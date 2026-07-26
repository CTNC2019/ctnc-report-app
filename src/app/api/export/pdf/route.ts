import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getRangeRawRows } from "@/lib/reportData";
import { getMasterData } from "@/lib/sheets";
import { buildReportTemplateData, REPORT_STYLE, type TableSpec } from "@/lib/reportTemplate";

export const runtime = "nodejs";

const { accentGreen, accentOrange, muted } = REPORT_STYLE.colors;
const { orgName: FS_ORG, reportTitle: FS_TITLE, periodLine: FS_PERIOD, heading1: FS_H1, heading2: FS_H2, label: FS_LABEL, body: FS_BODY, table: FS_TABLE } =
  REPORT_STYLE.fontSize;

function drawTable(doc: PDFKit.PDFDocument, x: number, startY: number, colWidths: number[], table: TableSpec, bottomMargin: number): number {
  let y = startY;
  const rowHeight = 20;
  const pageBottom = doc.page.height - bottomMargin;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  function drawRow(cells: string[], bold: boolean) {
    doc.font(bold ? "Bold" : "Regular").fontSize(FS_TABLE);
    const cellTexts = cells.map((c, i) => doc.heightOfString(c || "-", { width: colWidths[i] - 8 }));
    const h = Math.max(rowHeight, Math.max(...cellTexts) + 8);
    if (y + h > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    // Full grid border, no fill — per the approved "no background color" table style.
    let cx = x;
    cells.forEach((c, i) => {
      doc.rect(cx, y, colWidths[i], h).stroke("#000000");
      doc.fillColor("#000000").text(c || "-", cx + 4, y + 4, { width: colWidths[i] - 8 });
      cx += colWidths[i];
    });
    y += h;
  }

  drawRow(table.headers, true);
  table.rows.forEach((r) => drawRow(r, false));
  void tableWidth;
  return y + 14;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/(png|jpe?g)/i.test(ct)) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const lang = searchParams.get("lang") === "en" ? "en" : "vi";

  const data = await getFullDashboardData(startDate, endDate, lang);
  const raw = await getRangeRawRows(data.startDate, data.endDate, lang);
  const { sites: SITES } = await getMasterData();
  const tpl = buildReportTemplateData({ lang, startDate: data.startDate, endDate: data.endDate, preparedByName: me.name, sites: SITES, raw });

  const fontDir = path.join(process.cwd(), "public", "fonts");
  // font: null prevents PDFKit from eagerly loading its bundled Helvetica.afm at
  // construction time — that lookup fails on Vercel (file tracing does not reliably
  // include pdfkit's data/*.afm assets), and we only ever use our own embedded TTFs
  // anyway (registered and selected explicitly below).
  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
    bufferPages: true,
    font: null as unknown as string,
  });
  // Liberation Sans — metric-compatible, freely-licensed substitute for Arial (the
  // requested font). Arial itself is a commercial Monotype font that cannot be
  // redistributed as a font file in an open source-controlled repo; Liberation Sans
  // renders visually near-identical and has full Vietnamese diacritic coverage.
  doc.registerFont("Regular", path.join(fontDir, "LiberationSans-Regular.ttf"));
  doc.registerFont("Bold", path.join(fontDir, "LiberationSans-Bold.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottomMargin = doc.page.margins.bottom;

  function ensureSpace(need: number) {
    if (doc.y + need > doc.page.height - bottomMargin) doc.addPage();
  }

  // ---- Header: org name (green) / report title (orange) / dynamic reporting period ----
  doc.font("Bold").fontSize(FS_ORG).fillColor(accentGreen).text(tpl.headerOrgName, { align: "center" });
  doc.font("Bold").fontSize(FS_TITLE).fillColor(accentOrange).text(tpl.headerReportTitle, { align: "center" });
  doc
    .font("Bold")
    .fontSize(FS_PERIOD)
    .fillColor("#000000")
    .text(`${tpl.headerPeriodLabel}: ${tpl.headerPeriodText}`, { align: "center" });
  doc.font("Regular").fontSize(9).fillColor(muted).text(`${tpl.preparedByLabel}: ${tpl.preparedByValue} · ${tpl.exportedOnLabel}: ${tpl.exportedOnValue}`, { align: "center" });
  doc.moveDown(1);

  function h1(text: string) {
    ensureSpace(40);
    doc.font("Bold").fontSize(FS_H1).fillColor(accentGreen).text(text, left, doc.y + 10);
    doc.moveDown(0.3);
  }
  function h2(text: string) {
    ensureSpace(24);
    doc.font("Bold").fontSize(FS_H2).fillColor("#111111").text(text, left, doc.y + 6);
  }
  function label(text: string) {
    ensureSpace(16);
    doc.font("Bold").fontSize(FS_LABEL).fillColor("#555555").text(text, left, doc.y + 4);
  }
  function bodyText(text: string) {
    doc.font("Regular").fontSize(FS_BODY).fillColor("#000000").text(text || "—", left, doc.y + 2, { width: usableWidth });
  }
  function italicText(text: string) {
    doc.font("Regular").fontSize(9).fillColor(muted).text(text, left, doc.y + 2, { width: usableWidth });
  }

  h1(tpl.sectionITitle);
  for (const s of tpl.siteEntries) {
    h2(s.heading);

    label(s.keyActivitiesLabel);
    if (s.keyActivitiesText) bodyText(s.keyActivitiesText);
    s.activityBullets.forEach((a) => bodyText(`• ${a}`));

    label(s.keyResultsLabel);
    bodyText(s.keyResultsText);

    label(s.difficultiesLabel);
    bodyText(s.difficultiesText);

    label(s.followUpLabel);
    bodyText(s.followUpText);

    label(s.photosLabel);
    if (s.photos.length) {
      const IMG_BOX_H = 140;
      for (const p of s.photos) {
        const buf = await fetchImageBuffer(p.url);
        if (buf) {
          ensureSpace(IMG_BOX_H + 30);
          try {
            const imgY = doc.y + 4;
            doc.image(buf, left, imgY, { fit: [220, IMG_BOX_H] });
            // doc.image() draws at an absolute position and does not advance doc.y —
            // advance by the fixed box height (always ≥ the image's rendered height,
            // since `fit` never exceeds it) so the caption/next block never overlaps it.
            doc.y = imgY + IMG_BOX_H + 8;
            if (p.caption) italicText(p.caption);
          } catch {
            italicText(`${p.caption || "Photo"}: ${p.url}`);
          }
        } else {
          italicText(`${p.caption || "Photo"}: ${p.url}`);
        }
      }
    } else {
      italicText(s.noPhotosText);
    }

    label(s.relatedDocsLabel);
    if (s.relatedDocs.length) {
      s.relatedDocs.forEach((d) => bodyText(`• ${d.label || d.url}${d.label ? " — " + d.url : ""}`));
    } else {
      italicText(s.noDocsText);
    }

    label(s.planLabel);
    bodyText(s.planText);
    doc.moveDown(0.6);
  }

  h1(tpl.sectionIITitle);
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.24, usableWidth * 0.16, usableWidth * 0.16, usableWidth * 0.14, usableWidth * 0.1, usableWidth * 0.2],
    tpl.proposalsTable.rows.length ? tpl.proposalsTable : { headers: tpl.proposalsTable.headers, rows: [[tpl.proposalsEmpty, "-", "-", "-", "-", "-"]] },
    bottomMargin
  );

  h1(tpl.sectionIIITitle);
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.3, usableWidth * 0.15, usableWidth * 0.3, usableWidth * 0.25],
    tpl.reportsDataTable.rows.length ? tpl.reportsDataTable : { headers: tpl.reportsDataTable.headers, rows: [[tpl.reportsDataEmpty, "-", "-", "-"]] },
    bottomMargin
  );

  h1(tpl.sectionIVTitle);
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.25, usableWidth * 0.15, usableWidth * 0.3, usableWidth * 0.3],
    tpl.commsTable,
    bottomMargin
  );

  h1(tpl.sectionVTitle);
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.3, usableWidth * 0.15, usableWidth * 0.35, usableWidth * 0.2],
    tpl.issuesTable.rows.length ? tpl.issuesTable : { headers: tpl.issuesTable.headers, rows: [[tpl.issuesEmpty, "-", "-", "-"]] },
    bottomMargin
  );

  h1(tpl.sectionVITitle);
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.1, usableWidth * 0.2, usableWidth * 0.35, usableWidth * 0.2, usableWidth * 0.15],
    tpl.prioritiesTable.rows.length ? tpl.prioritiesTable : { headers: tpl.prioritiesTable.headers, rows: [["-", "-", tpl.prioritiesEmpty, "-", "-"]] },
    bottomMargin
  );

  h1(tpl.sectionVIITitle);
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.15, usableWidth * 0.4, usableWidth * 0.25, usableWidth * 0.2],
    tpl.deadlinesTable.rows.length ? tpl.deadlinesTable : { headers: tpl.deadlinesTable.headers, rows: [["-", tpl.deadlinesEmpty, "-", "-"]] },
    bottomMargin
  );

  doc.end();
  const buf = await done;
  const filename = `CTNC_BaoCao_${data.startDate}_${data.endDate}.pdf`;

  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
