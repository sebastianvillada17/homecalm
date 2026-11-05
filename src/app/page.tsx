import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ShoppingBasket, WalletCards, Wheat } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Badge } from "@/components/ui";

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden bg-[#f6f7f3]">
    <header className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 sm:px-9">
      <Wordmark />
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#617168] hover:bg-white inline-flex"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-dark"
        >
          Crear mi espacio <ArrowRight size={14} />
        </Link>
      </div>
    </header>

    <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-16 pt-8 sm:px-9 lg:grid-cols-[.95fr_1.05fr] lg:gap-16 lg:pb-24 lg:pt-14">
      <div className="relative z-10">
        <Badge tone="green">
          <span className="h-1.5 w-1.5 rounded-full bg-forest" /> TODO EN CASA, UN POCO MÁS CLARO
        </Badge>
        <h1 className="mt-6 max-w-[610px] font-display text-[44px] leading-[1.04] tracking-[-.055em] text-ink sm:text-[58px] xl:text-[66px]">
          Que la vida de casa <span className="text-forest">fluya mejor.</span>
        </h1>
        <p className="mt-5 max-w-[490px] text-[15px] leading-7 text-[#718077]">
          Finanzas, compras y pendientes del hogar, reunidos en un espacio que se siente simple y compartido.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white shadow-sm transition hover:bg-forest-dark"
          >
            Crear mi espacio <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-[#bfd2c5]"
          >
            Iniciar sesión
          </Link>
        </div>
        <p className="mt-4 text-[10px] text-[#9aa59d]">
          Sincronización en tiempo real · Base de datos MySQL en la nube · Tu información siempre segura
        </p>
        <div className="mt-10 flex items-center gap-4 border-t border-[#e4e9e3] pt-5"><div className="flex -space-x-2"><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#f6f7f3] bg-[#d6b18b] text-[9px] font-bold text-[#583f2e]">S</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#f6f7f3] bg-[#c0d2c2] text-[9px] font-bold text-[#315445]">S</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#f6f7f3] bg-[#e8d0aa] text-[9px] font-bold text-[#654e2e]">E</span></div><p className="text-[11px] text-[#718077]">Un solo lugar para lo que comparten.</p></div>
      </div>

      <div className="relative mx-auto w-full max-w-[650px] lg:ml-0"><div className="absolute -right-12 -top-10 h-72 w-72 rounded-full bg-[#e3efe6] blur-3xl" /><div className="absolute -bottom-12 -left-8 h-64 w-64 rounded-full bg-[#f9e8d0] blur-3xl" />
        <div className="relative rotate-[1.2deg] rounded-[28px] border border-white/70 bg-white p-3 shadow-[0_28px_80px_rgba(28,61,48,.12)] sm:p-5">
          <div className="flex items-center justify-between border-b border-[#edf0eb] pb-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-mint text-forest"><WalletCards size={16} /></span><div><p className="text-[10px] font-bold text-ink">Hogar Villato</p><p className="text-[9px] text-muted">Resumen del hogar</p></div></div><span className="rounded-full bg-[#edf6ee] px-2.5 py-1 text-[9px] font-bold text-forest">Modo demo</span></div>
          <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#f6f8f4] p-3"><p className="text-[9px] text-muted">Disponible</p><p className="mt-1 text-[17px] font-bold tracking-tight text-ink">$4,8 M</p><p className="mt-1 text-[9px] text-forest">Al día</p></div><div className="rounded-2xl bg-[#f6f8f4] p-3"><p className="text-[9px] text-muted">Gastos del mes</p><p className="mt-1 text-[17px] font-bold tracking-tight text-ink">$2,8 M</p><p className="mt-1 text-[9px] text-[#a8793d]">50,7% del plan</p></div><div className="hidden rounded-2xl bg-[#f6f8f4] p-3 sm:block"><p className="text-[9px] text-muted">Próxima tarea</p><p className="mt-1 text-[12px] font-bold text-ink">Recoger el mercado</p><p className="mt-1 text-[9px] text-muted">Hoy · 5:30 p. m.</p></div></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-[#edf0eb] p-3.5"><div className="flex items-center justify-between"><p className="text-[10px] font-bold text-ink">Semana del hogar</p><span className="text-[9px] text-muted">Ingresos · Gastos</span></div><div className="mt-5 flex h-[92px] items-end gap-2">{[42,60,48,75,55,87,68].map((height,index)=><div key={index} className="relative flex h-full flex-1 items-end gap-1"><span className="w-full rounded-t-md bg-[#cfe4d7]" style={{height:`${height}%`}}/><span className="absolute bottom-0 right-0 w-[42%] rounded-t-md bg-[#e8b879]" style={{height:`${Math.max(18,height-24)}%`}}/></div>)}</div><div className="mt-2 flex justify-between text-[8px] text-[#a1aaa3]"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div></div><div className="rounded-2xl bg-[#f0f5ee] p-3.5"><div className="flex items-center justify-between"><p className="text-[10px] font-bold text-ink">Esta semana</p><CalendarDays size={13} className="text-forest" /></div><p className="mt-4 font-display text-[17px] leading-tight text-ink">Un ritmo que<br/>se siente bien.</p><div className="mt-4 space-y-2"><div className="flex items-center gap-2 text-[9px] text-[#63736a]"><span className="grid h-4 w-4 place-items-center rounded-full bg-forest text-white"><Check size={9}/></span>Revisar el presupuesto</div><div className="flex items-center gap-2 text-[9px] text-[#63736a]"><span className="h-4 w-4 rounded-full border border-[#c5d4c8]"/>Organizar el menú</div></div></div></div>
          <div className="mt-3 grid grid-cols-3 gap-2"><div className="flex items-center gap-2 rounded-xl border border-[#edf0eb] px-2.5 py-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#edf5ef] text-forest"><WalletCards size={13}/></span><span className="text-[9px] font-semibold text-ink">Finanzas</span></div><div className="flex items-center gap-2 rounded-xl border border-[#edf0eb] px-2.5 py-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fff3df] text-[#ad742c]"><ShoppingBasket size={13}/></span><span className="text-[9px] font-semibold text-ink">Compras</span></div><div className="flex items-center gap-2 rounded-xl border border-[#edf0eb] px-2.5 py-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eff3fb] text-[#617fa4]"><Wheat size={13}/></span><span className="text-[9px] font-semibold text-ink">Alimentación</span></div></div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1320px] px-5 pb-10 sm:px-9"><div className="grid gap-3 border-t border-[#e4e9e3] pt-7 sm:grid-cols-3"><Feature icon={<WalletCards size={17}/>} title="Un mapa sencillo del dinero" text="Ve lo que entra, lo que sale y lo que quieren lograr juntos."/><Feature icon={<ShoppingBasket size={17}/>} title="Una lista que se conecta" text="Compras y despensa se organizan en el mismo lugar."/><Feature icon={<Check size={17}/>} title="Más orden, menos ruido" text="Tareas, eventos y comidas con un ritmo compartido."/></div></section>
    <footer className="border-t border-[#e4e9e3] py-5 text-center text-[10px] text-[#9aa59d]">HOMECALM · SVB · V1</footer>
  </main>;
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 rounded-2xl px-2 py-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-forest shadow-sm">{icon}</span><div><p className="text-xs font-bold text-ink">{title}</p><p className="mt-1 text-[10px] leading-5 text-muted">{text}</p></div></div>;
}
