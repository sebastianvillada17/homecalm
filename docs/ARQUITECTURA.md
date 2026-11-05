# ARQUITECTURA DEL SISTEMA – HOMECALM

## 1. Diagrama de Arquitectura de Capas

```mermaid
flowchart TD
    subgraph Cliente["Navegador Web / PWA"]
        UI["React 19 Components (Client & Server)"]
        Forms["Formularios con Validación React Hook Form & Zod"]
    end

    subgraph Aplicacion["Capa de Aplicación (Next.js 15 App Router)"]
        Proxy["Proxy & Security Headers (next.config.mjs)"]
        Middleware["Session Verifier & HMAC Validator"]
        RateLimiter["In-Memory Sliding Window Rate Limiter"]
        ServerActions["Server Actions ('use server')"]
        AuditService["Audit Logger (audit_logs)"]
        StructuredLogger["Structured Logger (logger.ts)"]
    end

    subgraph Integraciones["Servicios Externos"]
        GeminiAPI["Google Gemini 2.5 Flash API (15s Timeout)"]
        ResendMail["Resend Mail Gateway (10s Timeout)"]
    end

    subgraph Persistencia["Capa de Datos (MySQL 8.4 InnoDB)"]
        Pool["mysql2 Connection Pool (SSL enabled)"]
        Tables["22 Tablas Normalizadas (3FN) con Índices Compuestos"]
        Isolation["Multi-Tenant Isolation (household_id scope)"]
    end

    UI --> Proxy
    Forms --> ServerActions
    Proxy --> Middleware
    Middleware --> RateLimiter
    RateLimiter --> ServerActions
    ServerActions --> AuditService
    ServerActions --> StructuredLogger
    ServerActions --> GeminiAPI
    ServerActions --> ResendMail
    ServerActions --> Pool
    Pool --> Tables
    Tables --> Isolation
```

---

## 2. Modelo de Aislamiento Multi-Inquilino (Multi-Tenancy)

HOMECALM implementa un modelo de **Aislamiento Lógico por Household**:
1. Toda entidad operativa (`accounts`, `transactions`, `budgets`, `tasks`, `events`, `inventory`, `shopping_lists`, `debts`, `savings_goals`, `weekly_meal_plans`, `chat_conversations`, `audit_logs`) contiene una clave foránea obligatoria `household_id`.
2. Los usuarios se asocian a los hogares mediante la tabla `household_members`, que define su rol (`admin` o `member`).
3. En la capa de Server Actions, **nunca** se acepta el `household_id` desde el payload del cliente. El `household_id` se extrae exclusivamente de la cookie de sesión firmada criptográficamente con HMAC-SHA256.
4. Cada consulta de lectura y escritura incorpora de forma obligatoria e inmutable el filtro `WHERE household_id = ?`, haciendo imposible el acceso cruzado entre hogares distintos.

---

## 3. Modelo de Control de Acceso Basado en Roles (RBAC)

| Rol | Alcance de Permisos | Restricciones |
|---|---|---|
| **Admin** | Control total del hogar: finanzas, miembros, presupuestos, configuración global del hogar y eliminación de cuentas. | Sujeto a rate limiting en acciones sensibles y registro obligatorio en `audit_logs`. |
| **Member** | Lectura y gestión colaborativa de tareas, compras, eventos, inventario, visualización y registro de transacciones. | Bloqueado para renombrar el hogar, cambiar moneda base, eliminar cuentas bancarias o expulsar miembros. |

---

## 4. Flujo de Datos Financieros con Bloqueo de Fila

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant ServerAction as Server Action (modules.ts)
    participant DB as MySQL 8.4 (InnoDB)
    participant Audit as Auditoría (audit_logs)

    Usuario->>ServerAction: Registrar Gasto ($50.000 de Cuenta A)
    ServerAction->>ServerAction: Validar Sesión + Rate Limit + Zod Schema
    ServerAction->>DB: Iniciar Transacción (START TRANSACTION)
    ServerAction->>DB: SELECT balance FROM accounts WHERE id = ? FOR UPDATE (Bloqueo Exclusivo)
    DB-->>ServerAction: Saldo Actual: $200.000
    ServerAction->>DB: INSERT INTO transactions (id, household_id, account_id, amount, ...)
    ServerAction->>DB: UPDATE accounts SET balance = balance - 50000 WHERE id = ?
    ServerAction->>Audit: Registrar evento FINANCIAL_TRANSACTION_CREATE
    ServerAction->>DB: COMMIT
    DB-->>ServerAction: Confirmación Exitosa
    ServerAction-->>Usuario: Saldo Actualizado: $150.000
```

