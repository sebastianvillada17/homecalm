import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { formatCOP } from "@/lib/utils";

export async function buildHouseholdContext(householdId: string): Promise<string> {
  try {
    // 1. Información del hogar
    const [hhRows] = await pool.query<RowDataPacket[]>(
      "SELECT name, currency FROM households WHERE id = ?",
      [householdId]
    );
    const householdName = hhRows[0]?.name || "Hogar";
    const currency = hhRows[0]?.currency || "COP";

    // 2. Cuentas y saldo total
    const [accRows] = await pool.query<RowDataPacket[]>(
      "SELECT name, type, balance FROM accounts WHERE household_id = ?",
      [householdId]
    );
    const totalBalance = accRows.reduce((sum, a) => sum + Number(a.balance), 0);
    const accountsSummary = accRows.map((a) => `- ${a.name} (${a.type}): ${formatCOP(Number(a.balance))}`).join("\n");

    // 3. Presupuestos del mes
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [budgetRows] = await pool.query<RowDataPacket[]>(
      `SELECT b.category, b.monthly_limit,
              COALESCE((
                SELECT SUM(t.amount) 
                FROM transactions t 
                WHERE t.household_id = b.household_id 
                  AND t.category = b.category 
                  AND t.type = 'expense'
                  AND MONTH(t.date) = b.month 
                  AND YEAR(t.date) = b.year
              ), 0) as spent
       FROM budgets b
       WHERE b.household_id = ? AND b.month = ? AND b.year = ?`,
      [householdId, currentMonth, currentYear]
    );

    const budgetsSummary = budgetRows.map((b) => {
      const limit = Number(b.monthly_limit);
      const spent = Number(b.spent);
      const remaining = limit - spent;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return `- ${b.category}: Límite ${formatCOP(limit)}, Gastado ${formatCOP(spent)} (${pct}%), Restante ${formatCOP(remaining)}`;
    }).join("\n");

    // 4. Deudas pendientes
    const [debtRows] = await pool.query<RowDataPacket[]>(
      "SELECT name, institution, balance, due_date FROM debts WHERE household_id = ? AND balance > 0",
      [householdId]
    );
    const debtsSummary = debtRows.map((d) => 
      `- ${d.name} (${d.institution || "Sin entidad"}): Saldo pendiente ${formatCOP(Number(d.balance))}, Vence: ${d.due_date || "Sin fecha"}`
    ).join("\n");

    // 5. Metas de ahorro
    const [goalRows] = await pool.query<RowDataPacket[]>(
      "SELECT name, target_amount, current_amount, target_date FROM savings_goals WHERE household_id = ?",
      [householdId]
    );
    const goalsSummary = goalRows.map((g) => {
      const target = Number(g.target_amount);
      const curr = Number(g.current_amount);
      const pct = target > 0 ? Math.round((curr / target) * 100) : 0;
      return `- ${g.name}: Ahorrado ${formatCOP(curr)} de ${formatCOP(target)} (${pct}%), Meta: ${g.target_date || "Sin fecha"}`;
    }).join("\n");

    // 6. Tareas pendientes
    const [taskRows] = await pool.query<RowDataPacket[]>(
      "SELECT title, detail, due_date, priority FROM tasks WHERE household_id = ? AND done = FALSE ORDER BY due_date ASC LIMIT 10",
      [householdId]
    );
    const tasksSummary = taskRows.map((t) => 
      `- [${t.priority || "normal"}] ${t.title}${t.due_date ? ` (Vence: ${t.due_date})` : ""}${t.detail ? ` - ${t.detail}` : ""}`
    ).join("\n");

    // 7. Lista de compras activa
    const [shopRows] = await pool.query<RowDataPacket[]>(
      `SELECT si.name, si.quantity, si.unit
       FROM shopping_items si
       JOIN shopping_lists sl ON si.list_id = sl.id
       WHERE sl.household_id = ? AND sl.is_active = TRUE AND si.purchased = FALSE
       LIMIT 15`,
      [householdId]
    );
    const shopSummary = shopRows.map((s) => `- ${s.name} (${s.quantity} ${s.unit})`).join("\n");

    // 8. Menú semanal actual
    const [mealRows] = await pool.query<RowDataPacket[]>(
      `SELECT mpi.day_of_week, mpi.meal_type, mpi.dish_name, mpi.portions
       FROM meal_plan_items mpi
       JOIN weekly_meal_plans wp ON mpi.plan_id = wp.id
       WHERE wp.household_id = ? AND wp.week_start_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
       ORDER BY FIELD(mpi.day_of_week, 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM')
       LIMIT 15`,
      [householdId]
    );
    const mealsSummary = mealRows.map((m) => `- ${m.day_of_week} (${m.meal_type}): ${m.dish_name} [${m.portions} porciones]`).join("\n");

    // 9. Próximos eventos
    const [eventRows] = await pool.query<RowDataPacket[]>(
      "SELECT title, detail, event_date, budget FROM events WHERE household_id = ? AND event_date >= CURRENT_DATE() ORDER BY event_date ASC LIMIT 5",
      [householdId]
    );
    const eventsSummary = eventRows.map((e) => `- ${e.title} el ${e.event_date}${e.budget ? ` (Presupuesto: ${formatCOP(Number(e.budget))})` : ""}`).join("\n");

    return `
INFORMACIÓN REAL Y ACTUALIZADA DEL HOGAR ("${householdName}"):
Moneda: ${currency}
Fecha de hoy: ${now.toISOString().slice(0, 10)}

1. FINANZAS:
Saldo Total Disponible: ${formatCOP(totalBalance)}
Cuentas:
${accountsSummary || "- No hay cuentas registradas aún."}

2. PRESUPUESTOS (Mes ${currentMonth}/${currentYear}):
${budgetsSummary || "- No hay presupuestos definidos para este mes."}

3. DEUDAS:
${debtsSummary || "- No hay deudas pendientes registradas."}

4. METAS DE AHORRO:
${goalsSummary || "- No hay metas de ahorro registradas."}

5. TAREAS PENDIENTES:
${tasksSummary || "- No hay tareas pendientes."}

6. LISTA DE COMPRAS PENDIENTE:
${shopSummary || "- No hay productos pendientes en la lista de compras."}

7. MENÚ SEMANAL PROGRAMADO:
${mealsSummary || "- No hay menú planificado para esta semana."}

8. PRÓXIMOS EVENTOS:
${eventsSummary || "- No hay eventos futuros agendados."}
`.trim();
  } catch (err: any) {
    console.error("[HOMECALM] Error construyendo contexto del hogar:", err.message);
    return "No se pudo consultar el contexto actualizado del hogar.";
  }
}

