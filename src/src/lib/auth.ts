import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  householdId: string;
  householdName: string;
  role: string;
}

export interface SessionPayload extends SessionUser {
  iat: number; // Issued at timestamp (ms)
  exp: number; // Expiration timestamp (ms)
}

const SESSION_COOKIE_NAME = "homecalm_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 días

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "[HOMECALM SECURITY ERROR] Mandatory environment variable SESSION_SECRET is not configured. Hardcoded fallbacks have been eliminated. Please define SESSION_SECRET (at least 32 characters) in your environment variables."
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `[HOMECALM SECURITY ERROR] SESSION_SECRET is insufficiently strong (${secret.length} characters). It must contain at least 32 characters.`
    );
  }
  return secret;
}

/**
 * Signs a session payload with HMAC-SHA256 and includes strict expiration metadata.
 */
export function signToken(user: SessionUser, durationMs = SESSION_DURATION_SECONDS * 1000): string {
  const now = Date.now();
  const payload: SessionPayload = {
    ...user,
    iat: now,
    exp: now + durationMs,
  };

  const secret = getSessionSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Cryptographically verifies token signature and validates timestamp expiration.
 * Utilizes timingSafeEqual to protect against timing attacks.
 */
export function verifyToken<T = SessionUser>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    if (!data || !signature) return null;

    const secret = getSessionSecret();
    const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;

    // Strict expiration check
    if (typeof payload.exp === "number" && Date.now() > payload.exp) {
      return null; // Session expired
    }

    return payload as unknown as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  return verifyToken<SessionUser>(sessionCookie);
}

export async function setSession(user: SessionUser) {
  const token = signToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
