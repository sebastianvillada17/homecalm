"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loguear el error en cliente
    console.error("[HOMECALM ERROR BOUNDARY]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
      <Card className="w-full max-w-md p-6 text-center shadow-xl animate-fade-up">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
          <AlertTriangle size={28} />
        </div>
        <h1 className="font-serif text-2xl font-bold text-ink">
          Algo no salió como esperábamos
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Ocurrió una pausa inesperada en la aplicación. Tu información sigue segura en tu base de datos.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            size="sm"
            onClick={() => reset()}
            className="flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Intentar de nuevo</span>
          </Button>

          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-4 text-xs font-semibold text-muted hover:text-ink transition"
          >
            <Home size={14} />
            <span>Ir al inicio</span>
          </Link>
        </div>
      </Card>
    </main>
  );
}

