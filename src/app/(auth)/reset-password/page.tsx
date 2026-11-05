"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, AlertCircle, CheckCircle2 } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui";
import { verifyResetTokenAction, resetPasswordAction } from "@/actions/auth";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-canvas">
          <Loader2 size={24} className="animate-spin text-forest" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formError, setFormError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!token || token.length !== 64) {
        setIsVerifying(false);
        setTokenValid(false);
        setTokenError("El enlace de recuperación es incompleto o inválido.");
        return;
      }

      try {
        const res = await verifyResetTokenAction(token);
        setIsVerifying(false);
        setTokenValid(res.valid);
        if (!res.valid) {
          setTokenError(res.error || "El enlace ha expirado o ya ha sido utilizado.");
        }
      } catch (err) {
        setIsVerifying(false);
        setTokenValid(false);
        setTokenError("No se pudo verificar el enlace.");
      }
    }
    verify();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordAction(token, password);
      if (!res.success) {
        setFormError(res.error || "No se pudo actualizar la contraseña.");
        return;
      }
      setIsSuccess(true);
    } catch {
      setFormError("Ocurrió un error inesperado al actualizar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-[420px] rounded-3xl border border-line bg-card p-6 sm:p-8 shadow-xl animate-fade-up">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark compact />
          <span className="rounded-full bg-[#e6f1e9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-forest">
            Seguridad
          </span>
        </div>

        <Link
          href="/login"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-forest"
        >
          <ArrowLeft size={13} />
          Volver a iniciar sesión
        </Link>

        {isVerifying ? (
          <div className="py-12 text-center text-xs text-muted flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-forest" />
            <span>Validando enlace de recuperación...</span>
          </div>
        ) : !tokenValid ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
              <AlertCircle size={24} />
            </div>
            <h2 className="font-serif text-xl font-bold text-ink">Enlace no válido</h2>
            <p className="text-xs text-muted leading-relaxed">
              {tokenError || "Este enlace de recuperación no es válido o ya ha expirado."}
            </p>
            <div className="pt-2">
              <Link
                href="/forgot-password"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-forest px-4 text-xs font-semibold text-white hover:bg-forest/90"
              >
                Solicitar nuevo enlace
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-50 text-forest">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="font-serif text-xl font-bold text-ink">¡Contraseña actualizada!</h2>
            <p className="text-xs text-muted leading-relaxed">
              Tu contraseña ha sido restablecida exitosamente. Ahora puedes ingresar con tus nuevas credenciales.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-xs font-semibold text-white hover:bg-forest/90"
              >
                <span>Ir al inicio de sesión</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
              Nueva contraseña
            </h1>
            <p className="mt-1 text-xs text-muted">
              Define tu nueva clave para acceder a tu hogar en calma.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
              <div>
                <span className="mb-1.5 block font-semibold text-[#56645b]">Nueva contraseña</span>
                <div className="relative">
                  <LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa69d]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="focus-ring h-11 w-full rounded-xl border border-line bg-canvas pl-9 pr-11 text-xs text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa69d] hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block font-semibold text-[#56645b]">Confirmar nueva contraseña</span>
                <div className="relative">
                  <LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa69d]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="focus-ring h-11 w-full rounded-xl border border-line bg-canvas pl-9 pr-11 text-xs text-ink outline-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <Button
                size="md"
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <span>Guardar y acceder</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
