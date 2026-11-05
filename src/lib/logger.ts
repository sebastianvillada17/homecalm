/**
 * Structured Logger para HOMECALM
 * Centraliza la emisión de logs con timestamp, nivel de severidad y enmascaramiento de secretos.
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "db_password",
  "session_secret",
];

function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Si la cadena parece un secreto (JWT o hash largo), evitar imprimir completo
    if (obj.length > 50 && !obj.includes(" ")) {
      return `${obj.slice(0, 6)}...[REDACTED]`;
    }
    return obj;
  }
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = maskSensitiveData(value);
    }
  }
  return sanitized;
}

function formatLog(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  let metaStr = "";
  if (meta !== undefined) {
    try {
      metaStr = " " + JSON.stringify(maskSensitiveData(meta));
    } catch {
      metaStr = " [Unserializable Meta]";
    }
  }
  return `[${timestamp}] [${level}] [HOMECALM] ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: any) {
    console.log(formatLog("INFO", message, meta));
  },
  warn(message: string, meta?: any) {
    console.warn(formatLog("WARN", message, meta));
  },
  error(message: string, meta?: any) {
    console.error(formatLog("ERROR", message, meta));
  },
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("DEBUG", message, meta));
    }
  },
};

