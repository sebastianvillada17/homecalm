"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs=[
  {label:"Resumen",href:"/finanzas"},
  {label:"Cuentas",href:"/finanzas/cuentas"},
  {label:"Presupuestos",href:"/finanzas/presupuestos"},
  {label:"Deudas",href:"/finanzas/deudas"},
  {label:"Ahorros",href:"/finanzas/ahorros"},
];
export function FinanceTabs(){
  const pathname=usePathname();
  return <nav aria-label="Secciones financieras" className="app-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1.5">{tabs.map((tab)=><Link key={tab.href} href={tab.href} aria-current={pathname===tab.href?"page":undefined} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition",pathname===tab.href?"bg-[#eaf3ec] text-forest":"text-muted hover:bg-canvas hover:text-ink")}>{tab.label}</Link>)}</nav>;
}
