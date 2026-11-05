import Link from "next/link";

export function BrandMark({ size = 38, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="42" height="42" rx="14" fill={light ? "rgba(255,255,255,.12)" : "#E8F3EE"} />
      <path d="M10 21.5 22 11l12 10.5" stroke={light ? "#F5F6F2" : "#176B5B"} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 20.8v11h15v-11" stroke={light ? "#F5F6F2" : "#176B5B"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 27h6l3-2.7 5 0" stroke="#EFAE53" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="HOMECALM, ir al inicio">
      <BrandMark size={compact ? 33 : 38} light={light} />
      <span className={`text-[18px] font-bold tracking-[-0.055em] ${light ? "text-white" : "text-ink"}`}>
        HOME<span className={light ? "text-[#B8DCCB]" : "text-forest"}>CALM</span>
      </span>
    </Link>
  );
}
