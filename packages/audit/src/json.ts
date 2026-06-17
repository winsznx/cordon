import type { AuditRecord } from "./types";

export interface AuditExport {
  generatedAt: string;
  total: number;
  cleared: number;
  quarantined: number;
  records: AuditRecord[];
}

/** Build the JSON audit export payload. */
export function buildAuditExport(records: AuditRecord[], generatedAtIso: string): AuditExport {
  return {
    generatedAt: generatedAtIso,
    total: records.length,
    cleared: records.filter((r) => r.verdict === "cleared").length,
    quarantined: records.filter((r) => r.verdict === "quarantined").length,
    records,
  };
}

export function toAuditJson(records: AuditRecord[], generatedAtIso: string): string {
  return JSON.stringify(buildAuditExport(records, generatedAtIso), null, 2);
}
