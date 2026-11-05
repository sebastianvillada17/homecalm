"use client";

import { useState } from "react";
import { Check, ChevronRight, Sparkles, Wallet, CheckSquare, ShoppingBag, Users, X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { QuickTransaction } from "@/components/quick-transaction";
import { addTaskAction, addGroceryAction } from "@/actions/dashboard";

export function WelcomeOnboarding({
  userName,
  householdName,
  hasTransactions,
  hasTasks,
  hasGroceries,
  onRefresh,
}: {
  userName: string;
  householdName: string;
  hasTransactions: boolean;
  hasTasks: boolean;
  hasGroceries: boolean;
  onRefresh: () => void;
}) {
  const [taskInput, setTaskInput] = useState("");
  const [groceryInput, setGroceryInput] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingGrocery, setIsAddingGrocery] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const firstName = userName.split(" ")[0] || "Bienvenido";

  const step1Done = hasTransactions;
  const step2Done = hasTasks;
  const step3Done = hasGroceries;
  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const progressPercent = Math.round((completedCount / 3) * 100);

  async function handleQuickTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskInput.trim() || isAddingTask) return;
    setIsAddingTask(true);
    try {
      await addTaskAction(taskInput.trim());
      setTaskInput("");
      onRefresh();
    } finally {
      setIsAddingTask(false);
    }
  }

  async function handleQuickGrocery(e: React.FormEvent) {
    e.preventDefault();
    if (!groceryInput.trim() || isAddingGrocery) return;
    setIsAddingGrocery(true);
    try {
      await addGroceryAction(groceryInput.trim());
      setGroceryInput("");
      onRefresh();
    } finally {
      setIsAddingGrocery(false);
    }
  }

  if (dismissed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-xs text-muted shadow-sm">
        <span className="flex items-center gap-2 font-medium text-ink">
          <Sparkles size={14} className="text-forest" /> Guía de inicio rápido ({completedCount} de 3 pasos)
        </span>
        <button
          onClick={() => setDismissed(false)}
          className="text-xs font-bold text-forest hover:underline"
        >
          Mostrar guía
        </button>
      </div>
    );
  }

  return (
    <Card className="relative overflow-hidden border-[#cae5d4] bg-gradient-to-br from-[#f2f9f5] via-white to-[#fcfaf7] p-5 sm:p-6 shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#d7ede0]/60 blur-2xl" />

      <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-forest">
            <Sparkles size={12} /> Primeros pasos en tu hogar
          </div>
          <h2 className="mt-2.5 font-display text-[26px] leading-tight text-ink sm:text-[30px]">
            ¡Hola, {firstName}! Te damos la bienvenida a {householdName}.
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#5e6d64] max-w-[620px]">
            Tu espacio ya está creado en tu base de datos y sin datos de prueba. Sigue estos 3 sencillos pasos para empezar a organizar la vida en casa:
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="self-end rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink sm:self-start"
          title="Ocultar guía"
        >
          <X size={17} />
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-[#495e52]">Progreso de configuración inicial</span>
          <span className="text-forest">{completedCount} de 3 pasos completados ({progressPercent}%)</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e3ece6]">
          <div
            className="h-full rounded-full bg-forest transition-all duration-500"
            style={{ width: `${Math.max(8, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Grid de 3 pasos */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Paso 1 */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
            step1Done
              ? "border-[#bfe3cd] bg-[#f4faf6]"
              : "border-line bg-white shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className={`grid h-8 w-8 place-items-center rounded-xl ${step1Done ? "bg-forest text-white" : "bg-[#edf6f0] text-forest"}`}>
                {step1Done ? <Check size={16} strokeWidth={3} /> : <Wallet size={16} />}
              </span>
              <span className={`text-[10px] font-bold ${step1Done ? "text-forest" : "text-muted"}`}>
                {step1Done ? "Completado" : "Paso 1"}
              </span>
            </div>
            <h3 className="mt-3 text-xs font-bold text-ink">1. Registra tu saldo o ingreso</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">
              {step1Done
                ? "¡Excelente! Ya registraste tus primeros movimientos."
                : "Agrega cuánto tienes en tu cuenta o tu último sueldo para ver tu saldo real."}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line/60">
            <QuickTransaction isLoggedIn onSaved={onRefresh} />
          </div>
        </div>

        {/* Paso 2 */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
            step2Done
              ? "border-[#bfe3cd] bg-[#f4faf6]"
              : "border-line bg-white shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className={`grid h-8 w-8 place-items-center rounded-xl ${step2Done ? "bg-forest text-white" : "bg-[#eff5fb] text-[#3d6e99]"}`}>
                {step2Done ? <Check size={16} strokeWidth={3} /> : <CheckSquare size={16} />}
              </span>
              <span className={`text-[10px] font-bold ${step2Done ? "text-forest" : "text-muted"}`}>
                {step2Done ? "Completado" : "Paso 2"}
              </span>
            </div>
            <h3 className="mt-3 text-xs font-bold text-ink">2. Añade tu primer pendiente</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">
              {step2Done
                ? "¡Listo! Ya tienes tareas en tu lista de hoy."
                : "Escribe una rutina de casa (ej. Pagar servicios, Regar plantas, Sacar basura)."}
            </p>
          </div>
          <form onSubmit={handleQuickTask} className="mt-4 pt-3 border-t border-line/60 flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Ej. Pagar el internet"
              className="focus-ring h-9 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-xs outline-none focus:border-forest"
            />
            <Button size="sm" type="submit" disabled={isAddingTask || !taskInput.trim()}>
              Añadir
            </Button>
          </form>
        </div>

        {/* Paso 3 */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
            step3Done
              ? "border-[#bfe3cd] bg-[#f4faf6]"
              : "border-line bg-white shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className={`grid h-8 w-8 place-items-center rounded-xl ${step3Done ? "bg-forest text-white" : "bg-[#fbf4eb] text-[#a57335]"}`}>
                {step3Done ? <Check size={16} strokeWidth={3} /> : <ShoppingBag size={16} />}
              </span>
              <span className={`text-[10px] font-bold ${step3Done ? "text-forest" : "text-muted"}`}>
                {step3Done ? "Completado" : "Paso 3"}
              </span>
            </div>
            <h3 className="mt-3 text-xs font-bold text-ink">3. Arma tu lista de compras</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted">
              {step3Done
                ? "¡Genial! Productos añadidos a tu despensa/mercado."
                : "Anota lo que hace falta en la nevera o despensa para comprar."}
            </p>
          </div>
          <form onSubmit={handleQuickGrocery} className="mt-4 pt-3 border-t border-line/60 flex gap-2">
            <input
              type="text"
              value={groceryInput}
              onChange={(e) => setGroceryInput(e.target.value)}
              placeholder="Ej. Huevos, Café, Frutas"
              className="focus-ring h-9 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-xs outline-none focus:border-forest"
            />
            <Button size="sm" type="submit" disabled={isAddingGrocery || !groceryInput.trim()}>
              Añadir
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

