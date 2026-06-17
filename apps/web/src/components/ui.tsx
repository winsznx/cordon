import Link from "next/link";
import type { ReactNode } from "react";
import type { VerdictLabel } from "@/lib/types";

const CLEARED_COLOR = "color-mix(in srgb, var(--color-lichen) 55%, var(--color-bone))";
const QUARANTINE_COLOR = "var(--color-amber)";

export function Eyebrow({ children, tone = "bone" }: { children: ReactNode; tone?: "bone" | "plum" | "amber" }) {
  const color = tone === "plum" ? "text-plum" : tone === "amber" ? "text-amber" : "text-bone";
  return <span className={`eyebrow ${color}`}>{children}</span>;
}

export function Pill({
  href,
  children,
  external = false,
  tone = "plum",
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  tone?: "plum" | "outline";
}) {
  const tones =
    tone === "plum"
      ? "bg-plum text-bone hover:opacity-90"
      : "border text-bone hover:border-[color:var(--color-bone)]";
  const inner = (
    <span
      className={`eyebrow inline-flex items-center gap-2 rounded-[24px] px-5 py-3.5 transition ${tones}`}
      style={{ letterSpacing: "0.12em", borderColor: tone === "outline" ? "var(--hairline-strong)" : undefined }}
    >
      {children}
    </span>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={href}>{inner}</Link>
  );
}

export function VerdictBadge({ verdict, label }: { verdict: VerdictLabel; label?: string }) {
  const cleared = verdict === "cleared";
  const color = cleared ? CLEARED_COLOR : QUARANTINE_COLOR;
  return (
    <span
      className="eyebrow inline-flex items-center gap-2 rounded-[24px] border px-3 py-1.5"
      style={{ borderColor: color, color, letterSpacing: "0.12em" }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label ?? (cleared ? "Cleared" : "Quarantined")}
    </span>
  );
}

export function Stat({
  value,
  label,
  tone = "bone",
}: {
  value: ReactNode;
  label: string;
  tone?: "bone" | "plum" | "amber" | "lichen";
}) {
  const color =
    tone === "plum"
      ? "var(--color-plum)"
      : tone === "amber"
        ? "var(--color-amber)"
        : tone === "lichen"
          ? CLEARED_COLOR
          : "var(--color-bone)";
  return (
    <div className="flex flex-col gap-2">
      <span style={{ fontWeight: 200, fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1, letterSpacing: "-0.04em", color }}>
        {value}
      </span>
      <span className="eyebrow text-smoke">{label}</span>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t py-5" style={{ borderColor: "var(--hairline)" }}>
      <span className="eyebrow text-smoke">{label}</span>
      <div className="t-body-sm break-all text-ash">{children}</div>
      {hint ? <span className="t-caption text-smoke">{hint}</span> : null}
    </div>
  );
}
