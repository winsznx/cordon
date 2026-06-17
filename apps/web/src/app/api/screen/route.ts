import { CleanverseClient } from "@usecordon/cleanverse";
import { monadClient, readPolicy, screenSender } from "@usecordon/screening";
import { isAddress, type Address } from "viem";
import { ENV } from "@/lib/env";
import { REASON_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

const RPC = process.env.MONAD_RPC_URL ?? "";

// Read-only live screen: anyone can check any wallet against the on-chain policy. No writes.
export async function GET(request: Request): Promise<Response> {
  const address = (new URL(request.url).searchParams.get("address") ?? "").trim();
  if (!isAddress(address)) {
    return Response.json({ error: "Enter a valid 0x wallet address." }, { status: 400 });
  }
  if (!RPC || !ENV.cordonAddress) {
    return Response.json({ error: "Server not configured." }, { status: 500 });
  }

  try {
    const { policy } = await readPolicy(monadClient(RPC), ENV.cordonAddress as Address);
    const client = new CleanverseClient();
    const nowSec = Math.floor(Date.now() / 1000);
    const r = await screenSender({ client, chain: "monad", symbol: "usdc", sender: address, policy, nowSec });
    const cleared = r.verdict === 0;

    return Response.json({
      address,
      cleared,
      verdict: cleared ? "cleared" : "quarantined",
      reason: r.reason,
      reasonLabel: cleared ? `tier ${r.reason}` : (REASON_LABELS[r.reason] ?? String(r.reason)),
      tier: r.tier,
      group: r.apass?.group ?? null,
      hasApass: r.apass !== null,
      attestationHash: r.attestationHash,
      screenedAt: r.screenedAt,
      policy: { minTier: policy.minTier },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Screen failed." }, { status: 500 });
  }
}
