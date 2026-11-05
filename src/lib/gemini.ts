import { GoogleGenAI } from "@google/genai";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export async function generateAssistantResponse({
  userPrompt,
  householdContext,
  history = [],
}: {
  userPrompt: string;
  householdContext: string;
  history?: ChatTurn[];
}): Promise<{ text: string; modelUsed: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return {
      text: `¡Hola! Actualmente la clave de API de Gemini (GEMINI_API_KEY) no está configurada en las variables de entorno (.env.local).\n\nSin embargo, aquí tienes un resumen de la información actual de tu hogar:\n\n${householdContext}\n\nPara activar la inteligencia artificial generativa en tiempo real, agrega GEMINI_API_KEY en tu archivo .env.local.`,
      modelUsed: "local-context-fallback",
    };
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const systemInstruction = `
Eres el Asistente Inteligente de HOMECALM, la aplicación de gestión y armonía del hogar.
Tu tono es cálido, empático, claro, conciso y muy útil. 
Siempre respondes en español.

Tienes acceso al estado real y actualizado del hogar que te compartimos a continuación. 
Utiliza estos datos para responder preguntas sobre finanzas, presupuestos, tareas, compras, deudas, ahorros y menú semanal:
---
${householdContext}
---

Instrucciones de comportamiento:
1. Responde de forma directa, amable y estructurada con viñetas o números cuando sea apropiado.
2. Si te preguntan sobre presupuestos o dinero, usa los valores reales reportados arriba (en formato monetario).
3. Si un presupuesto supera el 80% o está excedido, adviértelo con tacto y sugiere cómo equilibrarlo.
4. Si te piden ideas de comidas o recetas, ten en cuenta el menú semanal y los ingredientes de la lista de compras.
5. Nunca inventes datos financieros que contradigan el contexto real provisto. Si algo no está registrado, indícalo con naturalidad y sugiere crearlo.
6. Mantén las respuestas legibles y evita párrafos excesivamente largos.
`.trim();

  // Convertir historial a formato de Google GenAI
  // Roles en SDK: 'user' y 'model'
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const h of history.slice(-8)) { // Mantener últimos 8 mensajes para contexto óptimo
    contents.push({
      role: h.role,
      parts: [{ text: h.text }],
    });
  }

  // Agregar el mensaje actual del usuario
  contents.push({
    role: "user",
    parts: [{ text: userPrompt }],
  });

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

  // Intentar primero con gemini-2.5-flash y fallback a gemini-1.5-flash
  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        }),
        15000,
        `Timeout de 15s excedido esperando respuesta de ${model}`
      );

      const replyText = response.text?.trim() || "";
      if (replyText) {
        return {
          text: replyText,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      console.warn(`[HOMECALM] Error o timeout con modelo ${model}:`, err.message);
      lastError = err;
    }
  }

  console.error("[HOMECALM] Fallaron todos los modelos de Gemini:", lastError?.message);
  return {
    text: `Lo siento, ocurrió un error temporal al comunicarme con Gemini (${lastError?.message || "error de conexión"}). Aquí tienes los datos de tu hogar para consulta directa:\n\n${householdContext}`,
    modelUsed: "error-fallback",
  };
}

