// Cordon keeper — deterministic inbound screening daemon (PRD §6).
//
//   pnpm --filter @cordon/keeper start                      # watch + screen + record (default)
//   pnpm --filter @cordon/keeper exec tsx src/index.ts record <sender> [amount] [minTierOverride]
//
// No LLM in the money path.

import { Reason } from "@cordon/screening";
import type { Address } from "viem";
import { screenAndRecord } from "./record";
import { watchInbound } from "./watch";

function reasonName(verdict: number, reason: number): string {
  if (verdict === 0) return `CLEARED (tier ${reason})`;
  return `QUARANTINED (${Reason[reason] ?? reason})`;
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "watch";

  if (cmd === "watch") {
    await watchInbound();
    return;
  }

  if (cmd === "record") {
    const sender = process.argv[3] as Address | undefined;
    if (!sender) throw new Error("usage: record <sender> [amount] [minTierOverride]");
    const amount = BigInt(process.argv[4] ?? "0");
    const minTierArg = process.argv[5];
    const minTierOverride = minTierArg === undefined ? undefined : Number(minTierArg);

    const r = await screenAndRecord({ sender, amount, minTierOverride });
    console.log(`[keeper] ${reasonName(r.verdict, r.reason)}`);
    console.log(`[keeper]   sender      ${sender}`);
    console.log(`[keeper]   amount      ${amount}`);
    console.log(`[keeper]   depositId   ${r.depositId}`);
    console.log(`[keeper]   attestation ${r.attestationHash}`);
    console.log(`[keeper]   tx          ${r.txHash}`);
    return;
  }

  throw new Error(`unknown command: ${cmd} (expected "watch" or "record")`);
}

main().catch((e) => {
  console.error(`[keeper] FATAL: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
