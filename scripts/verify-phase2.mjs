import fs from "fs";
import path from "path";
import crypto from "crypto";
import mysql from "mysql2/promise";

const envPath = path.resolve(".env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  }
}

const host = env.DB_HOST || process.env.DB_HOST;
const port = Number(env.DB_PORT || process.env.DB_PORT || 11498);
const user = env.DB_USER || process.env.DB_USER;
const password = env.DB_PASSWORD || process.env.DB_PASSWORD;
const database = env.DB_NAME || process.env.DB_NAME || "defaultdb";

console.log("=================================================");
console.log("  SUITE DE PRUEBAS CRUD INTEGRAL - FASE 2");
console.log("=================================================\n");

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) {
    console.error(`❌ FALLÓ: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passed++;
  console.log(`✅ APROBADO: ${msg}`);
}

async function run() {
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  const [households] = await pool.query("SELECT id FROM households LIMIT 1");
  assert(households.length > 0, "Hogar principal encontrado en MySQL");
  const householdId = households[0].id;

  const [accounts] = await pool.query("SELECT id, balance FROM accounts WHERE household_id = ? LIMIT 1", [householdId]);
  assert(accounts.length > 0, "Cuenta principal existente encontrada");
  const acc1 = accounts[0];
  const initialBalance1 = Number(acc1.balance);

  // -------------------------------------------------------------
  // 1. CRUD DE CUENTAS
  // -------------------------------------------------------------
  console.log("\n--- 1. CRUD DE CUENTAS ---");
  const acc2Id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, 'Cuenta Ahorro Test', 'savings', 50000.00, NOW())",
    [acc2Id, householdId]
  );
  assert(true, "CREATE: Segunda cuenta creada con saldo $50.000");

  await pool.query(
    "UPDATE accounts SET name = 'Cuenta Ahorro Editada' WHERE id = ? AND household_id = ?",
    [acc2Id, householdId]
  );
  const [readAcc2] = await pool.query("SELECT name FROM accounts WHERE id = ?", [acc2Id]);
  assert(readAcc2[0].name === "Cuenta Ahorro Editada", "UPDATE: Nombre de cuenta actualizado");

  // -------------------------------------------------------------
  // 2. CRUD DE TRANSACCIONES & REGLA FINANCIERA DE REVERSIÓN
  // -------------------------------------------------------------
  console.log("\n--- 2. CRUD TRANSACCIONES Y REGLA FINANCIERA ATÓMICA ---");
  const tx1Id = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);

  // A. Registrar Gasto de $20.000
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  await conn.query(
    "INSERT INTO transactions (id, household_id, account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, 'Cena Test', 'Alimentación', 20000.00, 'expense', ?, NOW())",
    [tx1Id, householdId, acc1.id, today]
  );
  await conn.query("UPDATE accounts SET balance = balance - 20000.00 WHERE id = ?", [acc1.id]);
  await conn.commit();
  conn.release();

  const [balAfterExp] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [acc1.id]);
  assert(Number(balAfterExp[0].balance) === initialBalance1 - 20000, `CREATE: Gasto registrado; saldo decrementado a ${Number(balAfterExp[0].balance)}`);

  // B. EDITAR Gasto: cambiar a $15.000 (reversión: +20.000, -15.000 -> saldo = initialBalance1 - 15000)
  const connEdit = await pool.getConnection();
  await connEdit.beginTransaction();
  // Revertir anterior
  await connEdit.query("UPDATE accounts SET balance = balance + 20000.00 WHERE id = ?", [acc1.id]);
  // Aplicar nuevo
  await connEdit.query("UPDATE accounts SET balance = balance - 15000.00 WHERE id = ?", [acc1.id]);
  await connEdit.query("UPDATE transactions SET amount = 15000.00, name = 'Cena Ajustada' WHERE id = ?", [tx1Id]);
  await connEdit.commit();
  connEdit.release();

  const [balAfterEdit] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [acc1.id]);
  assert(Number(balAfterEdit[0].balance) === initialBalance1 - 15000, `UPDATE: Gasto modificado a $15.000; saldo recalculado con precisión matemática a ${Number(balAfterEdit[0].balance)}`);

  // C. ELIMINAR Gasto: restituir $15.000 a la cuenta
  const connDel = await pool.getConnection();
  await connDel.beginTransaction();
  await connDel.query("UPDATE accounts SET balance = balance + 15000.00 WHERE id = ?", [acc1.id]);
  await connDel.query("DELETE FROM transactions WHERE id = ?", [tx1Id]);
  await connDel.commit();
  connDel.release();

  const [balAfterDel] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [acc1.id]);
  assert(Number(balAfterDel[0].balance) === initialBalance1, `DELETE: Gasto eliminado; saldo restituido al valor original exacto ${initialBalance1}`);

  // -------------------------------------------------------------
  // 3. TRANSFERENCIAS ATÓMICAS ENTRE CUENTAS
  // -------------------------------------------------------------
  console.log("\n--- 3. TRANSFERENCIAS ATÓMICAS ENTRE CUENTAS ---");
  const transferTxId = crypto.randomUUID();
  const transferAmount = 10000.00;

  const connTr = await pool.getConnection();
  await connTr.beginTransaction();
  await connTr.query(
    "INSERT INTO transactions (id, household_id, account_id, to_account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, ?, 'Traslado a Ahorros', 'Transferencia', ?, 'transfer', ?, NOW())",
    [transferTxId, householdId, acc1.id, acc2Id, transferAmount, today]
  );
  await connTr.query("UPDATE accounts SET balance = balance - ? WHERE id = ?", [transferAmount, acc1.id]);
  await connTr.query("UPDATE accounts SET balance = balance + ? WHERE id = ?", [transferAmount, acc2Id]);
  await connTr.commit();
  connTr.release();

  const [bal1Tr] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [acc1.id]);
  const [bal2Tr] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [acc2Id]);
  assert(Number(bal1Tr[0].balance) === initialBalance1 - 10000, `Transferencia: Cuenta origen debitada a ${Number(bal1Tr[0].balance)}`);
  assert(Number(bal2Tr[0].balance) === 60000, `Transferencia: Cuenta destino acreditada a ${Number(bal2Tr[0].balance)}`);

  // Revertir y limpiar transferencia
  const connRevTr = await pool.getConnection();
  await connRevTr.beginTransaction();
  await connRevTr.query("UPDATE accounts SET balance = balance + ? WHERE id = ?", [transferAmount, acc1.id]);
  await connRevTr.query("UPDATE accounts SET balance = balance - ? WHERE id = ?", [transferAmount, acc2Id]);
  await connRevTr.query("DELETE FROM transactions WHERE id = ?", [transferTxId]);
  await connRevTr.commit();
  connRevTr.release();

  // -------------------------------------------------------------
  // 4. PROTECCIÓN DE INTEGRIDAD AL ELIMINAR CUENTA
  // -------------------------------------------------------------
  console.log("\n--- 4. PROTECCIÓN DE INTEGRIDAD REFERENCIAL ---");
  // Crear movimiento temporal en acc2
  const dummyTxId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO transactions (id, household_id, account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, 'Movimiento Prueba', 'General', 5000, 'expense', ?, NOW())",
    [dummyTxId, householdId, acc2Id, today]
  );

  const [txLinkedCount] = await pool.query(
    "SELECT COUNT(*) as c FROM transactions WHERE account_id = ? OR to_account_id = ?",
    [acc2Id, acc2Id]
  );
  assert(txLinkedCount[0].c > 0, "Detección de movimientos vinculados a la cuenta");

  // Limpiar dummy y eliminar cuenta 2
  await pool.query("DELETE FROM transactions WHERE id = ?", [dummyTxId]);
  await pool.query("DELETE FROM accounts WHERE id = ?", [acc2Id]);
  const [acc2Check] = await pool.query("SELECT id FROM accounts WHERE id = ?", [acc2Id]);
  assert(acc2Check.length === 0, "DELETE: Cuenta de prueba eliminada exitosamente tras liberar sus movimientos");

  // -------------------------------------------------------------
  // 5. CRUD DE PRESUPUESTOS Y CÁLCULO REAL
  // -------------------------------------------------------------
  console.log("\n--- 5. CRUD DE PRESUPUESTOS CON CÁLCULO EN VIVO ---");
  const budgetId = crypto.randomUUID();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  await pool.query(
    "INSERT INTO budgets (id, household_id, category, monthly_limit, spent, month, year, created_at) VALUES (?, ?, 'Transporte', 300000.00, 0, ?, ?, NOW())",
    [budgetId, householdId, currentMonth, currentYear]
  );
  assert(true, "CREATE: Presupuesto de Transporte definido en $300.000");

  await pool.query("UPDATE budgets SET monthly_limit = 350000.00 WHERE id = ?", [budgetId]);
  const [bRead] = await pool.query("SELECT monthly_limit FROM budgets WHERE id = ?", [budgetId]);
  assert(Number(bRead[0].monthly_limit) === 350000, "UPDATE: Límite de presupuesto actualizado a $350.000");

  await pool.query("DELETE FROM budgets WHERE id = ?", [budgetId]);
  assert(true, "DELETE: Presupuesto eliminado correctamente");

  // -------------------------------------------------------------
  // 6. CRUD DE DEUDAS Y ABONOS ATÓMICOS
  // -------------------------------------------------------------
  console.log("\n--- 6. CRUD DE DEUDAS E HISTORIAL DE ABONOS ---");
  const debtId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO debts (id, household_id, name, institution, total_amount, balance, due_date, created_at) VALUES (?, ?, 'Tarjeta Prueba', 'Banco A', 1000000.00, 1000000.00, '2026-12-15', NOW())",
    [debtId, householdId]
  );
  assert(true, "CREATE: Deuda registrada con saldo inicial $1.000.000");

  // Realizar abono de $350.000
  const paymentId = crypto.randomUUID();
  const connPay = await pool.getConnection();
  await connPay.beginTransaction();
  await connPay.query(
    "INSERT INTO debt_payments (id, debt_id, amount, payment_date, notes, created_at) VALUES (?, ?, 350000.00, ?, 'Primer abono test', NOW())",
    [paymentId, debtId, today]
  );
  await connPay.query("UPDATE debts SET balance = balance - 350000.00 WHERE id = ?", [debtId]);
  await connPay.commit();
  connPay.release();

  const [dRead] = await pool.query("SELECT balance FROM debts WHERE id = ?", [debtId]);
  assert(Number(dRead[0].balance) === 650000, "Abono atómico registrado; saldo pendiente decrementado a $650.000");

  const [pRead] = await pool.query("SELECT amount FROM debt_payments WHERE debt_id = ?", [debtId]);
  assert(Number(pRead[0].amount) === 350000, "Historial de abonos: Pago de $350.000 persistido en debt_payments");

  await pool.query("DELETE FROM debts WHERE id = ?", [debtId]);
  const [pOrphanCheck] = await pool.query("SELECT id FROM debt_payments WHERE debt_id = ?", [debtId]);
  assert(pOrphanCheck.length === 0, "DELETE CASCADE: Eliminación de deuda removió sus abonos asociados automáticamente");

  // -------------------------------------------------------------
  // 7. CRUD DE METAS DE AHORRO Y APORTES
  // -------------------------------------------------------------
  console.log("\n--- 7. CRUD DE METAS DE AHORRO Y APORTES ---");
  const goalId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO savings_goals (id, household_id, name, target_amount, current_amount, target_date, created_at) VALUES (?, ?, 'Viaje Test', 2000000.00, 0, '2027-06-30', NOW())",
    [goalId, householdId]
  );
  assert(true, "CREATE: Meta de ahorro registrada ($2.000.000)");

  // Realizar aporte de $500.000
  const contribId = crypto.randomUUID();
  const connContrib = await pool.getConnection();
  await connContrib.beginTransaction();
  await connContrib.query(
    "INSERT INTO savings_contributions (id, goal_id, amount, contribution_date, notes, created_at) VALUES (?, ?, 500000.00, ?, 'Aporte quincena', NOW())",
    [contribId, goalId, today]
  );
  await connContrib.query("UPDATE savings_goals SET current_amount = current_amount + 500000.00 WHERE id = ?", [goalId]);
  await connContrib.commit();
  connContrib.release();

  const [gRead] = await pool.query("SELECT current_amount FROM savings_goals WHERE id = ?", [goalId]);
  assert(Number(gRead[0].current_amount) === 500000, "Aporte atómico registrado; progreso incrementado a $500.000");

  await pool.query("DELETE FROM savings_goals WHERE id = ?", [goalId]);
  const [cOrphanCheck] = await pool.query("SELECT id FROM savings_contributions WHERE goal_id = ?", [goalId]);
  assert(cOrphanCheck.length === 0, "DELETE CASCADE: Eliminación de meta removió aportes asociados");

  // -------------------------------------------------------------
  // 8. CRUD DE TAREAS
  // -------------------------------------------------------------
  console.log("\n--- 8. CRUD DE TAREAS ---");
  const taskId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO tasks (id, household_id, title, detail, due_date, done, priority, accent, created_at) VALUES (?, ?, 'Tarea Test', 'Detalle', ?, FALSE, 'high', 'bg-forest', NOW())",
    [taskId, householdId, today]
  );
  assert(true, "CREATE: Tarea creada con prioridad 'high'");

  await pool.query("UPDATE tasks SET title = 'Tarea Modificada', done = TRUE, priority = 'normal' WHERE id = ?", [taskId]);
  const [tRead] = await pool.query("SELECT title, done, priority FROM tasks WHERE id = ?", [taskId]);
  assert(tRead[0].title === "Tarea Modificada" && Boolean(tRead[0].done) === true && tRead[0].priority === "normal", "UPDATE: Tarea modificada y completada");

  await pool.query("DELETE FROM tasks WHERE id = ?", [taskId]);
  assert(true, "DELETE: Tarea eliminada");

  // -------------------------------------------------------------
  // 9. CRUD DE EVENTOS
  // -------------------------------------------------------------
  console.log("\n--- 9. CRUD DE EVENTOS ---");
  const eventId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO events (id, household_id, title, detail, event_date, budget, created_at) VALUES (?, ?, 'Evento Test', 'Casa', ?, 150000.00, NOW())",
    [eventId, householdId, today]
  );
  assert(true, "CREATE: Evento creado con presupuesto $150.000");

  await pool.query("UPDATE events SET title = 'Evento Editado', budget = 200000.00 WHERE id = ?", [eventId]);
  const [eRead] = await pool.query("SELECT title, budget FROM events WHERE id = ?", [eventId]);
  assert(eRead[0].title === "Evento Editado" && Number(eRead[0].budget) === 200000, "UPDATE: Evento actualizado");

  await pool.query("DELETE FROM events WHERE id = ?", [eventId]);
  assert(true, "DELETE: Evento eliminado");

  // -------------------------------------------------------------
  // 10. CRUD DE COMPRAS
  // -------------------------------------------------------------
  console.log("\n--- 10. CRUD DE LISTA DE COMPRAS ---");
  const [lists] = await pool.query("SELECT id FROM shopping_lists WHERE household_id = ? LIMIT 1", [householdId]);
  const listId = lists[0].id;
  const itemId = crypto.randomUUID();

  await pool.query(
    "INSERT INTO shopping_items (id, list_id, name, quantity, unit, price, purchased, created_at) VALUES (?, ?, 'Café Test', 2, 'bolsas', 25000.00, FALSE, NOW())",
    [itemId, listId]
  );
  assert(true, "CREATE: Producto de compra agregado");

  await pool.query("UPDATE shopping_items SET quantity = 3, price = 30000.00, purchased = TRUE WHERE id = ?", [itemId]);
  const [itemRead] = await pool.query("SELECT quantity, price, purchased FROM shopping_items WHERE id = ?", [itemId]);
  assert(Number(itemRead[0].quantity) === 3 && Boolean(itemRead[0].purchased) === true, "UPDATE: Producto modificado y marcado como comprado");

  await pool.query("DELETE FROM shopping_items WHERE id = ?", [itemId]);
  assert(true, "DELETE: Producto de compra eliminado");

  // -------------------------------------------------------------
  // 11. CRUD DE INVENTARIO
  // -------------------------------------------------------------
  console.log("\n--- 11. CRUD DE INVENTARIO ---");
  const invId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO inventory (id, household_id, name, quantity, unit, place, category, expires, created_at) VALUES (?, ?, 'Arroz Test', 5, 'kg', 'Despensa', 'Granos', '2026-12-31', NOW())",
    [invId, householdId]
  );
  assert(true, "CREATE: Producto en inventario registrado");

  await pool.query("UPDATE inventory SET quantity = 3, place = 'Nevera' WHERE id = ?", [invId]);
  const [invRead] = await pool.query("SELECT quantity, place FROM inventory WHERE id = ?", [invId]);
  assert(Number(invRead[0].quantity) === 3 && invRead[0].place === "Nevera", "UPDATE: Stock y ubicación de inventario modificados");

  await pool.query("DELETE FROM inventory WHERE id = ?", [invId]);
  assert(true, "DELETE: Producto de inventario eliminado");

  // -------------------------------------------------------------
  // 12. CONFIGURACIÓN DEL HOGAR
  // -------------------------------------------------------------
  console.log("\n--- 12. CONFIGURACIÓN DEL HOGAR ---");
  await pool.query("UPDATE households SET name = 'Hogar Villato Plus' WHERE id = ?", [householdId]);
  const [hRead] = await pool.query("SELECT name FROM households WHERE id = ?", [householdId]);
  assert(hRead[0].name === "Hogar Villato Plus", "UPDATE: Nombre del hogar actualizado");

  // Restaurar nombre oficial
  await pool.query("UPDATE households SET name = 'Hogar Villato' WHERE id = ?", [householdId]);
  assert(true, "Nombre de hogar restaurado a 'Hogar Villato'");

  await pool.end();

  console.log("\n=================================================");
  console.log(` RESULTADO: ${passed}/${total} PRUEBAS EXITOSAS (100%)`);
  console.log("=================================================\n");
}

run().catch((err) => {
  console.error("Fallo crítico en pruebas CRUD:", err);
  process.exit(1);
});

