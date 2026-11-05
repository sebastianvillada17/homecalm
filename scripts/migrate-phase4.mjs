import fs from "fs";
import path from "path";
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

async function addIndexIfNotExists(pool, tableName, indexName, columnsSql) {
  const [rows] = await pool.query(
    "SELECT index_name FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?",
    [database, tableName, indexName]
  );
  if (rows.length === 0) {
    console.log(`  -> Agregando índice [${indexName}] en tabla [${tableName}]...`);
    await pool.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columnsSql})`);
    console.log(`     ✅ Índice ${indexName} creado.`);
  } else {
    console.log(`  -> Índice [${indexName}] en tabla [${tableName}] ya existe.`);
  }
}

async function runPhase4Migration() {
  console.log("==================================================================");
  console.log("🚀 MIGRACIÓN FASE 4: ÍNDICES DE RENDIMIENTO Y TABLA DE AUDITORÍA");
  console.log("==================================================================");

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  try {
    // 1. Columna password_changed_at en users (para revocación de sesiones tras cambio de clave)
    console.log("\n1. Verificando columna password_changed_at en users...");
    const [pwdCols] = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'users' AND column_name = 'password_changed_at'",
      [database]
    );
    if (pwdCols.length === 0) {
      console.log("  -> Agregando password_changed_at a tabla users...");
      await pool.query("ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
      console.log("     ✅ Columna password_changed_at agregada.");
    } else {
      console.log("  -> Columna password_changed_at ya existe.");
    }

    // 2. Tabla audit_logs para trazabilidad y observabilidad
    console.log("\n2. Verificando tabla audit_logs...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        household_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(36) NULL,
        details JSON NULL,
        ip_address VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_hh_created (household_id, created_at),
        INDEX idx_audit_action (action)
      )
    `);
    console.log("  ✅ Tabla audit_logs lista y verificada.");

    // 3. Índices de alto rendimiento para optimizar consultas de producción
    console.log("\n3. Aplicando índices compuestos de rendimiento...");
    await addIndexIfNotExists(pool, "transactions", "idx_tx_hh_date", "household_id, date");
    await addIndexIfNotExists(pool, "transactions", "idx_tx_hh_cat_date", "household_id, category, type, date");
    await addIndexIfNotExists(pool, "tasks", "idx_tasks_hh_done_due", "household_id, done, due_date");
    await addIndexIfNotExists(pool, "events", "idx_events_hh_date", "household_id, event_date");
    await addIndexIfNotExists(pool, "inventory", "idx_inventory_hh_expires", "household_id, expires");
    await addIndexIfNotExists(pool, "shopping_items", "idx_shop_items_list_purchased", "list_id, purchased");
    await addIndexIfNotExists(pool, "chat_messages", "idx_chat_msg_conv_created", "conversation_id, created_at");
    await addIndexIfNotExists(pool, "meal_plan_items", "idx_meal_items_plan_day", "plan_id, day_of_week");

    console.log("\n==================================================================");
    console.log("🎉 MIGRACIÓN FASE 4 COMPLETADA CON ÉXITO");
    console.log("==================================================================");
  } finally {
    await pool.end();
  }
}

runPhase4Migration().catch((err) => {
  console.error("Error en migración Fase 4:", err);
  process.exit(1);
});

