import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

function getValidatedPoolConfig(): mysql.PoolOptions {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME?.trim() || "defaultdb";
  const port = Number(process.env.DB_PORT || 11498);

  // Require mandatory database credentials - NO hardcoded fallbacks
  if (!host || !user || !password) {
    const missing: string[] = [];
    if (!host) missing.push("DB_HOST");
    if (!user) missing.push("DB_USER");
    if (!password) missing.push("DB_PASSWORD");
    throw new Error(
      `[HOMECALM SECURITY ERROR] Missing mandatory database configuration: ${missing.join(
        ", "
      )}. Hardcoded credentials have been removed. Please define them in .env.local.`
    );
  }

  let sslConfig: mysql.SslOptions | undefined = undefined;
  const dbSsl = process.env.DB_SSL?.trim().toUpperCase();
  if (dbSsl === "REQUIRED" || dbSsl === "TRUE" || !process.env.DB_SSL) {
    const caCert = process.env.DB_CA_CERT?.trim();
    if (caCert) {
      sslConfig = {
        ca: caCert.startsWith("-----BEGIN")
          ? caCert
          : Buffer.from(caCert, "base64").toString("utf-8"),
        rejectUnauthorized: true,
      };
    } else {
      sslConfig = {
        rejectUnauthorized: false,
      };
    }
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000,
  };
}

export const pool: mysql.Pool =
  globalForDb.mysqlPool ?? mysql.createPool(getValidatedPoolConfig());

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

export async function query<T = any>(sql: string, values?: any[]): Promise<T> {
  const [results] = await pool.execute(sql, values);
  return results as T;
}

/**
 * Execute an atomic database transaction with automatic rollback and connection release.
 */
export async function withTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("[HOMECALM DB] Rollback error:", rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

function sanitizeErrorMessage(msg: string): string {
  // Redact potential passwords or credentials in connection strings
  return msg.replace(/(password|pwd)=[^;&]+/gi, "$1=****").replace(/:[^:@/]+@/, ":****@");
}

export async function testConnection(): Promise<{
  ok: boolean;
  version?: string;
  database?: string;
  error?: string;
}> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT VERSION() as version, DATABASE() as db, 1 as status"
    );
    const first = rows[0];
    return {
      ok: true,
      version: first?.version,
      database: first?.db,
    };
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    return {
      ok: false,
      error: sanitizeErrorMessage(rawMsg),
    };
  }
}

export default pool;
