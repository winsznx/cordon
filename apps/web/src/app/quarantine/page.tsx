import { DepositRow } from "@/components/deposit-row";
import { PageIntro } from "@/components/page-intro";
import { fetchDeposits } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function QuarantinePage() {
  const deposits = await fetchDeposits({ verdict: "quarantined", limit: 200 }).catch(() => []);

  return (
    <div className="pb-10">
      <PageIntro eyebrow="Quarantine" title="The money that never got in.">
        Deposits that failed policy — routed to a segregated wallet, never mixed into operating capital. Each row is a
        contained inbound compliance attack, logged for the regulator.
      </PageIntro>
      <div className="shell flex flex-col gap-3">
        {deposits.length === 0 ? (
          <p className="t-body text-smoke">Nothing in quarantine — every screened deposit cleared policy.</p>
        ) : (
          deposits.map((d) => <DepositRow key={d.depositId} d={d} />)
        )}
      </div>
    </div>
  );
}
