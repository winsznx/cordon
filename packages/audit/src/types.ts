export type VerdictLabel = "cleared" | "quarantined";

/** A regulator-ready audit row (selective disclosure — KYC hash, no PII). Mirrors the deposits table (PRD §11). */
export interface AuditRecord {
  depositId: string;
  sender: string;
  /** stringified token amount (base units) */
  amount: string;
  aToken: string;
  verdict: VerdictLabel;
  /** sender tier when cleared; Reason enum when quarantined */
  reason: number;
  reasonLabel: string;
  senderKycHash: string;
  senderTier: number | null;
  senderGroup: string | null;
  attestationHash: string;
  inboundTx: string | null;
  routingTx: string | null;
  verdictTx: string;
  explorerUrl: string;
  /** unix seconds */
  screenedAt: number;
}
