"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  MoreHorizontal,
  Plus,
  ShoppingBasket,
  Sparkles,
  WalletCards,
  Info,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCOP, formatCOP } from "@/lib/utils";
import { Badge, Button, Card, PageHeading } from "@/components/ui";
import { QuickTransaction } from "@/components/quick-transaction";
import {
  getDashboardDataAction,
  toggleTaskAction,
  toggleGroceryAction,
  addTaskAction,
  addGroceryAction,
  type DashboardData,
} from "@/actions/dashboard";
import { WelcomeOnboarding } from "@/components/dashboard/welcome-onboarding";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3 shadow-float">
      <p className="mb-2 text-[10px] font-semibold text-muted">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted">{entry.name === "ingreso" ? "Ingresos" : "Gastos"}</span>
          <span className="ml-2 font-semibold text-ink">{formatCOP(entry.value * 1000)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  amount,
  note,
  trend,
  tone,
}: {
  icon: typeof WalletCards;
  title: string;
  amount: string;
  note: string;
  trend?: string;
  tone: "green" | "amber" | "blue";
}) {
  const iconStyle =
    tone === "green"
      ? "bg-mint text-forest"
      : tone === "amber"
      ? "bg-[#fff2df] text-[#b67629]"
      : "bg-[#edf4fb] text-[#5480a9]";

  return (
    <Card className="card-lift p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconStyle}`}>
          <Icon size={18} />
        </span>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef7ef] px-2 py-1 text-[10px] font-bold text-forest">
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-medium text-muted">{title}</p>
      <p className="mt-1 text-[22px] font-bold tracking-[-.045em] text-ink">{amount}</p>
      <p className="mt-1 text-[10px] text-[#98a39b]">{note}</p>
    </Card>
  );
}

export function DashboardView({ initialData }: { initialData?: DashboardData }) {
  const [liveData, setLiveData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [inlineTask, setInlineTask] = useState("");
  const [inlineGrocery, setInlineGrocery] = useState("");

  const loadData = useCallback(async () => {
    try {
      const data = await getDashboardDataAction();
      setLiveData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Si no tenemos initialData, cargamos desde el cliente
    if (!initialData) {
      loadData();
    }
  }, [initialData, loadData]);

  const isRealUser = Boolean(liveData?.isLoggedIn);

  // Tareas reales
  const tasks = liveData?.tasks || [];
  const completedTasks = tasks.filter((t) => t.done).length;

  // Compras reales
  const groceries = liveData?.groceries || [];
  const boughtCount = groceries.filter((g) => g.purchased).length;

  // Balances reales desde MySQL
  const balance = liveData?.balance || 0;
  const expenses = liveData?.expensesThisMonth || 0;
  const income = liveData?.incomeThisMonth || 0;
  const savings = liveData?.savingsThisMonth || 0;
  const lastTx = liveData?.lastTransaction;
  const nextEvent = liveData?.nextEvent;

  // Gráfica de cashflow semanal
  const chartData = liveData?.cashflow || [
    { day: "Lun", ingreso: 0, gasto: 0 },
    { day: "Mar", ingreso: 0, gasto: 0 },
    { day: "Mié", ingreso: 0, gasto: 0 },
    { day: "Jue", ingreso: 0, gasto: 0 },
    { day: "Vie", ingreso: 0, gasto: 0 },
    { day: "Sáb", ingreso: 0, gasto: 0 },
    { day: "Dom", ingreso: 0, gasto: 0 },
  ];
  const hasChartMovement = chartData.some((d) => d.ingreso > 0 || d.gasto > 0);

  // Nombre de saludo real
  const greetingName = liveData?.user?.name
    ? liveData.user.name.split(" ")[0]
    : "en tu hogar";

  async function handleToggleTask(taskId: string, currentDone: boolean) {
    await toggleTaskAction(taskId, !currentDone);
    loadData();
  }

  async function handleToggleGrocery(itemId: string, currentPurchased: boolean) {
    await toggleGroceryAction(itemId, !currentPurchased);
    loadData();
  }

  async function handleAddInlineTask(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineTask.trim()) return;
    await addTaskAction(inlineTask.trim());
    setInlineTask("");
    loadData();
  }

  async function handleAddInlineGrocery(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineGrocery.trim()) return;
    await addGroceryAction(inlineGrocery.trim());
    setInlineGrocery("");
    loadData();
  }

  // Presupuesto 50/30/20 del mes
  const budgetRatio = income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 0;

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="RESUMEN EN TIEMPO REAL"
        title={`Buen día, ${greetingName}`}
        description="Tu hogar va tomando forma, un pendiente a la vez."
        action={<QuickTransaction isLoggedIn={isRealUser} onSaved={loadData} />}
      />

      {/* Wizard guiado de onboarding para nuevos hogares */}
      {liveData?.isLoggedIn && liveData.onboardingCompleted === false && (
        <OnboardingWizard
          initialStatus={{
            completed: false,
            step: liveData.onboardingStep || 1,
            householdName: liveData.user?.householdName || "Mi Hogar",
            currency: "COP",
          }}
          onFinished={loadData}
        />
      )}

      {/* Onboarding interactivo paso a paso para nuevo usuario */}
      {liveData && (
        <WelcomeOnboarding
          userName={liveData.user?.name || ""}
          householdName={liveData.user?.householdName || "Hogar Villato"}
          hasTransactions={Boolean(liveData.lastTransaction || liveData.balance > 0)}
          hasTasks={tasks.length > 0}
          hasGroceries={groceries.length > 0}
          onRefresh={loadData}
        />
      )}

      {/* Tarjeta de balance principal */}
      <section className="relative overflow-hidden rounded-[24px] bg-[#174a3f] px-5 py-5 text-white sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-12 -top-28 h-72 w-72 rounded-full border border-white/[.08]" />
        <div className="pointer-events-none absolute -right-1 -top-16 h-52 w-52 rounded-full border border-white/[.08]" />
        <div className="pointer-events-none absolute -right-8 bottom-[-112px] h-52 w-52 rounded-full bg-[#e7b36e]/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.08] px-2.5 py-1 text-[10px] font-semibold text-[#d9ebdf]">
              <Sparkles size={12} /> Resumen de tu hogar
            </div>
            <p className="text-xs text-white/55">Disponible entre cuentas</p>
            <p className="mt-1 font-display text-[34px] tracking-[-.04em] sm:text-[40px]">
              {formatCOP(balance)}
            </p>
            <p className="mt-1 text-[11px] text-white/55">
              {balance > 0
                ? "Tu saldo está al día."
                : "Aún no has registrado ingresos o saldo en tus cuentas."}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:pb-1">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[.11]">
              <WalletCards size={20} className="text-[#d9ebdf]" />
            </div>
            <div>
              <p className="text-[10px] text-white/50">Último movimiento</p>
              {lastTx ? (
                <>
                  <p className="mt-1 text-xs font-semibold">
                    {lastTx.name} · {lastTx.type === "expense" ? "−" : "+"}
                    {formatCOP(lastTx.amount)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/45">{lastTx.date}</p>
                </>
              ) : (
                <p className="mt-1 text-xs font-semibold text-white/80">Sin movimientos aún</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Estadísticas de gastos y eventos */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={ArrowDownRight as typeof WalletCards}
          title="Gastos de este mes"
          amount={formatCOP(expenses)}
          note={expenses === 0 ? "Sin gastos registrados aún" : "Registrados en MySQL"}
          tone="amber"
        />
        <StatCard
          icon={ArrowUpRight as typeof WalletCards}
          title="Ahorro estimado"
          amount={formatCOP(savings)}
          note={savings === 0 ? "Ingresos menos gastos este mes" : "Balance positivo este mes"}
          tone="green"
        />
        <StatCard
          icon={CalendarDays as typeof WalletCards}
          title="Próximo evento"
          amount={nextEvent ? nextEvent.title : "Sin eventos programados"}
          note={
            nextEvent
              ? `${nextEvent.date} · ${nextEvent.detail}`
              : "Planifica una fecha en la sección Eventos"
          }
          tone="blue"
        />
      </section>

      {/* Gráfico y presupuestos */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_.85fr]">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">Así se mueve el hogar</p>
              <p className="mt-1 text-[11px] text-muted">Ingresos y gastos esta semana</p>
            </div>
            <button
              aria-label="Opciones"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
              <span className="h-2 w-2 rounded-full bg-forest" /> Ingresos
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
              <span className="h-2 w-2 rounded-full bg-[#e9b36f]" /> Gastos
            </span>
          </div>

          <div className="mt-4 h-[205px] w-full">
            {hasChartMovement ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#176b5b" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#176b5b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#efae53" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#efae53" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#edf0eb" strokeDasharray="3 5" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#98a39b", fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#98a39b", fontSize: 10 }}
                    tickFormatter={(value: number) => `$${value}`}
                    width={40}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: "#d9e5dc", strokeDasharray: "4 4" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingreso"
                    stroke="#176b5b"
                    strokeWidth={2.4}
                    fill="url(#incomeFill)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="gasto"
                    stroke="#e9b36f"
                    strokeWidth={2.2}
                    fill="url(#expenseFill)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#dce5df] p-6 text-center">
                <WalletCards size={28} className="text-[#9cb5a6]" />
                <p className="mt-2 text-xs font-semibold text-ink">
                  Sin movimientos registrados esta semana
                </p>
                <p className="mt-1 text-[11px] text-muted max-w-[340px]">
                  Tus ingresos y gastos diarios se graficarán automáticamente aquí a medida que los
                  registres.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Card Presupuesto del mes */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Presupuesto del mes</p>
              <p className="mt-1 text-[11px] text-muted">Método 50/30/20</p>
            </div>
            <Badge tone={budgetRatio > 90 ? "amber" : "green"}>
              {income > 0 ? `${budgetRatio}% utilizado` : "Listo para iniciar"}
            </Badge>
          </div>

          {income > 0 ? (
            <div className="mt-4 space-y-3">
              <BudgetLine
                label="Necesidades (50%)"
                amount={formatCOP(Math.round(expenses * 0.6))}
                limit={formatCOP(Math.round(income * 0.5))}
                progress={Math.min(100, Math.round(((expenses * 0.6) / (income * 0.5 || 1)) * 100))}
                color="bg-forest"
              />
              <BudgetLine
                label="Deseos (30%)"
                amount={formatCOP(Math.round(expenses * 0.3))}
                limit={formatCOP(Math.round(income * 0.3))}
                progress={Math.min(100, Math.round(((expenses * 0.3) / (income * 0.3 || 1)) * 100))}
                color="bg-[#e9b36f]"
              />
              <BudgetLine
                label="Ahorro (20%)"
                amount={formatCOP(savings)}
                limit={formatCOP(Math.round(income * 0.2))}
                progress={Math.min(100, Math.round((savings / (income * 0.2 || 1)) * 100))}
                color="bg-[#7ea8d3]"
              />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#dce5df] p-4 text-center">
              <p className="text-xs font-semibold text-ink">Sin ingresos registrados</p>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                Registra tu primer ingreso con el botón "+ Añadir movimiento" para activar la
                distribución 50/30/20.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-[#f2f7f3] p-3 text-[10px] text-[#4f6759]">
            <p className="font-semibold text-forest">Consejo para tu hogar</p>
            <p className="mt-1">
              Las cuentas compartidas permiten que ambos sepan cuánto hay disponible sin tener que
              preguntarse todo el tiempo.
            </p>
          </div>
        </Card>
      </section>

      {/* Sección inferior: Tareas, Compras y Eventos */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card Tareas */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Pendientes de hoy</p>
              <p className="mt-1 text-[11px] text-muted">
                {tasks.length > 0
                  ? `${completedTasks} de ${tasks.length} completadas`
                  : "Sin tareas pendientes"}
              </p>
            </div>
            <Link href="/tareas" className="text-[10px] font-bold text-forest hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="mt-4 space-y-1">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.done)}
                  className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[#f8faf7]"
                >
                  <span
                    className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${
                      task.done
                        ? "border-forest bg-forest text-white"
                        : "border-[#cad6cc] bg-white text-transparent"
                    }`}
                  >
                    {task.done ? <Check size={12} strokeWidth={3} /> : <Circle size={9} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-semibold ${
                        task.done ? "text-[#9aa59d] line-through" : "text-ink"
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[10px] text-[#9aa59d]">
                      <span className={`h-1.5 w-1.5 rounded-full ${task.accent}`} />
                      {task.detail}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap pt-0.5 text-[9px] text-muted">
                    <Clock3 size={11} />
                    {task.due}
                  </span>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">
                No tienes tareas pendientes todavía.
              </div>
            )}
          </div>

          <form onSubmit={handleAddInlineTask} className="mt-3 flex gap-2 border-t border-line pt-3">
            <input
              type="text"
              value={inlineTask}
              onChange={(e) => setInlineTask(e.target.value)}
              placeholder="Escribe un nuevo pendiente..."
              className="focus-ring h-9 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-xs outline-none focus:border-forest"
            />
            <Button size="sm" type="submit" disabled={!inlineTask.trim()}>
              <Plus size={14} />
            </Button>
          </form>
        </Card>

        {/* Card Lista de compras */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Lista del mercado</p>
              <p className="mt-1 text-[11px] text-muted">
                {groceries.length > 0 ? `${groceries.length} productos en lista` : "Lista vacía"}
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff2df] text-[#b67629]">
              <ShoppingBasket size={17} />
            </span>
          </div>

          <div className="mt-3 space-y-1">
            {groceries.length > 0 ? (
              groceries.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleToggleGrocery(item.id, item.purchased)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left hover:bg-[#f8faf7]"
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-[5px] border ${
                      item.purchased
                        ? "border-forest bg-forest text-white"
                        : "border-[#d1dbd3] bg-white text-transparent"
                    }`}
                  >
                    {item.purchased && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[11px] font-medium ${
                      item.purchased ? "text-[#99a49c] line-through" : "text-ink"
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-muted">
                    {item.quantity} {item.unit}
                  </span>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">
                No hay productos en la lista.
              </div>
            )}
          </div>

          <form
            onSubmit={handleAddInlineGrocery}
            className="mt-3 flex gap-2 border-t border-line pt-3"
          >
            <input
              type="text"
              value={inlineGrocery}
              onChange={(e) => setInlineGrocery(e.target.value)}
              placeholder="Ej. Leche, Tomates, Arroz..."
              className="focus-ring h-9 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-xs outline-none focus:border-forest"
            />
            <Button size="sm" type="submit" disabled={!inlineGrocery.trim()}>
              <Plus size={14} />
            </Button>
          </form>
        </Card>

        {/* Card Eventos y planes */}
        <Card className="relative overflow-hidden bg-[#f1f5ef] p-4 sm:p-5">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#e0ebdc]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Badge tone="blue">EVENTOS Y PLANES</Badge>
              <CalendarDays size={18} className="text-forest" />
            </div>

            {nextEvent ? (
              <div className="mt-4">
                <p className="font-display text-[20px] leading-tight text-ink">
                  {nextEvent.title}
                </p>
                <p className="mt-1.5 text-[11px] text-muted">
                  {nextEvent.date} · {nextEvent.detail}
                </p>
                {nextEvent.budget > 0 && (
                  <div className="mt-4 flex items-center justify-between border-t border-[#dce6d8] pt-3">
                    <span className="text-[10px] text-muted">Presupuesto asignado</span>
                    <span className="text-xs font-bold text-ink">
                      {formatCOP(nextEvent.budget)}
                    </span>
                  </div>
                )}
                <Link
                  href="/eventos"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-forest-dark"
                >
                  Ver todos los eventos
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <p className="font-display text-[20px] leading-tight text-ink">Planes del hogar</p>
                <p className="mt-1.5 text-[11px] text-muted">
                  Organiza cumpleaños, reuniones y fechas importantes con tu familia.
                </p>
                <div className="mt-5 rounded-xl border border-dashed border-[#c9d8c9] bg-white/70 p-4 text-center">
                  <p className="text-xs font-semibold text-ink">Sin planes próximos</p>
                  <p className="mt-1 text-[10px] text-muted">
                    Añade celebraciones para asignar presupuesto.
                  </p>
                  <Link
                    href="/eventos"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-forest-dark"
                  >
                    <Plus size={13} /> Nuevo evento
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function BudgetLine({
  label,
  amount,
  limit,
  progress,
  color,
}: {
  label: string;
  amount: string;
  limit: string;
  progress: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[10px]">
        <span className="font-semibold text-[#526158]">{label}</span>
        <span className="text-muted">
          {amount} <span className="text-[#adb6af]">/ {limit}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#edf0eb]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
