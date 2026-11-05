"use server";

import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getMondayOfCurrentWeek } from "@/lib/utils";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export type DayOfWeek = "LUN" | "MAR" | "MIÉ" | "JUE" | "VIE" | "SÁB" | "DOM";
export type MealType = "Desayuno" | "Media mañana" | "Almuerzo" | "Merienda" | "Cena";

export interface MealIngredient {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface MealItemData {
  id: string;
  planId: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  dishName: string;
  description?: string;
  portions: number;
  instructions?: string;
  calories: number;
  ingredients: MealIngredient[];
  createdAt: string;
}

export interface WeeklyMealPlanData {
  id: string;
  weekStartDate: string;
  notes?: string;
  items: MealItemData[];
}

export async function getWeeklyMealPlanAction(weekStartDate?: string): Promise<{
  success: boolean;
  plan?: WeeklyMealPlanData;
  error?: string;
}> {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const targetDate = weekStartDate && /^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)
    ? weekStartDate
    : getMondayOfCurrentWeek();

  try {
    // 1. Buscar o crear el plan de la semana
    let [planRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, week_start_date, notes FROM weekly_meal_plans WHERE household_id = ? AND week_start_date = ?",
      [session.householdId, targetDate]
    );

    let planId: string;
    let notes = "";

    if (planRows.length === 0) {
      planId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO weekly_meal_plans (id, household_id, week_start_date, notes, created_at) VALUES (?, ?, ?, ?, NOW())",
        [planId, session.householdId, targetDate, "Menú de la semana"]
      );
    } else {
      planId = planRows[0].id;
      notes = planRows[0].notes || "";
    }

    // 2. Obtener items del plan
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, plan_id, day_of_week, meal_type, dish_name, description, portions, instructions, calories, created_at
       FROM meal_plan_items
       WHERE plan_id = ?
       ORDER BY FIELD(day_of_week, 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'),
                FIELD(meal_type, 'Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena'),
                created_at ASC`,
      [planId]
    );

    if (itemRows.length === 0) {
      return {
        success: true,
        plan: {
          id: planId,
          weekStartDate: targetDate,
          notes,
          items: [],
        },
      };
    }

    const itemIds = itemRows.map((r) => r.id);
    const placeholders = itemIds.map(() => "?").join(",");

    const [ingredientRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, meal_item_id, name, quantity, unit
       FROM meal_item_ingredients
       WHERE meal_item_id IN (${placeholders})
       ORDER BY name ASC`,
      itemIds
    );

    const ingredientsByItem: Record<string, MealIngredient[]> = {};
    for (const ing of ingredientRows) {
      if (!ingredientsByItem[ing.meal_item_id]) {
        ingredientsByItem[ing.meal_item_id] = [];
      }
      ingredientsByItem[ing.meal_item_id].push({
        id: ing.id,
        name: ing.name,
        quantity: Number(ing.quantity),
        unit: ing.unit || "unidades",
      });
    }

    const items: MealItemData[] = itemRows.map((r) => ({
      id: r.id,
      planId: r.plan_id,
      dayOfWeek: r.day_of_week as DayOfWeek,
      mealType: r.meal_type as MealType,
      dishName: r.dish_name,
      description: r.description || "",
      portions: Number(r.portions || 2),
      instructions: r.instructions || "",
      calories: Number(r.calories || 0),
      ingredients: ingredientsByItem[r.id] || [],
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    }));

    return {
      success: true,
      plan: {
        id: planId,
        weekStartDate: targetDate,
        notes,
        items,
      },
    };
  } catch (err: any) {
    console.error("[HOMECALM] Error obteniendo menú semanal:", err.message);
    return { success: false, error: "No se pudo cargar el menú semanal." };
  }
}

const mealItemSchema = z.object({
  planId: z.string().optional(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dayOfWeek: z.enum(["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]),
  mealType: z.enum(["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena"]),
  dishName: z.string().trim().min(1, "El nombre del plato es obligatorio.").max(200),
  description: z.string().trim().optional(),
  portions: z.number().int().positive().default(2),
  instructions: z.string().trim().optional(),
  calories: z.number().int().nonnegative().default(0),
  ingredients: z.array(
    z.object({
      name: z.string().trim().min(1, "Nombre de ingrediente requerido."),
      quantity: z.number().positive().default(1),
      unit: z.string().trim().default("unidades"),
    })
  ).optional().default([]),
});

export async function addMealItemAction(data: z.infer<typeof mealItemSchema>) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = mealItemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos del plato inválidos." };
  }

  const {
    planId: inputPlanId,
    weekStartDate,
    dayOfWeek,
    mealType,
    dishName,
    description,
    portions,
    instructions,
    calories,
    ingredients,
  } = parsed.data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let planId = inputPlanId;
    if (!planId) {
      const targetDate = weekStartDate || getMondayOfCurrentWeek();
      const [pRows] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM weekly_meal_plans WHERE household_id = ? AND week_start_date = ?",
        [session.householdId, targetDate]
      );
      if (pRows.length > 0) {
        planId = pRows[0].id;
      } else {
        planId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO weekly_meal_plans (id, household_id, week_start_date, notes, created_at) VALUES (?, ?, ?, 'Menú de la semana', NOW())",
          [planId, session.householdId, targetDate]
        );
      }
    } else {
      // Verificar pertenencia del plan al hogar
      const [pRows] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM weekly_meal_plans WHERE id = ? AND household_id = ?",
        [planId, session.householdId]
      );
      if (pRows.length === 0) {
        await conn.rollback();
        return { success: false, error: "Plan semanal no encontrado para este hogar." };
      }
    }

    const itemId = crypto.randomUUID();
    await conn.query(
      `INSERT INTO meal_plan_items (id, plan_id, day_of_week, meal_type, dish_name, description, portions, instructions, calories, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [itemId, planId, dayOfWeek, mealType, dishName, description || null, portions, instructions || null, calories]
    );

    for (const ing of ingredients) {
      const ingId = crypto.randomUUID();
      await conn.query(
        "INSERT INTO meal_item_ingredients (id, meal_item_id, name, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [ingId, itemId, ing.name.trim(), ing.quantity, ing.unit.trim().toLowerCase()]
      );
    }

    await conn.commit();
    revalidatePath("/alimentacion");
    return { success: true, id: itemId };
  } catch (err: any) {
    await conn.rollback();
    console.error("[HOMECALM] Error agregando plato al menú:", err.message);
    return { success: false, error: "No se pudo agregar el plato al menú." };
  } finally {
    conn.release();
  }
}

export async function updateMealItemAction(data: {
  id: string;
  dayOfWeek?: DayOfWeek;
  mealType?: MealType;
  dishName: string;
  description?: string;
  portions?: number;
  instructions?: string;
  calories?: number;
  ingredients?: { name: string; quantity: number; unit?: string }[];
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (!data.id || !data.dishName || !data.dishName.trim()) {
    return { success: false, error: "El nombre del plato es requerido." };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validar que el plato pertenece al hogar del usuario
    const [chk] = await conn.query<RowDataPacket[]>(
      `SELECT mpi.id 
       FROM meal_plan_items mpi
       JOIN weekly_meal_plans wp ON mpi.plan_id = wp.id
       WHERE mpi.id = ? AND wp.household_id = ?`,
      [data.id, session.householdId]
    );

    if (chk.length === 0) {
      await conn.rollback();
      return { success: false, error: "Plato no encontrado o sin permisos." };
    }

    await conn.query(
      `UPDATE meal_plan_items 
       SET dish_name = ?, 
           day_of_week = COALESCE(?, day_of_week), 
           meal_type = COALESCE(?, meal_type), 
           description = ?, 
           portions = ?, 
           instructions = ?, 
           calories = ?
       WHERE id = ?`,
      [
        data.dishName.trim(),
        data.dayOfWeek || null,
        data.mealType || null,
        data.description || null,
        data.portions || 2,
        data.instructions || null,
        data.calories || 0,
        data.id,
      ]
    );

    if (Array.isArray(data.ingredients)) {
      // Reemplazar ingredientes de forma limpia
      await conn.query("DELETE FROM meal_item_ingredients WHERE meal_item_id = ?", [data.id]);

      for (const ing of data.ingredients) {
        if (!ing.name || !ing.name.trim()) continue;
        const ingId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO meal_item_ingredients (id, meal_item_id, name, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
          [ingId, data.id, ing.name.trim(), ing.quantity > 0 ? ing.quantity : 1, (ing.unit || "unidades").trim().toLowerCase()]
        );
      }
    }

    await conn.commit();
    revalidatePath("/alimentacion");
    return { success: true };
  } catch (err: any) {
    await conn.rollback();
    console.error("[HOMECALM] Error actualizando plato:", err.message);
    return { success: false, error: "No se pudo actualizar el plato." };
  } finally {
    conn.release();
  }
}

export async function deleteMealItemAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE mpi FROM meal_plan_items mpi
       JOIN weekly_meal_plans wp ON mpi.plan_id = wp.id
       WHERE mpi.id = ? AND wp.household_id = ?`,
      [id, session.householdId]
    );

    if (result.affectedRows === 0) {
      return { success: false, error: "Plato no encontrado o sin permisos." };
    }

    revalidatePath("/alimentacion");
    return { success: true };
  } catch (err: any) {
    console.error("[HOMECALM] Error eliminando plato:", err.message);
    return { success: false, error: "No se pudo eliminar el plato." };
  }
}

export async function copyPreviousWeekMealPlanAction(targetWeekStartDate: string, sourceWeekStartDate?: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  let srcDate = sourceWeekStartDate;
  if (!srcDate) {
    const t = new Date(targetWeekStartDate);
    t.setDate(t.getDate() - 7);
    srcDate = t.toISOString().slice(0, 10);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [srcRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM weekly_meal_plans WHERE household_id = ? AND week_start_date = ?",
      [session.householdId, srcDate]
    );

    if (srcRows.length === 0) {
      await conn.rollback();
      return { success: false, error: `No se encontró menú de la semana anterior (${srcDate}).` };
    }

    const srcPlanId = srcRows[0].id;

    // Obtener items e ingredientes anteriores
    const [srcItems] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM meal_plan_items WHERE plan_id = ?",
      [srcPlanId]
    );

    if (srcItems.length === 0) {
      await conn.rollback();
      return { success: false, error: "El menú de la semana anterior no contiene platos." };
    }

    // Obtener o crear plan destino
    let [targetPlanRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM weekly_meal_plans WHERE household_id = ? AND week_start_date = ?",
      [session.householdId, targetWeekStartDate]
    );

    let targetPlanId: string;
    if (targetPlanRows.length === 0) {
      targetPlanId = crypto.randomUUID();
      await conn.query(
        "INSERT INTO weekly_meal_plans (id, household_id, week_start_date, notes, created_at) VALUES (?, ?, ?, 'Menú copiado de la semana anterior', NOW())",
        [targetPlanId, session.householdId, targetWeekStartDate]
      );
    } else {
      targetPlanId = targetPlanRows[0].id;
    }

    let copiedCount = 0;
    for (const item of srcItems) {
      const newItemId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO meal_plan_items (id, plan_id, day_of_week, meal_type, dish_name, description, portions, instructions, calories, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          newItemId,
          targetPlanId,
          item.day_of_week,
          item.meal_type,
          item.dish_name,
          item.description,
          item.portions,
          item.instructions,
          item.calories,
        ]
      );

      // Copiar ingredientes
      const [srcIngs] = await conn.query<RowDataPacket[]>(
        "SELECT name, quantity, unit FROM meal_item_ingredients WHERE meal_item_id = ?",
        [item.id]
      );

      for (const ing of srcIngs) {
        const newIngId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO meal_item_ingredients (id, meal_item_id, name, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
          [newIngId, newItemId, ing.name, ing.quantity, ing.unit]
        );
      }
      copiedCount++;
    }

    await conn.commit();
    revalidatePath("/alimentacion");
    return { success: true, copiedCount };
  } catch (err: any) {
    await conn.rollback();
    console.error("[HOMECALM] Error copiando menú semanal:", err.message);
    return { success: false, error: "No se pudo copiar el menú de la semana anterior." };
  } finally {
    conn.release();
  }
}

/**
 * Consolidación inteligente de ingredientes y envío a la Lista de Compras
 */
export async function sendIngredientsToShoppingListAction(params: {
  planId?: string;
  mealItemId?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let ingredientRows: RowDataPacket[] = [];

    if (params.mealItemId) {
      // Ingredientes de un plato específico
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT mii.name, mii.quantity, mii.unit 
         FROM meal_item_ingredients mii
         JOIN meal_plan_items mpi ON mii.meal_item_id = mpi.id
         JOIN weekly_meal_plans wp ON mpi.plan_id = wp.id
         WHERE mpi.id = ? AND wp.household_id = ?`,
        [params.mealItemId, session.householdId]
      );
      ingredientRows = rows;
    } else if (params.planId) {
      // Ingredientes de toda la semana
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT mii.name, mii.quantity, mii.unit 
         FROM meal_item_ingredients mii
         JOIN meal_plan_items mpi ON mii.meal_item_id = mpi.id
         JOIN weekly_meal_plans wp ON mpi.plan_id = wp.id
         WHERE wp.id = ? AND wp.household_id = ?`,
        [params.planId, session.householdId]
      );
      ingredientRows = rows;
    } else {
      await conn.rollback();
      return { success: false, error: "Se debe especificar un plan o un plato." };
    }

    if (ingredientRows.length === 0) {
      await conn.rollback();
      return { success: false, error: "No hay ingredientes para enviar a la lista de compras." };
    }

    // 1. Consolidación inteligente en memoria
    // Clave: nombre normalizado + '::' + unidad normalizada
    const consolidatedMap = new Map<string, { name: string; quantity: number; unit: string }>();

    for (const r of ingredientRows) {
      const rawName = (r.name || "").trim();
      if (!rawName) continue;
      const normName = rawName.toLowerCase();
      const normUnit = (r.unit || "unidades").trim().toLowerCase();
      const key = `${normName}::${normUnit}`;

      const qty = Number(r.quantity) || 1;
      const existing = consolidatedMap.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        // Guardamos el nombre capitalizado para buena presentación
        const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        consolidatedMap.set(key, {
          name: displayName,
          quantity: qty,
          unit: normUnit,
        });
      }
    }

    // 2. Obtener o crear lista de compras activa
    let [listRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM shopping_lists WHERE household_id = ? AND is_active = TRUE LIMIT 1",
      [session.householdId]
    );

    let listId: string;
    if (listRows.length === 0) {
      listId = crypto.randomUUID();
      await conn.query(
        "INSERT INTO shopping_lists (id, household_id, name, is_active, created_at) VALUES (?, ?, 'Mercado del hogar', TRUE, NOW())",
        [listId, session.householdId]
      );
    } else {
      listId = listRows[0].id;
    }

    // 3. Insertar o consolidar con items ya existentes en la lista de compras
    const [existingShoppingItems] = await conn.query<RowDataPacket[]>(
      "SELECT id, LOWER(TRIM(name)) as norm_name, LOWER(TRIM(unit)) as norm_unit, quantity, purchased FROM shopping_items WHERE list_id = ?",
      [listId]
    );

    const existingMap = new Map<string, { id: string; quantity: number; purchased: boolean }>();
    for (const item of existingShoppingItems) {
      const key = `${item.norm_name}::${item.norm_unit}`;
      existingMap.set(key, {
        id: item.id,
        quantity: Number(item.quantity),
        purchased: Boolean(item.purchased),
      });
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const [key, item] of consolidatedMap.entries()) {
      const match = existingMap.get(key);
      if (match && !match.purchased) {
        // Si ya está pendiente en la lista con la misma unidad, sumamos cantidades
        const newQty = match.quantity + item.quantity;
        await conn.query(
          "UPDATE shopping_items SET quantity = ? WHERE id = ?",
          [newQty, match.id]
        );
        updatedCount++;
      } else {
        // Insertamos como nuevo ítem en la lista
        const itemId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO shopping_items (id, list_id, name, quantity, unit, price, purchased, created_at) VALUES (?, ?, ?, ?, ?, 0.00, FALSE, NOW())",
          [itemId, listId, item.name, item.quantity, item.unit]
        );
        addedCount++;
      }
    }

    await conn.commit();
    revalidatePath("/compras");
    revalidatePath("/alimentacion");
    revalidatePath("/");

    return {
      success: true,
      addedCount,
      updatedCount,
      totalIngredients: consolidatedMap.size,
    };
  } catch (err: any) {
    await conn.rollback();
    console.error("[HOMECALM] Error enviando ingredientes a compras:", err.message);
    return { success: false, error: "No se pudieron transferir los ingredientes a la lista de compras." };
  } finally {
    conn.release();
  }
}

