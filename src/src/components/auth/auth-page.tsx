"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { z } from "zod";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui";
import { loginAction, registerAction, requestPasswordResetAction } from "@/actions/auth";

type AuthMode = "login" | "register" | "forgot";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [notice, setNotice] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const title = isRegister ? "Un hogar más liviano empieza aquí." : isForgot ? "Volvamos a encontrarnos." : "Que todo fluya en casa.";
  const subtitle = isRegister ? "Organicen las finanzas, las compras y los pendientes en un solo lugar." : isForgot ? "Deja tu correo para recuperar el acceso a tu espacio." : "Un espacio para llevar las cuentas, las compras y los planes sin complicarse.";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsError(false);

    const validEmail = z.string().email("Escribe un correo válido.").safeParse(email);
    if (!validEmail.success) {
      setNotice(validEmail.error.issues[0]?.message ?? "Revisa el correo.");
      setIsError(true);
      return;
    }

    if (!isForgot && password.trim().length < 8) {
      setNotice("La contraseña debe tener al menos 8 caracteres.");
      setIsError(true);
      return;
    }

    if (isRegister && name.trim().length < 2) {
      setNotice("Escribe tu nombre para continuar.");
      setIsError(true);
      return;
    }

    if (isForgot) {
      setIsSubmitting(true);
      try {
        const res = await requestPasswordResetAction(email);
        setNotice(res.message);
        setIsError(!res.success);
      } catch {
        setNotice("Ocurrió un error al procesar tu solicitud.");
        setIsError(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        const res = await registerAction({ name, email, password });
        if (!res.success) {
          setNotice(res.error || "No se pudo crear la cuenta.");
          setIsError(true);
          setIsSubmitting(false);
          return;
        }
        window.location.href = "/dashboard";
      } else {
        const res = await loginAction({ email, password });
        if (!res.success) {
          setNotice(res.error || "Credenciales incorrectas.");
          setIsError(true);
          setIsSubmitting(false);
          return;
        }
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const isFetchError = err?.message?.includes("fetch") || err?.name === "TypeError";
      setNotice(
        isFetchError
          ? "No se pudo conectar con el servidor local. Asegúrate de tener ejecutando 'pnpm dev' en tu terminal."
          : (err?.message || "Ocurrió un error al procesar la solicitud.")
      );
      setIsError(true);
      setIsSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-[#f5f6f2] lg:grid lg:grid-cols-[1.03fr_.97fr]">
    <section className="auth-photo relative hidden min-h-screen overflow-hidden lg:block">
      <div className="auth-sheen absolute inset-0" />
      <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14">
        <Wordmark light />
        <div className="max-w-[510px] pb-7 text-white">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.13em]"><span className="h-1.5 w-1.5 rounded-full bg-[#f0b96e]" /> La vida de casa, en equilibrio</p>
          <h1 className="font-display text-5xl leading-[1.08] tracking-[-.04em] xl:text-[58px]">{title}</h1>
          <p className="mt-5 max-w-[410px] text-sm leading-7 text-white/75">{subtitle}</p>
          <div className="mt-8 flex items-center gap-3 text-xs text-white/80"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/15"><Check size={14} /></span><span>Todo lo importante, un paso a la vez.</span></div>
        </div>
        <p className="text-[10px] tracking-wide text-white/50">HOMECALM · Organización del hogar</p>
      </div>
    </section>

    <section className="flex min-h-screen flex-col justify-center px-5 py-8 sm:px-10 lg:px-12 xl:px-20">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-9 flex items-center justify-between lg:hidden"><Wordmark compact /><span className="rounded-full bg-[#e6f1e9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-forest">Demo</span></div>
        <Link href={isForgot ? "/login" : "/"} className="mb-7 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-forest"><ArrowLeft size={14} /> {isForgot ? "Volver al acceso" : "Volver al inicio"}</Link>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-forest">{isRegister ? "COMIENZA CON CALMA" : isForgot ? "RECUPERAR ACCESO" : "QUÉ BUENO TENERTE AQUÍ"}</p>
        <h2 className="mt-2 font-display text-[34px] leading-tight tracking-[-.04em] text-ink">{isRegister ? "Crea tu espacio" : isForgot ? "¿Olvidaste tu clave?" : "Inicia sesión"}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{isRegister ? "Un espacio compartido para que la casa fluya mejor." : isForgot ? "La recuperación de cuenta estará disponible en la fase de backend." : "Todo tu hogar, un poco más en orden."}</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {isRegister && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#56645b]">Tu nombre</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Stephania Villato" className="focus-ring h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm outline-none placeholder:text-[#a5aea8] focus:border-forest" /></label>}
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#56645b]">Correo electrónico</span><span className="relative block"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa69d]" /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className="focus-ring h-11 w-full rounded-xl border border-line bg-white pl-9 pr-3.5 text-sm outline-none placeholder:text-[#a5aea8] focus:border-forest" /></span></label>
          {!isForgot && <label className="block"><span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#56645b]">Contraseña{!isRegister && <Link href="/forgot-password" className="font-medium text-forest hover:underline">¿La olvidaste?</Link>}</span><span className="relative block"><LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa69d]" /><input type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="focus-ring h-11 w-full rounded-xl border border-line bg-white pl-9 pr-11 text-sm outline-none placeholder:text-[#a5aea8] focus:border-forest" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa69d] hover:text-ink" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
          {notice && (
            <p
              role="status"
              className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${
                isError
                  ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
                  : "border-[#f1dfbd] bg-[#fff8eb] text-[#8b6327]"
              }`}
            >
              {notice}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isRegister ? "Creando espacio…" : "Iniciando sesión…"}
              </>
            ) : (
              <>
                {isRegister ? "Crear mi espacio" : isForgot ? "Continuar" : "Iniciar sesión"}
                <ArrowRight size={15} />
              </>
            )}
          </Button>
        </form>

        {!isForgot && <p className="mt-5 text-center text-xs text-muted">{isRegister ? "¿Ya tienes un espacio?" : "¿Primera vez por aquí?"} <Link href={isRegister ? "/login" : "/register"} className="font-bold text-forest hover:underline">{isRegister ? "Inicia sesión" : "Crear cuenta"}</Link></p>}
        <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-line" /><span className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#a0aaa3]">o explora primero</span><span className="h-px flex-1 bg-line" /></div>
        <Link href="/dashboard" className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-xs font-bold text-ink transition hover:border-[#bfd2c5] hover:bg-[#fbfcfa]">Entrar al modo demo <ArrowRight size={14} className="text-forest" /></Link>
        <p className="mt-3 text-center text-[10px] leading-5 text-[#9aa49c]">Las cuentas creadas se guardan en tu base de datos MySQL.<br />También puedes acceder en modo demostración con datos locales.</p>
      </div>
    </section>
  </main>;
}
