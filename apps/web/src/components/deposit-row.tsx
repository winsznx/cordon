import Link from "next/link";
import { formatUtc, shortHex } from "@/lib/format";
import type { Deposit } from "@/lib/types";
import { VerdictBadge } from "./ui";

export function DepositRow({ d, time }: { d: Deposit; time?: string }) {
  return (
    <Link
      href={`/audit/${d.depositId}`}
      className="card group block px-6 py-5 transition-colors"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <VerdictBadge verdict={d.verdict} />
          <span className="truncate font-mono t-body-sm text-ash transition-colors group-hover:text-bone">
            {shortHex(d.sender, 12, 8)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-6 t-caption text-smoke">
          <span className="hidden sm:inline">tier {d.senderTier ?? "—"}</span>
          {d.verdict === "quarantined" ? (
            <span className="hidden md:inline" style={{ color: "var(--color-amber)" }}>
              {d.reasonLabel}
            </span>
          ) : null}
          <span className="hidden font-mono lg:inline">{time ?? formatUtc(d.screenedAt)}</span>
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
