// Real end-to-end Phase 2 smoke: read the live on-chain policy, screen the real
// verified identity against the real Cleanverse API. No mocks, no on-chain writes.
//
//   pnpm --filter @usecordon/screening smoke

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Address } from "viem";
import { CleanverseClient } from "@usecordon/cleanverse";
import { monadClient, readPolicy, screenSender, Reason, type EvalPolicy } from "../src/index";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");

for (const line of readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2] ?? "";
}

function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing env ${key}`);
  return v;
}

interface Deployments {
  contracts: { CordonPolicy: { address: string } };
}

const deployments = JSON.parse(readFileSync(resolve(ROOT, "deployments/monad.json"), "utf8")) as Deployments;
const CORDON = deployments.contracts.CordonPolicy.address as Address;
const SENDER = "0x83C130ed9fb92830F09ea2b30E49009EF03065Bb"; // verified identity (Silver / tier 28)
const UNENROLLED = "0x96F9A82fB53760b1447A859F730b6860FDB4A029"; // holding wallet, no A-Pass

async function main(): Promise<void> {
  const pub = monadClient(env("MONAD_RPC_URL"));
  const onchain = await readPolicy(pub, CORDON);
  console.log(`[smoke] CordonPolicy ${CORDON}`);
  console.log(`[smoke] on-chain policy:`, onchain.policy);

  const client = new CleanverseClient();
  const nowSec = Math.floor(Date.now() / 1000);

  const cleared = await screenSender({ client, chain: "monad", symbol: "usdc", sender: SENDER, policy: onchain.policy, nowSec });
  console.log(`\n[smoke] verified sender → cleared=${cleared.cleared} verdict=${cleared.verdict} reason=${cleared.reason} tier=${cleared.tier}`);
  console.log(`[smoke]   attestation=${cleared.attestationHash}`);

  const strict: EvalPolicy = { ...onchain.policy, minTier: 29 };
  const tooLow = await screenSender({ client, chain: "monad", symbol: "usdc", sender: SENDER, policy: strict, nowSec });
  console.log(`[smoke] same sender, minTier=29 → cleared=${tooLow.cleared} reason=${tooLow.reason} (expect ${Reason.TierTooLow} TierTooLow)`);

  const noPass = await screenSender({ client, chain: "monad", symbol: "usdc", sender: UNENROLLED, policy: onchain.policy, nowSec });
  console.log(`[smoke] un-enrolled wallet → cleared=${noPass.cleared} reason=${noPass.reason} (expect ${Reason.NoAPass} NoAPass)`);

  const ok = cleared.cleared && tooLow.reason === Reason.TierTooLow && noPass.reason === Reason.NoAPass;
  console.log(`\n[smoke] ${ok ? "PASS ✓" : "MISMATCH ✗"}`);
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`[smoke] FATAL: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
