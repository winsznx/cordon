// Export the audit log (Supabase deposits) to JSON + PDF.
//   pnpm --filter @cordon/keeper export

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AuditRepository, buildAuditExport, createAuditClient, toAuditJson, toAuditPdf } from "@cordon/audit";
import { ROOT, config } from "../src/config";

async function main(): Promise<void> {
  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY not set in .env");
  }
  const repo = new AuditRepository(createAuditClient(config.supabaseUrl, config.supabaseSecretKey));
  const records = await repo.listDeposits();
  const generatedAt = new Date().toISOString();

  const outDir = resolve(ROOT, "internal/exports");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(resolve(outDir, "audit.json"), toAuditJson(records, generatedAt));
  const pdf = await toAuditPdf(buildAuditExport(records, generatedAt));
  writeFileSync(resolve(outDir, "audit.pdf"), pdf);

  console.log(`[export] ${records.length} records → internal/exports/audit.json + audit.pdf`);
}

main().catch((e) => {
  console.error(`[export] FATAL: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
