# GUÍA DE CONFIGURACIÓN Y EJECUCIÓN – HOMECALM

## 1. Requisitos Previos del Sistema

- **Node.js:** Versión 20.x o superior (Probado en v24.19.0).
- **Gestor de Paquetes:** `pnpm` versión 9.x o 11.x (o `npm` v10+).
- **Base de Datos:** Instancia accesible de MySQL 8.0 u 8.4 (InnoDB) con soporte SSL.

---

## 2. Instalación de Dependencias

En la carpeta raíz del proyecto (`homeflow`):

```bash
# Con pnpm:
pnpm install

# Con npm:
npm install
```

> [!NOTE]
> En entornos con `pnpm` versión 11, se configuró el archivo `pnpm-workspace.yaml` para permitir la compilación nativa de dependencias como `@google/genai` y `protobufjs`.

---

## 3. Configuración de Variables de Entorno

Copia el archivo de plantilla `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales reales (ver detalles en `docs/VARIABLES_ENTORNO.md`).

---

## 4. Inicialización de la Base de Datos

Para aplicar el esquema DDL canónico y los índices de alto rendimiento:

```bash
# Ejecutar migración completa de tablas e índices
node scripts/migrate-phase4.mjs
```

---

## 5. Scripts Disponibles en `package.json`

| Comando | Acción |
|---|---|
| `pnpm dev` | Inicia el servidor de desarrollo en `http://localhost:3000` (con Fast Refresh). |
| `pnpm build` | Compila y optimiza la aplicación para producción generando las 20 rutas estáticas y dinámicas. |
| `pnpm start` | Inicia el servidor Node.js en modo producción con los assets compilados de `.next`. |
| `pnpm typecheck` | Ejecuta la verificación estricta de tipos de TypeScript sin emitir archivos (`tsc --noEmit`). |

---

## 6. Scripts de Verificación y Auditoría Automatizada

Para ejecutar las baterías de pruebas creadas para validar la integridad del sistema:

```bash
# Suite Fase 1: Sesiones, Integridad de Fechas y Transacciones ACID (20 pruebas)
node scripts/verify-phase1.mjs

# Suite Fase 2: Operaciones CRUD Completas en los 12 módulos (35 pruebas)
node scripts/verify-phase2.mjs

# Suite Fase 3: Menú semanal, Onboarding, Asistente Gemini y Password Reset (21 pruebas)
node scripts/verify-phase3.mjs

# Suite Fase 4: Concurrencia de 10 hilos, RBAC, Rate Limiting, Seguridad e Índices (28 pruebas)
node scripts/verify-phase4.mjs

# Procedimiento de Respaldo Completo de 22 tablas con Checksum SHA-256
node scripts/backup-db.mjs

# Procedimiento de Simulación de Restauración en Caliente (DRP)
node scripts/restore-test.mjs
```

