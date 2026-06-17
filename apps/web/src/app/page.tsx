import { Membrane } from "@/components/membrane";
import { Eyebrow, Pill, Stat } from "@/components/ui";
import { ENV } from "@/lib/env";
import { explorerAddress, freshnessLabel, REASON_LABELS, shortHex } from "@/lib/format";
import { getPolicy } from "@/lib/onchain";
import { fetchTotals } from "@/lib/supabase";

export const revalidate = 10;

const PIPELINE = [
  { n: "01", title: "Watch", body: "An inbound Transfer hits the agent's holding wallet." },
  { n: "02", title: "Screen", body: "query_apass + query_user resolve the sender's real identity." },
  { n: "03", title: "Evaluate", body: "Tier, jurisdiction, freshness, blacklist — against on-chain policy." },
  { n: "04", title: "Route", body: "Clean funds to operating; risky funds to segregated quarantine." },
  { n: "05", title: "Record", body: "The verdict is anchored on-chain and written to the audit log." },
];

export default async function Home() {
  const [totals, policy] = await Promise.all([
    fetchTotals().catch(() => ({ total: 0, cleared: 0, quarantined: 0 })),
    getPolicy(),
  ]);
  const contract = explorerAddress(ENV.cordonAddress) ?? "#";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--hairline)" }}>
        <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[52%] md:block">
          <Membrane />
        </div>
        <div className="shell relative z-10 flex min-h-[82vh] flex-col justify-center py-20">
          <div className="reveal flex max-w-[540px] flex-col gap-7">
            <Eyebrow tone="plum">Inbound compliance firewall</Eyebrow>
            <h1 className="t-hero">A firewall for the money your AI&nbsp;agent receives.</h1>
            <p className="t-subheading measure text-ash">
              Anyone can dust your agent&apos;s wallet with sanctioned, mixer-linked, or simply non-compliant value.
              Cordon screens every inbound payment against on-chain risk policy — before it can touch spendable
              balance.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Pill href="/stream">See it screen, live →</Pill>
              <Pill href="/audit" tone="outline">
                Read the audit
              </Pill>
            </div>
            <a
              href={contract}
              target="_blank"
              rel="noreferrer"
              className="font-mono t-caption text-smoke transition-colors hover:text-bone"
            >
              Live on Monad · {shortHex(ENV.cordonAddress)} ↗
            </a>
          </div>
          <div aria-hidden="true" className="relative mt-12 h-[280px] w-full md:hidden">
            <Membrane />
          </div>
        </div>
      </section>

      {/* Thesis */}
      <section className="shell py-[120px]">
        <Eyebrow tone="plum">Why Cordon</Eyebrow>
        <h2 className="t-display mt-6 max-w-[18ch]">Everyone built brakes. Nobody built the windshield.</h2>
        <p className="t-subheading measure mt-8 text-ash">
          Every live Cleanverse project gates what an agent <span className="text-bone">spends</span>. Cordon owns the
          axis the board missed — what the agent is <span className="text-bone">paid</span>. Tainted funds are
          quarantined and never reach operating capital, and every screen becomes a regulator-ready record.
        </p>
      </section>

      {/* Pipeline */}
      <section className="shell border-t py-[120px]" style={{ borderColor: "var(--hairline)" }}>
        <Eyebrow>The keeper · rule-based, no AI guesswork in the money path</Eyebrow>
        <h2 className="t-heading-lg mt-6 max-w-[22ch]">Five steps from inbound transfer to immutable verdict.</h2>
        <ol
          className="mt-14 grid gap-px overflow-hidden rounded-[24px] md:grid-cols-5"
          style={{ background: "var(--hairline)" }}
        >
          {PIPELINE.map((step) => (
            <li key={step.n} className="flex flex-col gap-4 bg-void p-6">
              <span className="font-mono t-caption text-plum">{step.n}</span>
              <span className="t-heading-sm">{step.title}</span>
              <span className="t-body-sm text-smoke">{step.body}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-2.5">
          {REASON_LABELS.map((r) => (
            <span
              key={r}
              className="eyebrow rounded-[24px] border px-3 py-1.5 text-ash"
              style={{ borderColor: "var(--hairline)", letterSpacing: "0.1em" }}
            >
              {r}
            </span>
          ))}
        </div>
      </section>

      {/* Live stats */}
      <section className="shell border-t py-[120px]" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Screened on-chain</Eyebrow>
            <h2 className="t-heading-lg mt-6 max-w-[20ch]">Real verdicts, anchored on Monad.</h2>
          </div>
          <Pill href="/stream" tone="outline">
            Open the live stream →
          </Pill>
        </div>
        <div className="mt-16 grid gap-12 sm:grid-cols-3">
          <Stat value={totals.total} label="Deposits screened" />
          <Stat value={totals.cleared} label="Cleared" tone="lichen" />
          <Stat value={totals.quarantined} label="Quarantined" tone="amber" />
        </div>
        {policy ? (
          <p className="t-body-sm mt-12 font-mono text-smoke">
            Active policy · minTier {policy.minTier} · freshness {freshnessLabel(policy.freshnessWindow)} · blacklist{" "}
            {policy.requireCleanBlacklist ? "enforced" : "advisory"}
          </p>
        ) : null}
      </section>

      {/* Closing thesis */}
      <section className="shell border-t py-[120px]" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="t-display max-w-[20ch]">
          They screen what the agent spends. Cordon screens what it&apos;s <span className="text-plum">paid.</span>
        </h2>
        <div className="mt-12">
          <Pill href="/stream">See it screen, live →</Pill>
        </div>
      </section>
    </>
  );
}
