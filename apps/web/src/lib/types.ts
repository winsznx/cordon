export type VerdictLabel = "cleared" | "quarantined";

export interface Deposit {
  depositId: string;
  sender: string;
  amount: string;
  aToken: string;
  verdict: VerdictLabel;
  reason: number;
  reasonLabel: string;
  senderKycHash: string | null;
  senderTier: number | null;
  senderGroup: string | null;
  attestationHash: string | null;
  inboundTx: string | null;
  routingTx: string | null;
  verdictTx: string;
  explorerUrl: string | null;
  screenedAt: string;
}

export interface Policy {
  minTier: number;
  freshnessWindow: number;
  requireCleanBlacklist: boolean;
  keeper: string;
  operating: string;
  quarantine: string;
}
