import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "mysql-a8ddfe7-sebastianvibr-27cd.f.aivencloud.com",
    port: Number(process.env.DB_PORT || 11498),
    user: process.env.DB_USER || "avnadmin",
    password: process.env.DB_PASSWORD || "AVNS_Uf6WXvDAyoShRFco4GA",
    database: process.env.DB_NAME || "defaultdb",
    multipleStatements: true,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const sqlPath = path.join(__dirname, "..", "schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Ejecutando esquema SQL en la base de datos...");
    await connection.query(sql);
    console.log("¡Tablas creadas con éxito!");

    const [tables] = await connection.query("SHOW TABLES");
    console.log("Tablas en defaultdb:", tables);
  } catch (error) {
    console.error("Error al ejecutar migración:", error);
  } finally {
    await connection.end();
  }
}

runMigration();

