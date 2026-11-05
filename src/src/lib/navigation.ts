import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckSquare,
  CircleHelp,
  CreditCard,
  Home,
  LayoutDashboard,
  ListChecks,
  Package,
  Settings2,
  ShoppingBasket,
  Sparkles,
  WalletCards,
  Wheat,
} from "lucide-react";

export type NavigationItem = { label: string; href: string; icon: LucideIcon };
export type NavigationSection = { label?: string; items: NavigationItem[] };

export const navigation: NavigationSection[] = [
  { items: [{ label: "Resumen", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "MI HOGAR",
    items: [
      { label: "Finanzas", href: "/finanzas", icon: WalletCards },
      { label: "Compras", href: "/compras", icon: ShoppingBasket },
      { label: "Inventario", href: "/inventario", icon: Package },
      { label: "Tareas", href: "/tareas", icon: CheckSquare },
      { label: "Eventos", href: "/eventos", icon: CalendarDays },
      { label: "Alimentación", href: "/alimentacion", icon: Wheat },
    ],
  },
  {
    label: "TU ESPACIO",
    items: [
      { label: "Asistente", href: "/asistente", icon: Sparkles },
      { label: "Configuración", href: "/configuracion", icon: Settings2 },
    ],
  },
];

export const routeTitles: Record<string, string> = {
  "/dashboard": "Resumen",
  "/finanzas": "Finanzas",
  "/finanzas/cuentas": "Cuentas",
  "/finanzas/presupuestos": "Presupuestos",
  "/finanzas/deudas": "Deudas",
  "/finanzas/ahorros": "Ahorros",
  "/compras": "Compras",
  "/inventario": "Inventario",
  "/tareas": "Tareas",
  "/eventos": "Eventos",
  "/alimentacion": "Alimentación",
  "/asistente": "Asistente del hogar",
  "/configuracion": "Configuración",
};

export const quickLinks: NavigationItem[] = [
  { label: "Nueva tarea", href: "/tareas", icon: ListChecks },
  { label: "Añadir movimiento", href: "/finanzas", icon: CreditCard },
  { label: "Ver hogar", href: "/dashboard", icon: Home },
  { label: "Ayuda", href: "/asistente", icon: CircleHelp },
];
