import crypto from "crypto";
import pool from "@/lib/db";

export interface AuditLogEntry {
  householdId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Registra un evento de auditoría de forma segura y no bloqueante.
 * Protege información sensible (enmascara contraseñas, tokens).
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const id = crypto.randomUUID();

    // Enmascarar información sensible en details
    let safeDetails: Record<string, any> | null = null;
    if (entry.details) {
      safeDetails = { ...entry.details };
      const sensitiveKeys = ["password", "token", "passwordHash", "tokenHash", "secret"];
      for (const key of Object.keys(safeDetails)) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
          safeDetails[key] = "[REDACTED]";
        }
      }
    }

    await pool.query(
      `INSERT INTO audit_logs (id, household_id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        entry.householdId,
        entry.userId || null,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        safeDetails ? JSON.stringify(safeDetails) : null,
        entry.ipAddress || null,
      ]
    );
  } catch (err: any) {
    // La auditoría nunca debe hacer fallar la operación de negocio principal
    console.warn("[AUDIT LOG WARNING] No se pudo guardar registro de auditoría:", err.message);
  }
}

