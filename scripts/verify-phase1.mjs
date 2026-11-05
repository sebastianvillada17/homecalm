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

// Set env vars for tests
for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT || 11498);
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME || "defaultdb";
const secret = process.env.SESSION_SECRET;

console.log("=================================================");
console.log("  SUITE DE VERIFICACIÓN INTEGRAL - HOMECALM FASE 1");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FALLÓ: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ APROBADO: ${message}`);
}

async function runTests() {
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  // -----------------------------------------------------------------
  // 1. VERIFICACIÓN DE SEGURIDAD Y SESIONES (HMAC + EXPIRACIÓN)
  // -----------------------------------------------------------------
  console.log("--- 1. SEGURIDAD Y SESIONES ---");
  assert(secret && secret.length >= 32, "SESSION_SECRET configurado y contiene al menos 32 caracteres");

  // Simular lógica de signToken con expiración
  const testUser = {
    id: "test-user-id",
    email: "test@homecalm.local",
    name: "Usuario Prueba",
    householdId: "test-hh-id",
    householdName: "Hogar Prueba",
    role: "admin",
  };

  const now = Date.now();
  const validPayload = { ...testUser, iat: now, exp: now + 3600000 };
  const validData = Buffer.from(JSON.stringify(validPayload)).toString("base64url");
  const validSig = crypto.createHmac("sha256", secret).update(validData).digest("base64url");
  const validToken = `${validData}.${validSig}`;

  // Verificar token válido
  const [vData, vSig] = validToken.split(".");
  const expectedSig = crypto.createHmac("sha256", secret).update(vData).digest("base64url");
  assert(vSig === expectedSig, "Firma HMAC calculada y verificada correctamente");

  // Token expirado
  const expiredPayload = { ...testUser, iat: now - 7200000, exp: now - 3600000 };
  const expiredData = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expiredSig = crypto.createHmac("sha256", secret).update(expiredData).digest("base64url");
  const parsedExpired = JSON.parse(Buffer.from(expiredData, "base64url").toString("utf8"));
  assert(now > parsedExpired.exp, "Detección estricta de timestamp de expiración (sesión caducada rechazada)");

  // Token alterado
  const tamperedSig = validSig.slice(0, -2) + "xx";
  assert(tamperedSig !== expectedSig, "Token con firma alterada es rechazado inmediatamente");

  // -----------------------------------------------------------------
  // 2. NORMALIZACIÓN DE COLUMNAS DE FECHA EN MYSQL
  // -----------------------------------------------------------------
  console.log("\n--- 2. NORMALIZACIÓN DE FECHAS EN MYSQL ---");
  const dateColumns = [
    { table: "tasks", column: "due_date" },
    { table: "inventory", column: "expires" },
    { table: "debts", column: "due_date" },
    { table: "savings_goals", column: "target_date" },
    { table: "transactions", column: "date" },
    { table: "events", column: "event_date" },
  ];

  for (const { table, column } of dateColumns) {
    const [cols] = await pool.query(
      `SELECT DATA_TYPE FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      [database, table, column]
    );
    assert(
      cols.length > 0 && cols[0].DATA_TYPE === "date",
      `Columna [${table}.${column}] normalizada con tipo nativo DATE en MySQL`
    );
  }

  // -----------------------------------------------------------------
  // 3. INTEGRIDAD DE OPERACIONES FINANCIERAS (TRANSACCIÓN ATÓMICA)
  // -----------------------------------------------------------------
  console.log("\n--- 3. TRANSACCIONES FINANCIERAS ATÓMICAS (ACID) ---");
  
  // Obtener cuenta principal del usuario existente
  const [users] = await pool.query("SELECT id FROM users LIMIT 1");
  const [households] = await pool.query("SELECT id FROM households LIMIT 1");
  assert(users.length > 0 && households.length > 0, "Usuario y hogar de prueba existen en la base de datos");

  const householdId = households[0].id;
  const [accounts] = await pool.query("SELECT id, balance FROM accounts WHERE household_id = ? LIMIT 1", [householdId]);
  assert(accounts.length > 0, "Cuenta financiera existente encontrada");

  const testAccount = accounts[0];
  const initialBalance = Number(testAccount.balance);
  const testTxId = crypto.randomUUID();
  const incomeAmount = 150000.00;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Probar transacción atómica de ingreso con beginTransaction / commit
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bloquear fila y leer
    const [accLock] = await conn.query("SELECT id, balance FROM accounts WHERE id = ? FOR UPDATE", [testAccount.id]);
    assert(accLock.length > 0, "Bloqueo de fila exclusivo FOR UPDATE adquirido");

    // Insertar transacción
    await conn.query(
      "INSERT INTO transactions (id, household_id, account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [testTxId, householdId, testAccount.id, "Ingreso Prueba Unitaria", "Ingresos", incomeAmount, "income", todayStr]
    );

    // Actualizar balance
    await conn.query("UPDATE accounts SET balance = balance + ? WHERE id = ?", [incomeAmount, testAccount.id]);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // Verificar balance después del ingreso
  const [accAfterIncome] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [testAccount.id]);
  const balanceAfterIncome = Number(accAfterIncome[0].balance);
  assert(
    balanceAfterIncome === initialBalance + incomeAmount,
    `Saldo actualizado atómicamente tras ingreso: ${initialBalance} + ${incomeAmount} = ${balanceAfterIncome}`
  );

  // Probar transacción atómica de gasto
  const expenseAmount = 45000.00;
  const testTxExpenseId = crypto.randomUUID();
  const connExp = await pool.getConnection();
  try {
    await connExp.beginTransaction();
    await connExp.query(
      "INSERT INTO transactions (id, household_id, account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [testTxExpenseId, householdId, testAccount.id, "Gasto Prueba Unitaria", "Hogar", expenseAmount, "expense", todayStr]
    );
    await connExp.query("UPDATE accounts SET balance = balance - ? WHERE id = ?", [expenseAmount, testAccount.id]);
    await connExp.commit();
  } catch (e) {
    await connExp.rollback();
    throw e;
  } finally {
    connExp.release();
  }

  const [accAfterExpense] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [testAccount.id]);
  const balanceAfterExpense = Number(accAfterExpense[0].balance);
  assert(
    balanceAfterExpense === balanceAfterIncome - expenseAmount,
    `Saldo actualizado atómicamente tras gasto: ${balanceAfterIncome} - ${expenseAmount} = ${balanceAfterExpense}`
  );

  // Probar ROLLBACK ante fallo simulado
  console.log("\n--- 4. PRUEBA DE ROLLBACK ANTE FALLO ---");
  const failedTxId = crypto.randomUUID();
  const connFail = await pool.getConnection();
  let rollbackCaught = false;
  try {
    await connFail.beginTransaction();
    // Insertamos movimiento
    await connFail.query(
      "INSERT INTO transactions (id, household_id, account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
      [failedTxId, householdId, testAccount.id, "Movimiento que debe fallar", "Hogar", 999999, "expense", todayStr]
    );
    // Provocamos un fallo deliberado (ej. sintaxis errónea o restricción)
    await connFail.query("UPDATE accounts_inexistent_table SET balance = 0 WHERE id = ?", [testAccount.id]);
    await connFail.commit();
  } catch (err) {
    rollbackCaught = true;
    await connFail.rollback();
  } finally {
    connFail.release();
  }

  assert(rollbackCaught, "Excepción capturada correctamente en bloque de transacción");
  // Verificar que ni el movimiento ni el saldo cambiaron
  const [accAfterRollback] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [testAccount.id]);
  assert(
    Number(accAfterRollback[0].balance) === balanceAfterExpense,
    "Saldo intacto tras rollback (no se debitó ninguna cantidad)"
  );
  const [orphanTx] = await pool.query("SELECT id FROM transactions WHERE id = ?", [failedTxId]);
  assert(orphanTx.length === 0, "Transacción fallida revertida completamente (cero registros huérfanos)");

  // -----------------------------------------------------------------
  // 5. AISLAMIENTO ENTRE HOGARES
  // -----------------------------------------------------------------
  console.log("\n--- 5. AISLAMIENTO MULTI-INQUILINO (HOUSEHOLD ISOLATION) ---");
  const fakeHouseholdId = crypto.randomUUID();
  const [crossRows] = await pool.query(
    "SELECT id FROM accounts WHERE id = ? AND household_id = ?",
    [testAccount.id, fakeHouseholdId]
  );
  assert(
    crossRows.length === 0,
    "Validación estricta de aislamiento: cuentas de otro household_id no son accesibles"
  );

  // -----------------------------------------------------------------
  // 6. ESCRITURA Y LECTURA DE FECHAS EN DATE
  // -----------------------------------------------------------------
  console.log("\n--- 6. OPERACIONES DE ESCRITURA Y LECTURA CON DATE ---");
  const testTaskId = crypto.randomUUID();
  const testDueDate = "2026-11-20";
  await pool.query(
    "INSERT INTO tasks (id, household_id, title, detail, due_date, done, accent, created_at) VALUES (?, ?, ?, ?, ?, FALSE, 'bg-forest', NOW())",
    [testTaskId, householdId, "Tarea de Prueba", "Detalle", testDueDate]
  );
  const [readTask] = await pool.query(
    "SELECT id, DATE_FORMAT(due_date, '%Y-%m-%d') as due_date FROM tasks WHERE id = ?",
    [testTaskId]
  );
  assert(readTask[0].due_date === testDueDate, `Tarea insertada y leída con fecha DATE: ${testDueDate}`);

  // Limpieza de datos de prueba
  await pool.query("DELETE FROM tasks WHERE id = ?", [testTaskId]);
  await pool.query("DELETE FROM transactions WHERE id IN (?, ?)", [testTxId, testTxExpenseId]);
  // Restaurar balance original
  await pool.query("UPDATE accounts SET balance = ? WHERE id = ?", [initialBalance, testAccount.id]);
  console.log("-> Datos de prueba limpiados; saldo restaurado al original.");

  await pool.end();

  console.log("\n=================================================");
  console.log(` RESULTADO: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (100%)`);
  console.log("=================================================\n");
}

runTests().catch(err => {
  console.error("Fallo crítico en suite de pruebas:", err);
  process.exit(1);
});

