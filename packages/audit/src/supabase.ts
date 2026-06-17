import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuditRecord, VerdictLabel } from "./types";

/** Server-side client. Pass the SECRET key (sb_secret_…) — it bypasses RLS to write deposits. */
export function createAuditClient(url: string, secretKey: string): SupabaseClient {
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

interface DepositRow {
  deposit_id: string;
  sender_addr: string;
  amount: string;
  atoken: string;
  verdict: VerdictLabel;
  reason: number;
  reason_label: string;
  sender_kyc_hash: string;
  sender_tier: number | null;
  sender_group: string | null;
  attestation_hash: string;
  inbound_tx: string | null;
  routing_tx: string | null;
  verdict_tx: string;
  explorer_url: string;
  screened_at: string;
}

function toRow(r: AuditRecord): DepositRow {
  return {
    deposit_id: r.depositId,
    sender_addr: r.sender,
    amount: r.amount,
    atoken: r.aToken,
    verdict: r.verdict,
    reason: r.reason,
    reason_label: r.reasonLabel,
    sender_kyc_hash: r.senderKycHash,
    sender_tier: r.senderTier,
    sender_group: r.senderGroup,
    attestation_hash: r.attestationHash,
    inbound_tx: r.inboundTx,
    routing_tx: r.routingTx,
    verdict_tx: r.verdictTx,
    explorer_url: r.explorerUrl,
    screened_at: new Date(r.screenedAt * 1000).toISOString(),
  };
}

export class AuditRepository {
  constructor(private readonly db: SupabaseClient) {}

  async insertDeposit(record: AuditRecord): Promise<void> {
    const { error } = await this.db.from("deposits").upsert(toRow(record), { onConflict: "deposit_id" });
    if (error) throw new Error(`insertDeposit failed: ${error.message}`);
  }

  async countDeposits(): Promise<number> {
    const { count, error } = await this.db.from("deposits").select("*", { count: "exact", head: true });
    if (error) throw new Error(`countDeposits failed: ${error.message}`);
    return count ?? 0;
  }

  async listDeposits(): Promise<AuditRecord[]> {
    const { data, error } = await this.db.from("deposits").select("*").order("screened_at", { ascending: false });
    if (error) throw new Error(`listDeposits failed: ${error.message}`);
    return ((data ?? []) as DepositRow[]).map(fromRow);
  }
}

function fromRow(row: DepositRow): AuditRecord {
  return {
    depositId: row.deposit_id,
    sender: row.sender_addr,
    amount: row.amount,
    aToken: row.atoken,
    verdict: row.verdict,
    reason: row.reason,
    reasonLabel: row.reason_label,
    senderKycHash: row.sender_kyc_hash,
    senderTier: row.sender_tier,
    senderGroup: row.sender_group,
    attestationHash: row.attestation_hash,
    inboundTx: row.inbound_tx,
    routingTx: row.routing_tx,
    verdictTx: row.verdict_tx,
    explorerUrl: row.explorer_url,
    screenedAt: Math.floor(new Date(row.screened_at).getTime() / 1000),
  };
}
