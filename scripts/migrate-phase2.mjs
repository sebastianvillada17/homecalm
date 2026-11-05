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

async function runMigration() {
  console.log("=== INICIANDO MIGRACIÓN FASE 2: TABLAS Y COLUMNAS CRUD ===");
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  // 1. Verificar / agregar to_account_id en transactions
  const [txCols] = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'transactions' AND column_name = 'to_account_id'",
    [database]
  );
  if (txCols.length === 0) {
    console.log("Agregando columna to_account_id a transactions...");
    await pool.query("ALTER TABLE transactions ADD COLUMN to_account_id VARCHAR(36) NULL AFTER account_id");
    await pool.query("ALTER TABLE transactions ADD CONSTRAINT fk_transactions_to_account FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL");
    console.log("-> to_account_id agregada con clave foránea.");
  } else {
    console.log("-> to_account_id ya existe en transactions.");
  }

  // 2. Verificar / agregar priority en tasks
  const [taskCols] = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'tasks' AND column_name = 'priority'",
    [database]
  );
  if (taskCols.length === 0) {
    console.log("Agregando columna priority a tasks...");
    await pool.query("ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) DEFAULT 'normal' AFTER done");
    console.log("-> priority agregada.");
  } else {
    console.log("-> priority ya existe en tasks.");
  }

  // 3. Crear tabla debt_payments si no existe
  console.log("Verificando tabla debt_payments...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id VARCHAR(36) PRIMARY KEY,
      debt_id VARCHAR(36) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      payment_date DATE NOT NULL,
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
    )
  `);
  console.log("-> Tabla debt_payments verificada/creada.");

  // 4. Crear tabla savings_contributions si no existe
  console.log("Verificando tabla savings_contributions...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS savings_contributions (
      id VARCHAR(36) PRIMARY KEY,
      goal_id VARCHAR(36) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      contribution_date DATE NOT NULL,
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
    )
  `);
  console.log("-> Tabla savings_contributions verificada/creada.");

  console.log("\n=== MIGRACIÓN FASE 2 COMPLETADA CON ÉXITO ===");
  await pool.end();
}

runMigration().catch((err) => {
  console.error("Error en migración Fase 2:", err);
  process.exit(1);
});

