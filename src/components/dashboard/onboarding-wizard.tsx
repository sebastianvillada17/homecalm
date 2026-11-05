"use client";

import { useState, useTransition } from "react";
import { Button, Card, Badge } from "@/components/ui";
import {
  Sparkles,
  Home,
  CreditCard,
  PieChart,
  CheckSquare,
  PartyPopper,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  type OnboardingStatus,
  saveOnboardingStepAction,
  completeOnboardingAction,
} from "@/actions/onboarding";

interface OnboardingWizardProps {
  initialStatus: OnboardingStatus;
  onFinished: () => void;
}

export function OnboardingWizard({ initialStatus, onFinished }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(initialStatus.step || 1);
  const [householdName, setHouseholdName] = useState(initialStatus.householdName || "Mi Hogar");
  const [currency, setCurrency] = useState(initialStatus.currency || "COP");
  
  // Account
  const [accountName, setAccountName] = useState("Cuenta Principal");
  const [accountType, setAccountType] = useState<"bank" | "cash" | "savings">("bank");
  const [accountBalance, setAccountBalance] = useState<number>(0);

  // Budget
  const [budgetCategory, setBudgetCategory] = useState("Alimentación");
  const [budgetLimit, setBudgetLimit] = useState<number>(1000000);

  // Task
  const [taskTitle, setTaskTitle] = useState("Hacer mercado de la semana");
  const [taskDueDate, setTaskDueDate] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNextStep = (stepNumber: number) => {
    setErrorMsg(null);
    startTransition(async () => {
      let payload: any = { step: stepNumber };

      if (stepNumber === 2) {
        payload.householdName = householdName;
        payload.currency = currency;
      } else if (stepNumber === 3) {
        payload.account = {
          name: accountName,
          type: accountType,
          balance: Number(accountBalance),
        };
      } else if (stepNumber === 4) {
        payload.budget = {
          category: budgetCategory,
          monthlyLimit: Number(budgetLimit),
        };
      } else if (stepNumber === 5) {
        payload.task = {
          title: taskTitle,
          dueDate: taskDueDate || undefined,
        };
      }

      const res = await saveOnboardingStepAction(payload);
      if (!res.success) {
        setErrorMsg(res.error || "Ocurrió un error al guardar el paso.");
        return;
      }
      setStep((prev) => Math.min(6, prev + 1));
    });
  };

  const handleSkipOrComplete = () => {
    startTransition(async () => {
      await completeOnboardingAction();
      onFinished();
    });
  };

  const stepsInfo = [
    { num: 1, title: "Bienvenida" },
    { num: 2, title: "Tu Hogar" },
    { num: 3, title: "Cuenta" },
    { num: 4, title: "Presupuesto" },
    { num: 5, title: "Rutina" },
    { num: 6, title: "Listo" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-up">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-card shadow-2xl border border-line">
        {/* Barra superior con progreso */}
        <div className="border-b border-line bg-canvas/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-forest text-white">
                <Sparkles size={14} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-forest">
                Configuración Inicial · HOMECALM
              </span>
            </div>
            <button
              onClick={handleSkipOrComplete}
              disabled={isPending}
              className="text-[11px] font-medium text-muted hover:text-ink hover:underline"
            >
              Completar después
            </button>
          </div>

          {/* Stepper Dots */}
          <div className="mt-4 flex items-center justify-between gap-1">
            {stepsInfo.map((s) => (
              <div key={s.num} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-all ${
                    step >= s.num ? "bg-forest" : "bg-line"
                  }`}
                />
                <span
                  className={`text-[9px] font-semibold ${
                    step === s.num ? "text-forest" : "text-muted"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* PASO 1: BIENVENIDA */}
          {step === 1 && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-forest/10 text-forest">
                <Home size={32} />
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink">
                ¡Te damos la bienvenida a tu hogar en calma!
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-md mx-auto">
                HOMECALM está diseñado para que lleves las cuentas claras, las compras al día, la alimentación balanceada y los pendientes de casa organizados en un solo lugar.
              </p>
              <div className="pt-4 flex justify-center">
                <Button
                  size="md"
                  onClick={() => handleNextStep(1)}
                  disabled={isPending}
                  className="flex items-center gap-2 px-6"
                >
                  <span>Comenzar en 3 minutos</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: NOMBRE Y MONEDA */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest">Paso 1 de 4</span>
                <h3 className="font-serif text-xl font-bold text-ink">¿Cómo se llama tu hogar?</h3>
                <p className="text-xs text-muted">
                  Personaliza el nombre de tu espacio y la moneda principal para tus finanzas.
                </p>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-ink">Nombre del hogar</label>
                  <input
                    type="text"
                    required
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="Ej: Familia Morales o Mi Depto"
                    className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-ink">Moneda principal</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  >
                    <option value="COP">COP ($) - Peso Colombiano</option>
                    <option value="USD">USD ($) - Dólar Estadounidense</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="MXN">MXN ($) - Peso Mexicano</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                <Button size="sm" variant="secondary" onClick={() => setStep(1)} disabled={isPending}>
                  Atrás
                </Button>
                <Button size="sm" onClick={() => handleNextStep(2)} disabled={isPending}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: CUENTA BANCARIA */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest">Paso 2 de 4</span>
                <h3 className="font-serif text-xl font-bold text-ink">Tu primera cuenta financiera</h3>
                <p className="text-xs text-muted">
                  Agrega una cuenta bancaria o fondo de efectivo para empezar a registrar movimientos.
                </p>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-ink">Nombre de la cuenta</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ej: Bancolombia, Débito o Efectivo"
                    className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-ink">Tipo de cuenta</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                    >
                      <option value="bank">Cuenta Bancaria</option>
                      <option value="cash">Efectivo</option>
                      <option value="savings">Ahorros</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-ink">Saldo inicial ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(Number(e.target.value))}
                      className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                <Button size="sm" variant="secondary" onClick={() => setStep(2)} disabled={isPending}>
                  Atrás
                </Button>
                <Button size="sm" onClick={() => handleNextStep(3)} disabled={isPending}>
                  Crear cuenta y seguir
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4: PRIMER PRESUPUESTO */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest">Paso 3 de 4</span>
                <h3 className="font-serif text-xl font-bold text-ink">Tu primer presupuesto mensual</h3>
                <p className="text-xs text-muted">
                  Tener límites por categoría te permite mantener la paz mental con el dinero de casa.
                </p>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-ink">Categoría a presupuestar</label>
                  <select
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value)}
                    className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  >
                    <option value="Alimentación">Alimentación y Supermercado</option>
                    <option value="Hogar">Servicios y Mantenimiento del Hogar</option>
                    <option value="Transporte">Transporte y Gasolina</option>
                    <option value="Bienestar">Salud y Bienestar</option>
                    <option value="Ocio">Salidas y Ocio</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-ink">Límite mensual asignado ({currency})</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(Number(e.target.value))}
                    className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                <Button size="sm" variant="secondary" onClick={() => setStep(3)} disabled={isPending}>
                  Atrás
                </Button>
                <Button size="sm" onClick={() => handleNextStep(4)} disabled={isPending}>
                  Guardar presupuesto
                </Button>
              </div>
            </div>
          )}

          {/* PASO 5: TAREA / RUTINA */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest">Paso 4 de 4</span>
                <h3 className="font-serif text-xl font-bold text-ink">Crea tu primer pendiente</h3>
                <p className="text-xs text-muted">
                  Registra una tarea importante para que no se te pase nada esta semana.
                </p>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-ink">¿Qué hay que hacer?</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ej: Mercado quincenal, pagar internet..."
                    className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-ink">Fecha límite (opcional)</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="focus-ring h-10 w-full rounded-xl border border-line bg-canvas px-3 text-xs text-ink"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                <Button size="sm" variant="secondary" onClick={() => setStep(4)} disabled={isPending}>
                  Atrás
                </Button>
                <Button size="sm" onClick={() => handleNextStep(5)} disabled={isPending}>
                  Finalizar configuración
                </Button>
              </div>
            </div>
          )}

          {/* PASO 6: FINALIZADO */}
          {step === 6 && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-forest">
                <PartyPopper size={32} />
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink">
                ¡Tu hogar está configurado y listo!
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
                Has establecido tu cuenta principal, tu primer presupuesto y tus pendientes. Ahora puedes disfrutar de una vida en casa organizada y tranquila.
              </p>
              <div className="pt-4 flex justify-center">
                <Button
                  size="md"
                  onClick={handleSkipOrComplete}
                  disabled={isPending}
                  className="flex items-center gap-2 px-6"
                >
                  <CheckCircle2 size={16} />
                  <span>Entrar a mi hogar en calma</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

