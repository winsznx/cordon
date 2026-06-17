import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { AuditExport } from "./json";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.45, 0.47, 0.5);
const CLEAN = rgb(0.24, 0.74, 0.59);
const BLOCK = rgb(1, 0.36, 0.48);

/** Render an audit export to a regulator-ready PDF (selective disclosure — KYC hashes, no PII). */
export async function toAuditPdf(data: AuditExport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const draw = (
    s: string,
    opts: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number } = {},
  ): void => {
    const size = opts.size ?? 10;
    if (y - (size + 4) < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    page.drawText(s, {
      x: MARGIN + (opts.indent ?? 0),
      y,
      size,
      font: opts.f ?? font,
      color: opts.color ?? INK,
    });
    y -= size + 4;
  };

  draw("Cordon — Inbound Compliance Audit", { size: 18, f: bold });
  draw(`Generated ${data.generatedAt}`, { size: 9, color: MUTED });
  y -= 6;
  draw(`Screened ${data.total}   ·   Cleared ${data.cleared}   ·   Quarantined ${data.quarantined}`, {
    size: 11,
    f: bold,
  });
  y -= 12;

  for (const r of data.records) {
    if (y - 82 < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    draw(`${r.verdict.toUpperCase()} · ${r.reasonLabel}`, {
      size: 12,
      f: bold,
      color: r.verdict === "cleared" ? CLEAN : BLOCK,
    });
    draw(`deposit ${r.depositId}`, { size: 8, color: MUTED, indent: 8 });
    draw(`sender ${r.sender}   tier ${r.senderTier ?? "—"}   group ${r.senderGroup ?? "—"}`, { size: 9, indent: 8 });
    draw(`KYC hash ${r.senderKycHash || "—"}`, { size: 8, color: MUTED, indent: 8 });
    draw(`amount ${r.amount}   aToken ${r.aToken}`, { size: 9, indent: 8 });
    draw(`verdict tx ${r.verdictTx}`, { size: 8, color: MUTED, indent: 8 });
    draw(`attestation ${r.attestationHash}`, { size: 8, color: MUTED, indent: 8 });
    y -= 10;
  }

  return doc.save();
}
