import { AuditRepository, buildAuditRecord, createAuditClient } from "@cordon/audit";
import { CleanverseClient } from "@usecordon/cleanverse";
import { readPolicy, screenSender, type EvalPolicy } from "@usecordon/screening";
import { encodePacked, keccak256, type Address, type Hex } from "viem";
import { config, publicClient, walletClient } from "./config";

const recordVerdictAbi = [
  {
    type: "function",
    name: "recordVerdict",
    stateMutability: "nonpayable",
    inputs: [
      { name: "depositId", type: "bytes32" },
      { name: "sender", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "aToken", type: "address" },
      { name: "verdict", type: "uint8" },
      { name: "reason", type: "uint8" },
      { name: "attestationHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recorded",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export interface RecordArgs {
  sender: Address;
  amount: bigint;
  /** Defaults to keccak(sender, ms) for ad-hoc records; pass the inbound tx-derived id for real deposits. */
  depositId?: Hex;
  /** Override the on-chain minTier (demo: force a TierTooLow quarantine). */
  minTierOverride?: number;
}

export interface RecordResult {
  txHash: Hex;
  depositId: Hex;
  verdict: number;
  reason: number;
  tier: number | null;
  attestationHash: Hex;
}

/** Screen a sender against the live policy and anchor the verdict on-chain (keeper only). */
export async function screenAndRecord(args: RecordArgs): Promise<RecordResult> {
  const client = new CleanverseClient();
  const onchain = await readPolicy(publicClient, config.cordon);
  const policy: EvalPolicy =
    args.minTierOverride === undefined
      ? onchain.policy
      : { ...onchain.policy, minTier: args.minTierOverride };

  const nowSec = Math.floor(Date.now() / 1000);
  const screen = await screenSender({
    client,
    chain: "monad",
    symbol: "usdc",
    sender: args.sender,
    policy,
    nowSec,
  });

  const depositId =
    args.depositId ?? keccak256(encodePacked(["address", "uint256"], [args.sender, BigInt(Date.now())]));

  const txHash = await walletClient.writeContract({
    address: config.cordon,
    abi: recordVerdictAbi,
    functionName: "recordVerdict",
    args: [
      depositId,
      args.sender,
      args.amount,
      config.ausdc,
      screen.verdict,
      screen.reason,
      screen.attestationHash,
    ],
  });

  // Confirm by reading back state — avoids Monad's non-standard receipt fields.
  for (let i = 0; i < 40; i++) {
    const done = await publicClient.readContract({
      address: config.cordon,
      abi: recordVerdictAbi,
      functionName: "recorded",
      args: [depositId],
    });
    if (done) break;
  }

  // Write-through to the audit store (no-op without Supabase creds). Never blocks
  // the on-chain record — DB issues are logged, not fatal.
  if (config.supabaseUrl && config.supabaseSecretKey) {
    try {
      const repo = new AuditRepository(createAuditClient(config.supabaseUrl, config.supabaseSecretKey));
      await repo.insertDeposit(
        buildAuditRecord({
          screen,
          depositId,
          amount: args.amount,
          aToken: config.ausdc,
          verdictTx: txHash,
          explorerBase: config.explorer,
        }),
      );
    } catch (e) {
      console.error(`[keeper] audit persist failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    txHash,
    depositId,
    verdict: screen.verdict,
    reason: screen.reason,
    tier: screen.tier,
    attestationHash: screen.attestationHash,
  };
}
