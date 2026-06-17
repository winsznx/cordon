import { Reason, VERDICT_CLEARED, type ScreenResult } from "@cordon/screening";
import type { AuditRecord } from "./types";

export interface BuildAuditArgs {
  screen: ScreenResult;
  depositId: string;
  amount: bigint;
  aToken: string;
  verdictTx: string;
  explorerBase: string;
  inboundTx?: string | null;
  routingTx?: string | null;
}

/** Combine a screen result + on-chain verdict tx into an audit record. Pure. */
export function buildAuditRecord(args: BuildAuditArgs): AuditRecord {
  const { screen } = args;
  const cleared = screen.verdict === VERDICT_CLEARED;
  const base = args.explorerBase.replace(/\/$/, "");

  return {
    depositId: args.depositId,
    sender: screen.sender,
    amount: args.amount.toString(),
    aToken: args.aToken,
    verdict: cleared ? "cleared" : "quarantined",
    reason: screen.reason,
    reasonLabel: cleared ? `tier ${screen.reason}` : (Reason[screen.reason] ?? String(screen.reason)),
    senderKycHash: screen.apass?.currentKycHash ?? "",
    senderTier: screen.tier,
    senderGroup: screen.apass?.group ?? null,
    attestationHash: screen.attestationHash,
    inboundTx: args.inboundTx ?? null,
    routingTx: args.routingTx ?? null,
    verdictTx: args.verdictTx,
    explorerUrl: `${base}/tx/${args.verdictTx}`,
    screenedAt: screen.screenedAt,
  };
}
