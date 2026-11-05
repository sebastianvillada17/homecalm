import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number) {
  return copFormatter.format(value);
}

export function formatCompactCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    ...(options ?? {}),
    timeZone: "America/Bogota",
  }).format(typeof date === "string" ? new Date(`${date}T12:00:00`) : date);
}

export function getMondayOfCurrentWeek(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  // day: 0 (Sun), 1 (Mon), ..., 6 (Sat)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}
