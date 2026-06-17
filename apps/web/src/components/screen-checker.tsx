"use client";

import { useState } from "react";
import { shortHex } from "@/lib/format";
import { VerdictBadge } from "./ui";

interface Result {
  address: string;
  cleared: boolean;
  verdict: "cleared" | "quarantined";
  reasonLabel: string;
  tier: number | null;
  group: string | null;
  hasApass: boolean;
  policy: { minTier: number };
}

const VERIFIED = "0x83C130ed9fb92830F09ea2b30E49009EF03065Bb";
const UNVERIFIED = "0xdEAD000000000000000042069420694206942069";

export function ScreenChecker() {
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(target: string): Promise<void> {
    const a = target.trim();
    if (!a || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/screen?address=${encodeURIComponent(a)}`);
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Screen failed.");
      else setResult(data as Result);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(addr)}
          placeholder="0x… paste any wallet address"
          spellCheck={false}
          className="flex-1 rounded-[24px] border bg-transparent px-5 py-3.5 font-mono t-body-sm text-bone outline-none placeholder:text-smoke"
          style={{ borderColor: "var(--hairline-strong)" }}
        />
        <button
          type="button"
          onClick={() => run(addr)}
          disabled={loading}
          className="eyebrow rounded-[24px] bg-plum px-6 py-3.5 text-bone transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ letterSpacing: "0.12em" }}
        >
          {loading ? "Screening…" : "Screen"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 t-caption text-smoke">
        <span>Try:</span>
        <button type="button" onClick={() => { setAddr(VERIFIED); run(VERIFIED); }} className="transition-colors hover:text-bone">
          a verified sender →
        </button>
        <button type="button" onClick={() => { setAddr(UNVERIFIED); run(UNVERIFIED); }} className="transition-colors hover:text-bone">
          an unverified one →
        </button>
      </div>

      {error ? <p className="t-body-sm text-amber">{error}</p> : null}

      {result ? (
        <div className="card flex flex-col gap-4 px-6 py-5" style={{ borderColor: "var(--hairline)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <VerdictBadge verdict={result.verdict} />
            <span className="font-mono t-caption text-smoke">{shortHex(result.address, 12, 8)}</span>
          </div>
          <p className="t-body-sm text-ash">
            {result.cleared ? (
              <>Verified · tier {result.tier} · clears the policy (minTier {result.policy.minTier}) → swept to operating.</>
            ) : (
              <>
                <span className="text-amber">{result.reasonLabel}</span>
                {result.hasApass ? <> · tier {result.tier}</> : <> · no A-Pass</>} → routed to quarantine, never spendable.
              </>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
