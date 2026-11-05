"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import pool from "@/lib/db";
import { clearSession, getSession, setSession, SessionUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Escribe un correo electrónico válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

const loginSchema = z.object({
  email: z.string().email("Escribe un correo electrónico válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export async function registerAction(formData: {
  name: string;
  email: string;
  password: string;
}) {
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Datos no válidos.",
    };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const connection = await pool.getConnection();
  try {
    // 1. Verificar si el usuario ya existe
    const [existing] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return {
        success: false,
        error: "Ya existe un usuario registrado con este correo electrónico.",
      };
    }

    // 2. Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const accountId = crypto.randomUUID();

    // Nombre por defecto del hogar: si el usuario es Stephania o Sebastian, "Hogar Villato", o "Hogar de [Nombre]"
    const firstName = name.trim().split(" ")[0];
    const householdName = "Hogar Villato";

    await connection.beginTransaction();

    // 3. Crear usuario
    await connection.query(
      "INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, ?, ?, NOW())",
      [userId, normalizedEmail, name.trim(), passwordHash]
    );

    // 4. Crear su hogar
    await connection.query(
      "INSERT INTO households (id, name, currency, timezone, created_at) VALUES (?, ?, 'COP', 'America/Bogota', NOW())",
      [householdId, householdName]
    );

    // 5. Vincular como administrador
    await connection.query(
      "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', NOW())",
      [memberId, householdId, userId]
    );

    // 6. Crear cuenta financiera base
    await connection.query(
      "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, 'Cuenta principal', 'bank', 0, NOW())",
      [accountId, householdId]
    );

    await connection.commit();

    // 7. Iniciar sesión guardando cookie
    const sessionUser: SessionUser = {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      householdId,
      householdName,
      role: "admin",
    };

    await setSession(sessionUser);

    return {
      success: true,
      user: sessionUser,
    };
  } catch (error: any) {
    await connection.rollback();
    console.error("Error en registro:", error);
    return {
      success: false,
      error: "Ocurrió un error al crear tu cuenta. Intenta nuevamente.",
    };
  } finally {
    connection.release();
  }
}

export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Datos no válidos.",
    };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const rateCheck = checkRateLimit(`login:${normalizedEmail}`, 5, 15 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Demasiados intentos fallidos. Por seguridad, por favor espera ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minuto(s) antes de intentar de nuevo.`,
    };
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.full_name, u.password_hash, 
              hm.household_id, hm.role, 
              h.name as household_name
       FROM users u
       LEFT JOIN household_members hm ON u.id = hm.user_id
       LEFT JOIN households h ON hm.household_id = h.id
       WHERE u.email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return {
        success: false,
        error: "Correo electrónico o contraseña incorrectos.",
      };
    }

    const userRow = rows[0];
    const passwordMatch = await bcrypt.compare(password, userRow.password_hash);

    if (!passwordMatch) {
      return {
        success: false,
        error: "Correo electrónico o contraseña incorrectos.",
      };
    }

    resetRateLimit(`login:${normalizedEmail}`);

    let householdId = userRow.household_id;
    let householdName = userRow.household_name || "Hogar Villato";
    let role = userRow.role || "admin";

    // Si por alguna razón no tiene hogar asociado, le creamos uno
    if (!householdId) {
      householdId = crypto.randomUUID();
      const memberId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO households (id, name, currency, timezone, created_at) VALUES (?, ?, 'COP', 'America/Bogota', NOW())",
        [householdId, householdName]
      );
      await pool.query(
        "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', NOW())",
        [memberId, householdId, userRow.id]
      );
    }

    const sessionUser: SessionUser = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.full_name,
      householdId,
      householdName,
      role,
    };

    await setSession(sessionUser);

    return {
      success: true,
      user: sessionUser,
    };
  } catch (error: any) {
    console.error("Error en login:", error);
    return {
      success: false,
      error: error?.message || "Ocurrió un error al iniciar sesión. Intenta nuevamente.",
    };
  }
}

export async function logoutAction() {
  await clearSession();
  return { success: true };
}

export async function getCurrentUserAction() {
  return await getSession();
}

// =============================================================
// RECUPERACIÓN DE CONTRASEÑA (FLUJO REAL CON MYSQL Y RESEND)
// =============================================================

export async function requestPasswordResetAction(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const validEmail = z.string().email().safeParse(normalizedEmail);
  if (!validEmail.success) {
    return {
      success: false,
      message: "Ingresa un correo electrónico válido.",
    };
  }

  const rateCheck = checkRateLimit(`reset:${normalizedEmail}`, 3, 15 * 60);
  if (!rateCheck.allowed) {
    return {
      success: false,
      message: `Has solicitado demasiados enlaces recientemente. Por seguridad, espera ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minuto(s).`,
    };
  }

  try {
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    // Para evitar enumeración de usuarios, respondemos con éxito si existe o no
    if (userRows.length === 0) {
      return {
        success: true,
        message: "Si existe una cuenta asociada a este correo, recibirás un enlace de recuperación en breve.",
      };
    }

    const user = userRows[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const resetId = crypto.randomUUID();

    // Invalidar tokens previos pendientes
    await pool.query(
      "UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [user.id]
    );

    // Guardar nuevo token con expiración de 1 hora
    await pool.query(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())`,
      [resetId, user.id, tokenHash]
    );

    // Enviar correo
    await sendPasswordResetEmail({
      to: user.email,
      name: user.full_name,
      token: rawToken,
    });

    return {
      success: true,
      message: "Si existe una cuenta asociada a este correo, recibirás un enlace de recuperación en breve.",
    };
  } catch (err: any) {
    console.error("[HOMECALM] Error solicitando restablecimiento de contraseña:", err.message);
    return {
      success: false,
      message: "Ocurrió un error al procesar tu solicitud. Intenta nuevamente.",
    };
  }
}

export async function verifyResetTokenAction(token: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!token || token.trim().length !== 64) {
    return { valid: false, error: "El token de recuperación no es válido." };
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT pr.id, pr.expires_at, pr.used_at 
       FROM password_resets pr
       WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return { valid: false, error: "El enlace de recuperación es inválido o ha expirado." };
    }

    return { valid: true };
  } catch (err: any) {
    console.error("[HOMECALM] Error verificando token de recuperación:", err.message);
    return { valid: false, error: "Error al validar el enlace de recuperación." };
  }
}

export async function resetPasswordAction(token: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!token || token.trim().length !== 64) {
    return { success: false, error: "El enlace de recuperación no es válido." };
  }

  if (!newPassword || newPassword.trim().length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [resetRows] = await conn.query<RowDataPacket[]>(
      `SELECT pr.id, pr.user_id 
       FROM password_resets pr
       WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (resetRows.length === 0) {
      await conn.rollback();
      return { success: false, error: "El enlace de recuperación es inválido o ya ha expirado." };
    }

    const { id: resetId, user_id: userId } = resetRows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña del usuario y fecha de cambio de clave (invalida sesiones previas)
    await conn.query("UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?", [passwordHash, userId]);

    // Marcar token como utilizado
    await conn.query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [resetId]);

    await conn.commit();

    await recordAuditLog({
      householdId: "auth-system",
      userId,
      action: "AUTH_PASSWORD_RESET",
      entityType: "USER",
      entityId: userId,
    });

    return { success: true };
  } catch (err: any) {
    await conn.rollback();
    console.error("[HOMECALM] Error restableciendo contraseña:", err.message);
    return { success: false, error: "No se pudo actualizar la contraseña. Intenta nuevamente." };
  } finally {
    conn.release();
  }
}


