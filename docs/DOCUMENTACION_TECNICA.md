# DOCUMENTACIÓN TÉCNICA – HOMECALM

## 1. Visión General del Sistema
**HOMECALM** es una plataforma SaaS integral para la administración inteligente, financiera y operativa del hogar. Permite a los miembros de una familia coordinar finanzas compartidas, presupuestos, menús semanales de alimentación con consolidación automática de compras, inventario de despensa, tareas domésticas, eventos y asistencia contextual potenciada por Inteligencia Artificial generativa.

---

## 2. Pila Tecnológica (Tech Stack)

| Capa | Tecnología | Versión | Justificación Técnica |
|---|---|---|---|
| **Framework Web** | Next.js (App Router) | 15.5.28 | Arquitectura moderna React Server Components, Server Actions nativas, rutas dinámicas y estáticas optimizadas. |
| **Librería UI** | React | 19.3.1 | Concurrencia de renderizado, hooks modernos (`useActionState`, `useTransition`), compatibilidad con Server Actions. |
| **Lenguaje** | TypeScript | 5.9.3 | Tipado estático estricto en frontend y backend, interfaces compartidas y validaciones en tiempo de compilación. |
| **Estilos** | Tailwind CSS / PostCSS | 3.4.17 / 8.5.32 | Utility-first CSS con paleta de diseño intencional y diseño responsive. |
| **Base de Datos** | MySQL (Aiven Cloud) | 8.4.11 | Motor relacional transaccional ACID (InnoDB), soporte para transacciones bancarias, índices compuestos y foreign keys en cascada. |
| **Driver MySQL** | `mysql2/promise` | 3.24.6 | Conexiones mediante Connection Pool resiliente con soporte de promesas asíncronas y consultas preparadas (evita SQL Injection). |
| **Seguridad y Criptografía** | Node.js `crypto` + `bcryptjs` | 3.0.3 | Hashing de contraseñas con salt (costo 10), tokens criptográficos SHA-256 para recuperación de credenciales y cookies de sesión HMAC-SHA256 con firmas de 32+ bytes. |
| **Validación de Datos** | Zod | 4.6.7 | Esquemas de validación estrictos en Server Actions y formularios de usuario. |
| **Inteligencia Artificial** | Google GenAI SDK (`@google/genai`) | 2.32.0 | Modelo Gemini 2.5 Flash con inyección de contexto privado del hogar y límite de timeout de 15 segundos. |
| **Servicio de Correo** | Resend SDK | 6.37.0 | Notificaciones transaccionales para recuperación segura de contraseñas. |

---

## 3. Estructura del Código Fuente

```text
homeflow/
├── docs/                      # Suite completa de documentación técnica y operativa
├── scripts/                   # Scripts de migración, auditoría, respaldo y verificación
│   ├── backup-db.mjs          # Extracción segura de BD con checksum SHA-256
│   ├── restore-test.mjs       # Prueba de restauración en caliente en tablas temporales
│   ├── migrate-phase4.mjs     # Migración de esquemas e índices de Fase 4
│   ├── verify-phase1.mjs      # Suite de pruebas automatizadas: Fase 1 (20 pruebas)
│   ├── verify-phase2.mjs      # Suite de pruebas automatizadas: Fase 2 (35 pruebas)
│   ├── verify-phase3.mjs      # Suite de pruebas automatizadas: Fase 3 (21 pruebas)
│   └── verify-phase4.mjs      # Suite de pruebas automatizadas: Fase 4 (28 pruebas)
├── src/
│   ├── actions/               # Server Actions (Mutaciones Backend seguras)
│   │   ├── auth.ts            # Registro, login, logout, recuperación de contraseña, rate limiting
│   │   ├── dashboard.ts       # Carga agregada de métricas financieras y operativas
│   │   ├── meals.ts           # Gestión de planes semanales, platos e ingredientes
│   │   ├── modules.ts         # Operaciones CRUD transaccionales (Cuentas, Tareas, etc.)
│   │   ├── onboarding.ts      # Flujo interactivo de configuración inicial
│   │   └── chat.ts            # Asistente IA contextual con persistencia en MySQL
│   ├── app/                   # App Router de Next.js
│   │   ├── (auth)/            # Rutas de autenticación pública (login, register, forgot-password, reset-password)
│   │   ├── (dashboard)/       # Vistas protegidas de la aplicación
│   │   ├── error.tsx          # Error Boundary de aplicación
│   │   ├── global-error.tsx   # Error Boundary raíz
│   │   ├── globals.css        # Definición de variables CSS y Tailwind
│   │   └── layout.tsx         # Layout raíz con fuentes tipográficas y DemoProvider
│   ├── components/            # Componentes modulares de interfaz de usuario
│   │   ├── auth/              # Formularios de autenticación
│   │   ├── brand/             # Identidad corporativa, logos e imagotipos
│   │   ├── dashboard/         # Widgets y métricas del dashboard
│   │   ├── onboarding/        # Asistente paso a paso de bienvenida
│   │   └── ui/                # Componentes atómicos (botones, inputs, modales, alertas)
│   └── lib/                   # Librerías centrales y utilidades de infraestructura
│       ├── audit.ts           # Registro de auditoría centralizado (audit_logs)
│       ├── auth.ts            # Manejo de sesiones, JWT/HMAC y validación de usuarios
│       ├── db.ts              # Pool de conexiones MySQL con reconexión automática
│       ├── email.ts           # Servicio de envío de correo mediante Resend
│       ├── gemini.ts          # Integración con Google Gemini 2.5 Flash
│       ├── logger.ts          # Logger estructurado con sanitización de secretos
│       ├── rate-limit.ts      # Limitador de tasa por ventana deslizante en memoria
│       └── utils.ts           # Formateadores monetarios, fechas y utilidades de cálculo
├── next.config.mjs            # Cabeceras de seguridad HTTP, configuración PWA e imágenes
├── package.json               # Dependencias y scripts de ejecución
├── pnpm-workspace.yaml        # Configuración de políticas de compilación en pnpm v11
└── schema.sql                 # Estructura DDL canónica y actualizada de la base de datos
```

---

## 4. Patrones de Diseño e Integración

### 4.1 Server Actions como Backend Unificado
Todas las mutaciones de datos se ejecutan en el servidor mediante Server Actions de Next.js (`"use server"`).
- **Validación Estricta:** Toda entrada de datos pasa por validadores Zod antes de alcanzar la base de datos.
- **Autenticación en Cada Petición:** Se valida la sesión criptográfica del usuario (`getSession()`) y se extrae su `household_id`.
- **Aislamiento Multi-Inquilino:** Ninguna consulta SQL de lectura o escritura carece de la cláusula `WHERE household_id = ?`.

### 4.2 Transaccionalidad Bancaria (ACID)
Para cualquier operación que afecte saldos financieros (crear movimiento, editar transacción, transferir entre cuentas, eliminar gasto o registrar abono a deudas):
1. Se abre una transacción explícita (`await conn.beginTransaction()`).
2. Se adquiere bloqueo exclusivo sobre la fila de la cuenta afectada (`SELECT balance FROM accounts WHERE id = ? FOR UPDATE`).
3. Se ejecuta la inserción/modificación.
4. Se recalcula y actualiza el saldo de la cuenta.
5. Se confirma la transacción (`await conn.commit()`).
6. Si ocurre cualquier error, se revierte completamente (`await conn.rollback()`), garantizando cero registros corruptos o inconsistencias.

