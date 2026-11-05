"use server";

import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { recordAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export interface DashboardData {
  isLoggedIn: boolean;
  user: {
    name: string;
    email: string;
    householdId: string;
    householdName: string;
    role: string;
  } | null;
  balance: number;
  expensesThisMonth: number;
  incomeThisMonth: number;
  savingsThisMonth: number;
  lastTransaction: {
    id: string;
    name: string;
    amount: number;
    type: "income" | "expense" | "transfer";
    category: string;
    date: string;
  } | null;
  tasks: Array<{
    id: string;
    title: string;
    detail: string;
    due: string;
    done: boolean;
    priority?: string;
    assignedTo?: string;
    accent: string;
  }>;
  groceries: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    purchased: boolean;
    price: number;
  }>;
  cashflow: Array<{
    day: string;
    ingreso: number;
    gasto: number;
  }>;
  nextEvent: {
    id: string;
    title: string;
    detail: string;
    date: string;
    budget: number;
  } | null;
  hasData: boolean;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
}

const transactionSchema = z.object({
  name: z.string().trim().min(1, "El concepto o descripción es requerido.").max(200),
  amount: z.number().positive("El monto debe ser mayor a cero y positivo."),
  category: z.string().trim().min(1, "La categoría es requerida.").max(100),
  type: z.enum(["income", "expense", "transfer"]),
  accountId: z.string().optional().or(z.literal("")),
  toAccountId: z.string().optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha debe ser YYYY-MM-DD").optional().or(z.literal("")),
});

export async function getDashboardDataAction(): Promise<DashboardData> {
  const session = await getSession();

  if (!session) {
    return {
      isLoggedIn: false,
      user: null,
      balance: 0,
      expensesThisMonth: 0,
      incomeThisMonth: 0,
      savingsThisMonth: 0,
      lastTransaction: null,
      tasks: [],
      groceries: [],
      cashflow: [],
      nextEvent: null,
      hasData: false,
    };
  }

  const householdId = session.householdId;

  try {
    // 1. Balance total consolidado entre cuentas del hogar
    const [accountRows] = await pool.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE household_id = ?",
      [householdId]
    );
    const balance = Number(accountRows[0]?.total_balance || 0);

    // 2. Gastos e ingresos del mes en curso
    const [expenseRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income
       FROM transactions 
       WHERE household_id = ? 
         AND MONTH(date) = MONTH(CURRENT_DATE()) 
         AND YEAR(date) = YEAR(CURRENT_DATE())`,
      [householdId]
    );
    const expensesThisMonth = Number(expenseRows[0]?.total_expense || 0);
    const incomeThisMonth = Number(expenseRows[0]?.total_income || 0);
    const savingsThisMonth = Math.max(0, incomeThisMonth - expensesThisMonth);

    // 3. Último movimiento registrado
    const [lastTxRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, amount, type, category, DATE_FORMAT(date, '%Y-%m-%d') as date
       FROM transactions
       WHERE household_id = ?
       ORDER BY date DESC, created_at DESC
       LIMIT 1`,
      [householdId]
    );

    const lastTransaction = lastTxRows[0]
      ? {
          id: lastTxRows[0].id,
          name: lastTxRows[0].name,
          amount: Number(lastTxRows[0].amount),
          type: lastTxRows[0].type,
          category: lastTxRows[0].category,
          date: lastTxRows[0].date,
        }
      : null;

    // 4. Tareas del hogar con fechas normalizadas y prioridad
    const [taskRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, detail, assigned_to, DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, done, priority, accent 
       FROM tasks 
       WHERE household_id = ? 
       ORDER BY done ASC, due_date ASC, created_at DESC`,
      [householdId]
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const tasks = taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      detail: row.detail || `Hogar · ${session.name.split(" ")[0]}`,
      due: row.due_date === todayStr ? "Hoy" : (row.due_date || "Hoy"),
      done: Boolean(row.done),
      priority: row.priority || "normal",
      assignedTo: row.assigned_to || undefined,
      accent: row.accent || "bg-forest",
    }));

    // 5. Lista de compras activa
    let [listRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM shopping_lists WHERE household_id = ? AND is_active = TRUE LIMIT 1",
      [householdId]
    );

    let listId = listRows[0]?.id;
    if (!listId) {
      listId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO shopping_lists (id, household_id, name, is_active, created_at) VALUES (?, ?, 'Mercado del hogar', TRUE, NOW())",
        [listId, householdId]
      );
    }

    const [groceryRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, quantity, unit, price, purchased 
       FROM shopping_items 
       WHERE list_id = ? 
       ORDER BY purchased ASC, created_at DESC`,
      [listId]
    );

    const groceries = groceryRows.map((row) => ({
      id: row.id,
      name: row.name,
      quantity: Number(row.quantity),
      unit: row.unit || "unidades",
      purchased: Boolean(row.purchased),
      price: Number(row.price || 0),
    }));

    // 6. Cashflow semanal agrupado
    const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const cashflow = daysOfWeek.map((day) => ({
      day,
      ingreso: 0,
      gasto: 0,
    }));

    const [weeklyTx] = await pool.query<RowDataPacket[]>(
      `SELECT DAYOFWEEK(date) as day_num, type, SUM(amount) as total
       FROM transactions
       WHERE household_id = ? AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
       GROUP BY day_num, type`,
      [householdId]
    );

    const mapDayIndex: Record<number, number> = {
      2: 0, // Lun
      3: 1, // Mar
      4: 2, // Mié
      5: 3, // Jue
      6: 4, // Vie
      7: 5, // Sáb
      1: 6, // Dom
    };

    weeklyTx.forEach((tx) => {
      const idx = mapDayIndex[tx.day_num];
      if (idx !== undefined && cashflow[idx]) {
        if (tx.type === "income") cashflow[idx].ingreso = Math.round(Number(tx.total) / 1000);
        if (tx.type === "expense") cashflow[idx].gasto = Math.round(Number(tx.total) / 1000);
      }
    });

    // 7. Próximo evento ordenado cronológicamente
    const [nextEventRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, detail, DATE_FORMAT(event_date, '%d %b') as date_formatted, budget
       FROM events
       WHERE household_id = ? AND event_date >= CURRENT_DATE()
       ORDER BY event_date ASC, created_at DESC
       LIMIT 1`,
      [householdId]
    );

    const nextEvent = nextEventRows[0]
      ? {
          id: nextEventRows[0].id,
          title: nextEventRows[0].title,
          detail: nextEventRows[0].detail || "Evento del hogar",
          date: nextEventRows[0].date_formatted || "Próximamente",
          budget: Number(nextEventRows[0].budget || 0),
        }
      : null;

    const hasData =
      balance > 0 ||
      expensesThisMonth > 0 ||
      tasks.length > 0 ||
      groceries.length > 0 ||
      lastTransaction !== null ||
      nextEvent !== null;

    // 8. Estado de Onboarding del hogar
    let onboardingCompleted = false;
    let onboardingStep = 1;
    try {
      const [hhRows] = await pool.query<RowDataPacket[]>(
        "SELECT onboarding_completed, onboarding_step FROM households WHERE id = ?",
        [householdId]
      );
      if (hhRows.length > 0) {
        onboardingCompleted = Boolean(hhRows[0].onboarding_completed);
        onboardingStep = Number(hhRows[0].onboarding_step || 1);
      }
    } catch {
      // Ignorar si no existe la columna en algún entorno
    }

    return {
      isLoggedIn: true,
      user: {
        name: session.name,
        email: session.email,
        householdId: session.householdId,
        householdName: session.householdName,
        role: session.role,
      },
      balance,
      expensesThisMonth,
      incomeThisMonth,
      savingsThisMonth,
      lastTransaction,
      tasks,
      groceries,
      cashflow,
      nextEvent,
      hasData,
      onboardingCompleted,
      onboardingStep,
    };
  } catch (err: any) {
    console.error("[HOMECALM] Error cargando dashboard:", err.message);
    return {
      isLoggedIn: true,
      user: {
        name: session.name,
        email: session.email,
        householdId: session.householdId,
        householdName: session.householdName,
        role: session.role,
      },
      balance: 0,
      expensesThisMonth: 0,
      incomeThisMonth: 0,
      savingsThisMonth: 0,
      lastTransaction: null,
      tasks: [],
      groceries: [],
      cashflow: [],
      nextEvent: null,
      hasData: false,
      onboardingCompleted: true,
      onboardingStep: 6,
    };
  }
}

/**
 * CREATE: Registra una transacción y actualiza atómicamente el saldo.
 */
export async function addTransactionAction(data: {
  name: string;
  amount: number;
  category: string;
  type: "income" | "expense" | "transfer";
  accountId?: string;
  toAccountId?: string;
  date?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Sesión no válida o expirada." };

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Datos de transacción no válidos.",
    };
  }

  const { name, amount, category, type, accountId, toAccountId, date } = parsed.data;
  const txDate = date && date.trim() ? date.trim() : new Date().toISOString().slice(0, 10);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let targetAccountId = accountId;

    if (targetAccountId) {
      const [accounts] = await connection.query<RowDataPacket[]>(
        "SELECT id, balance FROM accounts WHERE id = ? AND household_id = ? FOR UPDATE",
        [targetAccountId, session.householdId]
      );
      if (accounts.length === 0) {
        await connection.rollback();
        return { success: false, error: "La cuenta financiera seleccionada no existe en tu hogar." };
      }
    } else {
      const [accounts] = await connection.query<RowDataPacket[]>(
        "SELECT id, balance FROM accounts WHERE household_id = ? ORDER BY created_at ASC LIMIT 1 FOR UPDATE",
        [session.householdId]
      );

      if (accounts.length === 0) {
        targetAccountId = crypto.randomUUID();
        await connection.query(
          "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, 'Cuenta principal', 'bank', 0, NOW())",
          [targetAccountId, session.householdId]
        );
      } else {
        targetAccountId = accounts[0].id;
      }
    }

    if (type === "transfer") {
      if (!toAccountId || toAccountId === targetAccountId) {
        await connection.rollback();
        return { success: false, error: "Debes seleccionar una cuenta de destino diferente a la de origen." };
      }
      const [toAcc] = await connection.query<RowDataPacket[]>(
        "SELECT id, balance FROM accounts WHERE id = ? AND household_id = ? FOR UPDATE",
        [toAccountId, session.householdId]
      );
      if (toAcc.length === 0) {
        await connection.rollback();
        return { success: false, error: "La cuenta de destino no existe en tu hogar." };
      }
    }

    const txId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO transactions (id, household_id, account_id, to_account_id, name, category, amount, type, date, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [txId, session.householdId, targetAccountId, type === "transfer" ? toAccountId : null, name, category, amount, type, txDate]
    );

    if (type === "income") {
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [amount, targetAccountId, session.householdId]);
    } else if (type === "expense") {
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [amount, targetAccountId, session.householdId]);
    } else if (type === "transfer" && toAccountId) {
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [amount, targetAccountId, session.householdId]);
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [amount, toAccountId, session.householdId]);
    }

    await connection.commit();

    await recordAuditLog({
      householdId: session.householdId,
      userId: session.id,
      action: type === "transfer" ? "FINANCIAL_TRANSFER" : (type === "income" ? "FINANCIAL_INCOME" : "FINANCIAL_EXPENSE"),
      entityType: "TRANSACTION",
      entityId: txId,
      details: { amount, category, accountId: targetAccountId, toAccountId },
    });

    revalidatePath("/");
    revalidatePath("/finanzas");
    return { success: true, id: txId };
  } catch (err: any) {
    await connection.rollback();
    console.error("[HOMECALM] Error registrando transacción:", err.message);
    return { success: false, error: "Ocurrió un error al registrar el movimiento." };
  } finally {
    connection.release();
  }
}

/**
 * UPDATE: Edita una transacción existente recalculando atómicamente el saldo.
 * Revierte el impacto anterior y aplica el nuevo impacto sobre la cuenta correspondiente.
 */
export async function updateTransactionAction(data: {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: "income" | "expense" | "transfer";
  accountId?: string;
  toAccountId?: string;
  date?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Sesión no válida o expirada." };

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos no válidos." };
  }

  const { name, amount, category, type, accountId, toAccountId, date } = parsed.data;
  const txDate = date && date.trim() ? date.trim() : new Date().toISOString().slice(0, 10);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener la transacción previa y bloquearla
    const [txRows] = await connection.query<RowDataPacket[]>(
      "SELECT id, household_id, account_id, to_account_id, amount, type FROM transactions WHERE id = ? AND household_id = ? FOR UPDATE",
      [data.id, session.householdId]
    );

    if (txRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Movimiento financiero no encontrado o no pertenece a tu hogar." };
    }

    const oldTx = txRows[0];
    const oldAmount = Number(oldTx.amount);
    const oldType = oldTx.type;
    const oldAccountId = oldTx.account_id;
    const oldToAccountId = oldTx.to_account_id;

    // 2. Revertir impacto del movimiento anterior
    if (oldType === "income" && oldAccountId) {
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [oldAmount, oldAccountId, session.householdId]);
    } else if (oldType === "expense" && oldAccountId) {
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [oldAmount, oldAccountId, session.householdId]);
    } else if (oldType === "transfer" && oldAccountId && oldToAccountId) {
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [oldAmount, oldAccountId, session.householdId]);
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [oldAmount, oldToAccountId, session.householdId]);
    }

    // 3. Determinar nueva cuenta origen
    const newAccountId = accountId || oldAccountId;
    const [accCheck] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM accounts WHERE id = ? AND household_id = ? FOR UPDATE",
      [newAccountId, session.householdId]
    );
    if (accCheck.length === 0) {
      await connection.rollback();
      return { success: false, error: "La cuenta financiera seleccionada no existe en tu hogar." };
    }

    let validToAccountId: string | null = null;
    if (type === "transfer") {
      validToAccountId = toAccountId || oldToAccountId;
      if (!validToAccountId || validToAccountId === newAccountId) {
        await connection.rollback();
        return { success: false, error: "Debes seleccionar una cuenta de destino diferente a la de origen." };
      }
      const [toCheck] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM accounts WHERE id = ? AND household_id = ? FOR UPDATE",
        [validToAccountId, session.householdId]
      );
      if (toCheck.length === 0) {
        await connection.rollback();
        return { success: false, error: "La cuenta de destino no existe en tu hogar." };
      }
    }

    // 4. Aplicar nuevo impacto
    if (type === "income") {
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [amount, newAccountId, session.householdId]);
    } else if (type === "expense") {
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [amount, newAccountId, session.householdId]);
    } else if (type === "transfer" && validToAccountId) {
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [amount, newAccountId, session.householdId]);
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [amount, validToAccountId, session.householdId]);
    }

    // 5. Actualizar registro en transactions
    await connection.query(
      `UPDATE transactions 
       SET name = ?, category = ?, amount = ?, type = ?, account_id = ?, to_account_id = ?, date = ? 
       WHERE id = ? AND household_id = ?`,
      [name, category, amount, type, newAccountId, validToAccountId, txDate, data.id, session.householdId]
    );

    await connection.commit();

    await recordAuditLog({
      householdId: session.householdId,
      userId: session.id,
      action: "FINANCIAL_TRANSACTION_UPDATE",
      entityType: "TRANSACTION",
      entityId: data.id,
      details: { amount, category, accountId: newAccountId, toAccountId: validToAccountId },
    });

    revalidatePath("/");
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    await connection.rollback();
    console.error("[HOMECALM] Error actualizando movimiento:", err.message);
    return { success: false, error: "No se pudo actualizar el movimiento financiero." };
  } finally {
    connection.release();
  }
}

/**
 * DELETE: Elimina una transacción y restituye atómicamente el saldo.
 */
export async function deleteTransactionAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Sesión no válida o expirada." };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [txRows] = await connection.query<RowDataPacket[]>(
      "SELECT id, household_id, account_id, to_account_id, amount, type FROM transactions WHERE id = ? AND household_id = ? FOR UPDATE",
      [id, session.householdId]
    );

    if (txRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "El movimiento que intentas eliminar no existe." };
    }

    const tx = txRows[0];
    const amount = Number(tx.amount);

    // Restituir saldos
    if (tx.type === "income" && tx.account_id) {
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [amount, tx.account_id, session.householdId]);
    } else if (tx.type === "expense" && tx.account_id) {
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [amount, tx.account_id, session.householdId]);
    } else if (tx.type === "transfer" && tx.account_id && tx.to_account_id) {
      await connection.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND household_id = ?", [amount, tx.account_id, session.householdId]);
      await connection.query("UPDATE accounts SET balance = balance - ? WHERE id = ? AND household_id = ?", [amount, tx.to_account_id, session.householdId]);
    }

    // Borrar la transacción
    await connection.query("DELETE FROM transactions WHERE id = ? AND household_id = ?", [id, session.householdId]);

    await connection.commit();

    await recordAuditLog({
      householdId: session.householdId,
      userId: session.id,
      action: "FINANCIAL_TRANSACTION_DELETE",
      entityType: "TRANSACTION",
      entityId: id,
      details: { amount, type: tx.type, accountId: tx.account_id },
    });

    revalidatePath("/");
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    await connection.rollback();
    console.error("[HOMECALM] Error eliminando transacción:", err.message);
    return { success: false, error: "No se pudo eliminar el movimiento financiero." };
  } finally {
    connection.release();
  }
}

/**
 * TRANSFER: Transfiere fondos entre dos cuentas atómicamente.
 */
export async function addTransferAction(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (data.fromAccountId === data.toAccountId) {
    return { success: false, error: "La cuenta de origen y destino deben ser diferentes." };
  }
  if (!data.amount || data.amount <= 0) {
    return { success: false, error: "El monto a transferir debe ser mayor a cero." };
  }

  const txDate = data.date && data.date.trim() ? data.date.trim() : new Date().toISOString().slice(0, 10);
  const name = data.description?.trim() || "Transferencia entre cuentas";

  return addTransactionAction({
    name,
    amount: data.amount,
    category: "Transferencia",
    type: "transfer",
    accountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    date: txDate,
  });
}

// -------------------------------------------------------------
// TAREAS (CRUD COMPLETO)
// -------------------------------------------------------------

export async function addTaskAction(title: string, detail?: string, dueDate?: string, priority = "normal", assignedTo?: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (!title || !title.trim()) {
    return { success: false, error: "El título de la tarea no puede estar vacío." };
  }

  try {
    const id = crypto.randomUUID();
    const firstName = session.name.split(" ")[0];
    const todayStr = new Date().toISOString().slice(0, 10);
    const validDueDate = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()) ? dueDate.trim() : todayStr;

    await pool.query(
      `INSERT INTO tasks (id, household_id, title, detail, assigned_to, due_date, done, priority, accent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, FALSE, ?, 'bg-forest', NOW())`,
      [id, session.householdId, title.trim(), detail || `Hogar · ${firstName}`, assignedTo || null, validDueDate, priority]
    );

    revalidatePath("/");
    revalidatePath("/tareas");

    return { success: true, id };
  } catch (err: any) {
    console.error("[HOMECALM] Error agregando tarea:", err.message);
    return { success: false, error: "No se pudo guardar la tarea." };
  }
}

export async function updateTaskAction(data: {
  id: string;
  title: string;
  detail?: string;
  dueDate?: string;
  done?: boolean;
  priority?: string;
  assignedTo?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (!data.title || !data.title.trim()) {
    return { success: false, error: "El título de la tarea es requerido." };
  }

  const validDueDate = data.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.dueDate.trim()) ? data.dueDate.trim() : null;

  try {
    await pool.query(
      `UPDATE tasks 
       SET title = ?, detail = ?, due_date = ?, done = COALESCE(?, done), priority = COALESCE(?, priority), assigned_to = ?
       WHERE id = ? AND household_id = ?`,
      [data.title.trim(), data.detail || null, validDueDate, data.done, data.priority || "normal", data.assignedTo || null, data.id, session.householdId]
    );

    revalidatePath("/");
    revalidatePath("/tareas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar la tarea." };
  }
}

export async function deleteTaskAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query("DELETE FROM tasks WHERE id = ? AND household_id = ?", [id, session.householdId]);
    revalidatePath("/");
    revalidatePath("/tareas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar la tarea." };
  }
}

export async function toggleTaskAction(id: string, done: boolean) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query(
      "UPDATE tasks SET done = ? WHERE id = ? AND household_id = ?",
      [done, id, session.householdId]
    );

    revalidatePath("/");
    revalidatePath("/tareas");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar el estado de la tarea." };
  }
}

// -------------------------------------------------------------
// LISTA DE COMPRAS (CRUD COMPLETO)
// -------------------------------------------------------------

export async function addGroceryAction(name: string, quantity = 1, unit = "unidades", price = 0) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (!name || !name.trim()) {
    return { success: false, error: "El nombre del producto no puede estar vacío." };
  }

  try {
    let [listRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM shopping_lists WHERE household_id = ? AND is_active = TRUE LIMIT 1",
      [session.householdId]
    );

    let listId = listRows[0]?.id;
    if (!listId) {
      listId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO shopping_lists (id, household_id, name, is_active, created_at) VALUES (?, ?, 'Mercado del hogar', TRUE, NOW())",
        [listId, session.householdId]
      );
    }

    const itemId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO shopping_items (id, list_id, name, quantity, unit, price, purchased, created_at) VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())",
      [itemId, listId, name.trim(), Math.max(1, quantity), unit, Math.max(0, price)]
    );

    revalidatePath("/");
    revalidatePath("/compras");

    return { success: true, id: itemId };
  } catch (err: any) {
    return { success: false, error: "No se pudo agregar el producto a la lista." };
  }
}

export async function updateGroceryAction(data: {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  price?: number;
  purchased?: boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (!data.name || !data.name.trim()) {
    return { success: false, error: "El nombre del producto es requerido." };
  }

  try {
    await pool.query(
      `UPDATE shopping_items si
       JOIN shopping_lists sl ON si.list_id = sl.id
       SET si.name = ?, si.quantity = ?, si.unit = ?, si.price = ?, si.purchased = COALESCE(?, si.purchased)
       WHERE si.id = ? AND sl.household_id = ?`,
      [data.name.trim(), data.quantity || 1, data.unit || "unidades", data.price || 0, data.purchased, data.id, session.householdId]
    );

    revalidatePath("/");
    revalidatePath("/compras");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar el producto." };
  }
}

export async function deleteGroceryAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query(
      `DELETE si FROM shopping_items si
       JOIN shopping_lists sl ON si.list_id = sl.id
       WHERE si.id = ? AND sl.household_id = ?`,
      [id, session.householdId]
    );

    revalidatePath("/");
    revalidatePath("/compras");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar el producto." };
  }
}

export async function toggleGroceryAction(id: string, purchased: boolean) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query(
      `UPDATE shopping_items si
       JOIN shopping_lists sl ON si.list_id = sl.id
       SET si.purchased = ? 
       WHERE si.id = ? AND sl.household_id = ?`,
      [purchased, id, session.householdId]
    );

    revalidatePath("/");
    revalidatePath("/compras");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar el estado del producto." };
  }
}
