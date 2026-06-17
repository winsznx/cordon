import type { ApassData } from "@usecordon/cleanverse";
import { Reason, type ScreenResult } from "@usecordon/screening";
import { describe, expect, it } from "vitest";
import { buildAuditRecord } from "../src/build";
import { buildAuditExport } from "../src/json";

const apass: ApassData = {
  tier: "28",
  subTier: 0,
  group: "28",
  subGroup: "",
  status: 1,
  expirationTime: 2_000_000_000,
  currentKycHash: "0xkyc",
  cvRecordId: null,
};

const clearedScreen: ScreenResult = {
  verdict: 0,
  reason: 28,
  cleared: true,
  sender: "0xSENDER",
  apass,
  user: null,
  tier: 28,
  attestationHash: "0xatt",
  screenedAt: 1_781_700_000,
};

const quarantinedScreen: ScreenResult = {
  ...clearedScreen,
  verdict: 1,
  reason: Reason.TierTooLow,
  cleared: false,
};

const EXPLORER = "https://testnet.monadvision.com/";

describe("buildAuditRecord", () => {
  it("builds a cleared record with tier label + explorer link", () => {
    const r = buildAuditRecord({
      screen: clearedScreen,
      depositId: "0xdep1",
      amount: 1_000_000n,
      aToken: "0xAUSDC",
      verdictTx: "0xtx1",
      explorerBase: EXPLORER,
    });
    expect(r.verdict).toBe("cleared");
    expect(r.reasonLabel).toBe("tier 28");
    expect(r.amount).toBe("1000000");
    expect(r.senderKycHash).toBe("0xkyc");
    expect(r.senderGroup).toBe("28");
    expect(r.explorerUrl).toBe("https://testnet.monadvision.com/tx/0xtx1");
  });

  it("builds a quarantined record with the Reason label", () => {
    const r = buildAuditRecord({
      screen: quarantinedScreen,
      depositId: "0xdep2",
      amount: 0n,
      aToken: "0xAUSDC",
      verdictTx: "0xtx2",
      explorerBase: EXPLORER,
    });
    expect(r.verdict).toBe("quarantined");
    expect(r.reason).toBe(Reason.TierTooLow);
    expect(r.reasonLabel).toBe("TierTooLow");
  });
});

describe("buildAuditExport", () => {
  it("tallies cleared vs quarantined", () => {
    const records = [
      buildAuditRecord({ screen: clearedScreen, depositId: "0x1", amount: 0n, aToken: "0xA", verdictTx: "0xa", explorerBase: EXPLORER }),
      buildAuditRecord({ screen: quarantinedScreen, depositId: "0x2", amount: 0n, aToken: "0xA", verdictTx: "0xb", explorerBase: EXPLORER }),
    ];
    const exp = buildAuditExport(records, "2026-06-17T00:00:00Z");
    expect(exp.total).toBe(2);
    expect(exp.cleared).toBe(1);
    expect(exp.quarantined).toBe(1);
  });
});
