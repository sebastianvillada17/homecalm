"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { recordAuditLog } from "@/lib/audit";

export interface AccountData {
  id: string;
  name: string;
  type: "bank" | "cash" | "savings";
  balance: number;
  transactionCount: number;
}

export interface TransactionData {
  id: string;
  name: string;
  category: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  accountId: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  date: string;
}

export interface BudgetData {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percent: number;
  month: number;
  year: number;
}

export interface DebtPaymentData {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

export interface DebtData {
  id: string;
  name: string;
  institution: string;
  totalAmount: number;
  balance: number;
  dueDate: string;
  isPaid: boolean;
  payments: DebtPaymentData[];
}

export interface SavingsContributionData {
  id: string;
  goalId: string;
  amount: number;
  contributionDate: string;
  notes?: string;
}

export interface SavingsGoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  percent: number;
  targetDate: string;
  isCompleted: boolean;
  contributions: SavingsContributionData[];
}

export interface InventoryData {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  place: string;
  category: string;
  expires?: string;
  isExpired?: boolean;
}

export interface EventData {
  id: string;
  title: string;
  detail: string;
  date: string;
  dateFormatted: string;
  budget: number;
}

export interface MemberData {
  id: string;
  name: string;
  email: string;
  role: string;
  rawRole?: "admin" | "member";
  initials: string;
}

export async function getModuleDataAction() {
  const session = await getSession();
  if (!session) {
    return {
      isLoggedIn: false,
      householdName: "Hogar Villato",
      accounts: [] as AccountData[],
      transactions: [] as TransactionData[],
      budgets: [] as BudgetData[],
      inventory: [] as InventoryData[],
      events: [] as EventData[],
      debts: [] as DebtData[],
      savingsGoals: [] as SavingsGoalData[],
      members: [] as MemberData[],
      totalBalance: 0,
      totalIncomeMonth: 0,
      totalExpenseMonth: 0,
    };
  }

  const householdId = session.householdId;

  try {
    // 1. Cuentas con conteo de transacciones asociadas
    const [accountsRows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.name, a.type, a.balance,
              (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id OR t.to_account_id = a.id) as tx_count
       FROM accounts a 
       WHERE a.household_id = ? 
       ORDER BY a.created_at ASC`,
      [householdId]
    );

    const accounts: AccountData[] = accountsRows.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type as "bank" | "cash" | "savings",
      balance: Number(a.balance),
      transactionCount: Number(a.tx_count || 0),
    }));

    // 2. Movimientos con nombres de cuentas asociadas
    const [txRows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.name, t.category, t.amount, t.type, 
              t.account_id, a1.name as account_name,
              t.to_account_id, a2.name as to_account_name,
              DATE_FORMAT(t.date, '%Y-%m-%d') as date 
       FROM transactions t
       LEFT JOIN accounts a1 ON t.account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       WHERE t.household_id = ? 
       ORDER BY t.date DESC, t.created_at DESC`,
      [householdId]
    );

    const transactions: TransactionData[] = txRows.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      amount: Number(t.amount),
      type: t.type,
      accountId: t.account_id,
      accountName: t.account_name || "Cuenta principal",
      toAccountId: t.to_account_id || undefined,
      toAccountName: t.to_account_name || undefined,
      date: t.date,
    }));

    // 3. Presupuestos del mes y año actual con cálculo real de gastos en la categoría
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [budgetRows] = await pool.query<RowDataPacket[]>(
      `SELECT b.id, b.category, b.monthly_limit, b.month, b.year,
              COALESCE(
                (SELECT SUM(t.amount) 
                 FROM transactions t 
                 WHERE t.household_id = b.household_id 
                   AND t.category = b.category 
                   AND t.type = 'expense' 
                   AND MONTH(t.date) = b.month 
                   AND YEAR(t.date) = b.year),
                0
              ) as spent
       FROM budgets b
       WHERE b.household_id = ? AND b.month = ? AND b.year = ?
       ORDER BY b.created_at ASC`,
      [householdId, currentMonth, currentYear]
    );

    const budgets: BudgetData[] = budgetRows.map((b) => {
      const limit = Number(b.monthly_limit);
      const spent = Number(b.spent);
      const remaining = Math.max(0, limit - spent);
      const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      return {
        id: b.id,
        category: b.category,
        monthlyLimit: limit,
        spent,
        remaining,
        percent,
        month: b.month,
        year: b.year,
      };
    });

    // 4. Totales calculados
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
    const totalIncomeMonth = transactions
      .filter((t) => t.type === "income" && t.date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, "0")}`))
      .reduce((acc, t) => acc + t.amount, 0);
    const totalExpenseMonth = transactions
      .filter((t) => t.type === "expense" && t.date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, "0")}`))
      .reduce((acc, t) => acc + t.amount, 0);

    // 5. Inventario con fechas normalizadas
    const [invRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, quantity, unit, place, category, DATE_FORMAT(expires, '%Y-%m-%d') as expires 
       FROM inventory 
       WHERE household_id = ? 
       ORDER BY expires ASC, created_at DESC`,
      [householdId]
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const inventory: InventoryData[] = invRows.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: Number(i.quantity),
      unit: i.unit,
      place: i.place,
      category: i.category,
      expires: i.expires || undefined,
      isExpired: i.expires ? i.expires < todayStr : false,
    }));

    // 6. Eventos del hogar ordenados cronológicamente
    const [eventRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, detail, 
              DATE_FORMAT(event_date, '%d %b') as date_formatted,
              DATE_FORMAT(event_date, '%Y-%m-%d') as date, 
              budget 
       FROM events 
       WHERE household_id = ? 
       ORDER BY event_date ASC, created_at DESC`,
      [householdId]
    );

    const events: EventData[] = eventRows.map((e) => ({
      id: e.id,
      title: e.title,
      detail: e.detail || "En casa",
      date: e.date,
      dateFormatted: e.date_formatted ? e.date_formatted.toUpperCase() : "PRÓX",
      budget: Number(e.budget || 0),
    }));

    // 7. Deudas e historial de abonos
    const [debtRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, institution, total_amount, balance, DATE_FORMAT(due_date, '%Y-%m-%d') as due_date
       FROM debts
       WHERE household_id = ?
       ORDER BY balance > 0 DESC, due_date ASC, created_at DESC`,
      [householdId]
    );

    const [paymentRows] = await pool.query<RowDataPacket[]>(
      `SELECT dp.id, dp.debt_id, dp.amount, DATE_FORMAT(dp.payment_date, '%Y-%m-%d') as payment_date, dp.notes
       FROM debt_payments dp
       JOIN debts d ON dp.debt_id = d.id
       WHERE d.household_id = ?
       ORDER BY dp.payment_date DESC`,
      [householdId]
    );

    const debts: DebtData[] = debtRows.map((d) => {
      const debtPayments: DebtPaymentData[] = paymentRows
        .filter((p) => p.debt_id === d.id)
        .map((p) => ({
          id: p.id,
          debtId: p.debt_id,
          amount: Number(p.amount),
          paymentDate: p.payment_date,
          notes: p.notes || undefined,
        }));

      const bal = Number(d.balance || 0);
      return {
        id: d.id,
        name: d.name,
        institution: d.institution || "Entidad",
        totalAmount: Number(d.total_amount || 0),
        balance: bal,
        dueDate: d.due_date || "Sin fecha fija",
        isPaid: bal <= 0,
        payments: debtPayments,
      };
    });

    // 8. Metas de ahorro e historial de aportes
    const [savingsRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, target_amount, current_amount, DATE_FORMAT(target_date, '%Y-%m-%d') as target_date
       FROM savings_goals
       WHERE household_id = ?
       ORDER BY current_amount >= target_amount ASC, created_at DESC`,
      [householdId]
    );

    const [contribRows] = await pool.query<RowDataPacket[]>(
      `SELECT sc.id, sc.goal_id, sc.amount, DATE_FORMAT(sc.contribution_date, '%Y-%m-%d') as contribution_date, sc.notes
       FROM savings_contributions sc
       JOIN savings_goals sg ON sc.goal_id = sg.id
       WHERE sg.household_id = ?
       ORDER BY sc.contribution_date DESC`,
      [householdId]
    );

    const savingsGoals: SavingsGoalData[] = savingsRows.map((s) => {
      const contributions: SavingsContributionData[] = contribRows
        .filter((c) => c.goal_id === s.id)
        .map((c) => ({
          id: c.id,
          goalId: c.goal_id,
          amount: Number(c.amount),
          contributionDate: c.contribution_date,
          notes: c.notes || undefined,
        }));

      const target = Number(s.target_amount || 0);
      const current = Number(s.current_amount || 0);
      const remaining = Math.max(0, target - current);
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      return {
        id: s.id,
        name: s.name,
        targetAmount: target,
        currentAmount: current,
        remaining,
        percent,
        targetDate: s.target_date || "Meta abierta",
        isCompleted: current >= target && target > 0,
        contributions,
      };
    });

    // 9. Miembros del hogar
    const [memberRows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.full_name, u.email, hm.role 
       FROM household_members hm 
       JOIN users u ON hm.user_id = u.id 
       WHERE hm.household_id = ?`,
      [householdId]
    );

    const members: MemberData[] = memberRows.map((m) => {
      const initials = m.full_name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      return {
        id: m.id,
        name: m.full_name,
        email: m.email,
        role: m.role === "admin" ? "Administrador/a" : "Miembro",
        rawRole: m.role as "admin" | "member",
        initials,
      };
    });

    return {
      isLoggedIn: true,
      currentUserId: session.id,
      currentUserRole: session.role as "admin" | "member",
      householdName: session.householdName || "Hogar Villato",
      accounts,
      transactions,
      budgets,
      inventory,
      events,
      debts,
      savingsGoals,
      members,
      totalBalance,
      totalIncomeMonth,
      totalExpenseMonth,
    };
  } catch (err: any) {
    console.error("[HOMECALM] Error al cargar datos de módulos:", err.message);
    return {
      isLoggedIn: true,
      householdName: session.householdName || "Hogar Villato",
      accounts: [],
      transactions: [],
      budgets: [],
      inventory: [],
      events: [],
      debts: [],
      savingsGoals: [],
      members: [],
      totalBalance: 0,
      totalIncomeMonth: 0,
      totalExpenseMonth: 0,
    };
  }
}

// =============================================================
// CUENTAS (CRUD COMPLETO)
// =============================================================

const accountSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la cuenta es requerido.").max(100),
  type: z.enum(["bank", "cash", "savings"]),
  balance: z.number().nonnegative("El balance inicial no puede ser negativo."),
});

export async function addAccountAction(data: {
  name: string;
  type: "bank" | "cash" | "savings";
  balance: number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = accountSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos de cuenta inválidos." };
  }

  const { name, type, balance } = parsed.data;

  try {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [id, session.householdId, name, type, balance]
    );
    revalidatePath("/finanzas");
    revalidatePath("/");
    return { success: true, id };
  } catch (err: any) {
    console.error("[HOMECALM] Error creando cuenta:", err.message);
    return { success: false, error: "No se pudo crear la cuenta." };
  }
}

export async function updateAccountAction(data: {
  id: string;
  name: string;
  type: "bank" | "cash" | "savings";
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (!data.name || !data.name.trim()) {
    return { success: false, error: "El nombre de la cuenta es requerido." };
  }

  try {
    await pool.query(
      "UPDATE accounts SET name = ?, type = ? WHERE id = ? AND household_id = ?",
      [data.name.trim(), data.type, data.id, session.householdId]
    );
    revalidatePath("/finanzas");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar la cuenta." };
  }
}

export async function deleteAccountAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (session.role !== "admin") {
    return { success: false, error: "Solo los administradores del hogar pueden eliminar cuentas financieras." };
  }

  try {
    // 1. Validar que no sea la única cuenta
    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM accounts WHERE household_id = ?",
      [session.householdId]
    );
    if ((countRows[0]?.count || 0) <= 1) {
      return { success: false, error: "No puedes eliminar la única cuenta del hogar. Debe haber al menos una." };
    }

    // 2. Validar que no tenga transacciones asociadas
    const [txRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM transactions WHERE (account_id = ? OR to_account_id = ?) AND household_id = ?",
      [id, id, session.householdId]
    );
    const txCount = Number(txRows[0]?.count || 0);
    if (txCount > 0) {
      return {
        success: false,
        error: `No es posible eliminar la cuenta porque contiene ${txCount} movimiento(s) asociado(s). Debes reclasificar o eliminar los movimientos primero.`,
      };
    }

    await pool.query("DELETE FROM accounts WHERE id = ? AND household_id = ?", [id, session.householdId]);
    
    await recordAuditLog({
      householdId: session.householdId,
      userId: session.id,
      action: "ACCOUNT_DELETE",
      entityType: "ACCOUNT",
      entityId: id,
    });

    revalidatePath("/finanzas");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar la cuenta." };
  }
}

// =============================================================
// PRESUPUESTOS (CRUD COMPLETO)
// =============================================================

const budgetSchema = z.object({
  category: z.string().trim().min(1, "La categoría es requerida.").max(100),
  monthlyLimit: z.number().positive("El límite mensual debe ser un número positivo."),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
});

export async function addBudgetAction(data: {
  category: string;
  monthlyLimit: number;
  month?: number;
  year?: number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = budgetSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos de presupuesto inválidos." };
  }

  const { category, monthlyLimit } = parsed.data;
  const month = parsed.data.month || new Date().getMonth() + 1;
  const year = parsed.data.year || new Date().getFullYear();

  try {
    // Verificar si ya existe presupuesto para esta categoría y período
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM budgets WHERE household_id = ? AND category = ? AND month = ? AND year = ?",
      [session.householdId, category, month, year]
    );

    if (existing.length > 0) {
      return { success: false, error: `Ya existe un presupuesto para ${category} en este período.` };
    }

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO budgets (id, household_id, category, monthly_limit, spent, month, year, created_at) 
       VALUES (?, ?, ?, ?, 0.00, ?, ?, NOW())`,
      [id, session.householdId, category, monthlyLimit, month, year]
    );

    revalidatePath("/finanzas");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: "No se pudo crear el presupuesto." };
  }
}

export async function updateBudgetAction(data: {
  id: string;
  monthlyLimit: number;
  category?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (data.monthlyLimit <= 0) {
    return { success: false, error: "El límite mensual debe ser mayor a cero." };
  }

  try {
    await pool.query(
      "UPDATE budgets SET monthly_limit = ?, category = COALESCE(?, category) WHERE id = ? AND household_id = ?",
      [data.monthlyLimit, data.category || null, data.id, session.householdId]
    );
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar el presupuesto." };
  }
}

export async function deleteBudgetAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query("DELETE FROM budgets WHERE id = ? AND household_id = ?", [id, session.householdId]);
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar el presupuesto." };
  }
}

// =============================================================
// DEUDAS Y ABONOS (CRUD COMPLETO)
// =============================================================

const debtSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la deuda es requerido."),
  institution: z.string().trim().optional(),
  totalAmount: z.number().positive("El monto total debe ser mayor a cero."),
  balance: z.number().nonnegative("El saldo pendiente no puede ser negativo."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato debe ser YYYY-MM-DD").optional().or(z.literal("")),
});

export async function addDebtAction(data: {
  name: string;
  institution?: string;
  totalAmount: number;
  balance: number;
  dueDate?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = debtSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos de deuda inválidos." };
  }

  const { name, institution, totalAmount, balance, dueDate } = parsed.data;
  const validDueDate = dueDate && dueDate.trim() ? dueDate.trim() : null;

  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO debts (id, household_id, name, institution, total_amount, balance, due_date, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        session.householdId,
        name,
        institution || "Entidad",
        totalAmount,
        balance,
        validDueDate,
      ]
    );
    revalidatePath("/finanzas");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: "No se pudo guardar la deuda." };
  }
}

export async function updateDebtAction(data: {
  id: string;
  name: string;
  institution?: string;
  totalAmount: number;
  balance: number;
  dueDate?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const validDueDate = data.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.dueDate.trim()) ? data.dueDate.trim() : null;

  try {
    await pool.query(
      `UPDATE debts 
       SET name = ?, institution = ?, total_amount = ?, balance = ?, due_date = ? 
       WHERE id = ? AND household_id = ?`,
      [data.name.trim(), data.institution || "Entidad", data.totalAmount, data.balance, validDueDate, data.id, session.householdId]
    );
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar la deuda." };
  }
}

export async function deleteDebtAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query("DELETE FROM debts WHERE id = ? AND household_id = ?", [id, session.householdId]);
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar la deuda." };
  }
}

export async function addDebtPaymentAction(data: {
  debtId: string;
  amount: number;
  paymentDate?: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (data.amount <= 0) {
    return { success: false, error: "El monto del abono debe ser mayor a cero." };
  }

  const payDate = data.paymentDate && /^\d{4}-\d{2}-\d{2}$/.test(data.paymentDate.trim())
    ? data.paymentDate.trim()
    : new Date().toISOString().slice(0, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [debtRows] = await conn.query<RowDataPacket[]>(
      "SELECT id, balance FROM debts WHERE id = ? AND household_id = ? FOR UPDATE",
      [data.debtId, session.householdId]
    );

    if (debtRows.length === 0) {
      await conn.rollback();
      return { success: false, error: "Deuda no encontrada." };
    }

    const currentBal = Number(debtRows[0].balance || 0);
    const newBal = Math.max(0, currentBal - data.amount);

    const paymentId = crypto.randomUUID();
    await conn.query(
      `INSERT INTO debt_payments (id, debt_id, amount, payment_date, notes, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [paymentId, data.debtId, data.amount, payDate, data.notes?.trim() || "Abono realizado"]
    );

    await conn.query(
      "UPDATE debts SET balance = ? WHERE id = ? AND household_id = ?",
      [newBal, data.debtId, session.householdId]
    );

    await conn.commit();
    revalidatePath("/finanzas");
    return { success: true, paymentId, remainingBalance: newBal };
  } catch (err: any) {
    await conn.rollback();
    return { success: false, error: "No se pudo registrar el abono." };
  } finally {
    conn.release();
  }
}

// =============================================================
// METAS DE AHORRO Y APORTES (CRUD COMPLETO)
// =============================================================

const savingsSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la meta es requerido."),
  targetAmount: z.number().positive("La meta debe ser mayor a cero."),
  currentAmount: z.number().nonnegative().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato debe ser YYYY-MM-DD").optional().or(z.literal("")),
});

export async function addSavingsGoalAction(data: {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = savingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos de meta inválidos." };
  }

  const { name, targetAmount, currentAmount, targetDate } = parsed.data;
  const validTargetDate = targetDate && targetDate.trim() ? targetDate.trim() : null;

  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO savings_goals (id, household_id, name, target_amount, current_amount, target_date, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        session.householdId,
        name,
        targetAmount,
        currentAmount || 0,
        validTargetDate,
      ]
    );
    revalidatePath("/finanzas");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: "No se pudo guardar la meta de ahorro." };
  }
}

export async function updateSavingsGoalAction(data: {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const validTargetDate = data.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(data.targetDate.trim()) ? data.targetDate.trim() : null;

  try {
    await pool.query(
      `UPDATE savings_goals 
       SET name = ?, target_amount = ?, target_date = ? 
       WHERE id = ? AND household_id = ?`,
      [data.name.trim(), data.targetAmount, validTargetDate, data.id, session.householdId]
    );
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar la meta de ahorro." };
  }
}

export async function deleteSavingsGoalAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query("DELETE FROM savings_goals WHERE id = ? AND household_id = ?", [id, session.householdId]);
    revalidatePath("/finanzas");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar la meta de ahorro." };
  }
}

export async function addSavingsContributionAction(data: {
  goalId: string;
  amount: number;
  contributionDate?: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (data.amount <= 0) {
    return { success: false, error: "El monto del aporte debe ser mayor a cero." };
  }

  const cDate = data.contributionDate && /^\d{4}-\d{2}-\d{2}$/.test(data.contributionDate.trim())
    ? data.contributionDate.trim()
    : new Date().toISOString().slice(0, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [goalRows] = await conn.query<RowDataPacket[]>(
      "SELECT id, current_amount, target_amount FROM savings_goals WHERE id = ? AND household_id = ? FOR UPDATE",
      [data.goalId, session.householdId]
    );

    if (goalRows.length === 0) {
      await conn.rollback();
      return { success: false, error: "Meta de ahorro no encontrada." };
    }

    const currentSaved = Number(goalRows[0].current_amount || 0);
    const newSaved = currentSaved + data.amount;

    const contribId = crypto.randomUUID();
    await conn.query(
      `INSERT INTO savings_contributions (id, goal_id, amount, contribution_date, notes, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [contribId, data.goalId, data.amount, cDate, data.notes?.trim() || "Aporte a la meta"]
    );

    await conn.query(
      "UPDATE savings_goals SET current_amount = ? WHERE id = ? AND household_id = ?",
      [newSaved, data.goalId, session.householdId]
    );

    await conn.commit();
    revalidatePath("/finanzas");
    return { success: true, contribId, currentSaved: newSaved };
  } catch (err: any) {
    await conn.rollback();
    return { success: false, error: "No se pudo registrar el aporte a la meta." };
  } finally {
    conn.release();
  }
}

// =============================================================
// INVENTARIO (CRUD COMPLETO)
// =============================================================

const inventorySchema = z.object({
  name: z.string().trim().min(1, "El nombre del producto es requerido."),
  quantity: z.number().positive("La cantidad debe ser mayor a cero."),
  unit: z.string().trim().optional(),
  place: z.string().trim().optional(),
  category: z.string().trim().optional(),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato debe ser YYYY-MM-DD").optional().or(z.literal("")),
});

export async function addInventoryAction(data: {
  name: string;
  quantity: number;
  unit?: string;
  place?: string;
  category?: string;
  expires?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = inventorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos de inventario inválidos." };
  }

  const { name, quantity, unit, place, category, expires } = parsed.data;
  const validExpires = expires && expires.trim() ? expires.trim() : null;

  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO inventory (id, household_id, name, quantity, unit, place, category, expires, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        session.householdId,
        name,
        quantity,
        unit || "unidades",
        place || "Despensa",
        category || "General",
        validExpires,
      ]
    );
    revalidatePath("/inventario");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: "No se pudo agregar el producto a inventario." };
  }
}

export async function updateInventoryAction(data: {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  place?: string;
  category?: string;
  expires?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const validExpires = data.expires && /^\d{4}-\d{2}-\d{2}$/.test(data.expires.trim()) ? data.expires.trim() : null;

  try {
    await pool.query(
      `UPDATE inventory 
       SET name = ?, quantity = ?, unit = ?, place = ?, category = ?, expires = ? 
       WHERE id = ? AND household_id = ?`,
      [data.name.trim(), data.quantity, data.unit || "unidades", data.place || "Despensa", data.category || "General", validExpires, data.id, session.householdId]
    );
    revalidatePath("/inventario");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar el producto de inventario." };
  }
}

export async function deleteInventoryAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query("DELETE FROM inventory WHERE id = ? AND household_id = ?", [id, session.householdId]);
    revalidatePath("/inventario");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar el producto de inventario." };
  }
}

// =============================================================
// EVENTOS (CRUD COMPLETO)
// =============================================================

const eventSchema = z.object({
  title: z.string().trim().min(1, "El título del evento es requerido."),
  detail: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD."),
  budget: z.number().nonnegative().optional(),
});

export async function addEventAction(data: {
  title: string;
  detail?: string;
  date: string;
  budget?: number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = eventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos de evento inválidos." };
  }

  const { title, detail, date, budget } = parsed.data;

  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO events (id, household_id, title, detail, event_date, budget, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        session.householdId,
        title,
        detail || "En casa",
        date,
        budget || 0,
      ]
    );
    revalidatePath("/eventos");
    revalidatePath("/");
    return { success: true, id };
  } catch (err: any) {
    return { success: false, error: "No se pudo registrar el evento." };
  }
}

export async function updateEventAction(data: {
  id: string;
  title: string;
  detail?: string;
  date: string;
  budget?: number;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const parsed = eventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos de evento inválidos." };
  }

  try {
    await pool.query(
      `UPDATE events 
       SET title = ?, detail = ?, event_date = ?, budget = ? 
       WHERE id = ? AND household_id = ?`,
      [data.title.trim(), data.detail || null, data.date, data.budget || 0, data.id, session.householdId]
    );
    revalidatePath("/eventos");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar el evento." };
  }
}

export async function deleteEventAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    await pool.query("DELETE FROM events WHERE id = ? AND household_id = ?", [id, session.householdId]);
    revalidatePath("/eventos");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo eliminar el evento." };
  }
}

// =============================================================
// CONFIGURACIÓN DEL HOGAR Y PERFIL
// =============================================================

export async function updateHouseholdNameAction(name: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (session.role !== "admin") {
    return { success: false, error: "Solo el administrador puede cambiar el nombre del hogar." };
  }

  if (!name || name.trim().length < 2) {
    return { success: false, error: "El nombre del hogar debe tener al menos 2 caracteres." };
  }

  try {
    await pool.query("UPDATE households SET name = ? WHERE id = ?", [name.trim(), session.householdId]);
    
    await recordAuditLog({
      householdId: session.householdId,
      userId: session.id,
      action: "HOUSEHOLD_NAME_UPDATE",
      entityType: "HOUSEHOLD",
      entityId: session.householdId,
      details: { newName: name.trim() },
    });

    revalidatePath("/configuracion");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar el nombre del hogar." };
  }
}

export async function updateUserProfileAction(fullName: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: "El nombre completo debe tener al menos 2 caracteres." };
  }

  try {
    await pool.query("UPDATE users SET full_name = ? WHERE id = ?", [fullName.trim(), session.id]);
    revalidatePath("/configuracion");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "No se pudo actualizar tu perfil." };
  }
}

export async function addHouseholdMemberAction(data: {
  name: string;
  email: string;
  role: "admin" | "member";
  password?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (session.role !== "admin") {
    return { success: false, error: "Solo los administradores pueden agregar miembros al hogar." };
  }

  const normalizedEmail = (data.email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Escribe un correo electrónico válido." };
  }

  const role = data.role === "admin" ? "admin" : "member";
  const name = (data.name || "").trim();
  if (name.length < 2) {
    return { success: false, error: "El nombre debe tener al menos 2 caracteres." };
  }

  try {
    // 1. Verificar si el usuario ya existe registrado en la plataforma
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      "SELECT id, full_name FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    let targetUserId: string;

    if (existingUsers.length > 0) {
      targetUserId = existingUsers[0].id;

      // Verificar si ya forma parte de este hogar
      const [existingMembers] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM household_members WHERE household_id = ? AND user_id = ? LIMIT 1",
        [session.householdId, targetUserId]
      );

      if (existingMembers.length > 0) {
        return { success: false, error: "Este usuario ya forma parte de tu hogar." };
      }

      // Vincular al usuario existente al hogar actual
      const memberId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, ?, NOW())",
        [memberId, session.householdId, targetUserId, role]
      );
    } else {
      // 2. Si el usuario no existe, crearlo con credenciales provisionales
      const pass = data.password?.trim() || "HomeCalm2026*";
      if (pass.length < 8) {
        return { success: false, error: "La contraseña inicial debe tener al menos 8 caracteres." };
      }

      const passwordHash = await bcrypt.hash(pass, 10);
      targetUserId = crypto.randomUUID();
      const memberId = crypto.randomUUID();

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          "INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, ?, ?, NOW())",
          [targetUserId, normalizedEmail, name, passwordHash]
        );
        await connection.query(
          "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, ?, NOW())",
          [memberId, session.householdId, targetUserId, role]
        );
        await connection.commit();
      } catch (e) {
        await connection.rollback();
        throw e;
      } finally {
        connection.release();
      }
    }

    await recordAuditLog({
      householdId: session.householdId,
      userId: session.id,
      action: "HOUSEHOLD_MEMBER_ADD",
      entityType: "USER",
      entityId: targetUserId,
      details: { email: normalizedEmail, role, name },
    });

    revalidatePath("/configuracion");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[HOMECALM] Error al agregar miembro:", err);
    return { success: false, error: "Ocurrió un error al vincular al miembro al hogar." };
  }
}

export async function removeHouseholdMemberAction(targetUserId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  if (session.role !== "admin") {
    return { success: false, error: "Solo los administradores pueden remover miembros del hogar." };
  }

  if (session.id === targetUserId) {
    return { success: false, error: "No puedes eliminarte a ti mismo del hogar." };
  }

  try {
    const [result]: any = await pool.query(
      "DELETE FROM household_members WHERE household_id = ? AND user_id = ?",
      [session.householdId, targetUserId]
    );

    if (result.affectedRows === 0) {
      return { success: false, error: "El usuario no pertenece a este hogar." };
    }

    await recordAuditLog({
      householdId: session.householdId,
      userId: session.id,
      action: "HOUSEHOLD_MEMBER_REMOVE",
      entityType: "USER",
      entityId: targetUserId,
      details: { targetUserId },
    });

    revalidatePath("/configuracion");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[HOMECALM] Error al remover miembro:", err);
    return { success: false, error: "No se pudo remover al miembro del hogar." };
  }
}
