import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getMonthRawRows, siteName } from "@/lib/reportData";
import { SITES } from "@/lib/sheets";

export const runtime = "nodejs";

const ACCENT = "#0F9D58";
const MUTED = "#666666";

type Row = string[];

function drawTable(doc: PDFKit.PDFDocument, x: number, startY: number, colWidths: number[], headers: Row, rows: Row[], bottomMargin: number): number {
  let y = startY;
  const rowHeight = 20;
  const pageBottom = doc.page.height - bottomMargin;

  function drawHeader() {
    doc.font("Bold").fontSize(9).fillColor("#FFFFFF");
    doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(ACCENT);
    let cx = x;
    headers.forEach((h, i) => {
      doc.fillColor("#FFFFFF").text(h, cx + 4, y + 6, { width: colWidths[i] - 8, ellipsis: true });
      cx += colWidths[i];
    });
    y += rowHeight;
  }

  drawHeader();
  doc.font("Regular").fontSize(9);
  rows.forEach((r, idx) => {
    const cellTexts = r.map((cell, i) => doc.heightOfString(cell || "-", { width: colWidths[i] - 8 }));
    const h = Math.max(rowHeight, Math.max(...cellTexts) + 8);
    if (y + h > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
      doc.font("Regular").fontSize(9);
    }
    if (idx % 2 === 1) doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), h).fill("#F5F7FA");
    let cx = x;
    r.forEach((cell, i) => {
      doc.fillColor("#222222").text(cell || "-", cx + 4, y + 4, { width: colWidths[i] - 8 });
      cx += colWidths[i];
    });
    y += h;
  });
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
  const month = searchParams.get("month") || undefined;

  const data = await getFullDashboardData(month);
  const raw = await getMonthRawRows(data.month);
  const bySite = new Map(raw.siteUpdates.map((s) => [s.siteCode, s]));

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
  doc.registerFont("Regular", path.join(fontDir, "DejaVuSans.ttf"));
  doc.registerFont("Bold", path.join(fontDir, "DejaVuSans-Bold.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottomMargin = doc.page.margins.bottom;

  function ensureSpace(need: number) {
    if (doc.y + need > doc.page.height - bottomMargin) doc.addPage();
  }

  doc.font("Bold").fontSize(11).fillColor(ACCENT).text("TRUNG TÂM CTNC", { align: "center" });
  doc.font("Bold").fontSize(18).fillColor("#111111").text("CTNC MONTHLY REPORT", { align: "center" });
  doc.font("Regular").fontSize(9).fillColor(MUTED).text(`Tháng báo cáo: ${data.month} · Xuất ngày ${new Date().toLocaleDateString("vi-VN")}`, { align: "center" });
  doc.moveDown(1);

  function h1(text: string) {
    ensureSpace(40);
    doc.font("Bold").fontSize(14).fillColor(ACCENT).text(text, left, doc.y + 10);
    doc.moveDown(0.3);
  }
  function h2(text: string) {
    ensureSpace(24);
    doc.font("Bold").fontSize(11).fillColor("#111111").text(text, left, doc.y + 6);
  }
  function label(text: string) {
    ensureSpace(16);
    doc.font("Bold").fontSize(9).fillColor("#555555").text(text, left, doc.y + 4);
  }
  function bodyText(text: string) {
    doc.font("Regular").fontSize(10).fillColor("#222222").text(text || "—", left, doc.y + 2, { width: usableWidth });
  }
  function italicText(text: string) {
    doc.font("Regular").fontSize(9).fillColor(MUTED).text(text, left, doc.y + 2, { width: usableWidth });
  }

  h1("1. Tổng quan hoạt động theo khu vực / Monthly overview by site");
  for (let i = 0; i < SITES.length; i++) {
    const s = SITES[i];
    const up = bySite.get(s.code);
    h2(`1.${i + 1} ${siteName(s.code, "vi")}`);
    label("Số hoạt động");
    bodyText(String(up?.numActs || 0));
    label("Hoạt động và ghi chú trong tháng");
    if (up?.activitiesList.length) {
      up.activitiesList.forEach((a) => bodyText(`• ${a.typeLabel}${a.desc ? " — " + a.desc : ""}`));
    } else {
      bodyText(up?.desc || "—");
    }
    label("Kết quả, thách thức, việc cần theo dõi");
    bodyText(up?.results || "—");
    label("Ảnh và tài liệu minh họa");
    if (up?.photos.length) {
      for (const p of up.photos) {
        const buf = await fetchImageBuffer(p.url);
        if (buf) {
          ensureSpace(160);
          try {
            doc.image(buf, left, doc.y + 4, { fit: [220, 140] });
            doc.moveDown(8);
          } catch {
            italicText(`${p.caption || "Ảnh"}: ${p.url}`);
          }
        } else {
          italicText(`${p.caption || "Ảnh"}: ${p.url}`);
        }
      }
    } else {
      italicText("Không có ảnh đính kèm.");
    }
    label("Kế hoạch tháng tới");
    bodyText(up?.plan || "—");
    doc.moveDown(0.6);
  }

  h1("2. Đề xuất / Proposals");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.3, usableWidth * 0.2, usableWidth * 0.15, usableWidth * 0.35],
    ["Đề xuất / Donor", "Trạng thái", "Hạn chót", "Ghi chú"],
    raw.proposals.length ? raw.proposals.map((p) => [p.name, p.statusLabel, p.deadline, p.note]) : [["Không có đề xuất trong tháng", "-", "-", "-"]],
    bottomMargin
  );

  h1("3. Báo cáo & cập nhật dữ liệu / Reports and data updates");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.3, usableWidth * 0.15, usableWidth * 0.3, usableWidth * 0.25],
    ["Báo cáo / bộ dữ liệu", "Loại", "Tiến độ", "Hạn chót & hành động"],
    raw.reportsData.length ? raw.reportsData.map((r) => [r.itemName, r.typeLabel, r.statusUpdate, r.deadlineAction]) : [["Không có mục nào trong tháng", "-", "-", "-"]],
    bottomMargin
  );

  h1("4. Truyền thông với donor & công chúng");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.25, usableWidth * 0.15, usableWidth * 0.3, usableWidth * 0.3],
    ["Kênh", "SL hoàn thành", "Diễn ra trong tháng", "Kế hoạch tháng tới"],
    raw.comms.length ? raw.comms.map((c) => [c.channelLabel, String(c.numCompleted), c.thisMonth, c.nextMonth]) : [["—", "0", "—", "—"]],
    bottomMargin
  );

  h1("5. Vấn đề cần hỗ trợ");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.3, usableWidth * 0.15, usableWidth * 0.35, usableWidth * 0.2],
    ["Vấn đề", "Khu vực", "Hành động cần thiết", "Phụ trách"],
    raw.issues.length ? raw.issues.map((i) => [i.description, i.siteCode, i.actionNeeded, i.pic]) : [["Không có vấn đề nào được ghi nhận", "-", "-", "-"]],
    bottomMargin
  );

  h1("6. Ưu tiên chính tháng tới");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.1, usableWidth * 0.2, usableWidth * 0.35, usableWidth * 0.2, usableWidth * 0.15],
    ["Ưu tiên", "Khu vực", "Hoạt động dự kiến", "Phụ trách", "Hạn chót"],
    raw.priorities.length ? raw.priorities.map((p) => [p.priorityNo, p.siteCode, p.activity, p.pic, p.deadline]) : [["-", "-", "Chưa xác định ưu tiên", "-", "-"]],
    bottomMargin
  );

  h1("7. Deadline quan trọng tháng tới");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.15, usableWidth * 0.4, usableWidth * 0.25, usableWidth * 0.2],
    ["Ngày", "Deadline / sự kiện", "Khu vực / Donor", "Phụ trách"],
    raw.deadlines.length ? raw.deadlines.map((d) => [d.date, d.event, d.siteDonor, d.pic]) : [["-", "Không có deadline nào được ghi nhận", "-", "-"]],
    bottomMargin
  );

  doc.end();
  const buf = await done;
  const filename = `CTNC_BaoCao_${data.month.replace("/", "-")}.pdf`;

  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
