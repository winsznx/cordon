import type { ApassData, UserData } from "@cordon/cleanverse";
import type { Hex } from "viem";

/** Mirrors CordonPolicy.Reason (on-chain enum order is load-bearing). */
export enum Reason {
  NoAPass = 0,
  Frozen = 1,
  Blacklisted = 2,
  TierTooLow = 3,
  GroupNotAllowed = 4,
  NearExpiry = 5,
}

export const VERDICT_CLEARED = 0;
export const VERDICT_QUARANTINED = 1;

/** The subset of the on-chain Policy the keeper evaluates against. */
export interface EvalPolicy {
  minTier: number;
  /** seconds — the A-Pass must not expire within this window of `now` */
  freshnessWindow: number;
  requireCleanBlacklist: boolean;
}

export interface Verdict {
  /** 0 = cleared, 1 = quarantined (matches CordonPolicy) */
  verdict: number;
  /** sender tier when cleared; Reason enum when quarantined */
  reason: number;
  cleared: boolean;
}

export interface ScreenResult extends Verdict {
  sender: string;
  apass: ApassData | null;
  user: UserData | null;
  /** parsed numeric tier, or null when no A-Pass */
  tier: number | null;
  attestationHash: Hex;
  /** unix seconds the screen was taken */
  screenedAt: number;
}
