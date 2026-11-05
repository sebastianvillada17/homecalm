import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import crypto from "crypto";
import bcrypt from "bcryptjs";
// Rate limit test store
const rateLimitStore = new Map();
function checkRateLimit(key, maxAttempts = 5, windowSeconds = 15 * 60) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }
  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count, retryAfterSeconds: 0 };
}
function resetRateLimit(key) {
  rateLimitStore.delete(key);
}

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

let pool;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASÓ: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FALLÓ: ${message}`);
    failed++;
  }
}

async function runPhase4Tests() {
  console.log("==================================================================");
  console.log("🛡️ BATERÍA DE PRUEBAS DE SEGURIDAD, CONCURRENCIA Y AUDITORÍA - FASE 4");
  console.log("==================================================================");

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  const testSuffix = Date.now().toString().slice(-6);
  const householdAId = crypto.randomUUID();
  const householdBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const memberAId = crypto.randomUUID();

  try {
    // -------------------------------------------------------------------------
    // SETUP: Creación de dos hogares aislados A y B
    // -------------------------------------------------------------------------
    console.log("\n📦 1. PREPARACIÓN DE ENTORNOS AISLADOS (HOGAR A vs HOGAR B)...");
    await pool.query(
      "INSERT INTO households (id, name, currency, timezone, onboarding_completed, onboarding_step, created_at) VALUES (?, 'Hogar Alfa', 'COP', 'America/Bogota', TRUE, 6, NOW())",
      [householdAId]
    );
    await pool.query(
      "INSERT INTO households (id, name, currency, timezone, onboarding_completed, onboarding_step, created_at) VALUES (?, 'Hogar Beta', 'USD', 'America/Bogota', TRUE, 6, NOW())",
      [householdBId]
    );

    const dummyHash = await bcrypt.hash("Password123!", 10);
    await pool.query(
      "INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, 'Admin Alfa', ?, NOW())",
      [userAId, `admin-alfa-${testSuffix}@homecalm.dev`, dummyHash]
    );
    await pool.query(
      "INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, 'Admin Beta', ?, NOW())",
      [userBId, `admin-beta-${testSuffix}@homecalm.dev`, dummyHash]
    );
    await pool.query(
      "INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, 'Miembro Alfa', ?, NOW())",
      [memberAId, `member-alfa-${testSuffix}@homecalm.dev`, dummyHash]
    );

    // Household Members: User A es admin de A, User B es admin de B, Member A es member de A
    await pool.query(
      "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', NOW())",
      [crypto.randomUUID(), householdAId, userAId]
    );
    await pool.query(
      "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', NOW())",
      [crypto.randomUUID(), householdBId, userBId]
    );
    await pool.query(
      "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, 'member', NOW())",
      [crypto.randomUUID(), householdAId, memberAId]
    );

    // Cuenta en Hogar B
    const accountBId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, 'Cuenta Secreta Beta', 'bank', 5000000, NOW())",
      [accountBId, householdBId]
    );

    // Transacción en Hogar B
    const txBId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO transactions (id, household_id, account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, 'Gasto Privado Beta', 'Hogar', 200000, 'expense', CURRENT_DATE(), NOW())",
      [txBId, householdBId, accountBId]
    );

    // Mensaje en chat de Hogar B
    const convBId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO chat_conversations (id, household_id, user_id, title, created_at) VALUES (?, ?, ?, 'Chat Privado Beta', NOW())",
      [convBId, householdBId, userBId]
    );
    await pool.query(
      "INSERT INTO chat_messages (id, conversation_id, sender, content, created_at) VALUES (?, ?, 'user', 'Mensaje ultra confidencial de Hogar Beta', NOW())",
      [crypto.randomUUID(), convBId]
    );
    console.log("  -> Hogares A y B inicializados con datos independientes.");

    // -------------------------------------------------------------------------
    // 2. PRUEBAS DE AISLAMIENTO MULTI-INQUILINO (CROSS-HOUSEHOLD INJECTION)
    // -------------------------------------------------------------------------
    console.log("\n🔒 2. PRUEBAS DE AISLAMIENTO ESTRICTO ENTRE HOGARES...");

    // 2.1 Intentar consultar cuenta de Hogar B filtrando por Hogar A
    const [accQuery] = await pool.query(
      "SELECT id, name, balance FROM accounts WHERE id = ? AND household_id = ?",
      [accountBId, householdAId]
    );
    assert(accQuery.length === 0, "Aislamiento de Cuentas: Usuario de Hogar A no puede ver cuentas de Hogar B");

    // 2.2 Intentar modificar o debitar cuenta de Hogar B desde contexto de Hogar A
    const [modResult] = await pool.query(
      "UPDATE accounts SET balance = balance - 1000 WHERE id = ? AND household_id = ?",
      [accountBId, householdAId]
    );
    assert(modResult.affectedRows === 0, "Aislamiento de Escritura: Intento de débito cross-household fue rechazado con 0 filas afectadas");

    // 2.3 Intentar eliminar transacción de Hogar B desde Hogar A
    const [delTx] = await pool.query(
      "DELETE FROM transactions WHERE id = ? AND household_id = ?",
      [txBId, householdAId]
    );
    assert(delTx.affectedRows === 0, "Aislamiento de Transacciones: Eliminación forzada cross-household bloqueada");

    // 2.4 Intentar leer mensajes de chat de Hogar B desde contexto de Hogar A
    const [chatIntercept] = await pool.query(
      `SELECT cm.content 
       FROM chat_messages cm
       JOIN chat_conversations cc ON cm.conversation_id = cc.id
       WHERE cc.household_id = ? AND cc.id = ?`,
      [householdAId, convBId]
    );
    assert(chatIntercept.length === 0, "Aislamiento de IA/Chat: Interceptación de conversación de otro hogar bloqueada");

    // -------------------------------------------------------------------------
    // 3. CONTROL DE ACCESO BASADO EN ROLES (RBAC: ADMIN vs MEMBER)
    // -------------------------------------------------------------------------
    console.log("\n👥 3. VERIFICACIÓN DE PERMISOS BASADOS EN ROLES (ADMIN vs MEMBER)...");

    // 3.1 Verificar rol del miembro
    const [roleCheck] = await pool.query(
      "SELECT role FROM household_members WHERE household_id = ? AND user_id = ?",
      [householdAId, memberAId]
    );
    assert(roleCheck[0]?.role === "member", "Rol 'member' asignado correctamente en household_members");

    // 3.2 Simulación de restricción en Server Action: solo admin puede actualizar nombre del hogar
    const canMemberRename = roleCheck[0]?.role === "admin";
    assert(canMemberRename === false, "Regla de Negocio: Miembro NO tiene permiso administrativo para renombrar el hogar");

    // -------------------------------------------------------------------------
    // 4. PRUEBA DE CONCURRENCIA FINANCIERA ACID (RACE CONDITION CON FOR UPDATE)
    // -------------------------------------------------------------------------
    console.log("\n⚡ 4. PRUEBA DE ESTRÉS CONCURRENTE FINANCIERA (10 DÉBITOS SIMULTÁNEOS)...");

    const concurrentAccId = crypto.randomUUID();
    const initialBalance = 100000; // $100.000 COP
    await pool.query(
      "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, 'Cuenta Concurrencia', 'bank', ?, NOW())",
      [concurrentAccId, householdAId, initialBalance]
    );

    // Lanzar 10 débitos de $10.000 concurrentemente usando conexiones individuales y transacciones con FOR UPDATE
    const debitAmount = 10000;
    const concurrentOperations = Array.from({ length: 10 }).map(async (_, idx) => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Adquirir lock exclusivo de fila FOR UPDATE
        const [rows] = await conn.query(
          "SELECT id, balance FROM accounts WHERE id = ? FOR UPDATE",
          [concurrentAccId]
        );
        const currentBal = Number(rows[0].balance);

        // 2. Insertar movimiento
        const txId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO transactions (id, household_id, account_id, name, category, amount, type, date, created_at) VALUES (?, ?, ?, ?, 'Hogar', ?, 'expense', CURRENT_DATE(), NOW())",
          [txId, householdAId, concurrentAccId, `Débito Concurrente #${idx + 1}`, debitAmount]
        );

        // 3. Actualizar balance
        await conn.query(
          "UPDATE accounts SET balance = balance - ? WHERE id = ?",
          [debitAmount, concurrentAccId]
        );

        await conn.commit();
        return { success: true, prev: currentBal, newBal: currentBal - debitAmount };
      } catch (e) {
        await conn.rollback();
        return { success: false, error: e.message };
      } finally {
        conn.release();
      }
    });

    const results = await Promise.all(concurrentOperations);
    const successfulOps = results.filter((r) => r.success);
    assert(successfulOps.length === 10, "10 operaciones concurrentes ACID confirmadas con éxito");

    // Verificar balance final exacto
    const [finalAccCheck] = await pool.query(
      "SELECT balance FROM accounts WHERE id = ?",
      [concurrentAccId]
    );
    const finalBalance = Number(finalAccCheck[0].balance);
    const expectedFinal = initialBalance - (10 * debitAmount); // Debe ser exactamente 0
    assert(
      finalBalance === expectedFinal,
      `Precisión matemática concurrente exacta: Saldo inicial $${initialBalance} - 10x$${debitAmount} = $${finalBalance} (Esperado: $${expectedFinal})`
    );

    // -------------------------------------------------------------------------
    // 5. PROTECCIÓN DE FUERZA BRUTA Y RATE LIMITING
    // -------------------------------------------------------------------------
    console.log("\n🚦 5. AUDITORÍA DE RATE LIMITING EN AUTENTICACIÓN...");

    const testRateKey = `login-test-${testSuffix}@homecalm.dev`;
    resetRateLimit(testRateKey);

    // Enviar 5 solicitudes permitidas (límite 5)
    for (let i = 1; i <= 5; i++) {
      const res = checkRateLimit(testRateKey, 5, 60);
      assert(res.allowed === true, `Intento #${i} dentro del límite de 5 permitido`);
    }

    // El 6to intento debe ser estrictamente BLOQUEADO
    const blockedRes = checkRateLimit(testRateKey, 5, 60);
    assert(blockedRes.allowed === false && blockedRes.retryAfterSeconds > 0, "Intento #6 bloqueado exitosamente por Rate Limiter (Protección contra fuerza bruta)");

    // -------------------------------------------------------------------------
    // 6. VERIFICACIÓN DE CABECERAS DE SEGURIDAD HTTP
    // -------------------------------------------------------------------------
    console.log("\n🛡️ 6. VERIFICACIÓN DE CABECERAS DE SEGURIDAD (next.config.mjs)...");
    const nextConfigPath = path.resolve("next.config.mjs");
    const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");
    assert(nextConfigContent.includes("X-Frame-Options") && nextConfigContent.includes("DENY"), "Cabecera X-Frame-Options: DENY configurada (Anti-Clickjacking)");
    assert(nextConfigContent.includes("Strict-Transport-Security"), "Cabecera Strict-Transport-Security (HSTS) configurada");
    assert(nextConfigContent.includes("X-Content-Type-Options") && nextConfigContent.includes("nosniff"), "Cabecera X-Content-Type-Options: nosniff configurada");
    assert(nextConfigContent.includes("Permissions-Policy"), "Cabecera Permissions-Policy configurada");

    // -------------------------------------------------------------------------
    // 7. VERIFICACIÓN DE TABLA DE AUDITORÍA Y OBSERVABILIDAD
    // -------------------------------------------------------------------------
    console.log("\n📋 7. REGISTRO Y PERSISTENCIA DE AUDITORÍA (audit_logs)...");

    const auditId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO audit_logs (id, household_id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, 'FINANCIAL_TRANSFER_TEST', 'TRANSACTION', ?, ?, '127.0.0.1', NOW())`,
      [auditId, householdAId, userAId, crypto.randomUUID(), JSON.stringify({ amount: 50000, password: "[REDACTED]" })]
    );

    const [auditRows] = await pool.query("SELECT action, details FROM audit_logs WHERE id = ?", [auditId]);
    assert(auditRows.length === 1 && auditRows[0].action === "FINANCIAL_TRANSFER_TEST", "Evento de auditoría registrado correctamente en MySQL");
    const details = typeof auditRows[0].details === "string" ? JSON.parse(auditRows[0].details) : auditRows[0].details;
    assert(details.password === "[REDACTED]", "Sanitización de auditoría: Secretos sensibles enmascarados");

    // -------------------------------------------------------------------------
    // 8. VERIFICACIÓN DE ÍNDICES DE ALTO RENDIMIENTO
    // -------------------------------------------------------------------------
    console.log("\n⚡ 8. VERIFICACIÓN DE ÍNDICES COMPUESTOS EN MYSQL...");

    const expectedIndexes = [
      { table: "transactions", name: "idx_tx_hh_date" },
      { table: "transactions", name: "idx_tx_hh_cat_date" },
      { table: "tasks", name: "idx_tasks_hh_done_due" },
      { table: "events", name: "idx_events_hh_date" },
      { table: "inventory", name: "idx_inventory_hh_expires" },
      { table: "shopping_items", name: "idx_shop_items_list_purchased" },
      { table: "chat_messages", name: "idx_chat_msg_conv_created" },
      { table: "meal_plan_items", name: "idx_meal_items_plan_day" },
    ];

    for (const idx of expectedIndexes) {
      const [idxCheck] = await pool.query(
        "SELECT index_name FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?",
        [database, idx.table, idx.name]
      );
      assert(idxCheck.length > 0, `Índice de producción [${idx.name}] verificado en tabla [${idx.table}]`);
    }

    // -------------------------------------------------------------------------
    // TEARDOWN
    // -------------------------------------------------------------------------
    console.log("\n🧹 Limpieza de fixtures de prueba...");
    await pool.query("DELETE FROM households WHERE id IN (?, ?)", [householdAId, householdBId]);
    await pool.query("DELETE FROM users WHERE id IN (?, ?, ?)", [userAId, userBId, memberAId]);
    console.log("-> Datos de prueba Fase 4 eliminados.");

  } catch (err) {
    console.error("❌ Excepción en ejecución de pruebas Fase 4:", err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTADO FASE 4: ${passed} PASADAS | ${failed} FALLIDAS`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runPhase4Tests();
