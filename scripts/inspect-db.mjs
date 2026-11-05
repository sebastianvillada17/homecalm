import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

const envPath = path.resolve(".env.local");
const envFile = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

async function inspect() {
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 11498),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  const tables = [
    'users', 'households', 'household_members', 'accounts',
    'transactions', 'budgets', 'events', 'tasks',
    'inventory', 'shopping_lists', 'shopping_items', 'debts', 'savings_goals'
  ];

  console.log("=== ROW COUNTS ACROSS ALL TABLES ===");
  for (const t of tables) {
    try {
      const [rows] = await pool.query(`SELECT COUNT(*) as c FROM ${t}`);
      console.log(`${t.padEnd(20)}: ${rows[0].c}`);
    } catch (e) {
      console.log(`${t.padEnd(20)}: ERROR (${e.message})`);
    }
  }

  await pool.end();
}

inspect().catch(err => {
  console.error("Inspection error:", err.message);
  process.exit(1);
});
