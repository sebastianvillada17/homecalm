"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  ArrowUp,
  Bot,
  CalendarDays,
  Lightbulb,
  Sparkles,
  WalletCards,
  RotateCcw,
  ShoppingCart,
  CheckSquare,
  Wheat,
  Loader2,
  Lock,
} from "lucide-react";
import { Badge, Button, Card, PageHeading } from "@/components/ui";
import {
  getAssistantHistoryAction,
  sendAssistantMessageAction,
  clearAssistantHistoryAction,
  type ChatMessageData,
} from "@/actions/assistant";

const starters = [
  "¿Cómo va el presupuesto este mes?",
  "¿Qué nos falta para el mercado?",
  "¿Qué tareas tenemos pendientes?",
  "¿Qué hay en el menú semanal?",
  "¿Cómo van nuestras metas de ahorro?",
];

export function AssistantView() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [modelUsedInfo, setModelUsedInfo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const res = await getAssistantHistoryAction();
        if (res.success) {
          setConversationId(res.conversationId || null);
          setMessages(res.messages || []);
        }
      } catch (err) {
        console.error("Error cargando historial de chat:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (textToSend = input) => {
    const clean = textToSend.trim();
    if (!clean || isSending) return;

    setInput("");
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: ChatMessageData = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId || "",
      sender: "user",
      content: clean,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendAssistantMessageAction(clean, conversationId || undefined);
      if (res.success && res.assistantMessage && res.userMessage) {
        if (!conversationId && res.conversationId) {
          setConversationId(res.conversationId);
        }
        setModelUsedInfo(res.assistantMessage.modelUsed || null);
        const userMsg: ChatMessageData = res.userMessage;
        const aiMsg: ChatMessageData = res.assistantMessage;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          userMsg,
          aiMsg,
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            conversationId: conversationId || "",
            sender: "assistant",
            content: `Error: ${res.error || "No se pudo obtener respuesta del asistente."}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversationId: conversationId || "",
          sender: "assistant",
          content: "Ocurrió un error inesperado al procesar tu solicitud.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!conversationId || messages.length === 0) return;
    if (!confirm("¿Deseas reiniciar esta conversación?")) return;

    try {
      await clearAssistantHistoryAction(conversationId);
      setMessages([]);
    } catch (err) {
      console.error("Error limpiando chat:", err);
    }
  };

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="INTELIGENCIA PARA EL HOGAR"
        title="Asistente de Hogar con Gemini"
        description="Consulta tus finanzas, pendientes, compras y menús con inteligencia artificial conectada a tus datos reales."
        action={
          <div className="flex items-center gap-2">
            <Badge tone="green">
              <Sparkles size={11} className="mr-1 inline" />
              Gemini 2.5 Flash
            </Badge>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_.65fr]">
        <Card className="flex min-h-[580px] flex-col overflow-hidden">
          {/* Header del chat */}
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-canvas/40">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest/10 text-forest">
                <Bot size={20} />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">HOMECALM AI Assistant</p>
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado a datos reales de MySQL
                </p>
              </div>
            </div>

            {messages.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleClearChat}
                className="h-8 text-[11px] px-2.5 flex items-center gap-1 text-muted hover:text-ink"
                title="Limpiar conversación"
              >
                <RotateCcw size={12} />
                Reiniciar
              </Button>
            )}
          </div>

          {/* Área de mensajes con scroll */}
          <div className="app-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
            {isLoadingHistory ? (
              <div className="flex h-full items-center justify-center py-20 text-xs text-muted">
                <Loader2 size={20} className="animate-spin text-forest mr-2" />
                Cargando conversación...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-forest/10 text-forest mb-3">
                  <Sparkles size={24} />
                </span>
                <h3 className="font-serif text-lg font-bold text-ink">
                  ¡Hola! ¿En qué puedo orientarte hoy?
                </h3>
                <p className="mt-1 text-xs text-muted max-w-sm leading-relaxed">
                  Tengo acceso en tiempo real a tus cuentas, presupuestos, lista de compras, menú semanal y pendientes. Hazme cualquier pregunta sobre tu hogar.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.sender === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest">
                        <Sparkles size={13} />
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isUser
                          ? "rounded-br-sm bg-forest text-white shadow-sm"
                          : "rounded-bl-sm border border-line bg-card text-ink shadow-sm"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest">
                  <Loader2 size={13} className="animate-spin" />
                </span>
                <span className="rounded-2xl border border-line bg-card px-3.5 py-2 text-xs text-muted italic">
                  Consultando datos del hogar y redactando respuesta con Gemini...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input y sugerencias */}
          <div className="border-t border-line p-4 bg-canvas/30">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => handleSend(starter)}
                  disabled={isSending}
                  className="rounded-full border border-line bg-card px-2.5 py-1 text-[10px] font-medium text-muted transition hover:border-forest/40 hover:text-forest"
                >
                  {starter}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 rounded-xl border border-line bg-card p-1.5 pl-3 focus-within:border-forest"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregúntame sobre tus finanzas, comidas o pendientes…"
                disabled={isSending}
                className="h-9 min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
              />
              <Button size="sm" type="submit" disabled={isSending || !input.trim()} aria-label="Enviar mensaje">
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
              </Button>
            </form>

            <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted">
              <span className="flex items-center gap-1">
                <Lock size={10} className="text-forest" /> Privacidad garantizada: tus datos solo se comparten en tu sesión.
              </span>
              {modelUsedInfo && <span>Modelo: {modelUsedInfo}</span>}
            </div>
          </div>
        </Card>

        {/* Panel lateral de capacidades */}
        <div className="space-y-4">
          <Card className="border-[#cae5d4] bg-[#f2f9f5] p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-forest shadow-xs">
              <Lightbulb size={18} />
            </span>
            <p className="mt-3.5 font-serif text-lg font-bold text-ink">¿Qué puedes preguntarle?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#4d6356]">
              El asistente combina la potencia de Gemini con los números reales de tu hogar en tiempo real.
            </p>

            <div className="mt-4 space-y-2">
              <Capability icon={<WalletCards size={13} />} label="Control de presupuestos y gastos" />
              <Capability icon={<ShoppingCart size={13} />} label="Faltantes en la lista de compras" />
              <Capability icon={<Wheat size={13} />} label="Planificación de comidas de la semana" />
              <Capability icon={<CheckSquare size={13} />} label="Priorización de tareas y rutinas" />
              <Capability icon={<CalendarDays size={13} />} label="Próximos eventos y fechas clave" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-forest" />
              <p className="text-xs font-bold text-ink">Seguridad y Aislamiento</p>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              El asistente nunca ejecuta sentencias SQL arbitrarias. Solo lee un resumen contextual autorizado de tu hogar y tus conversaciones se almacenan de forma segura en MySQL vinculadas exclusivamente a tu cuenta.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Capability({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/80 px-3 py-2 text-xs font-medium text-[#465b4f] shadow-2xs">
      <span className="text-forest">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
