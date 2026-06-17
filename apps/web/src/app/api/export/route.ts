import { AuditRepository, buildAuditExport, createAuditClient, toAuditJson, toAuditPdf } from "@cordon/audit";
import { ENV } from "@/lib/env";

export const dynamic = "force-dynamic";

// Reads via the publishable key (RLS public read); builds the export server-side.
export async function GET(request: Request): Promise<Response> {
  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "json";
  const repo = new AuditRepository(createAuditClient(ENV.supabaseUrl, ENV.supabasePublishableKey));
  const records = await repo.listDeposits();
  const generatedAt = new Date().toISOString();

  if (format === "json") {
    return new Response(toAuditJson(records, generatedAt), {
      headers: {
        "content-type": "application/json",
        "content-disposition": 'attachment; filename="cordon-audit.json"',
      },
    });
  }

  const pdf = await toAuditPdf(buildAuditExport(records, generatedAt));
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="cordon-audit.pdf"',
    },
  });
}
