# HOMECALM — Organización Integral del Hogar

> **Que todo fluya en casa.**  
> Aplicación web integral y PWA para la gestión financiera, operativa y logística del hogar, con asistencia inteligente contextual e integridad de datos de grado bancario.

---

## 🌟 Características Principales

- **Finanzas Transaccionales ACID:** Cuentas bancarias, billeteras, transacciones, transferencias entre cuentas y presupuestos con cálculo en vivo.
- **Deudas y Metas de Ahorro:** Historial de abonos a pasivos y progreso de ahorro con persistencia relacional.
- **Planificación Semanal de Alimentación:** Menú semanal de lunes a domingo con recetas, ingredientes y consolidación matemática automática en la lista de compras.
- **Gestión del Hogar:** Tareas domésticas con prioridades y fechas límite, eventos, lista de compras interactiva e inventario con alertas de caducidad.
- **Asistente IA Contextual:** Integración con Google Gemini 2.5 Flash alimentado con el contexto privado del hogar y persistencia de conversaciones en MySQL.
- **Autenticación y Seguridad Integral:** Sesiones criptográficas HMAC-SHA256, hashing bcrypt (costo 10), recuperación de contraseñas por correo con tokens SHA-256 de un solo uso, rate limiting contra fuerza bruta y cabeceras HTTP reforzadas.
- **Observabilidad y Auditoría:** Tabla `audit_logs` con sanitización de datos sensibles y logging estructurado.
- **Recuperación ante Desastres (DRP):** Scripts automatizados de respaldo con checksum SHA-256 y simulación de restauración en caliente.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 15.5.28 (App Router, Server Actions)
- **Frontend:** React 19.3.1, TypeScript 5.9.3, Tailwind CSS 3.4.17
- **Base de Datos:** MySQL 8.4.11 (Aiven Cloud InnoDB con SSL)
- **Driver:** `mysql2/promise` 3.24.6
- **Validación:** Zod 4.6.7
- **Seguridad:** Node.js Crypto, bcryptjs 3.0.3, Rate Limiting por ventana deslizante
- **Servicios Externos:** Google Gemini AI Studio (`@google/genai`), Resend Mail API

---

## 🚀 Inicio Rápido

### 1. Clonar e Instalar
```bash
git clone <url-del-repositorio>
cd homeflow
pnpm install
```

### 2. Configuración de Variables de Entorno
Copia la plantilla y configura tus credenciales:
```bash
cp .env.example .env.local
```

### 3. Migración de Base de Datos
Aplica el esquema canónico e índices de alto rendimiento:
```bash
node scripts/migrate-phase4.mjs
```

### 4. Ejecutar en Desarrollo
```bash
pnpm dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🧪 Pruebas Automatizadas y Auditoría

HOMECALM cuenta con una cobertura integral de pruebas de integración y regresión:

```bash
# Fase 1: Sesiones, Fechas nativas y Transacciones ACID (20 pruebas)
node scripts/verify-phase1.mjs

# Fase 2: Operaciones CRUD Completas en los módulos (35 pruebas)
node scripts/verify-phase2.mjs

# Fase 3: Alimentación, Onboarding, Asistente Gemini y Reset de Contraseña (21 pruebas)
node scripts/verify-phase3.mjs

# Fase 4: Concurrencia de 10 hilos, RBAC, Rate Limiting, Seguridad e Índices (28 pruebas)
node scripts/verify-phase4.mjs

# Total: 104/104 pruebas exitosas (100% aprobación)
```

---

## 💾 Respaldo y Restauración de Base de Datos

```bash
# Generar respaldo completo con firma SHA-256:
node scripts/backup-db.mjs

# Ejecutar simulación de restauración en caliente (DRP):
node scripts/restore-test.mjs
```

---

## 📚 Documentación Técnica Detallada

La suite completa de documentación técnica y operativa se encuentra en la carpeta [`docs/`](./docs):

- [Documentación Técnica del Sistema](./docs/DOCUMENTACION_TECNICA.md)
- [Arquitectura de Software y Modelo de Aislamiento](./docs/ARQUITECTURA.md)
- [Guía de Configuración y Ejecución](./docs/CONFIGURACION.md)
- [Diccionario de Variables de Entorno](./docs/VARIABLES_ENTORNO.md)
- [Modelo de Base de Datos y Diagrama ERD](./docs/BASE_DE_DATOS.md)
- [Manual de Despliegue en Producción](./docs/DESPLIEGUE.md)
- [Plan de Respaldo y Recuperación ante Desastres (DRP)](./docs/RESPALDOS_Y_RECUPERACION.md)
- [Auditoría y Políticas de Seguridad](./docs/SEGURIDAD.md)
- [Manual de Usuario Final](./docs/MANUAL_DE_USUARIO.md)

---

## 📄 Licencia y Créditos

Desarrollado para **HOMECALM** — 2026. Todos los derechos reservados.
