import type { ApassData, UserData } from "@usecordon/cleanverse";
import { Reason, VERDICT_CLEARED, VERDICT_QUARANTINED, type EvalPolicy, type Verdict } from "./types";

export interface EvaluateArgs {
  apass: ApassData | null;
  user: UserData | null;
  policy: EvalPolicy;
  /** Omit to skip group enforcement (e.g. institution set no allowlist). */
  isGroupAllowed?: (group: string) => boolean;
  /** unix seconds */
  nowSec: number;
}

export function parseTier(apass: ApassData | null): number {
  if (!apass) return 0;
  const t = Number.parseInt(apass.tier, 10);
  return Number.isFinite(t) ? t : 0;
}

const A_PASS_ACTIVE = 1;

/**
 * Pure inbound screen: A-Pass + user vs. policy → verdict. Checks run in
 * {Reason} enum order so the reported reason is deterministic.
 */
export function evaluate(args: EvaluateArgs): Verdict {
  const { apass, user, policy, isGroupAllowed, nowSec } = args;

  if (!apass) return quarantine(Reason.NoAPass);
  if (apass.status !== A_PASS_ACTIVE) return quarantine(Reason.Frozen);

  if (policy.requireCleanBlacklist && user && user.blacklist_reason.trim() !== "") {
    return quarantine(Reason.Blacklisted);
  }

  const tier = parseTier(apass);
  if (tier < policy.minTier) return quarantine(Reason.TierTooLow);

  if (isGroupAllowed && !isGroupAllowed(apass.group)) return quarantine(Reason.GroupNotAllowed);

  if (apass.expirationTime - nowSec <= policy.freshnessWindow) return quarantine(Reason.NearExpiry);

  return { verdict: VERDICT_CLEARED, reason: tier, cleared: true };
}

function quarantine(reason: Reason): Verdict {
  return { verdict: VERDICT_QUARANTINED, reason, cleared: false };
}
