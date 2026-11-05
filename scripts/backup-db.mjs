import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import crypto from "crypto";

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

const TABLES_TO_BACKUP = [
  "households",
  "users",
  "household_members",
  "accounts",
  "transactions",
  "budgets",
  "events",
  "tasks",
  "inventory",
  "shopping_lists",
  "shopping_items",
  "debts",
  "savings_goals",
  "debt_payments",
  "savings_contributions",
  "weekly_meal_plans",
  "meal_plan_items",
  "meal_item_ingredients",
  "chat_conversations",
  "chat_messages",
  "password_resets",
  "audit_logs",
];

async function runBackup() {
  console.log("==================================================================");
  console.log("💾 PROCEDIMIENTO DE RESPALDO (BACKUP) - HOMECALM MYSQL");
  console.log("==================================================================");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve("backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  const backupData = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    database,
    host,
    tableCounts: {},
    tables: {},
  };

  try {
    let totalRows = 0;
    for (const table of TABLES_TO_BACKUP) {
      try {
        const [rows] = await pool.query(`SELECT * FROM ${table}`);
        backupData.tables[table] = rows;
        backupData.tableCounts[table] = rows.length;
        totalRows += rows.length;
        console.log(`  ✓ Tabla [${table}]: ${rows.length} registros extraídos.`);
      } catch (err) {
        console.warn(`  ⚠️ Advertencia en tabla [${table}]: ${err.message}`);
        backupData.tables[table] = [];
        backupData.tableCounts[table] = 0;
      }
    }

    const jsonString = JSON.stringify(backupData, null, 2);
    const checksum = crypto.createHash("sha256").update(jsonString).digest("hex");
    backupData.checksum = checksum;

    const backupFilePath = path.join(backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");

    const stats = fs.statSync(backupFilePath);
    const sizeKb = (stats.size / 1024).toFixed(2);

    console.log("\n==================================================================");
    console.log(`✅ RESPALDO GENERADO CON ÉXITO: ${backupFilePath}`);
    console.log(`   - Tablas respaldadas: ${TABLES_TO_BACKUP.length}`);
    console.log(`   - Total registros: ${totalRows}`);
    console.log(`   - Tamaño: ${sizeKb} KB`);
    console.log(`   - Checksum SHA-256: ${checksum}`);
    console.log("==================================================================");

    return backupFilePath;
  } finally {
    await pool.end();
  }
}

runBackup().catch((err) => {
  console.error("❌ Error generando backup:", err);
  process.exit(1);
});

