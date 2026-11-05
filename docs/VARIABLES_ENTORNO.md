# GUÍA DE VARIABLES DE ENTORNO – HOMECALM

El proyecto requiere variables de entorno para la persistencia en MySQL, firma criptográfica de sesiones, integraciones de IA y envío de correos electrónicos.

## 1. Tabla Maestra de Variables

| Variable | Tipo | Obligatoria | Entorno | Descripción | Ejemplo / Formato |
|---|---|---|---|---|---|
| `DB_HOST` | String | **Sí** | Dev & Prod | Nombre de host o IP del servidor MySQL. | `mysql-instancia.aivencloud.com` |
| `DB_PORT` | Number | **Sí** | Dev & Prod | Puerto de conexión MySQL. | `11498` (Default: 3306) |
| `DB_USER` | String | **Sí** | Dev & Prod | Usuario autenticado en MySQL con privilegios DDL/DML. | `avnadmin` |
| `DB_PASSWORD` | String | **Sí** | Dev & Prod | Contraseña segura del usuario de base de datos. | `AVNS_...` |
| `DB_NAME` | String | **Sí** | Dev & Prod | Nombre de la base de datos destino. | `defaultdb` |
| `SESSION_SECRET` | String | **Sí** | Dev & Prod | Clave secreta para firmar cookies HMAC-SHA256 (mínimo 32 caracteres). | Cadena pseudoaleatoria de 64 caracteres hex |
| `GEMINI_API_KEY` | String | Opcional | Dev & Prod | Clave de API de Google AI Studio para el Asistente IA (Gemini 2.5 Flash). | `AIzaSy...` |
| `RESEND_API_KEY` | String | Opcional | Dev & Prod | Clave de API de Resend para envío de correos transaccionales. | `re_...` |
| `EMAIL_FROM` | String | Opcional | Dev & Prod | Remitente verificado para los correos de recuperación. | `no-reply@tudominio.com` |
| `NEXT_PUBLIC_APP_URL`| String | **Sí** | Dev & Prod | URL canónica para generación de enlaces absolutos de reseteo de clave. | `http://localhost:3000` (Dev) o `https://homecalm.app` (Prod) |
| `NODE_ENV` | String | Automática | Dev & Prod | Define el entorno de ejecución (`development` o `production`). | `production` |

---

## 2. Generación de `SESSION_SECRET` Seguro

Para generar un secreto seguro de 64 caracteres en consola:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Comportamiento en Modo Sin Conexión Externa (Graceful Fallback)

1. **`GEMINI_API_KEY` no provista:**
   El asistente IA responde con un mensaje cordial explicativo de que el asistente opera en modo de contexto básico local sin interrumpir el flujo del usuario.
2. **`RESEND_API_KEY` no provista:**
   En entornos locales de desarrollo, el enlace de recuperación de contraseña se imprime de forma segura en la consola del servidor (`logger.ts`) para permitir completar la prueba de restablecimiento sin necesidad de configurar DNS ni dominio real.

