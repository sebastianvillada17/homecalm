import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const envPath = path.resolve(".env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  }
}

const host = env.DB_HOST || process.env.DB_HOST;
const port = Number(env.DB_PORT || process.env.DB_PORT || 11498);
const user = env.DB_USER || process.env.DB_USER;
const password = env.DB_PASSWORD || process.env.DB_PASSWORD;
const database = env.DB_NAME || process.env.DB_NAME || "defaultdb";

let pool;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASÓ: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FALLÓ: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🚀 BATERÍA DE PRUEBAS AUTOMATIZADAS - HOMECALM FASE 3");
  console.log("==================================================================");

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  const testSuffix = Date.now().toString().slice(-6);
  const testUserId = crypto.randomUUID();
  const testHouseholdId = crypto.randomUUID();
  const testEmail = `test-phase3-${testSuffix}@homecalm.dev`;

  try {
    // SETUP: Crear hogar y usuario de prueba
    console.log("\n📦 Preparando entorno de pruebas...");
    await pool.query(
      "INSERT INTO households (id, name, currency, timezone, onboarding_completed, onboarding_step, created_at) VALUES (?, ?, 'COP', 'America/Bogota', FALSE, 1, NOW())",
      [testHouseholdId, `Hogar Test ${testSuffix}`]
    );

    const initialHash = await bcrypt.hash("ContrasenaInicial123", 10);
    await pool.query(
      "INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, 'Usuario Fase 3', ?, NOW())",
      [testUserId, testEmail, initialHash]
    );

    await pool.query(
      "INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, 'admin', NOW())",
      [crypto.randomUUID(), testHouseholdId, testUserId]
    );
    console.log("-> Usuario y hogar de prueba creados.");

    // =========================================================================
    // PILAR 1: MENÚ SEMANAL DE ALIMENTACIÓN & CONSOLIDACIÓN EN COMPRAS
    // =========================================================================
    console.log("\n🍽️ PILAR 1: MENÚ SEMANAL Y CONSOLIDACIÓN DE INGREDIENTES");

    // 1.1 Crear plan semanal
    const planId = crypto.randomUUID();
    const weekStart = "2026-11-09";
    await pool.query(
      "INSERT INTO weekly_meal_plans (id, household_id, week_start_date, notes, created_at) VALUES (?, ?, ?, 'Menú de prueba', NOW())",
      [planId, testHouseholdId, weekStart]
    );

    const [planRows] = await pool.query(
      "SELECT id, week_start_date FROM weekly_meal_plans WHERE id = ?",
      [planId]
    );
    assert(planRows.length === 1 && planRows[0].week_start_date !== null, "Plan semanal creado y persistido");

    // 1.2 Agregar Plato A con ingredientes
    const itemAId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO meal_plan_items (id, plan_id, day_of_week, meal_type, dish_name, description, portions, instructions, calories, created_at)
       VALUES (?, ?, 'LUN', 'Almuerzo', 'Ensalada César con Pollo', 'Plato saludable', 2, 'Mezclar lechuga y aderezo', 350, NOW())`,
      [itemAId, planId]
    );

    // Ingredientes plato A: Tomate (2 unidades), Pollo (500 g)
    await pool.query(
      "INSERT INTO meal_item_ingredients (id, meal_item_id, name, quantity, unit, created_at) VALUES (?, ?, 'Tomate chonto', 2, 'unidades', NOW())",
      [crypto.randomUUID(), itemAId]
    );
    await pool.query(
      "INSERT INTO meal_item_ingredients (id, meal_item_id, name, quantity, unit, created_at) VALUES (?, ?, 'Pechuga de pollo', 500, 'g', NOW())",
      [crypto.randomUUID(), itemAId]
    );

    // 1.3 Agregar Plato B con ingredientes
    const itemBId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO meal_plan_items (id, plan_id, day_of_week, meal_type, dish_name, portions, created_at)
       VALUES (?, ?, 'MAR', 'Cena', 'Sopa de Tomate Casera', 2, NOW())`,
      [itemBId, planId]
    );

    // Ingredientes plato B: Tomate (3 unidades - compatible para sumar con 2 unidades), Crema de leche (200 ml)
    await pool.query(
      "INSERT INTO meal_item_ingredients (id, meal_item_id, name, quantity, unit, created_at) VALUES (?, ?, 'Tomate chonto', 3, 'unidades', NOW())",
      [crypto.randomUUID(), itemBId]
    );
    await pool.query(
      "INSERT INTO meal_item_ingredients (id, meal_item_id, name, quantity, unit, created_at) VALUES (?, ?, 'Crema de leche', 200, 'ml', NOW())",
      [crypto.randomUUID(), itemBId]
    );

    // Verificar consulta de platos e ingredientes
    const [itemRows] = await pool.query(
      "SELECT id, dish_name FROM meal_plan_items WHERE plan_id = ?",
      [planId]
    );
    assert(itemRows.length === 2, "Platos persistidos en MySQL correctamente (2 platos)");

    const [ingRows] = await pool.query(
      "SELECT name, quantity, unit FROM meal_item_ingredients WHERE meal_item_id IN (?, ?)",
      [itemAId, itemBId]
    );
    assert(ingRows.length === 4, "Ingredientes persistidos en MySQL correctamente (4 ingredientes)");

    // 1.4 Simulación de Consolidación Inteligente hacia Lista de Compras
    // Clave: Tomate chonto (2 uds) + Tomate chonto (3 uds) => 5 unidades
    const consMap = new Map();
    for (const ing of ingRows) {
      const key = `${ing.name.toLowerCase().trim()}::${ing.unit.toLowerCase().trim()}`;
      const qty = Number(ing.quantity);
      if (consMap.has(key)) {
        consMap.set(key, { ...consMap.get(key), quantity: consMap.get(key).quantity + qty });
      } else {
        consMap.set(key, { name: ing.name, quantity: qty, unit: ing.unit });
      }
    }

    const tomateKey = "tomate chonto::unidades";
    assert(consMap.has(tomateKey) && consMap.get(tomateKey).quantity === 5, "Consolidación matemática correcta: 2 uds + 3 uds = 5 uds de Tomate chonto");
    assert(consMap.size === 3, "Número consolidado de productos único = 3 (Tomate 5 uds, Pollo 500g, Crema 200ml)");

    // 1.5 Inserción en Lista de Compras
    const shoppingListId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO shopping_lists (id, household_id, name, is_active, created_at) VALUES (?, ?, 'Lista Semana 45', TRUE, NOW())",
      [shoppingListId, testHouseholdId]
    );

    for (const item of consMap.values()) {
      await pool.query(
        "INSERT INTO shopping_items (id, list_id, name, quantity, unit, price, purchased, created_at) VALUES (?, ?, ?, ?, ?, 0, FALSE, NOW())",
        [crypto.randomUUID(), shoppingListId, item.name, item.quantity, item.unit]
      );
    }

    const [shopItems] = await pool.query(
      "SELECT name, quantity, unit FROM shopping_items WHERE list_id = ?",
      [shoppingListId]
    );
    assert(shopItems.length === 3, "Ingredientes consolidados insertados en shopping_items (3 items)");
    const tomateItem = shopItems.find(s => s.name.toLowerCase().includes("tomate"));
    assert(Number(tomateItem.quantity) === 5, "Cantidad de tomate persistida en lista de compras es exactamente 5");

    // 1.6 Eliminación y Cascada de Ingredientes
    await pool.query("DELETE FROM meal_plan_items WHERE id = ?", [itemAId]);
    const [remainingIngs] = await pool.query("SELECT id FROM meal_item_ingredients WHERE meal_item_id = ?", [itemAId]);
    assert(remainingIngs.length === 0, "Eliminación en CASCADA de ingredientes comprobada");

    // =========================================================================
    // PILAR 2: ONBOARDING GUIADO PARA NUEVOS HOGARES
    // =========================================================================
    console.log("\n🧭 PILAR 2: ONBOARDING GUIADO DE HOGAR");

    // 2.1 Verificar estado inicial
    const [hhState0] = await pool.query(
      "SELECT onboarding_completed, onboarding_step FROM households WHERE id = ?",
      [testHouseholdId]
    );
    assert(hhState0[0].onboarding_completed === 0 && hhState0[0].onboarding_step === 1, "Hogar inicia con onboarding_completed = FALSE y paso = 1");

    // 2.2 Avance de pasos
    await pool.query("UPDATE households SET onboarding_step = 2, name = 'Hogar Renovado', currency = 'USD' WHERE id = ?", [testHouseholdId]);
    const [hhState1] = await pool.query("SELECT name, currency, onboarding_step FROM households WHERE id = ?", [testHouseholdId]);
    assert(hhState1[0].name === "Hogar Renovado" && hhState1[0].currency === "USD" && hhState1[0].onboarding_step === 2, "Paso 2 guardado: Nombre y Moneda actualizados");

    // 2.3 Creación de cuenta en onboarding (Paso 3)
    const onbAccId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO accounts (id, household_id, name, type, balance, created_at) VALUES (?, ?, 'Cuenta Onboarding', 'bank', 1500, NOW())",
      [onbAccId, testHouseholdId]
    );
    await pool.query("UPDATE households SET onboarding_step = 3 WHERE id = ?", [testHouseholdId]);
    const [accCheck] = await pool.query("SELECT balance FROM accounts WHERE id = ?", [onbAccId]);
    assert(accCheck.length === 1 && Number(accCheck[0].balance) === 1500, "Paso 3: Cuenta inicial creada con saldo en MySQL");

    // 2.4 Finalización de onboarding
    await pool.query("UPDATE households SET onboarding_completed = TRUE, onboarding_step = 6 WHERE id = ?", [testHouseholdId]);
    const [hhStateFinal] = await pool.query("SELECT onboarding_completed, onboarding_step FROM households WHERE id = ?", [testHouseholdId]);
    assert(hhStateFinal[0].onboarding_completed === 1 && hhStateFinal[0].onboarding_step === 6, "Onboarding finalizado con éxito: onboarding_completed = TRUE");

    // =========================================================================
    // PILAR 3: ASISTENTE INTELIGENTE CON PERSISTENCIA Y CONTEXTO
    // =========================================================================
    console.log("\n🤖 PILAR 3: ASISTENTE INTELIGENTE (CHAT & CONTEXTO)");

    // 3.1 Crear conversación de chat
    const convId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO chat_conversations (id, household_id, user_id, title, created_at) VALUES (?, ?, ?, 'Conversación de Prueba', NOW())",
      [convId, testHouseholdId, testUserId]
    );

    // 3.2 Insertar mensaje de usuario
    const userMsgId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO chat_messages (id, conversation_id, sender, content, created_at) VALUES (?, ?, 'user', '¿Cuál es el saldo de mi cuenta y qué comidas tengo?', NOW())",
      [userMsgId, convId]
    );

    // 3.3 Insertar respuesta de asistente
    const aiMsgId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO chat_messages (id, conversation_id, sender, content, created_at) VALUES (?, ?, 'assistant', 'Tu saldo en Cuenta Onboarding es de $1,500 USD y tienes programada una Sopa de Tomate Casera para el martes.', NOW())",
      [aiMsgId, convId]
    );

    // 3.4 Consultar historial ordenado
    const [chatHistory] = await pool.query(
      "SELECT sender, content FROM chat_messages WHERE conversation_id = ?",
      [convId]
    );
    assert(chatHistory.length === 2, "Historial de chat persistido en MySQL (2 mensajes)");
    const hasUser = chatHistory.some((m) => m.sender === "user");
    const hasAssistant = chatHistory.some((m) => m.sender === "assistant");
    assert(hasUser && hasAssistant, "Roles 'user' y 'assistant' verificados en la conversación");

    // 3.5 Limpieza de conversación
    await pool.query("DELETE FROM chat_messages WHERE conversation_id = ?", [convId]);
    const [emptyChat] = await pool.query("SELECT id FROM chat_messages WHERE conversation_id = ?", [convId]);
    assert(emptyChat.length === 0, "Limpieza de historial de chat confirmada");

    // =========================================================================
    // PILAR 4: RECUPERACIÓN DE CONTRASEÑA REAL CON HASH SHA-256 Y EXPIRACIÓN
    // =========================================================================
    console.log("\n🔐 PILAR 4: RECUPERACIÓN DE CONTRASEÑA MEDIANTE EMAIL Y SHA-256");

    // 4.1 Generación de token seguro
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    assert(rawToken.length === 64 && tokenHash.length === 64, "Token aleatorio criptográfico y hash SHA-256 generados");

    // 4.2 Guardar solicitud de restablecimiento con 1 hora de vigencia
    const resetId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())`,
      [resetId, testUserId, tokenHash]
    );

    // 4.3 Validación del token por hash
    const [tokenLookup] = await pool.query(
      `SELECT id, user_id FROM password_resets 
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    assert(tokenLookup.length === 1 && tokenLookup[0].user_id === testUserId, "Token válido localizado mediante SHA-256 y vigencia horaria");

    // 4.4 Simulación de Token Expirado
    const expiredRawToken = crypto.randomBytes(32).toString("hex");
    const expiredHash = crypto.createHash("sha256").update(expiredRawToken).digest("hex");
    await pool.query(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW())`,
      [crypto.randomUUID(), testUserId, expiredHash]
    );

    const [expiredLookup] = await pool.query(
      `SELECT id FROM password_resets 
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [expiredHash]
    );
    assert(expiredLookup.length === 0, "Token expirado correctamente rechazado por MySQL");

    // 4.5 Restablecer contraseña con bcrypt y marcar token como usado
    const newPassword = "NuevaContrasenaSegura2026!";
    const newHash = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, testUserId]);
    await pool.query("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [resetId]);

    // 4.6 Verificar que el token usado ya NO puede volver a utilizarse (replay attack)
    const [usedLookup] = await pool.query(
      `SELECT id FROM password_resets 
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    assert(usedLookup.length === 0, "Prevención de Replay Attack: Token usado rechazado para nuevos usos");

    // 4.7 Verificar autenticación con nueva contraseña
    const [userAuthCheck] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [testUserId]);
    const validLogin = await bcrypt.compare(newPassword, userAuthCheck[0].password_hash);
    const oldLoginValid = await bcrypt.compare("ContrasenaInicial123", userAuthCheck[0].password_hash);
    assert(validLogin === true, "Inicio de sesión con nueva contraseña EXITOSO");
    assert(oldLoginValid === false, "Inicio de sesión con contraseña antigua DENEGADO");

    // =========================================================================
    // TEARDOWN: Limpieza de datos de prueba
    // =========================================================================
    console.log("\n🧹 Limpieza de datos de prueba...");
    await pool.query("DELETE FROM households WHERE id = ?", [testHouseholdId]);
    await pool.query("DELETE FROM users WHERE id = ?", [testUserId]);
    console.log("-> Registros de prueba removidos.");

  } catch (err) {
    console.error("❌ Excepción en ejecución de pruebas:", err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTADO FINAL: ${passed} PASADAS | ${failed} FALLIDAS`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
