import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getMonthRawRows, siteName } from "@/lib/reportData";
import { getMasterData } from "@/lib/sheets";

export const runtime = "nodejs";

const ACCENT = "#0F9D58";
const MUTED = "#666666";

type Row = string[];

function drawTable(doc: PDFKit.PDFDocument, x: number, startY: number, colWidths: number[], headers: Row, rows: Row[], bottomMargin: number): number {
  let y = startY;
  const rowHeight = 20;
  const pageBottom = doc.page.height - bottomMargin;

  function drawHeader() {
    // Measure wrapped header height the same way data rows do below — a header label
    // that doesn't fit a narrow column on one line (e.g. "SL hoàn thành", "Hạn chót")
    // was previously clipped by a fixed-height band, spilling its second line into the
    // first data row underneath it.
    doc.font("Bold").fontSize(9);
    const headerTexts = headers.map((h, i) => doc.heightOfString(h, { width: colWidths[i] - 8 }));
    const hH = Math.max(rowHeight, Math.max(...headerTexts) + 8);
    doc.fillColor("#FFFFFF");
    doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), hH).fill(ACCENT);
    let cx = x;
    headers.forEach((h, i) => {
      doc.fillColor("#FFFFFF").text(h, cx + 4, y + 6, { width: colWidths[i] - 8 });
      cx += colWidths[i];
    });
    y += hH;
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
  const { sites: SITES } = await getMasterData();
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

  h1("I. Tổng quan hoạt động theo khu vực / Monthly overview by site");
  for (let i = 0; i < SITES.length; i++) {
    const s = SITES[i];
    const up = bySite.get(s.code);
    h2(`${i + 1}. ${siteName(SITES, s.code)} (${up?.numActs || 0} hoạt động / activities)`);

    label(`${i + 1}.1. Hoạt động chính / Key activities`);
    if (up?.keyActivities) bodyText(up.keyActivities);
    if (up?.activitiesList.length) {
      up.activitiesList.forEach((a) => bodyText(`• ${a.typeLabel}${a.desc ? " — " + a.desc : ""}`));
    } else if (!up?.keyActivities) {
      bodyText(up?.desc || "—");
    }

    label(`${i + 1}.2. Kết quả / Key results`);
    bodyText(up?.keyResults || "—");

    label(`${i + 1}.3. Khó khăn, thách thức / Difficulties, challenges`);
    bodyText(up?.difficulties || "—");

    label(`${i + 1}.4. Việc cần theo dõi / Follow-up`);
    bodyText(up?.followUp || "—");

    label(`${i + 1}.5. Hình ảnh hoạt động / Activity images`);
    if (up?.photos.length) {
      const IMG_BOX_H = 140;
      for (const p of up.photos) {
        const buf = await fetchImageBuffer(p.url);
        if (buf) {
          ensureSpace(IMG_BOX_H + 30);
          try {
            const imgY = doc.y + 4;
            doc.image(buf, left, imgY, { fit: [220, IMG_BOX_H] });
            // doc.image() draws at an absolute position and does NOT advance doc.y on
            // its own — the previous code used moveDown(8), which moves by 8 text
            // *lines* rather than the image's actual height, so whatever was drawn
            // next (caption, then the following label/section) started while still
            // inside the image's box and rendered on top of it. Advance by the fixed
            // box height itself instead — deterministic and always ≥ the image's
            // actual rendered height, since `fit` never exceeds it.
            doc.y = imgY + IMG_BOX_H + 8;
            if (p.caption) italicText(p.caption);
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

    label(`${i + 1}.6. Tài liệu liên quan / Related documents`);
    if (up?.relatedDocs.length) {
      up.relatedDocs.forEach((d) => bodyText(`• ${d.label || d.url}${d.label ? " — " + d.url : ""}`));
    } else {
      italicText("Không có tài liệu liên quan.");
    }

    label(`${i + 1}.7. Kế hoạch tháng tới / Plan for next month`);
    bodyText(up?.plan || "—");
    doc.moveDown(0.6);
  }

  h1("II. Đề xuất dự án / Project Proposal");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.24, usableWidth * 0.16, usableWidth * 0.16, usableWidth * 0.14, usableWidth * 0.1, usableWidth * 0.2],
    ["Tên đề xuất", "Người viết", "Nhà tài trợ", "Trạng thái", "Hạn chót", "Ghi chú"],
    raw.proposals.length
      ? raw.proposals.map((p) => [p.name, p.writer, p.donor, p.statusLabel, p.deadline, p.note])
      : [["Không có đề xuất trong tháng", "-", "-", "-", "-", "-"]],
    bottomMargin
  );

  h1("III. Báo cáo & cập nhật dữ liệu / Reports and data updates");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.3, usableWidth * 0.15, usableWidth * 0.3, usableWidth * 0.25],
    ["Báo cáo / bộ dữ liệu", "Loại", "Tiến độ", "Hạn chót & hành động"],
    raw.reportsData.length ? raw.reportsData.map((r) => [r.itemName, r.typeLabel, r.statusUpdate, r.deadlineAction]) : [["Không có mục nào trong tháng", "-", "-", "-"]],
    bottomMargin
  );

  h1("IV. Truyền thông / Communications");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.25, usableWidth * 0.15, usableWidth * 0.3, usableWidth * 0.3],
    ["Kênh", "SL hoàn thành", "Diễn ra trong tháng", "Kế hoạch tháng tới"],
    raw.comms.length ? raw.comms.map((c) => [c.channelLabel, String(c.numCompleted), c.thisMonth, c.nextMonth]) : [["—", "0", "—", "—"]],
    bottomMargin
  );

  h1("V. Vấn đề cần hỗ trợ / Key challenges or support needed");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.3, usableWidth * 0.15, usableWidth * 0.35, usableWidth * 0.2],
    ["Vấn đề", "Khu vực", "Hành động cần thiết", "Phụ trách"],
    raw.issues.length ? raw.issues.map((i) => [i.description, i.siteCode, i.actionNeeded, i.pic]) : [["Không có vấn đề nào được ghi nhận", "-", "-", "-"]],
    bottomMargin
  );

  h1("VI. Ưu tiên chính tháng tới / Main priorities for next month");
  doc.y = drawTable(
    doc, left, doc.y,
    [usableWidth * 0.1, usableWidth * 0.2, usableWidth * 0.35, usableWidth * 0.2, usableWidth * 0.15],
    ["Ưu tiên", "Khu vực", "Hoạt động dự kiến", "Phụ trách", "Hạn chót"],
    raw.priorities.length ? raw.priorities.map((p) => [p.priorityNo, p.siteCode, p.activity, p.pic, p.deadline]) : [["-", "-", "Chưa xác định ưu tiên", "-", "-"]],
    bottomMargin
  );

  h1("VII. Deadline quan trọng tháng tới / Important deadlines next month");
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
