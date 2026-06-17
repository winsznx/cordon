import type { ApassData } from "@usecordon/cleanverse";
import type { EvalPolicy, ScreenResult } from "@usecordon/screening";
import { zeroHash } from "viem";
import { describe, expect, it } from "vitest";
import { REASON_CATALOG, toScreenDecision } from "../src/core";

const POLICY: EvalPolicy = { minTier: 1, freshnessWindow: 2_592_000, requireCleanBlacklist: true };
const CONTRACT = "0x244198CFA8660BE9B47961E3C061DFA90622d2B0" as const;
const SENDER = "0x83C130ed9fb92830F09ea2b30E49009EF03065Bb" as const;

function apass(group: string): ApassData {
  return { group } as ApassData;
}

describe("REASON_CATALOG", () => {
  it("mirrors the on-chain enum order", () => {
    expect(REASON_CATALOG.map((r) => r.label)).toEqual([
      "NoAPass",
      "Frozen",
      "Blacklisted",
      "TierTooLow",
      "GroupNotAllowed",
      "NearExpiry",
    ]);
    REASON_CATALOG.forEach((r, i) => expect(r.code).toBe(i));
  });
});

describe("toScreenDecision", () => {
  it("maps a cleared result to a credit recommendation", () => {
    const result: ScreenResult = {
      verdict: 0,
      reason: 28,
      cleared: true,
      sender: SENDER,
      apass: apass("us"),
      user: null,
      tier: 28,
      attestationHash: "0x9e9df69e78f5cbe3dc2abbe5908332c9915d0115038e8ac5f39f6c6531560fe5",
      screenedAt: 1781731223,
    };
    const d = toScreenDecision(result, POLICY, CONTRACT);
    expect(d.verdict).toBe("cleared");
    expect(d.cleared).toBe(true);
    expect(d.tier).toBe(28);
    expect(d.group).toBe("us");
    expect(d.hasApass).toBe(true);
    expect(d.reasonLabel).toBe("cleared");
    expect(d.recommendation).toContain("CREDIT");
    expect(d.contract).toBe(CONTRACT);
  });

  it("maps a quarantined NoAPass result to a do-not-credit recommendation", () => {
    const result: ScreenResult = {
      verdict: 1,
      reason: 0,
      cleared: false,
      sender: SENDER,
      apass: null,
      user: null,
      tier: null,
      attestationHash: zeroHash,
      screenedAt: 1781731223,
    };
    const d = toScreenDecision(result, POLICY, CONTRACT);
    expect(d.verdict).toBe("quarantined");
    expect(d.cleared).toBe(false);
    expect(d.tier).toBeNull();
    expect(d.hasApass).toBe(false);
    expect(d.reasonLabel).toBe("NoAPass");
    expect(d.recommendation).toContain("DO NOT CREDIT");
  });

  it("labels each quarantine reason from the catalog", () => {
    for (const { code, label } of REASON_CATALOG) {
      const result: ScreenResult = {
        verdict: 1,
        reason: code,
        cleared: false,
        sender: SENDER,
        apass: code === 0 ? null : apass("us"),
        user: null,
        tier: code === 0 ? null : 1,
        attestationHash: zeroHash,
        screenedAt: 1781731223,
      };
      expect(toScreenDecision(result, POLICY, CONTRACT).reasonLabel).toBe(label);
    }
  });
});
