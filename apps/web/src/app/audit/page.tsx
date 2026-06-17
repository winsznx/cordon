import { DepositRow } from "@/components/deposit-row";
import { PageIntro } from "@/components/page-intro";
import { Stat } from "@/components/ui";
import { fetchDeposits, fetchTotals } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const [deposits, totals] = await Promise.all([
    fetchDeposits({ limit: 200 }).catch(() => []),
    fetchTotals().catch(() => ({ total: 0, cleared: 0, quarantined: 0 })),
  ]);

  return (
    <div className="pb-10">
      <PageIntro
        eyebrow="Audit log"
        title="A regulator-ready record of every screen."
        action={
          <div className="flex gap-3">
            <a
              href="/api/export?format=json"
              className="eyebrow inline-flex items-center gap-2 rounded-[24px] border px-5 py-3.5 transition hover:border-[color:var(--color-bone)]"
              style={{ borderColor: "var(--hairline-strong)", letterSpacing: "0.12em" }}
            >
              JSON ↓
            </a>
            <a
              href="/api/export?format=pdf"
              className="eyebrow inline-flex items-center gap-2 rounded-[24px] bg-plum px-5 py-3.5 text-bone transition hover:opacity-90"
              style={{ letterSpacing: "0.12em" }}
            >
              PDF ↓
            </a>
          </div>
        }
      >
        Selective disclosure — KYC hash, tier, group, verdict, and the on-chain transaction. No PII. Cleared and
        quarantined deposits are first-class rows; the report proves the institution actively contained what it caught.
      </PageIntro>

      <div className="shell grid gap-12 pb-16 sm:grid-cols-3">
        <Stat value={totals.total} label="Screened" />
        <Stat value={totals.cleared} label="Cleared" tone="lichen" />
        <Stat value={totals.quarantined} label="Quarantined" tone="amber" />
      </div>

      <div className="shell flex flex-col gap-3">
        {deposits.length === 0 ? (
          <p className="t-body text-smoke">No deposits yet.</p>
        ) : (
          deposits.map((d) => <DepositRow key={d.depositId} d={d} />)
        )}
      </div>
    </div>
  );
}
