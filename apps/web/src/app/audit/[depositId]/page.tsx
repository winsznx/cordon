import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, VerdictBadge } from "@/components/ui";
import { explorerAddress, explorerTx, formatUtc, shortHex } from "@/lib/format";
import { fetchDeposit } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function ExplorerLink({ href, children }: { href: string | null; children: string }) {
  if (!href) return <span className="font-mono">{children}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-mono transition-colors hover:text-bone">
      {children} ↗
    </a>
  );
}

export default async function DepositDetail({ params }: { params: Promise<{ depositId: string }> }) {
  const { depositId } = await params;
  const d = await fetchDeposit(depositId).catch(() => null);
  if (!d) notFound();

  const cleared = d.verdict === "cleared";

  return (
    <div className="shell pb-10 pt-20">
      <Link href="/audit" className="t-body-sm text-smoke transition-colors hover:text-bone">
        ← Audit log
      </Link>

      <div className="mt-8 flex flex-col gap-6">
        <VerdictBadge verdict={d.verdict} />
        <h1 className="t-display break-all" style={{ fontSize: "clamp(30px, 4vw, 52px)" }}>
          {shortHex(d.sender, 14, 10)}
        </h1>
        <p className="t-subheading text-ash">
          {cleared ? (
            <>Cleared at tier {d.reason} — swept to operating, spendable.</>
          ) : (
            <>
              Quarantined: <span className="text-amber">{d.reasonLabel}</span> — contained, never reached operating
              capital.
            </>
          )}
        </p>
      </div>

      <div className="mt-12 grid gap-x-12 md:grid-cols-2">
        <Field label="Deposit ID">
          <span className="font-mono">{d.depositId}</span>
        </Field>
        <Field label="Sender">
          <ExplorerLink href={explorerAddress(d.sender)}>{d.sender}</ExplorerLink>
        </Field>
        <Field label="Sender tier">{d.senderTier ?? "—"}</Field>
        <Field label="Jurisdiction group">{d.senderGroup ?? "—"}</Field>
        <Field label="Amount" hint="base units (0 = screen-only, pre-settlement)">
          <span className="font-mono">{d.amount}</span>
        </Field>
        <Field label="A-Token">
          <ExplorerLink href={explorerAddress(d.aToken)}>{shortHex(d.aToken, 10, 8)}</ExplorerLink>
        </Field>
        <Field label="KYC hash" hint="selective disclosure — proves verified status, no PII">
          <span className="font-mono">{d.senderKycHash ?? "—"}</span>
        </Field>
        <Field label="Attestation hash">
          <span className="font-mono">{d.attestationHash ?? "—"}</span>
        </Field>
        <Field label="Verdict tx" hint="on-chain audit anchor">
          <ExplorerLink href={explorerTx(d.verdictTx)}>{shortHex(d.verdictTx, 12, 10)}</ExplorerLink>
        </Field>
        <Field label="Screened at">
          <span className="font-mono">{formatUtc(d.screenedAt)}</span>
        </Field>
      </div>
    </div>
  );
}
