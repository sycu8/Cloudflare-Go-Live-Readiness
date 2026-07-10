import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";

export type PdfReportInput = {
  projectName: string;
  framework: string;
  packageManager: string;
  deploymentTarget: string;
  scannedAt: string;
  productionReady: boolean;
  scores: {
    overall: number;
    migration: number;
    security: number;
    aiReadiness: number;
    seo: number;
    deployment: number;
  };
  blockers: Array<{ title: string; description: string }>;
  findings: Array<{
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
    remediationSteps?: string[];
  }>;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type PdfWriter = {
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
  doc: PDFDocument;
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function ensureSpace(writer: PdfWriter, needed: number): void {
  if (writer.y - needed >= MARGIN) return;
  writer.page = writer.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  writer.y = PAGE_HEIGHT - MARGIN;
}

function drawLines(
  writer: PdfWriter,
  lines: string[],
  size: number,
  options?: { bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number },
): void {
  const font = options?.bold ? writer.bold : writer.font;
  const gap = options?.gap ?? size + 4;
  const color = options?.color ?? rgb(0.1, 0.12, 0.18);

  for (const line of lines) {
    ensureSpace(writer, gap);
    writer.page.drawText(line, {
      x: MARGIN,
      y: writer.y,
      size,
      font,
      color,
    });
    writer.y -= gap;
  }
}

export function pdfReportInputFromScanData(data: {
  productionReady?: boolean;
  scores?: PdfReportInput["scores"];
  blockers?: Array<{ title: string; description: string }>;
  findings?: Array<{
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    status?: string;
    evidence?: string;
    remediation?: { steps: string[] };
  }>;
  inspection?: {
    projectName?: string;
    framework?: string;
    packageManager?: string;
    deploymentTarget?: string;
  };
  scannedAt?: string;
  projectName?: string;
}): PdfReportInput | null {
  if (!data.scores || !data.inspection) return null;

  const openFindings = (data.findings ?? [])
    .filter((f) => f.status !== "passed" && f.status !== "fixed")
    .slice(0, 40);

  const blockerFindings =
    data.blockers?.length &&
    typeof data.blockers[0] === "object" &&
    data.blockers[0] !== null &&
    "title" in data.blockers[0]
      ? (data.blockers as Array<{ title: string; description: string }>)
      : (data.findings ?? []).filter((f) => f.severity === "blocker");

  return {
    projectName: data.projectName ?? data.inspection.projectName ?? "Unknown project",
    framework: data.inspection.framework ?? "unknown",
    packageManager: data.inspection.packageManager ?? "npm",
    deploymentTarget: data.inspection.deploymentTarget ?? "unknown",
    scannedAt: data.scannedAt ?? new Date().toISOString(),
    productionReady: Boolean(data.productionReady),
    scores: data.scores,
    blockers: blockerFindings.map((b) => ({
      title: b.title,
      description: b.description ?? "",
    })),
    findings: openFindings.map((f) => ({
      severity: f.severity,
      title: f.title,
      description: f.description ?? "",
      recommendation: f.recommendation ?? "",
      evidence: f.evidence,
      remediationSteps: f.remediation?.steps,
    })),
  };
}

export async function generatePdfReport(input: PdfReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`CF Ready Report — ${input.projectName}`);
  doc.setAuthor("CF Ready");
  doc.setSubject("Cloudflare Go-Live Readiness Report");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const writer: PdfWriter = { page, y: PAGE_HEIGHT - MARGIN, font, bold, doc };

  drawLines(writer, ["Cloudflare Go-Live Readiness Report"], 20, { bold: true });
  writer.y -= 8;
  drawLines(writer, [`Project: ${input.projectName}`], 11);
  drawLines(writer, [`Framework: ${input.framework} · ${input.packageManager}`], 10, {
    color: rgb(0.35, 0.4, 0.5),
  });
  drawLines(writer, [`Deployment target: ${input.deploymentTarget}`], 10, {
    color: rgb(0.35, 0.4, 0.5),
  });
  drawLines(writer, [`Scanned: ${input.scannedAt}`], 10, { color: rgb(0.35, 0.4, 0.5) });
  writer.y -= 10;

  const statusLine = input.productionReady
    ? "Production ready — no blockers"
    : "Not production ready — blockers or critical issues present";
  drawLines(writer, [statusLine], 12, {
    bold: true,
    color: input.productionReady ? rgb(0.1, 0.55, 0.35) : rgb(0.85, 0.25, 0.2),
  });
  writer.y -= 6;

  drawLines(writer, [`Overall readiness: ${input.scores.overall}/100`], 16, { bold: true });
  writer.y -= 8;

  drawLines(writer, ["Category scores"], 12, { bold: true });
  for (const row of [
    `Migration: ${input.scores.migration}/100`,
    `Security: ${input.scores.security}/100`,
    `AI readiness: ${input.scores.aiReadiness}/100`,
    `SEO: ${input.scores.seo}/100`,
    `Deployment: ${input.scores.deployment}/100`,
  ]) {
    drawLines(writer, [row], 10);
  }
  writer.y -= 8;

  if (input.blockers.length > 0) {
    drawLines(writer, ["Blockers"], 12, { bold: true, color: rgb(0.85, 0.25, 0.2) });
    for (const blocker of input.blockers.slice(0, 10)) {
      drawLines(writer, wrapText(`• ${blocker.title}: ${blocker.description}`, font, 10, CONTENT_WIDTH), 10);
    }
    writer.y -= 8;
  }

  drawLines(writer, ["Findings"], 12, { bold: true });
  for (const finding of input.findings) {
    drawLines(
      writer,
      wrapText(`[${finding.severity.toUpperCase()}] ${finding.title}`, bold, 10, CONTENT_WIDTH),
      10,
      { bold: true },
    );
    drawLines(
      writer,
      wrapText(finding.description, font, 9, CONTENT_WIDTH),
      9,
      { color: rgb(0.25, 0.28, 0.35) },
    );
    if (finding.evidence) {
      drawLines(
        writer,
        wrapText(`Evidence: ${finding.evidence}`, font, 8, CONTENT_WIDTH),
        8,
        { color: rgb(0.4, 0.42, 0.48) },
      );
    }
    if (finding.remediationSteps?.length) {
      for (const step of finding.remediationSteps.slice(0, 3)) {
        drawLines(
          writer,
          wrapText(`- ${step}`, font, 8, CONTENT_WIDTH),
          8,
          { color: rgb(0.15, 0.5, 0.35) },
        );
      }
    }
    drawLines(
      writer,
      wrapText(`Recommendation: ${finding.recommendation}`, font, 9, CONTENT_WIDTH),
      9,
      { color: rgb(0.2, 0.45, 0.65) },
    );
    writer.y -= 6;
  }

  drawLines(writer, ["Generated by CF Ready — https://ready.orangecloud.vn"], 8, {
    color: rgb(0.5, 0.52, 0.58),
  });

  return doc.save();
}
