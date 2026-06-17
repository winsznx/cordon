import { ENV } from "./env";

export const REASON_LABELS = [
  "NoAPass",
  "Frozen",
  "Blacklisted",
  "TierTooLow",
  "GroupNotAllowed",
  "NearExpiry",
] as const;

export function shortHex(value: string | null | undefined, lead = 6, tail = 4): string {
  if (!value) return "—";
  return value.length <= lead + tail + 1 ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function explorerTx(hash: string | null | undefined): string | null {
  return hash ? `${ENV.explorer}/tx/${hash}` : null;
}

export function explorerAddress(addr: string | null | undefined): string | null {
  return addr ? `${ENV.explorer}/address/${addr}` : null;
}

export function freshnessLabel(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  return `${seconds}s`;
}

/** Deterministic UTC formatting — identical on server and client (no hydration drift). */
export function formatUtc(iso: string): string {
  return `${new Date(iso).toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

export function timeAgo(iso: string, nowMs: number): string {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
