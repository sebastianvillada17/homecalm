import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f6f2] px-6 text-center">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm max-w-md w-full">
        <p className="text-xs font-bold uppercase tracking-widest text-forest">404 — No encontrado</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">Página no encontrada</h1>
        <p className="mt-2 text-xs leading-5 text-muted">
          La ruta a la que intentas ingresar no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-dark"
          >
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

