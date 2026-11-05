import fs from "fs";
import mysql from "mysql2/promise";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

async function run() {
  const pool = mysql.createPool({
    host: env.DB_HOST || "mysql-a8ddfe7-sebastianvibr-27cd.f.aivencloud.com",
    port: Number(env.DB_PORT || 11498),
    user: env.DB_USER || "avnadmin",
    password: env.DB_PASSWORD || "AVNS_Uf6WXvDAyoShRFco4GA",
    database: env.DB_NAME || "defaultdb",
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  console.log("Creando tablas debts y savings_goals...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debts (
      id VARCHAR(36) PRIMARY KEY,
      household_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      institution VARCHAR(150),
      total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      due_date VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id VARCHAR(36) PRIMARY KEY,
      household_id VARCHAR(36) NOT NULL,
      name VARCHAR(150) NOT NULL,
      target_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      target_date VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
    );
  `);

  console.log("Tablas creadas exitosamente en Aiven MySQL.");
  await pool.end();
}

run().catch(console.error);

