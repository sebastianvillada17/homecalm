"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card } from "@/components/ui";
import { formatCompactCOP } from "@/lib/utils";

const monthlyData = [
  { month: "Jun", ingresos: 4.5, gastos: 3.2 },
  { month: "Jul", ingresos: 4.8, gastos: 3.6 },
  { month: "Ago", ingresos: 4.7, gastos: 3.1 },
  { month: "Sep", ingresos: 5.0, gastos: 3.8 },
  { month: "Oct", ingresos: 5.05, gastos: 3.4 },
  { month: "Nov", ingresos: 5.2, gastos: 2.84 },
];

export function FinanceReport() {
  return <Card className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-sm font-bold text-ink">Tendencia de 6 meses</p><p className="mt-1 text-[11px] text-muted">Ingresos frente a gastos · datos demo en millones COP</p></div>
      <Badge tone="blue">Jun — Nov 2026</Badge>
    </div>
    <div className="mt-4 flex items-center gap-4 text-[10px] text-muted"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest"/>Ingresos</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e9b36f]"/>Gastos</span></div>
    <div className="mt-3 h-[210px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlyData} margin={{ top: 8, right: 6, left: -18, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#edf0eb" strokeDasharray="3 5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#98a39b", fontSize: 10 }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#98a39b", fontSize: 9 }} tickFormatter={(value: number) => `$${value}`} width={42} domain={[0, 6]} />
          <Tooltip formatter={(value) => formatCompactCOP(Number(value) * 1_000_000)} labelStyle={{ color: "#728078", fontSize: 10 }} contentStyle={{ border: "1px solid #e7ebe5", borderRadius: 12, fontSize: 11 }} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#176b5b" radius={[5, 5, 0, 0]} maxBarSize={24} />
          <Bar dataKey="gastos" name="Gastos" fill="#e9b36f" radius={[5, 5, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Card>;
}
