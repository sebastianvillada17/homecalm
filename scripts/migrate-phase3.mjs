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
  console.log("=== INICIANDO MIGRACIÓN FASE 3: MENÚ, ONBOARDING, ASISTENTE Y SEGURIDAD ===");
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  // 1. Columnas de Onboarding en households
  const [obCols] = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'households' AND column_name = 'onboarding_completed'",
    [database]
  );
  if (obCols.length === 0) {
    console.log("Agregando columnas de onboarding a households...");
    await pool.query("ALTER TABLE households ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE");
    await pool.query("ALTER TABLE households ADD COLUMN onboarding_step INT NOT NULL DEFAULT 1");
    console.log("-> Columnas de onboarding agregadas exitosamente.");
  } else {
    console.log("-> Columnas de onboarding ya existen.");
  }

  // 2. Tabla weekly_meal_plans
  console.log("Verificando tabla weekly_meal_plans...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_meal_plans (
      id VARCHAR(36) PRIMARY KEY,
      household_id VARCHAR(36) NOT NULL,
      week_start_date DATE NOT NULL,
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      UNIQUE KEY uk_hh_week (household_id, week_start_date)
    )
  `);
  console.log("-> Tabla weekly_meal_plans lista.");

  // 3. Tabla meal_plan_items
  console.log("Verificando tabla meal_plan_items...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meal_plan_items (
      id VARCHAR(36) PRIMARY KEY,
      plan_id VARCHAR(36) NOT NULL,
      day_of_week ENUM('LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM') NOT NULL,
      meal_type ENUM('Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena') NOT NULL,
      dish_name VARCHAR(200) NOT NULL,
      description TEXT,
      portions INT DEFAULT 2,
      instructions TEXT,
      calories INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES weekly_meal_plans(id) ON DELETE CASCADE
    )
  `);
  console.log("-> Tabla meal_plan_items lista.");

  // 4. Tabla meal_item_ingredients
  console.log("Verificando tabla meal_item_ingredients...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meal_item_ingredients (
      id VARCHAR(36) PRIMARY KEY,
      meal_item_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
      unit VARCHAR(50) DEFAULT 'unidades',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meal_item_id) REFERENCES meal_plan_items(id) ON DELETE CASCADE
    )
  `);
  console.log("-> Tabla meal_item_ingredients lista.");

  // 5. Tablas para Chat del Asistente (Conversaciones y Mensajes)
  console.log("Verificando tablas chat_conversations y chat_messages...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id VARCHAR(36) PRIMARY KEY,
      household_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(150) DEFAULT 'Nueva conversación',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      sender ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    )
  `);
  console.log("-> Tablas de chat del asistente listas.");

  // 6. Tabla password_resets
  console.log("Verificando tabla password_resets...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_token_hash (token_hash)
    )
  `);
  console.log("-> Tabla password_resets lista.");

  console.log("\n=== MIGRACIÓN FASE 3 COMPLETADA CON ÉXITO ===");
  await pool.end();
}

runMigration().catch((err) => {
  console.error("Error en migración Fase 3:", err);
  process.exit(1);
});

