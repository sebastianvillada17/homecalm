"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, Search, X } from "lucide-react";
import { navigation, routeTitles } from "@/lib/navigation";
import { Wordmark } from "@/components/brand";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { getCurrentUserAction, logoutAction } from "@/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function AppShell({
  children,
  user,
  groceryCount = 0,
}: {
  children: React.ReactNode;
  user?: SessionUser | null;
  groceryCount?: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(user ?? null);
  const { resetDemo } = useDemo();
  const pageTitle = routeTitles[pathname] ?? "Resumen";

  useEffect(() => {
    if (!currentUser) {
      getCurrentUserAction().then(setCurrentUser);
    }
  }, [currentUser]);

  async function handleLogout() {
    await logoutAction();
    window.location.href = "/login";
  }

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "HV";
  const displayName = currentUser?.name || "Miembro del hogar";
  const shortName = displayName.split(" ")[0];
  const householdName = currentUser?.householdName || "Hogar Villato";
  const isRealUser = !!currentUser;

  // Fecha de hoy formateada en español
  const todayFormatted = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const todayCapitalized =
    todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-[#14271f]/45 backdrop-blur-[2px] lg:hidden"
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[258px] -translate-x-full flex-col bg-[#173f36] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
      >
        <div className="flex h-[78px] items-center justify-between border-b border-white/10 px-5">
          <Wordmark light />
          <button
            onClick={() => setMobileOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl text-white/75 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <button className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.07] px-3 py-3 text-left transition hover:bg-white/[.11]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f0e9] text-forest">
            <span className="font-display text-[18px]">V</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-white truncate">
              {householdName}
            </span>
            <span className="mt-0.5 block text-[10px] text-white/55">
              {isRealUser ? "Base de datos MySQL" : "Modo demostración"}
            </span>
          </span>
          <ChevronDown size={15} className="text-white/50" />
        </button>

        <nav className="app-scrollbar mt-5 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          {navigation.map((section, index) => (
            <div key={section.label ?? `main-${index}`}>
              {section.label && (
                <p className="mb-2 px-3 text-[9px] font-bold tracking-[.17em] text-white/40">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map(({ label, href, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" &&
                      href !== "/finanzas" &&
                      pathname.startsWith(`${href}/`));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                        active
                          ? "bg-[#e6f1e9] text-[#164b3f] shadow-sm"
                          : "text-white/68 hover:bg-white/[.08] hover:text-white"
                      )}
                    >
                      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                      <span className="flex-1">{label}</span>
                      {href === "/compras" && groceryCount > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                            active
                              ? "bg-forest/10 text-forest"
                              : "bg-white/10 text-white/70"
                          )}
                        >
                          {groceryCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-white/[.06] p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#dbebdf]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7fcca6]" /> Tu espacio, en calma
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-white/50">
            Una pequeña rutina hoy hace más liviana la semana.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d6b18b] text-xs font-bold text-[#563d29]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{displayName}</p>
            <p className="mt-0.5 text-[10px] text-white/45">
              {isRealUser ? "Conectado" : "Modo demostración"}
            </p>
          </div>
          {isRealUser ? (
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] text-white/50 hover:bg-white/10 hover:text-white/90"
            >
              <LogOut size={12} /> Salir
            </button>
          ) : (
            <button
              onClick={resetDemo}
              title="Restablecer datos de demostración"
              className="rounded-lg px-2 py-1 text-[9px] text-white/45 hover:bg-white/10 hover:text-white/90"
            >
              Reiniciar
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:min-w-[600px]">
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink lg:hidden"
              aria-label="Abrir navegación"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="hidden text-[10px] font-medium uppercase tracking-[.13em] text-[#9aa69d] sm:block">
                {todayCapitalized}
              </p>
              <p className="text-sm font-semibold text-ink sm:mt-0.5">{pageTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              aria-label="Buscar"
              title="Búsqueda: próximamente"
              disabled
              className="grid h-9 w-9 cursor-not-allowed place-items-center rounded-xl border border-line bg-white text-[#9aa49c]"
            >
              <Search size={16} />
            </button>
            <button
              aria-label="Notificaciones"
              title="Notificaciones: próximamente"
              disabled
              className="relative grid h-9 w-9 cursor-not-allowed place-items-center rounded-xl border border-line bg-white text-[#9aa49c]"
            >
              <Bell size={16} />
              <span className="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#e78364] ring-2 ring-white" />
            </button>
            <div className="ml-1 hidden h-8 items-center gap-2 border-l border-line pl-3 sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#d6b18b] text-[10px] font-bold text-[#563d29]">
                {initials}
              </div>
              <span className="text-xs font-semibold text-ink">{shortName}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-10 pt-5 sm:px-7 sm:pt-7 lg:px-9">
          {isRealUser ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3.5 py-2 text-[11px] text-[#166534]">
              <span>
                <strong className="font-semibold text-[#15803d]">Conectado a MySQL:</strong>{" "}
                Has iniciado sesión como <strong>{displayName}</strong> ({currentUser.email}) en{" "}
                <strong>{householdName}</strong>.
              </span>
              <button
                onClick={handleLogout}
                className="font-semibold text-forest underline-offset-4 hover:underline"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d8e8dd] bg-[#eef6ef] px-3.5 py-2.5 text-[11px] text-[#557566]">
              <span>
                <strong className="font-semibold text-[#316752]">Modo demostración.</strong>{" "}
                <Link href="/register" className="font-semibold text-forest underline">
                  Crea tu cuenta real aquí
                </Link>{" "}
                para sincronizar tus datos en MySQL.
              </span>
              <Link
                href="/login"
                className="font-semibold text-forest underline-offset-4 hover:underline"
              >
                Iniciar sesión
              </Link>
            </div>
          )}
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1500px] items-center justify-between border-t border-line px-4 py-4 text-[10px] text-[#96a19a] sm:px-7 lg:px-9">
          <span>HOMECALM · Un hogar a la vez</span>
          <span>Privado por diseño</span>
        </footer>
      </div>
    </div>
  );
}
