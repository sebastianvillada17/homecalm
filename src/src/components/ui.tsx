import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg" }) {
  return <button className={cn("focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50", {
    "bg-forest text-white shadow-sm hover:bg-forest-dark": variant === "primary",
    "border border-line bg-white text-ink hover:border-[#bfd2c5] hover:bg-[#fbfcfa]": variant === "secondary",
    "text-muted hover:bg-[#eff3ef] hover:text-ink": variant === "ghost",
    "bg-[#fff0ed] text-[#a8483d] hover:bg-[#ffe2dc]": variant === "danger",
    "h-8 px-3 text-xs": size === "sm",
    "h-10 px-4 text-sm": size === "md",
    "h-12 px-5 text-sm": size === "lg",
  }, className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-white shadow-card", className)} {...props} />;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue"; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", {
    "bg-[#f0f3f0] text-[#65736a]": tone === "neutral",
    "bg-[#e7f4ed] text-[#267258]": tone === "green",
    "bg-[#fff2df] text-[#a9691e]": tone === "amber",
    "bg-[#fff0ed] text-[#aa5145]": tone === "red",
    "bg-[#edf4fb] text-[#497aa8]": tone === "blue",
  }, className)}>{children}</span>;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("focus-ring w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-[#a5aea8] focus:border-forest", className)} {...props} />;
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-[#56645b]">{children}</label>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>
      {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-forest">{eyebrow}</p>}
      <h1 className="font-display text-[30px] leading-tight tracking-[-.035em] text-ink sm:text-[34px]">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9e3db] bg-[#fbfcfa] px-5 py-10 text-center">
    <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-mint text-forest">{icon}</div>
    <p className="font-semibold text-ink">{title}</p>
    <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
