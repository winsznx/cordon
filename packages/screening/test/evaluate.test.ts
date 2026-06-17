import type { ApassData, UserData } from "@usecordon/cleanverse";
import { describe, expect, it } from "vitest";
import { evaluate } from "../src/evaluate";
import { Reason, VERDICT_CLEARED, VERDICT_QUARANTINED, type EvalPolicy } from "../src/types";

const NOW = 1_000_000_000;

const apass = (over: Partial<ApassData> = {}): ApassData => ({
  tier: "28",
  subTier: 0,
  group: "US",
  subGroup: "",
  status: 1,
  expirationTime: 2_000_000_000,
  currentKycHash: "0xabc",
  cvRecordId: "rec-1",
  ...over,
});

const user = (blacklist = ""): UserData => ({ status: "ok", blacklist_reason: blacklist });

const policy: EvalPolicy = { minTier: 2, freshnessWindow: 86_400, requireCleanBlacklist: true };

describe("evaluate", () => {
  it("clears a fully-compliant sender and reports the tier", () => {
    const v = evaluate({ apass: apass(), user: user(), policy, nowSec: NOW });
    expect(v.cleared).toBe(true);
    expect(v.verdict).toBe(VERDICT_CLEARED);
    expect(v.reason).toBe(28);
  });

  it("quarantines NoAPass when there is no A-Pass", () => {
    const v = evaluate({ apass: null, user: null, policy, nowSec: NOW });
    expect(v.verdict).toBe(VERDICT_QUARANTINED);
    expect(v.reason).toBe(Reason.NoAPass);
  });

  it("quarantines Frozen when status is 2", () => {
    expect(evaluate({ apass: apass({ status: 2 }), user: user(), policy, nowSec: NOW }).reason).toBe(Reason.Frozen);
  });

  it("quarantines Frozen for any non-active status", () => {
    expect(evaluate({ apass: apass({ status: 0 }), user: user(), policy, nowSec: NOW }).reason).toBe(Reason.Frozen);
  });

  it("quarantines Blacklisted when blacklist_reason is set", () => {
    const v = evaluate({ apass: apass(), user: user("OFAC SDN"), policy, nowSec: NOW });
    expect(v.reason).toBe(Reason.Blacklisted);
  });

  it("ignores blacklist when requireCleanBlacklist is false", () => {
    const v = evaluate({
      apass: apass(),
      user: user("OFAC SDN"),
      policy: { ...policy, requireCleanBlacklist: false },
      nowSec: NOW,
    });
    expect(v.cleared).toBe(true);
  });

  it("quarantines TierTooLow when tier < minTier", () => {
    const v = evaluate({ apass: apass({ tier: "1" }), user: user(), policy, nowSec: NOW });
    expect(v.reason).toBe(Reason.TierTooLow);
  });

  it("treats an unparseable tier as 0 (TierTooLow)", () => {
    const v = evaluate({ apass: apass({ tier: "n/a" }), user: user(), policy, nowSec: NOW });
    expect(v.reason).toBe(Reason.TierTooLow);
  });

  it("quarantines GroupNotAllowed when the group fails the allowlist", () => {
    const v = evaluate({ apass: apass(), user: user(), policy, isGroupAllowed: () => false, nowSec: NOW });
    expect(v.reason).toBe(Reason.GroupNotAllowed);
  });

  it("skips group enforcement when no allowlist check is given", () => {
    expect(evaluate({ apass: apass(), user: user(), policy, nowSec: NOW }).cleared).toBe(true);
  });

  it("quarantines NearExpiry when expiry is within the freshness window", () => {
    const v = evaluate({ apass: apass({ expirationTime: NOW + 100 }), user: user(), policy, nowSec: NOW });
    expect(v.reason).toBe(Reason.NearExpiry);
  });

  it("NearExpiry boundary: exactly at the window edge is too close", () => {
    const atEdge = evaluate({ apass: apass({ expirationTime: NOW + policy.freshnessWindow }), user: user(), policy, nowSec: NOW });
    expect(atEdge.reason).toBe(Reason.NearExpiry);
    const justPast = evaluate({ apass: apass({ expirationTime: NOW + policy.freshnessWindow + 1 }), user: user(), policy, nowSec: NOW });
    expect(justPast.cleared).toBe(true);
  });

  it("reports the lower-ordered reason first (Blacklisted before TierTooLow)", () => {
    const v = evaluate({ apass: apass({ tier: "1" }), user: user("mixer"), policy, nowSec: NOW });
    expect(v.reason).toBe(Reason.Blacklisted);
  });
});
