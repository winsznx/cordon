import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";
import type { Deposit, VerdictLabel } from "./types";

export function createSupabase(): SupabaseClient {
  return createClient(ENV.supabaseUrl, ENV.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface DepositRow {
  deposit_id: string;
  sender_addr: string;
  amount: string;
  atoken: string;
  verdict: VerdictLabel;
  reason: number;
  reason_label: string | null;
  sender_kyc_hash: string | null;
  sender_tier: number | null;
  sender_group: string | null;
  attestation_hash: string | null;
  inbound_tx: string | null;
  routing_tx: string | null;
  verdict_tx: string;
  explorer_url: string | null;
  screened_at: string;
}

export function mapDeposit(r: DepositRow): Deposit {
  return {
    depositId: r.deposit_id,
    sender: r.sender_addr,
    amount: r.amount,
    aToken: r.atoken,
    verdict: r.verdict,
    reason: r.reason,
    reasonLabel: r.reason_label ?? String(r.reason),
    senderKycHash: r.sender_kyc_hash,
    senderTier: r.sender_tier,
    senderGroup: r.sender_group,
    attestationHash: r.attestation_hash,
    inboundTx: r.inbound_tx,
    routingTx: r.routing_tx,
    verdictTx: r.verdict_tx,
    explorerUrl: r.explorer_url,
    screenedAt: r.screened_at,
  };
}

export async function fetchDeposits(opts: { verdict?: VerdictLabel; limit?: number } = {}): Promise<Deposit[]> {
  const db = createSupabase();
  let query = db.from("deposits").select("*").order("screened_at", { ascending: false });
  if (opts.verdict) query = query.eq("verdict", opts.verdict);
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as DepositRow[]).map(mapDeposit);
}

export async function fetchDeposit(depositId: string): Promise<Deposit | null> {
  const db = createSupabase();
  const { data, error } = await db.from("deposits").select("*").eq("deposit_id", depositId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapDeposit(data as DepositRow) : null;
}

export interface DepositTotals {
  total: number;
  cleared: number;
  quarantined: number;
}

export async function fetchTotals(): Promise<DepositTotals> {
  const db = createSupabase();
  const head = (verdict?: VerdictLabel) => {
    let q = db.from("deposits").select("*", { count: "exact", head: true });
    if (verdict) q = q.eq("verdict", verdict);
    return q;
  };
  const [all, cleared, quarantined] = await Promise.all([head(), head("cleared"), head("quarantined")]);
  return {
    total: all.count ?? 0,
    cleared: cleared.count ?? 0,
    quarantined: quarantined.count ?? 0,
  };
}
