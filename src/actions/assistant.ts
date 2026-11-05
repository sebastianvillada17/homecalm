"use server";

import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { buildHouseholdContext } from "@/lib/assistant-context";
import { generateAssistantResponse, type ChatTurn } from "@/lib/gemini";

export interface ChatMessageData {
  id: string;
  conversationId: string;
  sender: "user" | "assistant";
  content: string;
  createdAt: string;
  modelUsed?: string;
}

export async function getAssistantHistoryAction(): Promise<{
  success: boolean;
  conversationId?: string;
  messages?: ChatMessageData[];
  error?: string;
}> {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    // 1. Obtener o crear conversación activa
    let [convRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM chat_conversations 
       WHERE household_id = ? AND user_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [session.householdId, session.id]
    );

    let conversationId: string;
    if (convRows.length === 0) {
      conversationId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO chat_conversations (id, household_id, user_id, title, created_at) VALUES (?, ?, ?, 'Conversación con Asistente', NOW())",
        [conversationId, session.householdId, session.id]
      );
    } else {
      conversationId = convRows[0].id;
    }

    // 2. Obtener mensajes ordenados
    const [msgRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, conversation_id, sender, content, created_at 
       FROM chat_messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    const messages: ChatMessageData[] = msgRows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      sender: r.sender as "user" | "assistant",
      content: r.content,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    }));

    return {
      success: true,
      conversationId,
      messages,
    };
  } catch (err: any) {
    console.error("[HOMECALM] Error obteniendo historial de chat:", err.message);
    return { success: false, error: "No se pudo cargar el historial del asistente." };
  }
}

export async function sendAssistantMessageAction(prompt: string, conversationIdInput?: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  const cleanPrompt = prompt?.trim();
  if (!cleanPrompt) return { success: false, error: "El mensaje no puede estar vacío." };

  const conn = await pool.getConnection();
  try {
    let conversationId = conversationIdInput;

    if (!conversationId) {
      const [cRows] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM chat_conversations WHERE household_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
        [session.householdId, session.id]
      );
      if (cRows.length > 0) {
        conversationId = cRows[0].id;
      } else {
        conversationId = crypto.randomUUID();
        await conn.query(
          "INSERT INTO chat_conversations (id, household_id, user_id, title, created_at) VALUES (?, ?, ?, 'Conversación con Asistente', NOW())",
          [conversationId, session.householdId, session.id]
        );
      }
    } else {
      // Validar pertenencia
      const [cRows] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM chat_conversations WHERE id = ? AND household_id = ?",
        [conversationId, session.householdId]
      );
      if (cRows.length === 0) {
        conn.release();
        return { success: false, error: "Conversación no encontrada o sin permisos." };
      }
    }

    // 1. Guardar mensaje del usuario
    const userMsgId = crypto.randomUUID();
    await conn.query(
      "INSERT INTO chat_messages (id, conversation_id, sender, content, created_at) VALUES (?, ?, 'user', ?, NOW())",
      [userMsgId, conversationId, cleanPrompt]
    );

    // 2. Cargar historial anterior para contexto
    const [prevMessages] = await conn.query<RowDataPacket[]>(
      `SELECT sender, content FROM chat_messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    const history: ChatTurn[] = prevMessages.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("model" as const),
      text: m.content,
    }));

    // 3. Consultar contexto en tiempo real del hogar
    const context = await buildHouseholdContext(session.householdId);

    // 4. Llamar a Gemini API
    const { text: replyText, modelUsed } = await generateAssistantResponse({
      userPrompt: cleanPrompt,
      householdContext: context,
      history,
    });

    // 5. Guardar respuesta del asistente
    const assistantMsgId = crypto.randomUUID();
    await conn.query(
      "INSERT INTO chat_messages (id, conversation_id, sender, content, created_at) VALUES (?, ?, 'assistant', ?, NOW())",
      [assistantMsgId, conversationId, replyText]
    );

    revalidatePath("/asistente");

    const targetConvId = conversationId as string;

    return {
      success: true,
      conversationId: targetConvId,
      userMessage: {
        id: userMsgId,
        conversationId: targetConvId,
        sender: "user" as const,
        content: cleanPrompt,
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: assistantMsgId,
        conversationId: targetConvId,
        sender: "assistant" as const,
        content: replyText,
        createdAt: new Date().toISOString(),
        modelUsed,
      },
    };
  } catch (err: any) {
    console.error("[HOMECALM] Error procesando mensaje de asistente:", err.message);
    return { success: false, error: "Ocurrió un error al procesar el mensaje con el asistente." };
  } finally {
    conn.release();
  }
}

export async function clearAssistantHistoryAction(conversationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "No autenticado" };

  try {
    // Validar pertenencia
    const [chk] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM chat_conversations WHERE id = ? AND household_id = ?",
      [conversationId, session.householdId]
    );
    if (chk.length === 0) {
      return { success: false, error: "Conversación no encontrada." };
    }

    await pool.query("DELETE FROM chat_messages WHERE conversation_id = ?", [conversationId]);
    revalidatePath("/asistente");
    return { success: true };
  } catch (err: any) {
    console.error("[HOMECALM] Error limpiando chat:", err.message);
    return { success: false, error: "No se pudo limpiar el historial de mensajes." };
  }
}
