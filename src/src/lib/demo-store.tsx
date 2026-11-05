"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type DemoTask = { id: string; title: string; detail: string; due: string; done: boolean; accent: string };
export type DemoGrocery = { id: string; name: string; quantity: number; unit: string; purchased: boolean; price: number };
export type DemoInventory = { id: string; name: string; quantity: number; unit: string; place: string; category: string; expires?: string };
export type DemoTransaction = { id: string; name: string; category: string; date: string; account: string; amount: number; type: "income" | "expense" };
export type DemoState = {
  tasks: DemoTask[];
  groceries: DemoGrocery[];
  inventory: DemoInventory[];
  transactions: DemoTransaction[];
  shoppingClosed: boolean;
};

type DemoContextValue = {
  data: DemoState;
  hydrated: boolean;
  toggleTask: (id: string) => void;
  addTask: (title: string) => void;
  toggleGrocery: (id: string) => void;
  addGrocery: (name: string, quantity?: number, unit?: string) => void;
  closeShoppingList: () => void;
  addTransaction: (transaction: Omit<DemoTransaction, "id">) => void;
  resetDemo: () => void;
};

const STORAGE_KEY = "homeflow-demo-v2";

export const initialDemoState: DemoState = {
  tasks: [
    { id: "t1", title: "Sacar la ropa de la lavadora", detail: "Lavandería · Stephania", due: "Hoy · 10:30", done: false, accent: "bg-sky" },
    { id: "t2", title: "Regar las plantas del balcón", detail: "Jardín · Sebastian", due: "Hoy · 12:00", done: true, accent: "bg-forest" },
    { id: "t3", title: "Recoger el pedido de mercado", detail: "Compras · Todos", due: "Hoy · 17:30", done: false, accent: "bg-sun" },
  ],
  groceries: [
    { id: "g1", name: "Leche deslactosada", quantity: 2, unit: "litros", purchased: false, price: 9800 },
    { id: "g2", name: "Aguacates", quantity: 4, unit: "unidades", purchased: true, price: 12000 },
    { id: "g3", name: "Avena en hojuelas", quantity: 1, unit: "paquete", purchased: false, price: 7900 },
  ],
  inventory: [
    { id: "i1", name: "Arroz integral", quantity: 2, unit: "kg", place: "Despensa", category: "Granos" },
    { id: "i2", name: "Leche deslactosada", quantity: 1, unit: "litro", place: "Nevera", category: "Lácteos", expires: "Vence en 4 días" },
    { id: "i3", name: "Café molido", quantity: 1, unit: "bolsa", place: "Despensa", category: "Bebidas" },
    { id: "i4", name: "Tomates chontos", quantity: 3, unit: "unidades", place: "Nevera", category: "Verduras", expires: "Vence mañana" },
  ],
  transactions: [
    { id: "m1", name: "Mercado del hogar", category: "Alimentación", date: "2026-11-02", account: "Cuenta principal", amount: 186400, type: "expense" },
    { id: "m2", name: "Pago mensual", category: "Ingresos", date: "2026-11-01", account: "Cuenta principal", amount: 5200000, type: "income" },
    { id: "m3", name: "Servicio de internet", category: "Servicios", date: "2026-10-30", account: "Cuenta principal", amount: 89000, type: "expense" },
  ],
  shoppingClosed: false,
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoState>(initialDemoState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setData({ ...initialDemoState, ...JSON.parse(stored) as Partial<DemoState> });
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable in private browsing. */ }
    } finally {
      setHydrated(true);
    }
  }, []);

  const update = useCallback((updater: (previous: DemoState) => DemoState) => {
    setData((previous) => {
      const next = updater(previous);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Private browsing may disable local storage. */ }
      return next;
    });
  }, []);

  const toggleTask = useCallback((id: string) => update((previous) => ({
    ...previous,
    tasks: previous.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task),
  })), [update]);

  const addTask = useCallback((title: string) => update((previous) => ({
    ...previous,
    tasks: [{ id: `t-${Date.now()}`, title, detail: "Hogar · Sin asignar", due: "Sin fecha", done: false, accent: "bg-forest" }, ...previous.tasks],
  })), [update]);

  const toggleGrocery = useCallback((id: string) => update((previous) => ({
    ...previous,
    groceries: previous.groceries.map((item) => item.id === id ? { ...item, purchased: !item.purchased } : item),
  })), [update]);

  const addGrocery = useCallback((name: string, quantity = 1, unit = "unidad") => update((previous) => {
    if (previous.groceries.some((item) => item.name.toLowerCase() === name.toLowerCase())) return previous;
    return { ...previous, shoppingClosed: false, groceries: [...previous.groceries, { id: `g-${Date.now()}`, name, quantity, unit, purchased: false, price: 0 }] };
  }), [update]);

  const closeShoppingList = useCallback(() => update((previous) => {
    if (previous.shoppingClosed) return previous;
    const purchased = previous.groceries.filter((item) => item.purchased);
    const inventory = [...previous.inventory];
    for (const item of purchased) {
      const match = inventory.find((entry) => entry.name.toLowerCase() === item.name.toLowerCase());
      if (match) match.quantity += item.quantity;
      else inventory.push({ id: `i-${item.id}`, name: item.name, quantity: item.quantity, unit: item.unit, place: "Despensa", category: "Mercado" });
    }
    const groceries = previous.groceries.filter((item) => !item.purchased);
    return { ...previous, groceries, inventory, shoppingClosed: true };
  }), [update]);

  const addTransaction = useCallback((transaction: Omit<DemoTransaction, "id">) => update((previous) => ({
    ...previous,
    transactions: [{ ...transaction, id: `m-${Date.now()}` }, ...previous.transactions],
  })), [update]);

  const resetDemo = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Reset visible state even if storage is disabled. */ }
    setData(initialDemoState);
  }, []);

  const value = useMemo(() => ({ data, hydrated, toggleTask, addTask, toggleGrocery, addGrocery, closeShoppingList, addTransaction, resetDemo }), [data, hydrated, toggleTask, addTask, toggleGrocery, addGrocery, closeShoppingList, addTransaction, resetDemo]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo debe usarse dentro de DemoProvider");
  return value;
}
