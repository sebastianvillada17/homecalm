"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, CalendarDays,
  Check, CreditCard, MapPin, Package, Plus, Search, ShoppingBasket, Sparkles,
  WalletCards, X, AlertTriangle, PiggyBank, Pencil, Trash2, History,
  ChevronDown, ChevronUp, Loader2, Clock3, Tag, DollarSign, UserCheck, CheckCircle2
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { formatCOP } from "@/lib/utils";
import { Badge, Button, Card, PageHeading, TextInput } from "@/components/ui";
import { QuickTransaction } from "@/components/quick-transaction";
import {
  getModuleDataAction,
  addAccountAction,
  updateAccountAction,
  deleteAccountAction,
  addBudgetAction,
  updateBudgetAction,
  deleteBudgetAction,
  addDebtAction,
  updateDebtAction,
  deleteDebtAction,
  addDebtPaymentAction,
  addSavingsGoalAction,
  updateSavingsGoalAction,
  deleteSavingsGoalAction,
  addSavingsContributionAction,
  addInventoryAction,
  updateInventoryAction,
  deleteInventoryAction,
  addEventAction,
  updateEventAction,
  deleteEventAction,
  updateHouseholdNameAction,
  updateUserProfileAction,
  addHouseholdMemberAction,
  removeHouseholdMemberAction,
  type AccountData,
  type TransactionData,
  type BudgetData,
  type InventoryData,
  type EventData,
  type DebtData,
  type SavingsGoalData,
  type MemberData,
} from "@/actions/modules";
import {
  getDashboardDataAction,
  addTaskAction,
  updateTaskAction,
  deleteTaskAction,
  toggleTaskAction,
  addGroceryAction,
  updateGroceryAction,
  deleteGroceryAction,
  toggleGroceryAction,
  updateTransactionAction,
  deleteTransactionAction,
  addTransferAction,
  type DashboardData,
} from "@/actions/dashboard";
import { FoodView } from "./food-view";
import type { WeeklyMealPlanData } from "@/actions/meals";

export type ModuleKind =
  | "finances"
  | "accounts"
  | "budgets"
  | "debts"
  | "savings"
  | "shopping"
  | "inventory"
  | "tasks"
  | "events"
  | "food"
  | "settings";

export interface ModulePageProps {
  kind: ModuleKind;
  initialModuleData?: Awaited<ReturnType<typeof getModuleDataAction>> | null;
  initialDashboardData?: DashboardData | null;
  initialMealPlan?: WeeklyMealPlanData | null;
}

export function ModulePage({
  kind,
  initialModuleData,
  initialDashboardData,
  initialMealPlan,
}: ModulePageProps) {
  const [moduleData, setModuleData] = useState<Awaited<ReturnType<typeof getModuleDataAction>> | null>(
    initialModuleData ?? null
  );
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    initialDashboardData ?? null
  );

  const loadAll = useCallback(async () => {
    try {
      const [m, d] = await Promise.all([getModuleDataAction(), getDashboardDataAction()]);
      setModuleData(m);
      setDashboardData(d);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!initialModuleData || !initialDashboardData) {
      loadAll();
    }
  }, [loadAll, initialModuleData, initialDashboardData]);

  const isReal = Boolean(moduleData?.isLoggedIn);

  if (["finances", "accounts", "budgets", "debts", "savings"].includes(kind)) {
    return (
      <FinanceView
        section={kind as "finances" | "accounts" | "budgets" | "debts" | "savings"}
        isReal={isReal}
        moduleData={moduleData}
        onRefresh={loadAll}
      />
    );
  }
  if (kind === "shopping") return <ShoppingView isReal={isReal} dashboardData={dashboardData} onRefresh={loadAll} />;
  if (kind === "inventory") return <InventoryView isReal={isReal} moduleData={moduleData} onRefresh={loadAll} />;
  if (kind === "tasks") return <TasksView isReal={isReal} dashboardData={dashboardData} onRefresh={loadAll} />;
  if (kind === "events") return <EventsView isReal={isReal} moduleData={moduleData} onRefresh={loadAll} />;
  if (kind === "food") return <FoodView isReal={isReal} initialPlan={initialMealPlan} />;
  return <SettingsView isReal={isReal} moduleData={moduleData} onRefresh={loadAll} />;
}

const financeTabs = [
  { label: "Resumen", href: "/finanzas", key: "finances" },
  { label: "Cuentas", href: "/finanzas/cuentas", key: "accounts" },
  { label: "Presupuestos", href: "/finanzas/presupuestos", key: "budgets" },
  { label: "Deudas", href: "/finanzas/deudas", key: "debts" },
  { label: "Ahorros", href: "/finanzas/ahorros", key: "savings" },
];

// =============================================================
// FINANZAS (Cuentas, Movimientos, Transferencias, Presupuestos, Deudas, Ahorro)
// =============================================================

function FinanceView({
  section,
  isReal,
  moduleData,
  onRefresh,
}: {
  section: "finances" | "accounts" | "budgets" | "debts" | "savings";
  isReal: boolean;
  moduleData: Awaited<ReturnType<typeof getModuleDataAction>> | null;
  onRefresh: () => void;
}) {
  const { data: demoData } = useDemo();

  // Modales Cuentas
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountData | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"bank" | "cash" | "savings">("bank");
  const [accBalance, setAccBalance] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);

  // Modales Transferencia
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDesc, setTransferDesc] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);

  // Edición / Eliminación Transacciones
  const [editTx, setEditTx] = useState<TransactionData | null>(null);
  const [txName, setTxName] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Hogar");
  const [txType, setTxType] = useState<"income" | "expense" | "transfer">("expense");
  const [txAccountId, setTxAccountId] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  // Filtros de transacciones
  const [txFilterType, setTxFilterType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [txSearch, setTxSearch] = useState("");

  // Presupuestos
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetData | null>(null);
  const [budgetCategory, setBudgetCategory] = useState("Alimentación");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Deudas y Abonos
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [editDebt, setEditDebt] = useState<DebtData | null>(null);
  const [debtPayModal, setDebtPayModal] = useState<DebtData | null>(null);
  const [debtName, setDebtName] = useState("");
  const [debtInstitution, setDebtInstitution] = useState("");
  const [debtTotal, setDebtTotal] = useState("");
  const [debtBal, setDebtBal] = useState("");
  const [debtDue, setDebtDue] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // Metas de Ahorro y Aportes
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoalData | null>(null);
  const [goalContribModal, setGoalContribModal] = useState<SavingsGoalData | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [contribAmount, setContribAmount] = useState("");
  const [contribNotes, setContribNotes] = useState("");
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const title =
    section === "finances"
      ? "Finanzas del hogar"
      : financeTabs.find((tab) => tab.key === section)?.label ?? "Finanzas";

  const description =
    section === "finances"
      ? "Una vista tranquila de cómo entra y se mueve el dinero."
      : section === "accounts"
      ? "Cuentas y efectivo que comparten en casa."
      : section === "budgets"
      ? "Un plan flexible para repartir los gastos del mes."
      : section === "debts"
      ? "Saldos pendientes y abonos a créditos del hogar."
      : "Metas de ahorro que se convierten en planes grandes.";

  const totalBalance = isReal ? (moduleData?.totalBalance || 0) : 4820500;
  const totalIncome = isReal ? (moduleData?.totalIncomeMonth || 0) : 5200000;
  const totalExpense = isReal ? (moduleData?.totalExpenseMonth || 0) : 2840300;
  const realAccounts = moduleData?.accounts || [];
  const realTransactions = moduleData?.transactions || [];
  const realBudgets = moduleData?.budgets || [];
  const realDebts = moduleData?.debts || [];
  const realGoals = moduleData?.savingsGoals || [];

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return realTransactions.filter((tx) => {
      const matchType = txFilterType === "all" || tx.type === txFilterType;
      const matchSearch =
        tx.name.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.category.toLowerCase().includes(txSearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [realTransactions, txFilterType, txSearch]);

  // Handlers Cuentas
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    if (!accName.trim()) return;
    const res = await addAccountAction({
      name: accName.trim(),
      type: accType,
      balance: Number(accBalance) || 0,
    });
    if (!res.success) {
      setAccountError(res.error || "Error al crear la cuenta.");
      return;
    }
    setAccName("");
    setAccBalance("");
    setShowAddAccount(false);
    onRefresh();
  }

  async function handleUpdateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!editAccount || !accName.trim()) return;
    const res = await updateAccountAction({
      id: editAccount.id,
      name: accName.trim(),
      type: accType,
    });
    if (!res.success) {
      setAccountError(res.error || "Error al actualizar la cuenta.");
      return;
    }
    setEditAccount(null);
    onRefresh();
  }

  async function handleDeleteAccount(id: string) {
    setAccountError(null);
    if (!confirm("¿Estás seguro de que deseas eliminar esta cuenta?")) return;
    const res = await deleteAccountAction(id);
    if (!res.success) {
      alert(res.error || "No se pudo eliminar la cuenta.");
      return;
    }
    onRefresh();
  }

  // Handler Transferencias
  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferError(null);
    if (!transferFrom || !transferTo || !transferAmount) return;
    const res = await addTransferAction({
      fromAccountId: transferFrom,
      toAccountId: transferTo,
      amount: Number(transferAmount),
      description: transferDesc.trim(),
    });
    if (!res.success) {
      setTransferError(res.error || "Error al realizar la transferencia.");
      return;
    }
    setShowTransfer(false);
    setTransferAmount("");
    setTransferDesc("");
    onRefresh();
  }

  // Handlers Transacciones
  function openEditTx(tx: TransactionData) {
    setEditTx(tx);
    setTxName(tx.name);
    setTxAmount(String(tx.amount));
    setTxCategory(tx.category);
    setTxType(tx.type);
    setTxAccountId(tx.accountId);
    setTxDate(tx.date);
    setTxError(null);
  }

  async function handleUpdateTx(e: React.FormEvent) {
    e.preventDefault();
    if (!editTx) return;
    setTxError(null);
    const res = await updateTransactionAction({
      id: editTx.id,
      name: txName.trim(),
      amount: Number(txAmount),
      category: txCategory,
      type: txType,
      accountId: txAccountId,
      date: txDate,
    });
    if (!res.success) {
      setTxError(res.error || "Error al modificar movimiento.");
      return;
    }
    setEditTx(null);
    onRefresh();
  }

  async function handleDeleteTx(id: string) {
    if (!confirm("¿Deseas eliminar este movimiento? El saldo de la cuenta se restituirá automáticamente.")) return;
    const res = await deleteTransactionAction(id);
    if (!res.success) {
      alert(res.error || "Error al eliminar el movimiento.");
      return;
    }
    onRefresh();
  }

  // Handlers Presupuestos
  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    setBudgetError(null);
    if (!budgetLimit || Number(budgetLimit) <= 0) return;
    const res = await addBudgetAction({
      category: budgetCategory,
      monthlyLimit: Number(budgetLimit),
    });
    if (!res.success) {
      setBudgetError(res.error || "Error creando presupuesto.");
      return;
    }
    setShowAddBudget(false);
    setBudgetLimit("");
    onRefresh();
  }

  async function handleUpdateBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!editBudget || Number(budgetLimit) <= 0) return;
    const res = await updateBudgetAction({
      id: editBudget.id,
      monthlyLimit: Number(budgetLimit),
    });
    if (!res.success) {
      setBudgetError(res.error || "Error al modificar presupuesto.");
      return;
    }
    setEditBudget(null);
    onRefresh();
  }

  async function handleDeleteBudget(id: string) {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    await deleteBudgetAction(id);
    onRefresh();
  }

  // Handlers Deudas y Abonos
  async function handleAddDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!debtName.trim() || Number(debtTotal) <= 0) return;
    await addDebtAction({
      name: debtName.trim(),
      institution: debtInstitution.trim() || undefined,
      totalAmount: Number(debtTotal),
      balance: Number(debtBal) || Number(debtTotal),
      dueDate: debtDue || undefined,
    });
    setShowAddDebt(false);
    setDebtName("");
    setDebtTotal("");
    setDebtBal("");
    setDebtDue("");
    onRefresh();
  }

  async function handleUpdateDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!editDebt) return;
    await updateDebtAction({
      id: editDebt.id,
      name: debtName.trim(),
      institution: debtInstitution.trim(),
      totalAmount: Number(debtTotal),
      balance: Number(debtBal),
      dueDate: debtDue || undefined,
    });
    setEditDebt(null);
    onRefresh();
  }

  async function handleDeleteDebt(id: string) {
    if (!confirm("¿Eliminar esta deuda del registro?")) return;
    await deleteDebtAction(id);
    onRefresh();
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!debtPayModal || Number(payAmount) <= 0) return;
    const res = await addDebtPaymentAction({
      debtId: debtPayModal.id,
      amount: Number(payAmount),
      notes: payNotes.trim() || undefined,
    });
    if (!res.success) {
      alert(res.error || "No se pudo registrar el abono.");
      return;
    }
    setDebtPayModal(null);
    setPayAmount("");
    setPayNotes("");
    onRefresh();
  }

  // Handlers Metas y Aportes
  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalName.trim() || Number(goalTarget) <= 0) return;
    await addSavingsGoalAction({
      name: goalName.trim(),
      targetAmount: Number(goalTarget),
      currentAmount: Number(goalCurrent) || 0,
      targetDate: goalDate || undefined,
    });
    setShowAddGoal(false);
    setGoalName("");
    setGoalTarget("");
    setGoalCurrent("");
    setGoalDate("");
    onRefresh();
  }

  async function handleUpdateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!editGoal) return;
    await updateSavingsGoalAction({
      id: editGoal.id,
      name: goalName.trim(),
      targetAmount: Number(goalTarget),
      targetDate: goalDate || undefined,
    });
    setEditGoal(null);
    onRefresh();
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm("¿Eliminar esta meta de ahorro?")) return;
    await deleteSavingsGoalAction(id);
    onRefresh();
  }

  async function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();
    if (!goalContribModal || Number(contribAmount) <= 0) return;
    const res = await addSavingsContributionAction({
      goalId: goalContribModal.id,
      amount: Number(contribAmount),
      notes: contribNotes.trim() || undefined,
    });
    if (!res.success) {
      alert(res.error || "No se pudo registrar el aporte.");
      return;
    }
    setGoalContribModal(null);
    setContribAmount("");
    setContribNotes("");
    onRefresh();
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="DINERO DEL HOGAR"
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isReal && realAccounts.length > 1 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setTransferFrom(realAccounts[0]?.id || "");
                  setTransferTo(realAccounts[1]?.id || "");
                  setShowTransfer(true);
                }}
              >
                <ArrowRightLeft size={16} /> Transferir
              </Button>
            )}
            <QuickTransaction isLoggedIn={isReal} onSaved={onRefresh} />
          </div>
        }
      />

      <nav className="app-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1.5">
        {financeTabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
              tab.key === section
                ? "bg-[#eaf3ec] text-forest"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* ================= SECTION: RESUMEN FINANZAS ================= */}
      {section === "finances" && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <FinanceMetric
              title="Disponible total"
              value={formatCOP(totalBalance)}
              detail={isReal ? `En ${realAccounts.length} cuenta(s)` : "En 3 cuentas"}
              icon={<WalletCards size={16} />}
              tone="green"
            />
            <FinanceMetric
              title="Ingresos del mes"
              value={formatCOP(totalIncome)}
              detail={isReal ? "Registrados en MySQL" : "+3,2% vs. octubre"}
              icon={<ArrowDownLeft size={16} />}
              tone="blue"
            />
            <FinanceMetric
              title="Gastos del mes"
              value={formatCOP(totalExpense)}
              detail={isReal ? "Registrados en MySQL" : "50,7% del presupuesto"}
              icon={<ArrowUpRight size={16} />}
              tone="amber"
            />
          </section>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-5">
              <div>
                <p className="text-sm font-bold text-ink">Movimientos registrados</p>
                <p className="mt-0.5 text-[11px] text-muted">Historial financiero en tiempo real</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={txFilterType}
                  onChange={(e) => setTxFilterType(e.target.value as any)}
                  className="focus-ring h-8 rounded-lg border border-line bg-canvas px-2.5 text-xs text-ink"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="income">Solo Ingresos (+)</option>
                  <option value="expense">Solo Gastos (−)</option>
                  <option value="transfer">Transferencias (⇄)</option>
                </select>
                <div className="relative w-44">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="focus-ring h-8 w-full rounded-lg border border-line bg-canvas pl-7 pr-2.5 text-xs text-ink"
                  />
                </div>
              </div>
            </div>

            {filteredTransactions.length > 0 ? (
              <div className="divide-y divide-line">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          tx.type === "income"
                            ? "bg-[#edf6ee] text-forest"
                            : tx.type === "transfer"
                            ? "bg-[#edf4fb] text-[#497aa8]"
                            : "bg-[#fff3e4] text-[#b77d37]"
                        }`}
                      >
                        {tx.type === "income" ? (
                          <ArrowDownLeft size={16} />
                        ) : tx.type === "transfer" ? (
                          <ArrowRightLeft size={16} />
                        ) : (
                          <ShoppingBasket size={15} />
                        )}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-ink">{tx.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {tx.category} · {tx.date} ·{" "}
                          <span className="font-medium text-forest">
                            {tx.type === "transfer"
                              ? `${tx.accountName || "Origen"} ➔ ${tx.toAccountName || "Destino"}`
                              : tx.accountName || "Cuenta principal"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold ${
                          tx.type === "income"
                            ? "text-forest"
                            : tx.type === "transfer"
                            ? "text-[#497aa8]"
                            : "text-ink"
                        }`}
                      >
                        {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "⇄"}
                        {formatCOP(tx.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditTx(tx)}
                          title="Editar movimiento"
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          title="Eliminar movimiento"
                          className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-xs text-muted">
                {realTransactions.length === 0
                  ? "No tienes movimientos registrados todavía. Usa el botón '+ Añadir movimiento' para comenzar."
                  : "No se encontraron movimientos con los filtros aplicados."}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ================= SECTION: CUENTAS ================= */}
      {section === "accounts" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Cuentas compartidas del hogar</p>
              <p className="mt-0.5 text-[11px] text-muted">Bancos, billeteras y efectivo</p>
            </div>
            <Button size="sm" onClick={() => setShowAddAccount(true)}>
              <Plus size={14} /> Nueva cuenta
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {realAccounts.map((acc) => (
              <Card key={acc.id} className="card-lift p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      acc.type === "cash"
                        ? "bg-[#fff2df] text-[#b67629]"
                        : acc.type === "savings"
                        ? "bg-[#edf4fb] text-[#5480a9]"
                        : "bg-mint text-forest"
                    }`}
                  >
                    {acc.type === "cash" ? (
                      <PiggyBank size={18} />
                    ) : (
                      <CreditCard size={18} />
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditAccount(acc);
                        setAccName(acc.name);
                        setAccType(acc.type);
                        setAccountError(null);
                      }}
                      title="Editar cuenta"
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      title="Eliminar cuenta"
                      className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-sm font-bold text-ink">{acc.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={acc.type === "cash" ? "amber" : "green"}>
                    {acc.type === "cash" ? "Efectivo" : acc.type === "savings" ? "Ahorro" : "Bancaria"}
                  </Badge>
                  <span className="text-[10px] text-muted">{acc.transactionCount} mov.</span>
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[9px] uppercase tracking-wide text-muted">Saldo disponible</p>
                  <p className="mt-1 text-xl font-bold text-ink">{formatCOP(acc.balance)}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ================= SECTION: PRESUPUESTOS ================= */}
      {section === "budgets" && (
        <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-ink">Presupuesto por categoría</p>
                <p className="mt-1 text-[11px] text-muted">Límites y consumo en tiempo real</p>
              </div>
              <Button size="sm" onClick={() => setShowAddBudget(true)}>
                <Plus size={14} /> Definir presupuesto
              </Button>
            </div>

            {realBudgets.length > 0 ? (
              <div className="mt-5 space-y-4">
                {realBudgets.map((b) => (
                  <div key={b.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted">
                          {formatCOP(b.spent)} / <span className="font-semibold text-ink">{formatCOP(b.monthlyLimit)}</span>
                        </span>
                        <button
                          onClick={() => {
                            setEditBudget(b);
                            setBudgetLimit(String(b.monthlyLimit));
                            setBudgetError(null);
                          }}
                          className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-canvas hover:text-ink"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          className="grid h-6 w-6 place-items-center rounded text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0eb]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.percent >= 90 ? "bg-rose-500" : b.percent >= 70 ? "bg-amber-500" : "bg-forest"
                        }`}
                        style={{ width: `${b.percent}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted">
                      <span>{b.percent}% gastado</span>
                      <span>Restante: {formatCOP(b.remaining)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-8 rounded-xl border border-dashed border-line p-8 text-center text-xs text-muted">
                No has definido presupuestos mensuales aún. Haz clic en "Definir presupuesto" para fijar límites de gasto.
              </div>
            )}
          </Card>

          <Card className="bg-[#eef5ef] p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-forest">
              <Sparkles size={17} />
            </span>
            <p className="mt-4 font-display text-xl text-ink">Cálculo dinámico con MySQL</p>
            <p className="mt-2 text-xs leading-6 text-muted">
              A diferencia de las versiones demostrativas, el consumo de cada categoría se calcula sumando en vivo tus
              gastos reales registrados en la base de datos durante el mes actual.
            </p>
          </Card>
        </section>
      )}

      {/* ================= SECTION: DEUDAS ================= */}
      {section === "debts" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Deudas y compromisos</p>
              <p className="mt-0.5 text-[11px] text-muted">Créditos, tarjetas y cuentas por pagar</p>
            </div>
            <Button size="sm" onClick={() => setShowAddDebt(true)}>
              <Plus size={14} /> Nueva deuda
            </Button>
          </div>

          {realDebts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {realDebts.map((d) => {
                const paidAmount = Math.max(0, d.totalAmount - d.balance);
                const progress = d.totalAmount > 0 ? Math.min(100, Math.round((paidAmount / d.totalAmount) * 100)) : 100;
                const isExpanded = expandedDebtId === d.id;

                return (
                  <Card key={d.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-ink">{d.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{d.institution}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={d.isPaid ? "green" : "amber"}>
                          {d.isPaid ? "Pagada" : "En curso"}
                        </Badge>
                        <button
                          onClick={() => {
                            setEditDebt(d);
                            setDebtName(d.name);
                            setDebtInstitution(d.institution);
                            setDebtTotal(String(d.totalAmount));
                            setDebtBal(String(d.balance));
                            setDebtDue(d.dueDate !== "Sin fecha fija" ? d.dueDate : "");
                          }}
                          className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-canvas hover:text-ink"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteDebt(d.id)}
                          className="grid h-7 w-7 place-items-center rounded text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-muted">Saldo pendiente</p>
                        <p className="text-xl font-bold text-ink">{formatCOP(d.balance)}</p>
                      </div>
                      <span className="text-xs text-muted">Total: {formatCOP(d.totalAmount)}</span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0eb]">
                      <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted">
                      <span>{progress}% pagado</span>
                      <span>Fecha límite: {d.dueDate}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDebtPayModal(d);
                          setPayAmount("");
                          setPayNotes("");
                        }}
                        disabled={d.isPaid}
                      >
                        <DollarSign size={14} /> Registrar abono
                      </Button>

                      <button
                        onClick={() => setExpandedDebtId(isExpanded ? null : d.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:underline"
                      >
                        <History size={13} /> {d.payments.length} abonos {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl bg-canvas p-3 text-xs">
                        <p className="font-bold text-ink">Historial de abonos</p>
                        {d.payments.length > 0 ? (
                          <div className="mt-2 divide-y divide-line">
                            {d.payments.map((p) => (
                              <div key={p.id} className="flex justify-between py-1.5 text-[11px]">
                                <div>
                                  <span className="font-semibold text-ink">{formatCOP(p.amount)}</span>
                                  {p.notes && <span className="ml-2 text-muted">({p.notes})</span>}
                                </div>
                                <span className="text-muted">{p.paymentDate}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted">Aún no hay abonos registrados para esta deuda.</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-10 text-center text-xs text-muted">
              Tu hogar no tiene deudas registradas. ¡Excelente trabajo o haz clic en "Nueva deuda" para anotar una!
            </div>
          )}
        </section>
      )}

      {/* ================= SECTION: AHORROS ================= */}
      {section === "savings" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Metas de ahorro del hogar</p>
              <p className="mt-0.5 text-[11px] text-muted">Objetivos y aportes compartidos</p>
            </div>
            <Button size="sm" onClick={() => setShowAddGoal(true)}>
              <Plus size={14} /> Nueva meta
            </Button>
          </div>

          {realGoals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {realGoals.map((g) => {
                const isExpanded = expandedGoalId === g.id;

                return (
                  <Card key={g.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-forest">
                        <PiggyBank size={18} />
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={g.isCompleted ? "green" : "blue"}>
                          {g.isCompleted ? "Completada" : `${g.percent}%`}
                        </Badge>
                        <button
                          onClick={() => {
                            setEditGoal(g);
                            setGoalName(g.name);
                            setGoalTarget(String(g.targetAmount));
                            setGoalDate(g.targetDate !== "Meta abierta" ? g.targetDate : "");
                          }}
                          className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-canvas hover:text-ink"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="grid h-7 w-7 place-items-center rounded text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="mt-4 text-sm font-bold text-ink">{g.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted">Fecha límite: {g.targetDate}</p>

                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-lg font-bold text-ink">{formatCOP(g.currentAmount)}</span>
                      <span className="text-[10px] text-muted">Meta: {formatCOP(g.targetAmount)}</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0eb]">
                      <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${g.percent}%` }} />
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setGoalContribModal(g);
                          setContribAmount("");
                          setContribNotes("");
                        }}
                      >
                        <Plus size={14} /> Aportar
                      </Button>

                      <button
                        onClick={() => setExpandedGoalId(isExpanded ? null : g.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:underline"
                      >
                        <History size={13} /> {g.contributions.length} aportes {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl bg-canvas p-3 text-xs">
                        <p className="font-bold text-ink">Historial de aportes</p>
                        {g.contributions.length > 0 ? (
                          <div className="mt-2 divide-y divide-line">
                            {g.contributions.map((c) => (
                              <div key={c.id} className="flex justify-between py-1.5 text-[11px]">
                                <div>
                                  <span className="font-semibold text-forest">+{formatCOP(c.amount)}</span>
                                  {c.notes && <span className="ml-2 text-muted">({c.notes})</span>}
                                </div>
                                <span className="text-muted">{c.contributionDate}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted">No se han registrado aportes para esta meta aún.</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-10 text-center text-xs text-muted">
              Comienza una meta de ahorro para tus planes futuros (viajes, emergencias, mejoras). Haz clic en "Nueva meta".
            </div>
          )}
        </section>
      )}

      {/* ================= MODAL: EDITAR MOVIMIENTO ================= */}
      {editTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">Editar movimiento</h3>
              <button onClick={() => setEditTx(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            {txError && <div className="mt-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{txError}</div>}
            <form onSubmit={handleUpdateTx} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Descripción</label>
                <input
                  type="text"
                  value={txName}
                  onChange={(e) => setTxName(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Valor ($ COP)</label>
                  <input
                    type="number"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Tipo</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  >
                    <option value="expense">Gasto (−)</option>
                    <option value="income">Ingreso (+)</option>
                    <option value="transfer">Transferencia (⇄)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Cuenta</label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  >
                    {realAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Fecha</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                    required
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Guardar cambios</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setEditTx(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= MODAL: NUEVA CUENTA / EDITAR CUENTA ================= */}
      {(showAddAccount || editAccount) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">{editAccount ? "Editar cuenta" : "Nueva cuenta"}</h3>
              <button onClick={() => { setShowAddAccount(false); setEditAccount(null); }} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            {accountError && <div className="mt-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{accountError}</div>}
            <form onSubmit={editAccount ? handleUpdateAccount : handleCreateAccount} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Nombre de la cuenta</label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Ej. Bancolombia, Efectivo, Nequi"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Tipo de cuenta</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                >
                  <option value="bank">Cuenta bancaria</option>
                  <option value="cash">Efectivo / Billetera</option>
                  <option value="savings">Cuenta de ahorro</option>
                </select>
              </div>
              {!editAccount && (
                <div>
                  <label className="text-xs font-semibold text-ink">Saldo inicial ($ COP)</label>
                  <input
                    type="number"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    placeholder="0"
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  />
                </div>
              )}
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Guardar</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => { setShowAddAccount(false); setEditAccount(null); }}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= MODAL: TRANSFERIR ENTRE CUENTAS ================= */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">Transferir entre cuentas</h3>
              <button onClick={() => setShowTransfer(false)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            {transferError && <div className="mt-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{transferError}</div>}
            <form onSubmit={handleTransfer} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Cuenta de origen (sale el dinero)</label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  required
                >
                  {realAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCOP(a.balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Cuenta de destino (entra el dinero)</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  required
                >
                  {realAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCOP(a.balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Monto a transferir ($ COP)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Ej. 100000"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Concepto / Nota (opcional)</label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Ej. Retiro para efectivo semanal"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Transferir atómicamente</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setShowTransfer(false)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= MODAL: PRESUPUESTO ================= */}
      {(showAddBudget || editBudget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">{editBudget ? "Editar presupuesto" : "Nuevo presupuesto"}</h3>
              <button onClick={() => { setShowAddBudget(false); setEditBudget(null); }} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            {budgetError && <div className="mt-3 rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{budgetError}</div>}
            <form onSubmit={editBudget ? handleUpdateBudget : handleAddBudget} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Categoría</label>
                {editBudget ? (
                  <p className="mt-1 font-bold text-ink">{editBudget.category}</p>
                ) : (
                  <select
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  >
                    <option value="Alimentación">Alimentación</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Bienestar">Bienestar</option>
                    <option value="Educación">Educación</option>
                    <option value="Entretenimiento">Entretenimiento</option>
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Límite mensual ($ COP)</label>
                <input
                  type="number"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  placeholder="Ej. 1200000"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Guardar</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => { setShowAddBudget(false); setEditBudget(null); }}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= MODAL: DEUDA / ABONO ================= */}
      {(showAddDebt || editDebt) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">{editDebt ? "Editar deuda" : "Nueva deuda o crédito"}</h3>
              <button onClick={() => { setShowAddDebt(false); setEditDebt(null); }} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={editDebt ? handleUpdateDebt : handleAddDebt} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Nombre de la deuda</label>
                <input
                  type="text"
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="Ej. Tarjeta de crédito, Crédito hipotecario"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Entidad o acreedor</label>
                <input
                  type="text"
                  value={debtInstitution}
                  onChange={(e) => setDebtInstitution(e.target.value)}
                  placeholder="Ej. Bancolombia, Familiar, etc."
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Monto total ($ COP)</label>
                  <input
                    type="number"
                    value={debtTotal}
                    onChange={(e) => setDebtTotal(e.target.value)}
                    placeholder="5000000"
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Saldo pendiente ($ COP)</label>
                  <input
                    type="number"
                    value={debtBal}
                    onChange={(e) => setDebtBal(e.target.value)}
                    placeholder="3000000"
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Fecha límite o corte</label>
                <input
                  type="date"
                  value={debtDue}
                  onChange={(e) => setDebtDue(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Guardar</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => { setShowAddDebt(false); setEditDebt(null); }}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= MODAL: REGISTRAR ABONO ================= */}
      {debtPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">Abonar a {debtPayModal.name}</h3>
              <button onClick={() => setDebtPayModal(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <p className="mt-1 text-xs text-muted">Saldo actual: {formatCOP(debtPayModal.balance)}</p>
            <form onSubmit={handleAddPayment} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Valor a abonar ($ COP)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Ej. 250000"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Nota o referencia (opcional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ej. Cuota mensual nov"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Confirmar abono</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setDebtPayModal(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= MODAL: META DE AHORRO ================= */}
      {(showAddGoal || editGoal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">{editGoal ? "Editar meta" : "Nueva meta de ahorro"}</h3>
              <button onClick={() => { setShowAddGoal(false); setEditGoal(null); }} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={editGoal ? handleUpdateGoal : handleAddGoal} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Nombre de la meta</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Ej. Viaje de vacaciones, Fondo de emergencia"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Monto objetivo ($ COP)</label>
                <input
                  type="number"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="Ej. 3000000"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              {!editGoal && (
                <div>
                  <label className="text-xs font-semibold text-ink">Ahorro inicial ($ COP)</label>
                  <input
                    type="number"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    placeholder="0"
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-ink">Fecha objetivo (opcional)</label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Guardar meta</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => { setShowAddGoal(false); setEditGoal(null); }}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ================= MODAL: REGISTRAR APORTE A META ================= */}
      {goalContribModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">Aportar a {goalContribModal.name}</h3>
              <button onClick={() => setGoalContribModal(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <p className="mt-1 text-xs text-muted">Ahorrado: {formatCOP(goalContribModal.currentAmount)} de {formatCOP(goalContribModal.targetAmount)}</p>
            <form onSubmit={handleAddContribution} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Monto a aportar ($ COP)</label>
                <input
                  type="number"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="Ej. 100000"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Nota o concepto</label>
                <input
                  type="text"
                  value={contribNotes}
                  onChange={(e) => setContribNotes(e.target.value)}
                  placeholder="Ej. Aporte quincena"
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="mt-4 flex gap-2 pt-2">
                <Button size="sm" type="submit" className="flex-1">Confirmar aporte</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setGoalContribModal(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function FinanceMetric({
  title,
  value,
  detail,
  icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "green" | "blue" | "amber";
}) {
  const cls =
    tone === "green"
      ? "bg-mint text-forest"
      : tone === "blue"
      ? "bg-[#edf4fb] text-[#5480a9]"
      : "bg-[#fff2df] text-[#b67629]";
  return (
    <Card className="p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${cls}`}>{icon}</span>
      <p className="mt-3 text-[10px] text-muted">{title}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[9px] text-[#98a39b]">{detail}</p>
    </Card>
  );
}

// =============================================================
// LISTA DE COMPRAS (CRUD COMPLETO)
// =============================================================

function ShoppingView({
  isReal,
  dashboardData,
  onRefresh,
}: {
  isReal: boolean;
  dashboardData: DashboardData | null;
  onRefresh: () => void;
}) {
  const { data: demoData, toggleGrocery: toggleDemoGrocery, addGrocery: addDemoGrocery } = useDemo();
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newPrice, setNewPrice] = useState("");
  const [editItem, setEditItem] = useState<{ id: string; name: string; quantity: number; price: number } | null>(null);

  const items = isReal ? dashboardData?.groceries || [] : demoData.groceries;
  const purchased = items.filter((item) => item.purchased).length;
  const totalEstimated = items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 1), 0);

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    if (isReal) {
      await addGroceryAction(newItem.trim(), Number(newQty) || 1, "unidades", Number(newPrice) || 0);
      setNewItem("");
      setNewQty("1");
      setNewPrice("");
      onRefresh();
    } else {
      addDemoGrocery(newItem.trim());
      setNewItem("");
    }
  }

  async function handleToggle(id: string, current: boolean) {
    if (isReal) {
      await toggleGroceryAction(id, !current);
      onRefresh();
    } else {
      toggleDemoGrocery(id);
    }
  }

  async function handleDelete(id: string) {
    if (isReal) {
      await deleteGroceryAction(id);
      onRefresh();
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    if (isReal) {
      await updateGroceryAction({
        id: editItem.id,
        name: editItem.name,
        quantity: editItem.quantity,
        price: editItem.price,
      });
      setEditItem(null);
      onRefresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="LISTA COMPARTIDA"
        title="Compras"
        description="Lo que hace falta en casa, sincronizado con todos."
        action={
          <div className="flex items-center gap-2">
            <Badge tone="green">{items.length} productos</Badge>
            {totalEstimated > 0 && <Badge tone="blue">Total estimado: {formatCOP(totalEstimated)}</Badge>}
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="text-sm font-bold text-ink">Lista del supermercado</p>
              <p className="mt-0.5 text-[10px] text-muted">{purchased} de {items.length} comprados</p>
            </div>
            <Badge tone={items.length > 0 ? "green" : "amber"}>
              {items.length > 0 ? "En progreso" : "Lista vacía"}
            </Badge>
          </div>

          <div className="p-5">
            {items.length > 0 ? (
              <div className="divide-y divide-line">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggle(item.id, item.purchased)}
                        className={`grid h-5 w-5 place-items-center rounded-md border ${
                          item.purchased ? "border-forest bg-forest text-white" : "border-[#cad6cc] text-transparent"
                        }`}
                      >
                        {item.purchased && <Check size={13} strokeWidth={3} />}
                      </button>
                      <span className={`text-xs font-semibold ${item.purchased ? "text-muted line-through" : "text-ink"}`}>
                        {item.name}
                        <span className="ml-2 text-[10px] font-normal text-muted">
                          {item.quantity} {item.unit || "unidades"}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.price > 0 && <span className="text-xs font-semibold text-muted">{formatCOP(item.price)}</span>}
                      {isReal && (
                        <>
                          <button
                            onClick={() => setEditItem({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })}
                            className="text-muted hover:text-ink"
                          >
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:text-rose-700">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-6 rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
                Tu lista de compras está vacía. Añade lo que haga falta en el formulario inferior.
              </div>
            )}

            <form onSubmit={submitItem} className="mt-4 grid gap-2 sm:grid-cols-[1fr_80px_110px_auto]">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Producto (ej. Leche, Café, Detergente)"
                className="focus-ring h-9 rounded-xl border border-line bg-canvas px-3 text-xs"
                required
              />
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder="Cant."
                className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
              />
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Precio est."
                className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
              />
              <Button type="submit" size="sm">
                <Plus size={15} /> Añadir
              </Button>
            </form>
          </div>
        </Card>

        <Card className="bg-[#eef5ef] p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-forest">
            <Sparkles size={18} />
          </span>
          <p className="mt-4 font-display text-xl text-ink">Compras organizadas.</p>
          <p className="mt-2 text-xs leading-6 text-muted">
            Los productos que anotes aquí se guardan directamente en tu base de datos y se sincronizan con los demás miembros de tu hogar.
          </p>
        </Card>
      </section>

      {/* Modal Editar Producto de Lista */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <h3 className="font-display text-lg text-ink">Editar producto de compra</h3>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Nombre</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Cantidad</label>
                  <input
                    type="number"
                    value={editItem.quantity}
                    onChange={(e) => setEditItem({ ...editItem, quantity: Number(e.target.value) })}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Precio ($ COP)</label>
                  <input
                    type="number"
                    value={editItem.price}
                    onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" type="submit" className="flex-1">Guardar cambios</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setEditItem(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// =============================================================
// INVENTARIO (CRUD COMPLETO)
// =============================================================

function InventoryView({
  isReal,
  moduleData,
  onRefresh,
}: {
  isReal: boolean;
  moduleData: Awaited<ReturnType<typeof getModuleDataAction>> | null;
  onRefresh: () => void;
}) {
  const { data: demoData } = useDemo();
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<InventoryData | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemUnit, setItemUnit] = useState("unidades");
  const [itemPlace, setItemPlace] = useState("Despensa");
  const [itemCategory, setItemCategory] = useState("General");
  const [itemExpires, setItemExpires] = useState("");

  const inventory = isReal ? moduleData?.inventory || [] : demoData.inventory;

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchQuery = item.name.toLowerCase().includes(query.toLowerCase());
      const matchPlace = placeFilter === "all" || item.place === placeFilter;
      return matchQuery && matchPlace;
    });
  }, [inventory, query, placeFilter]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    await addInventoryAction({
      name: itemName.trim(),
      quantity: Number(itemQty) || 1,
      unit: itemUnit,
      place: itemPlace,
      category: itemCategory,
      expires: itemExpires || undefined,
    });
    setItemName("");
    setItemExpires("");
    setShowAdd(false);
    onRefresh();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem || !itemName.trim()) return;
    await updateInventoryAction({
      id: editItem.id,
      name: itemName.trim(),
      quantity: Number(itemQty) || 1,
      unit: itemUnit,
      place: itemPlace,
      category: itemCategory,
      expires: itemExpires || undefined,
    });
    setEditItem(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Deseas eliminar este producto del inventario?")) return;
    await deleteInventoryAction(id);
    onRefresh();
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="LO QUE YA TIENES"
        title="Inventario"
        description="Tu despensa, nevera y suministros al día."
        action={
          <Button onClick={() => setShowAdd(!showAdd)} variant="secondary">
            <Plus size={15} /> {showAdd ? "Cerrar" : "Añadir producto"}
          </Button>
        }
      />

      {showAdd && (
        <Card className="border-forest p-5">
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-6">
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Producto (ej. Arroz)"
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-3 text-xs"
              required
            />
            <input
              type="number"
              value={itemQty}
              onChange={(e) => setItemQty(e.target.value)}
              placeholder="Cant."
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
            />
            <select
              value={itemPlace}
              onChange={(e) => setItemPlace(e.target.value)}
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
            >
              <option value="Despensa">Despensa</option>
              <option value="Nevera">Nevera</option>
              <option value="Baño">Baño / Limpieza</option>
            </select>
            <input
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
              placeholder="Categoría (ej. Granos)"
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
            />
            <input
              type="date"
              value={itemExpires}
              onChange={(e) => setItemExpires(e.target.value)}
              title="Vencimiento"
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
            />
            <Button size="sm" type="submit">Guardar</Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-5">
          <div className="flex items-center gap-1.5">
            {["all", "Despensa", "Nevera", "Baño"].map((place) => (
              <button
                key={place}
                onClick={() => setPlaceFilter(place)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  placeFilter === place ? "bg-forest text-white" : "bg-canvas text-muted hover:text-ink"
                }`}
              >
                {place === "all" ? "Todos" : place}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-line">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint text-forest">
                    <Package size={16} />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold text-ink">{item.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                      <span>{item.category}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><MapPin size={10} />{item.place}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.expires && (
                    <Badge tone={(item as any).isExpired ? "red" : "neutral"}>
                      {(item as any).isExpired ? "Vencido: " : "Vence: "}
                      {item.expires}
                    </Badge>
                  )}
                  <span className="text-xs font-bold text-ink">
                    {item.quantity} <span className="text-[10px] font-normal text-muted">{item.unit}</span>
                  </span>
                  {isReal && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditItem(item as InventoryData);
                          setItemName(item.name);
                          setItemQty(String(item.quantity));
                          setItemUnit(item.unit);
                          setItemPlace(item.place);
                          setItemCategory(item.category);
                          setItemExpires(item.expires || "");
                        }}
                        className="text-muted hover:text-ink"
                      >
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-xs text-muted">
            No se encontraron productos en el inventario.
          </div>
        )}
      </Card>

      {/* Modal Editar Inventario */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <h3 className="font-display text-lg text-ink">Editar producto</h3>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Nombre</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Cantidad</label>
                  <input
                    type="number"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Ubicación</label>
                  <select
                    value={itemPlace}
                    onChange={(e) => setItemPlace(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  >
                    <option value="Despensa">Despensa</option>
                    <option value="Nevera">Nevera</option>
                    <option value="Baño">Baño</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={itemExpires}
                  onChange={(e) => setItemExpires(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" type="submit" className="flex-1">Guardar cambios</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setEditItem(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// =============================================================
// TAREAS (CRUD COMPLETO)
// =============================================================

function TasksView({
  isReal,
  dashboardData,
  onRefresh,
}: {
  isReal: boolean;
  dashboardData: DashboardData | null;
  onRefresh: () => void;
}) {
  const { data: demoData, toggleTask: toggleDemoTask, addTask: addDemoTask } = useDemo();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [editTask, setEditTask] = useState<{ id: string; title: string; due: string; priority: string } | null>(null);

  const tasks = isReal ? dashboardData?.tasks || [] : demoData.tasks;
  const doneCount = tasks.filter((task) => task.done).length;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "pending") return !t.done;
      if (filter === "done") return t.done;
      return true;
    });
  }, [tasks, filter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (isReal) {
      await addTaskAction(title.trim(), undefined, dueDate || undefined, priority);
      setTitle("");
      setDueDate("");
      onRefresh();
    } else {
      addDemoTask(title.trim());
      setTitle("");
    }
  }

  async function handleToggle(id: string, current: boolean) {
    if (isReal) {
      await toggleTaskAction(id, !current);
      onRefresh();
    } else {
      toggleDemoTask(id);
    }
  }

  async function handleDelete(id: string) {
    if (isReal) {
      await deleteTaskAction(id);
      onRefresh();
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTask) return;
    if (isReal) {
      await updateTaskAction({
        id: editTask.id,
        title: editTask.title,
        dueDate: editTask.due || undefined,
        priority: editTask.priority,
      });
      setEditTask(null);
      onRefresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="RUTINAS COMPARTIDAS"
        title="Tareas"
        description="Pequeños pendientes que hacen más fácil el hogar."
        action={
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${filter === "all" ? "bg-forest text-white" : "bg-canvas text-muted"}`}
            >
              Todas ({tasks.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${filter === "pending" ? "bg-forest text-white" : "bg-canvas text-muted"}`}
            >
              Pendientes ({tasks.length - doneCount})
            </button>
            <button
              onClick={() => setFilter("done")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${filter === "done" ? "bg-forest text-white" : "bg-canvas text-muted"}`}
            >
              Completadas ({doneCount})
            </button>
          </div>
        }
      />

      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-2 border-b border-line pb-4 sm:grid-cols-[1fr_130px_110px_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nuevo pendiente (ej. Regar plantas, Sacar basura)..."
            className="focus-ring h-9 rounded-xl border border-line bg-canvas px-3 text-xs"
            required
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="focus-ring h-9 rounded-xl border border-line bg-canvas px-2 text-xs"
          >
            <option value="normal">Prioridad Normal</option>
            <option value="high">Prioridad Alta</option>
            <option value="low">Prioridad Baja</option>
          </select>
          <Button type="submit" size="sm">
            <Plus size={15} /> Añadir
          </Button>
        </form>

        {filteredTasks.length > 0 ? (
          <div className="mt-3 divide-y divide-line">
            {filteredTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(task.id, task.done)}
                    className={`grid h-5 w-5 place-items-center rounded-full border ${
                      task.done ? "border-forest bg-forest text-white" : "border-[#c7d3ca] text-transparent"
                    }`}
                  >
                    {task.done && <Check size={12} strokeWidth={3} />}
                  </button>
                  <div>
                    <span className={`text-xs font-semibold ${task.done ? "text-muted line-through" : "text-ink"}`}>
                      {task.title}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-muted">
                      {task.detail} {task.due && `· Fecha: ${task.due}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={(task as any).priority === "high" ? "red" : (task as any).priority === "low" ? "neutral" : "green"}>
                    {(task as any).priority === "high" ? "Alta" : (task as any).priority === "low" ? "Baja" : "Normal"}
                  </Badge>
                  {isReal && (
                    <>
                      <button
                        onClick={() => setEditTask({ id: task.id, title: task.title, due: task.due, priority: (task as any).priority || "normal" })}
                        className="text-muted hover:text-ink"
                      >
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-8 text-center text-xs text-muted">No hay tareas con ese estado.</div>
        )}
      </Card>

      {/* Modal Editar Tarea */}
      {editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <h3 className="font-display text-lg text-ink">Editar tarea</h3>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Título</label>
                <input
                  type="text"
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Fecha</label>
                  <input
                    type="date"
                    value={editTask.due !== "Hoy" ? editTask.due : ""}
                    onChange={(e) => setEditTask({ ...editTask, due: e.target.value })}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Prioridad</label>
                  <select
                    value={editTask.priority}
                    onChange={(e) => setEditTask({ ...editTask, priority: e.target.value })}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" type="submit" className="flex-1">Guardar cambios</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setEditTask(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// =============================================================
// EVENTOS (CRUD COMPLETO)
// =============================================================

function EventsView({
  isReal,
  moduleData,
  onRefresh,
}: {
  isReal: boolean;
  moduleData: Awaited<ReturnType<typeof getModuleDataAction>> | null;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editEvent, setEditEvent] = useState<EventData | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDetail, setEventDetail] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventBudget, setEventBudget] = useState("");

  const events = isReal ? moduleData?.events || [] : [];

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    await addEventAction({
      title: eventTitle.trim(),
      detail: eventDetail.trim(),
      date: eventDate,
      budget: Number(eventBudget) || 0,
    });
    setEventTitle("");
    setEventDetail("");
    setEventDate("");
    setEventBudget("");
    setShowAdd(false);
    onRefresh();
  }

  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editEvent || !eventTitle.trim() || !eventDate) return;
    await updateEventAction({
      id: editEvent.id,
      title: eventTitle.trim(),
      detail: eventDetail.trim(),
      date: eventDate,
      budget: Number(eventBudget) || 0,
    });
    setEditEvent(null);
    onRefresh();
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm("¿Deseas eliminar este evento?")) return;
    await deleteEventAction(id);
    onRefresh();
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="PLANES DEL HOGAR"
        title="Eventos"
        description="Celebraciones y compromisos especiales."
        action={
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus size={15} /> {showAdd ? "Cerrar" : "Nuevo evento"}
          </Button>
        }
      />

      {showAdd && (
        <Card className="border-forest p-5">
          <form onSubmit={handleAddEvent} className="grid gap-3 sm:grid-cols-4">
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Título (ej. Cumpleaños, Cena familiar)"
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-3 text-xs"
              required
            />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-3 text-xs"
              required
            />
            <input
              type="number"
              value={eventBudget}
              onChange={(e) => setEventBudget(e.target.value)}
              placeholder="Presupuesto ($ COP)"
              className="focus-ring h-9 rounded-xl border border-line bg-canvas px-3 text-xs"
            />
            <Button size="sm" type="submit">Guardar evento</Button>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <p className="text-sm font-bold text-ink">Próximos planes</p>
        {events.length > 0 ? (
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-mint text-forest">
                    <span className="text-[10px] font-bold leading-none">{event.dateFormatted}</span>
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink">{event.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{event.detail}</p>
                    {event.budget > 0 && (
                      <p className="mt-0.5 text-[10px] font-semibold text-forest">Presupuesto: {formatCOP(event.budget)}</p>
                    )}
                  </div>
                </div>

                {isReal && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditEvent(event);
                        setEventTitle(event.title);
                        setEventDetail(event.detail);
                        setEventDate(event.date);
                        setEventBudget(String(event.budget));
                      }}
                      className="text-muted hover:text-ink"
                    >
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDeleteEvent(event.id)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="my-8 text-center text-xs text-muted">
            No tienes eventos registrados aún. Haz clic en "Nuevo evento".
          </div>
        )}
      </Card>

      {/* Modal Editar Evento */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm p-6">
            <h3 className="font-display text-lg text-ink">Editar evento</h3>
            <form onSubmit={handleUpdateEvent} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink">Título</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink">Detalle o ubicación</label>
                <input
                  type="text"
                  value={eventDetail}
                  onChange={(e) => setEventDetail(e.target.value)}
                  className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-3 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Fecha</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Presupuesto ($ COP)</label>
                  <input
                    type="number"
                    value={eventBudget}
                    onChange={(e) => setEventBudget(e.target.value)}
                    className="focus-ring mt-1 h-9 w-full rounded-xl border border-line bg-canvas px-2 text-xs"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" type="submit" className="flex-1">Guardar cambios</Button>
                <Button size="sm" variant="secondary" type="button" onClick={() => setEditEvent(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}



// =============================================================
// CONFIGURACIÓN (CRUD NOMBRE DE HOGAR Y PERFIL)
// =============================================================

function SettingsView({
  isReal,
  moduleData,
  onRefresh,
}: {
  isReal: boolean;
  moduleData: Awaited<ReturnType<typeof getModuleDataAction>> | null;
  onRefresh: () => void;
}) {
  const [editingHousehold, setEditingHousehold] = useState(false);
  const [householdName, setHouseholdName] = useState(moduleData?.householdName || "Hogar Villato");
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulario de agregar miembro
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");
  const [memberPassword, setMemberPassword] = useState("HomeCalm2026*");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  const members = moduleData?.members || [];
  const currentUserId = (moduleData as any)?.currentUserId;
  const currentUserRole = (moduleData as any)?.currentUserRole || "admin";
  const isAdmin = currentUserRole === "admin";

  async function handleSaveHousehold(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErrorMsg(null);
    const res = await updateHouseholdNameAction(householdName);
    if (!res.success) {
      setErrorMsg(res.error || "No se pudo actualizar el hogar.");
      return;
    }
    setEditingHousehold(false);
    setMsg("Nombre del hogar actualizado exitosamente.");
    onRefresh();
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErrorMsg(null);
    setIsSubmittingMember(true);

    try {
      const res = await addHouseholdMemberAction({
        name: memberName,
        email: memberEmail,
        role: memberRole,
        password: memberPassword,
      });

      if (!res.success) {
        setErrorMsg(res.error || "No se pudo agregar al miembro.");
        setIsSubmittingMember(false);
        return;
      }

      setMsg(`¡${memberName} ha sido vinculado/a exitosamente al hogar!`);
      setShowAddMember(false);
      setMemberName("");
      setMemberEmail("");
      setMemberPassword("HomeCalm2026*");
      setMemberRole("member");
      onRefresh();
    } catch {
      setErrorMsg("Ocurrió un error inesperado al procesar la vinculación.");
    } finally {
      setIsSubmittingMember(false);
    }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`¿Estás seguro/a de remover a ${name} de este hogar? Perderá acceso a los movimientos y listas compartidas.`)) {
      return;
    }
    setMsg(null);
    setErrorMsg(null);

    const res = await removeHouseholdMemberAction(userId);
    if (!res.success) {
      setErrorMsg(res.error || "No se pudo remover al miembro.");
      return;
    }

    setMsg(`${name} fue removido/a del hogar.`);
    onRefresh();
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeading
        eyebrow="TU CASA, A TU MANERA"
        title="Configuración"
        description="Preferencias y miembros del hogar."
        action={<Badge tone="green">{isReal ? "MySQL Aiven Cloud" : "Local"}</Badge>}
      />

      {msg && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">{msg}</div>}
      {errorMsg && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMsg}</div>}

      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-ink">{moduleData?.householdName || "Hogar Villato"}</p>
                <p className="mt-0.5 text-[10px] text-muted">{members.length} miembro(s) registrados</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setEditingHousehold(!editingHousehold)}>
                {editingHousehold ? "Cerrar" : "Editar"}
              </Button>
            </div>

            {editingHousehold && (
              <form onSubmit={handleSaveHousehold} className="mt-4 flex gap-2 border-t border-line pt-4">
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="focus-ring h-9 flex-1 rounded-xl border border-line bg-canvas px-3 text-xs"
                  required
                />
                <Button size="sm" type="submit">Guardar</Button>
              </form>
            )}

            <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase text-muted">Moneda</span>
                <p className="mt-0.5 font-medium text-ink">COP ($)</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-muted">Zona horaria</span>
                <p className="mt-0.5 font-medium text-ink">America/Bogota</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink">Miembros del hogar</p>
                <p className="text-[10px] text-muted">Personas que comparten y organizan esta casa.</p>
              </div>
              {isAdmin && (
                <Button size="sm" variant={showAddMember ? "secondary" : "primary"} onClick={() => setShowAddMember(!showAddMember)}>
                  <Plus size={14} className={showAddMember ? "rotate-45 transition-transform" : ""} />
                  {showAddMember ? "Cancelar" : "Agregar miembro"}
                </Button>
              )}
            </div>

            {/* Formulario para agregar miembro */}
            {showAddMember && (
              <form onSubmit={handleAddMember} className="mt-4 space-y-3 rounded-2xl border border-line bg-[#f8faf8] p-4 text-xs animate-fade-up">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">Vincular nuevo miembro al hogar</p>
                  <span className="text-[10px] text-muted">Rol: Administrador o Miembro</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Nombre</span>
                    <input
                      type="text"
                      placeholder="Ej. Stephania o Sebastián"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="focus-ring h-9 w-full rounded-xl border border-line bg-white px-3 text-xs"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Correo electrónico</span>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="focus-ring h-9 w-full rounded-xl border border-line bg-white px-3 text-xs"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Rol en el hogar</span>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as "admin" | "member")}
                      className="focus-ring h-9 w-full rounded-xl border border-line bg-white px-3 text-xs"
                    >
                      <option value="member">Miembro (Lectura y gestión colaborativa)</option>
                      <option value="admin">Administrador/a (Control total)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Contraseña provisional</span>
                    <input
                      type="text"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      className="focus-ring h-9 w-full rounded-xl border border-line bg-white px-3 text-xs"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                  </label>
                </div>

                <p className="text-[10px] text-muted">
                  💡 Si la persona ya tiene cuenta registrada en HOMECALM con este correo, se vinculará directamente a tu hogar. Si es una persona nueva, podrá iniciar sesión con esta contraseña provisional y cambiarla luego.
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="secondary" type="button" onClick={() => setShowAddMember(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" type="submit" disabled={isSubmittingMember}>
                    {isSubmittingMember ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                    {isSubmittingMember ? "Vinculando…" : "Vincular al hogar"}
                  </Button>
                </div>
              </form>
            )}

            {/* Listado de miembros */}
            <div className="mt-4 divide-y divide-line">
              {members.map((m) => {
                const isSelf = m.id === currentUserId;
                return (
                  <div key={m.id || m.email} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d6b18b] text-xs font-bold text-[#513e2e]">
                        {m.initials}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="block text-xs font-semibold text-ink">{m.name}</span>
                          {isSelf && (
                            <span className="rounded-md bg-[#eef4f0] px-1.5 py-0.5 text-[9px] font-bold text-forest">
                              Tú
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted">{m.role} · {m.email}</span>
                      </div>
                    </div>

                    {isAdmin && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        className="rounded-lg p-1.5 text-muted hover:bg-rose/10 hover:text-rose transition"
                        title={`Remover a ${m.name} del hogar`}
                        aria-label={`Remover a ${m.name} del hogar`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="border-[#cadfd2] bg-[#f2f8f4] p-5">
          <p className="text-xs font-bold text-forest">Seguridad y Aislamiento</p>
          <p className="mt-2 text-[10px] leading-5 text-[#55695e]">
            Cada movimiento, cuenta y registro está estrictamente aislado por el identificador único de tu hogar en MySQL.
            Las operaciones atómicas garantizan consistencia contable en todo momento.
          </p>
        </Card>
      </div>
    </div>
  );
}
