import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
} from "docx";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getRangeRawRows } from "@/lib/reportData";
import { getMasterData } from "@/lib/sheets";
import { buildReportTemplateData, REPORT_STYLE, type TableSpec } from "@/lib/reportTemplate";

export const runtime = "nodejs";

const FONT = REPORT_STYLE.fontFamily;
const { accentGreen, accentOrange } = REPORT_STYLE.colors;
const FS = REPORT_STYLE.fontSize;
// docx sizes are in half-points (12pt body -> size 24).
const SZ = {
  orgName: FS.orgName * 2,
  reportTitle: FS.reportTitle * 2,
  periodLine: FS.periodLine * 2,
  heading1: FS.heading1 * 2,
  heading2: FS.heading2 * 2,
  label: FS.label * 2,
  body: FS.body * 2,
  table: FS.table * 2,
};
// Full grid border, no shading — per the approved "no background color" table style.
const cellBorder = { style: BorderStyle.SINGLE, size: 2, color: "000000" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function headerCell(text: string) {
  return new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: SZ.table, font: FONT })] })],
  });
}
function bodyCell(text: string) {
  return new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: text || "-", size: SZ.table, font: FONT })] })] });
}
function dataTable(t: TableSpec) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ tableHeader: true, children: t.headers.map(headerCell) }), ...t.rows.map((r) => new TableRow({ children: r.map(bodyCell) }))],
  });
}
function h1(text: string) {
  return new Paragraph({ spacing: { before: 360, after: 150 }, children: [new TextRun({ text, bold: true, color: accentGreen.replace("#", ""), size: SZ.heading1, font: FONT })] });
}
function h2(text: string) {
  return new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text, bold: true, size: SZ.heading2, font: FONT })] });
}
function label(text: string) {
  return new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text, bold: true, size: SZ.label, color: "444444", font: FONT })] });
}
function body(text: string) {
  return new Paragraph({ spacing: { before: REPORT_STYLE.bodySpacingPt.before * 20, after: REPORT_STYLE.bodySpacingPt.after * 20 }, children: [new TextRun({ text: text || "—", size: SZ.body, font: FONT })] });
}
function italic(text: string) {
  return new Paragraph({ children: [new TextRun({ text, italics: true, color: "888888", size: SZ.label, font: FONT })] });
}

async function fetchImage(url: string): Promise<{ data: ArrayBuffer; type: "jpg" | "png" | "gif" | "bmp" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    let type: "jpg" | "png" | "gif" | "bmp" | null = null;
    if (ct.includes("png")) type = "png";
    else if (ct.includes("jpeg") || ct.includes("jpg")) type = "jpg";
    else if (ct.includes("gif")) type = "gif";
    else if (ct.includes("bmp")) type = "bmp";
    if (!type) return null;
    const data = await res.arrayBuffer();
    return { data, type };
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

  const siteSections: Paragraph[] = [];
  for (const s of tpl.siteEntries) {
    siteSections.push(h2(s.heading));

    siteSections.push(label(s.keyActivitiesLabel));
    if (s.keyActivitiesText) siteSections.push(body(s.keyActivitiesText));
    s.activityBullets.forEach((a) => siteSections.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: a, size: SZ.body, font: FONT })] })));

    siteSections.push(label(s.keyResultsLabel));
    siteSections.push(body(s.keyResultsText));

    siteSections.push(label(s.difficultiesLabel));
    siteSections.push(body(s.difficultiesText));

    siteSections.push(label(s.followUpLabel));
    siteSections.push(body(s.followUpText));

    siteSections.push(label(s.photosLabel));
    if (s.photos.length) {
      for (const p of s.photos) {
        const img = await fetchImage(p.url);
        if (img) {
          siteSections.push(
            new Paragraph({
              children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: 320, height: 200 } })],
            })
          );
          if (p.caption) siteSections.push(italic(p.caption));
        } else {
          siteSections.push(italic(`${p.caption || "Photo"}: ${p.url}`));
        }
      }
    } else {
      siteSections.push(italic(s.noPhotosText));
    }

    siteSections.push(label(s.relatedDocsLabel));
    if (s.relatedDocs.length) {
      s.relatedDocs.forEach((d) =>
        siteSections.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `${d.label || d.url}${d.label ? " — " + d.url : ""}`, size: SZ.body, color: "0563C1", underline: {}, font: FONT })] }))
      );
    } else {
      siteSections.push(italic(s.noDocsText));
    }

    siteSections.push(label(s.planLabel));
    siteSections.push(body(s.planText));
  }

  const doc = new Document({
    styles: {
      // Backstop default so any paragraph that forgets to set `font` explicitly still
      // renders in the approved font rather than falling back to docx-js's own default
      // (Calibri) — every helper above also sets `font` on each TextRun directly, since
      // Word's built-in Heading styles can otherwise override a bare document default.
      default: { document: { run: { font: FONT } } },
    },
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: tpl.headerOrgName, bold: true, size: SZ.orgName, color: accentGreen.replace("#", ""), font: FONT })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: tpl.headerReportTitle, bold: true, size: SZ.reportTitle, color: accentOrange.replace("#", ""), font: FONT })] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 100 },
            children: [new TextRun({ text: `${tpl.headerPeriodLabel}: ${tpl.headerPeriodText}`, bold: true, size: SZ.periodLine, font: FONT })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `${tpl.preparedByLabel}: ${tpl.preparedByValue} · ${tpl.exportedOnLabel}: ${tpl.exportedOnValue}`, italics: true, color: "666666", size: SZ.label, font: FONT })],
          }),

          h1(tpl.sectionITitle),
          ...siteSections,

          h1(tpl.sectionIITitle),
          tpl.proposalsTable.rows.length ? dataTable(tpl.proposalsTable) : italic(tpl.proposalsEmpty),

          h1(tpl.sectionIIITitle),
          tpl.reportsDataTable.rows.length ? dataTable(tpl.reportsDataTable) : italic(tpl.reportsDataEmpty),

          h1(tpl.sectionIVTitle),
          dataTable(tpl.commsTable),

          h1(tpl.sectionVTitle),
          tpl.issuesTable.rows.length ? dataTable(tpl.issuesTable) : italic(tpl.issuesEmpty),

          h1(tpl.sectionVITitle),
          tpl.prioritiesTable.rows.length ? dataTable(tpl.prioritiesTable) : italic(tpl.prioritiesEmpty),

          h1(tpl.sectionVIITitle),
          tpl.deadlinesTable.rows.length ? dataTable(tpl.deadlinesTable) : italic(tpl.deadlinesEmpty),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const filename = `CTNC_BaoCao_${data.startDate}_${data.endDate}.docx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
