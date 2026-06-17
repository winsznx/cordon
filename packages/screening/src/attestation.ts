import type { ApassData } from "@cordon/cleanverse";
import { keccak256, stringToHex, type Hex } from "viem";

/// Selective-disclosure attestation: proves the sender's verified status without
/// putting PII on-chain. keccak(cvRecordId | currentKycHash | tier | status | screenedAt).
export function attestationHash(apass: ApassData, screenedAtSec: number): Hex {
  const payload = [
    apass.cvRecordId ?? "",
    apass.currentKycHash,
    apass.tier,
    String(apass.status),
    String(screenedAtSec),
  ].join("|");
  return keccak256(stringToHex(payload));
}
