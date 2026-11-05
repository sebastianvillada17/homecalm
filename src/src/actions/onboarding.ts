"use server";

import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export interface OnboardingStatus {
  completed: boolean;
  step: number;
  householdName: string;
  currency: string;
}

export async function getOnboardingStatusAction(): Promise<{
  success: boolean;
  status?: OnboardingStatus;
  error?: string;
}> {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT name, currency, onboarding_completed, onboarding_step FROM households WHERE id = ?",
      [session.householdId]
    );

    if (rows.length === 0) {
      return { success: false, error: "Hogar no encontrado" };
    }

    const row = rows[0];
    return {
      success: true,
      status: {
        completed: Boolean(row.onboarding_completed),
        step: Number(row.onboarding_step || 1),
        householdName: row.name || "Mi Hogar",
        currency: row.currency || "COP",
      },
    };
  } catch (err: any) {
    console.error("[HOMECALM] Error obteniendo estado de onboarding:", err.message);
    return { success: false, error: "Error consultando onboarding." };
  }
}

export async function saveOnboardingStepAction(data: {
  step: number;
  householdName?: string;
  currency?: string;
  account?: {
    name: string;
    type: "bank" | "cash" | "savings";
    balance: number;
  };
  budget?: {
    category: string;
    monthlyLimit: number;
  };
  task?: {
    title: string;
    dueDate?: string;
  };
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (data.step === 2 && data.householdName) {
      // Actualizar nombre y moneda del hogar
      await conn.query(
        "UPDATE households SET name = ?, currency = ?, onboarding_step = 3 WHERE id = ?",
        [data.householdName.trim(), data.currency || "COP", session.householdId]
      );
    } else if (data.step === 3 && data.account) {
      // Crear primera cuenta financiera
      const accId = crypto.randomUUID();
      await conn.query(
        "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [accId, session.householdId, data.account.name.trim(), data.account.type, Math.max(0, data.account.balance)]
      );
      await conn.query(
        "UPDATE households SET onboarding_step = 4 WHERE id = ?",
        [session.householdId]
      );
    } else if (data.step === 4 && data.budget) {
      // Crear primer presupuesto mensual
      const now = new Date();
      const budId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO budgets (id, household_id, category, monthly_limit, spent, month, year, created_at)
         VALUES (?, ?, ?, ?, 0.00, ?, ?, NOW())`,
        [budId, session.householdId, data.budget.category.trim(), Math.max(0, data.budget.monthlyLimit), now.getMonth() + 1, now.getFullYear()]
      );
      await conn.query(
        "UPDATE households SET onboarding_step = 5 WHERE id = ?",
        [session.householdId]
      );
    } else if (data.step === 5 && data.task?.title) {
      // Crear primera tarea
      const taskId = crypto.randomUUID();
      const validDue = data.task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.task.dueDate) ? data.task.dueDate : null;
      await conn.query(
        `INSERT INTO tasks (id, household_id, title, detail, due_date, done, priority, accent, created_at)
         VALUES (?, ?, ?, 'Creada durante onboarding', ?, FALSE, 'normal', 'bg-forest', NOW())`,
        [taskId, session.householdId, data.task.title.trim(), validDue]
      );
      await conn.query(
        "UPDATE households SET onboarding_step = 6 WHERE id = ?",
        [session.householdId]
      );
    } else {
      // Avance simple de paso
      await conn.query(
        "UPDATE households SET onboarding_step = ? WHERE id = ?",
        [Math.min(6, data.step + 1), session.householdId]
      );
    }

    await conn.commit();
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true, nextStep: data.step + 1 };
  } catch (err: any) {
    await conn.rollback();
    console.error("[HOMECALM] Error guardando paso de onboarding:", err.message);
    return { success: false, error: "No se pudo guardar el paso del onboarding." };
  } finally {
    conn.release();
  }
}

export async function completeOnboardingAction() {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query(
      "UPDATE households SET onboarding_completed = TRUE, onboarding_step = 6 WHERE id = ?",
      [session.householdId]
    );

    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("[HOMECALM] Error completando onboarding:", err.message);
    return { success: false, error: "No se pudo finalizar el onboarding." };
  }
}

