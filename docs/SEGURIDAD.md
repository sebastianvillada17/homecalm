# POLÍTICA Y AUDITORÍA DE SEGURIDAD – HOMECALM

## 1. Modelo de Amenazas y Mitigaciones OWASP Top 10

| Vulnerabilidad OWASP | Riesgo Potencial | Mitigación Implementada en HOMECALM |
|---|---|---|
| **A01: Broken Access Control** | Acceso no autorizado a finanzas o datos de otros hogares. | - Validación de sesión en cada Server Action.<br>- Filtrado estricto `WHERE household_id = ?` forzado por sesión.<br>- Verificación de rol administrativo (`admin`) para operaciones críticas. |
| **A02: Cryptographic Failures** | Fuga de contraseñas o tokens en texto plano. | - Hashing de contraseñas con `bcryptjs` (salt rounds 10).<br>- Tokens de recuperación generados con `crypto.randomBytes(32)` y almacenados como hash SHA-256 en MySQL.<br>- Inmediata invalidación de tokens usados (Anti-Replay Attack). |
| **A03: Injection (SQL Injection)** | Inyección de código SQL mediante parámetros de usuario. | - Uso exclusivo de sentencias preparadas y parámetros posicionales (`?`) mediante `mysql2/promise`. Cero interpolación directa de cadenas en SQL. |
| **A04: Insecure Design** | Condiciones de carrera en saldo de cuentas. | - Bloqueo de fila exclusivo `SELECT ... FOR UPDATE` en transacciones InnoDB para garantizar serialización de débitos/créditos concurrentes. |
| **A05: Security Misconfiguration** | Cabeceras HTTP permisivas o cookies inseguras. | - Cabeceras HTTP en `next.config.mjs`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (solo producción), `Permissions-Policy`.<br>- Cookies con flags `HttpOnly`, `SameSite=Lax`, `Secure` (en prod). |
| **A07: Identification and Authentication Failures** | Ataques de fuerza bruta a credenciales. | - Rate limiting en memoria con ventana deslizante (`checkRateLimit`) en `loginAction` y recuperación de contraseñas (máximo 5 intentos por ventana de 15 minutos). |
| **A09: Security Logging and Monitoring Failures** | Acciones financieras o administrativas sin trazabilidad. | - Tabla inmutable `audit_logs` que registra fecha, IP, usuario, acción y entidad.<br>- Sanitización automática de campos sensibles (`[REDACTED]`). |

---

## 2. Invocaciones Externas Seguras con Timeout

Toda llamada a APIs de terceros implementa límite estricto de espera para prevenir bloqueos de hilo o ataques de denegación de servicio por agotamiento de recursos:
- **Google Gemini API (`gemini.ts`):** Timeout de 15 segundos mediante `Promise.race()`.
- **Resend Email API (`email.ts`):** Timeout de 10 segundos mediante `Promise.race()`.

---

## 3. Manejo de Errores y Fugas de Información

- **`error.tsx` y `global-error.tsx`:** Los errores inesperados en tiempo de ejecución son interceptados por boundaries que muestran una interfaz visual amigable sin exponer stack traces técnicos al usuario final.
- **`logger.ts`:** Registra errores en consola con formato JSON estructurado, redactando automáticamente contraseñas, secretos y tokens.

