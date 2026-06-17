import { PageIntro } from "@/components/page-intro";
import { Field } from "@/components/ui";
import { ENV } from "@/lib/env";
import { explorerAddress, freshnessLabel, REASON_LABELS, shortHex } from "@/lib/format";
import { getPolicy } from "@/lib/onchain";

export const revalidate = 10;

function AddrLink({ addr }: { addr: string }) {
  const href = explorerAddress(addr) ?? "#";
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-mono transition-colors hover:text-bone">
      {shortHex(addr, 10, 8)} ↗
    </a>
  );
}

export default async function PolicyPage() {
  const policy = await getPolicy();
  const contract = explorerAddress(ENV.cordonAddress);

  return (
    <div className="pb-10">
      <PageIntro eyebrow="Inbound risk policy" title="Enforced on-chain — the richer layer over a binary check.">
        Cleanverse tells you <span className="text-bone">if</span> a counterparty is verified. Cordon decides whether
        that verified money is allowed <span className="text-bone">into this institution</span> — minimum tier, allowed
        jurisdiction, A-Pass freshness, clean blacklist.
      </PageIntro>

      <div className="shell">
        {policy ? (
          <div className="grid gap-x-12 md:grid-cols-2">
            <Field label="Minimum tier" hint="senders below this are quarantined — TierTooLow">
              {policy.minTier}
            </Field>
            <Field label="Freshness window" hint="A-Pass must not expire within this window — NearExpiry">
              {freshnessLabel(policy.freshnessWindow)}
            </Field>
            <Field label="Blacklist" hint="query_user.blacklist_reason must be empty — Blacklisted">
              {policy.requireCleanBlacklist ? "Enforced" : "Advisory"}
            </Field>
            <Field label="Keeper" hint="the only address allowed to record verdicts">
              <AddrLink addr={policy.keeper} />
            </Field>
            <Field label="Operating wallet" hint="clean, spendable destination">
              <AddrLink addr={policy.operating} />
            </Field>
            <Field label="Quarantine wallet" hint="segregated — funds routed here are never spent">
              <AddrLink addr={policy.quarantine} />
            </Field>
          </div>
        ) : (
          <p className="t-body text-smoke">On-chain policy read unavailable right now.</p>
        )}

        <div className="mt-16">
          <span className="eyebrow text-smoke">Quarantine reasons</span>
          <div className="mt-5 flex flex-wrap gap-2.5">
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
        </div>

        {contract ? (
          <p className="mt-14 font-mono t-caption text-smoke">
            CordonPolicy ·{" "}
            <a href={contract} target="_blank" rel="noreferrer" className="transition-colors hover:text-bone">
              {ENV.cordonAddress} ↗
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
