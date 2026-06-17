import { CleanverseClient } from "@usecordon/cleanverse";
import {
  monadClient,
  readPolicy,
  screenSender,
  type EvalPolicy,
  type ScreenResult,
} from "@usecordon/screening";
import { getAddress, isAddress, type Address } from "viem";
import type { McpConfig } from "./config";

/** Cordon's quarantine reasons, in on-chain enum order. */
export const REASON_CATALOG = [
  { code: 0, label: "NoAPass", meaning: "Sender has no Cleanverse A-Pass — identity is unverifiable." },
  { code: 1, label: "Frozen", meaning: "The sender's A-Pass is not active (frozen or suspended)." },
  { code: 2, label: "Blacklisted", meaning: "The sender carries a blacklist signal from query_user." },
  { code: 3, label: "TierTooLow", meaning: "Sender is verified but their tier is below the policy minimum." },
  { code: 4, label: "GroupNotAllowed", meaning: "The sender's jurisdiction/group is not on the policy allowlist." },
  { code: 5, label: "NearExpiry", meaning: "The A-Pass expires within the policy's freshness window." },
] as const;

const REASON_LABELS = REASON_CATALOG.map((r) => r.label);
const REASON_MEANINGS = REASON_CATALOG.map((r) => r.meaning);

export type PolicySnapshot = {
  minTier: number;
  freshnessWindow: number;
  requireCleanBlacklist: boolean;
  contract: Address;
  keeper: Address;
  operating: Address;
  quarantine: Address;
  explorer: string;
}

export type ScreenDecision = {
  address: Address;
  verdict: "cleared" | "quarantined";
  cleared: boolean;
  /** sender tier when cleared, Reason enum code when quarantined */
  reasonCode: number;
  reasonLabel: string;
  tier: number | null;
  group: string | null;
  hasApass: boolean;
  attestationHash: string;
  screenedAt: number;
  recommendation: string;
  policy: EvalPolicy;
  contract: Address;
}

export class InvalidAddressError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a valid 0x wallet address.`);
    this.name = "InvalidAddressError";
  }
}

/** Redact RPC URLs / API keys from error text before it is returned to a client. */
export function safeMessage(err: unknown): string {
  if (err instanceof InvalidAddressError) return err.message;
  const raw = err instanceof Error ? err.message : String(err);
  const firstLine = raw.split("\n")[0] ?? raw;
  return firstLine.replace(/https?:\/\/\S+/gi, "[rpc endpoint]").slice(0, 200);
}

/** Pure mapping from a raw screen result to the decision DTO — unit-testable, no IO. */
export function toScreenDecision(
  r: ScreenResult,
  policy: EvalPolicy,
  contract: Address,
): ScreenDecision {
  const recommendation = r.cleared
    ? `CREDIT. Verified sender at tier ${r.tier} clears the policy minimum tier of ${policy.minTier}. Route the funds to operating (spendable) balance.`
    : `DO NOT CREDIT. ${REASON_MEANINGS[r.reason] ?? "The sender failed the policy."} Route the funds to quarantine (segregated, never spent) and retain the attestation for the audit trail.`;

  return {
    address: getAddress(r.sender),
    verdict: r.cleared ? "cleared" : "quarantined",
    cleared: r.cleared,
    reasonCode: r.reason,
    reasonLabel: r.cleared ? "cleared" : (REASON_LABELS[r.reason] ?? `reason ${r.reason}`),
    tier: r.tier,
    group: r.apass?.group ?? null,
    hasApass: r.apass !== null,
    attestationHash: r.attestationHash,
    screenedAt: r.screenedAt,
    recommendation,
    policy,
    contract,
  };
}

type ScreenContext = { cv: CleanverseClient; policy: EvalPolicy };

/** Read the live policy and build a Cleanverse client once, to share across a batch. */
async function buildContext(cfg: McpConfig): Promise<ScreenContext> {
  const client = monadClient(cfg.rpcUrl);
  const { policy } = await readPolicy(client, cfg.cordonAddress);
  const cv = new CleanverseClient(cfg.cleanverseBase ? { baseUrl: cfg.cleanverseBase } : {});
  return { cv, policy };
}

async function screenWithContext(cfg: McpConfig, address: string, ctx: ScreenContext): Promise<ScreenDecision> {
  if (!isAddress(address)) throw new InvalidAddressError(address);
  const sender = getAddress(address);
  const nowSec = Math.floor(Date.now() / 1000);
  const result = await screenSender({ client: ctx.cv, chain: "monad", symbol: "usdc", sender, policy: ctx.policy, nowSec });
  return toScreenDecision(result, ctx.policy, cfg.cordonAddress);
}

/** Screen one inbound sender against the live on-chain policy + Cleanverse A-Pass. */
export async function screenOne(cfg: McpConfig, address: string): Promise<ScreenDecision> {
  if (!isAddress(address)) throw new InvalidAddressError(address);
  const ctx = await buildContext(cfg);
  return screenWithContext(cfg, address, ctx);
}

export interface BatchScreenResult {
  results: ScreenDecision[];
  errors: { address: string; error: string }[];
}

/** Screen many senders with bounded concurrency; per-address failures are isolated. */
export async function screenMany(cfg: McpConfig, addresses: string[]): Promise<BatchScreenResult> {
  const results: ScreenDecision[] = [];
  const errors: { address: string; error: string }[] = [];
  const CONCURRENCY = 4;
  const ctx = await buildContext(cfg);

  for (let i = 0; i < addresses.length; i += CONCURRENCY) {
    const chunk = addresses.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((a) => screenWithContext(cfg, a, ctx)));
    settled.forEach((s, j) => {
      const address = chunk[j] ?? "";
      if (s.status === "fulfilled") results.push(s.value);
      else errors.push({ address, error: safeMessage(s.reason) });
    });
  }

  return { results, errors };
}

/** Read the live on-chain policy the keeper enforces. */
export async function getPolicySnapshot(cfg: McpConfig): Promise<PolicySnapshot> {
  const client = monadClient(cfg.rpcUrl);
  const { policy, keeper, operating, quarantine } = await readPolicy(client, cfg.cordonAddress);
  return {
    minTier: policy.minTier,
    freshnessWindow: policy.freshnessWindow,
    requireCleanBlacklist: policy.requireCleanBlacklist,
    contract: cfg.cordonAddress,
    keeper,
    operating,
    quarantine,
    explorer: `${cfg.explorer}/address/${cfg.cordonAddress}`,
  };
}
