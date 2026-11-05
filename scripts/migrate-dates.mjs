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
} else {
  env = process.env;
}

const host = env.DB_HOST || process.env.DB_HOST;
const port = Number(env.DB_PORT || process.env.DB_PORT || 11498);
const user = env.DB_USER || process.env.DB_USER;
const password = env.DB_PASSWORD || process.env.DB_PASSWORD;
const database = env.DB_NAME || process.env.DB_NAME || "defaultdb";

if (!host || !user || !password) {
  console.error("Missing mandatory database connection variables in .env.local.");
  process.exit(1);
}

const tablesToMigrate = [
  { table: "tasks", column: "due_date" },
  { table: "inventory", column: "expires" },
  { table: "debts", column: "due_date" },
  { table: "savings_goals", column: "target_date" },
];

async function migrate() {
  console.log("=== INICIANDO MIGRACIÓN DE FECHAS A TIPO DATE ===");
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  for (const { table, column } of tablesToMigrate) {
    console.log(`\nVerificando columna [${table}.${column}]...`);
    const [colInfo] = await pool.query(
      `SELECT DATA_TYPE, COLUMN_TYPE, IS_NULLABLE 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      [database, table, column]
    );

    if (colInfo.length === 0) {
      console.log(`Tabla o columna no encontrada: ${table}.${column}`);
      continue;
    }

    const currentType = colInfo[0].DATA_TYPE.toLowerCase();
    console.log(`Tipo actual de [${table}.${column}]: ${currentType} (${colInfo[0].COLUMN_TYPE})`);

    if (currentType === "date") {
      console.log(`-> [${table}.${column}] ya es de tipo DATE. Omitiendo.`);
      continue;
    }

    // Inspeccionar registros existentes
    const [rows] = await pool.query(`SELECT id, \`${column}\` as val FROM \`${table}\``);
    console.log(`Registros encontrados en [${table}]: ${rows.length}`);

    // Si existen registros, sanitizar formatos
    for (const row of rows) {
      const val = row.val;
      if (!val || val.trim() === "") {
        await pool.query(`UPDATE \`${table}\` SET \`${column}\` = NULL WHERE id = ?`, [row.id]);
        continue;
      }

      // Si tiene formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
        await pool.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`, [val.trim(), row.id]);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) {
        // DD/MM/YYYY -> YYYY-MM-DD
        const parts = val.trim().split("/");
        const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
        await pool.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`, [iso, row.id]);
      } else {
        console.warn(`Valor no convertible encontrado en ${table}.${column} (id: ${row.id}): "${val}". Se preserva como NULL para permitir conversión.`);
        await pool.query(`UPDATE \`${table}\` SET \`${column}\` = NULL WHERE id = ?`, [row.id]);
      }
    }

    // Modificar la columna al tipo DATE NULL
    console.log(`Ejecutando ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` DATE NULL...`);
    await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` DATE NULL`);
    console.log(`-> [${table}.${column}] migrado exitosamente a DATE NULL.`);
  }

  // Verificar estado final
  console.log("\n=== VERIFICACIÓN FINAL EN INFORMATION_SCHEMA ===");
  const [finalCols] = await pool.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_type 
     FROM information_schema.columns 
     WHERE table_schema = ? AND column_name IN ('due_date', 'expires', 'target_date', 'date', 'event_date')
     ORDER BY table_name, column_name`,
    [database]
  );
  console.log(JSON.stringify(finalCols, null, 2));

  await pool.end();
  console.log("\nMigración de fechas completada exitosamente.");
}

migrate().catch((err) => {
  console.error("Error durante la migración:", err);
  process.exit(1);
});

