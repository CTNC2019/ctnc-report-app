import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getMonthRawRows } from "@/lib/reportData";

export const runtime = "nodejs";

const ACCENT = "#0F9D58";
const MUTED = "#666666";
const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Submitted: "Đã nộp",
  Approved: "Đã duyệt",
  Returned: "Trả lại",
  Missing: "Chưa nộp",
};

type Row = string[];

function drawTable(
  doc: PDFKit.PDFDocument,
  x: number,
  startY: number,
  colWidths: number[],
  headers: Row,
  rows: Row[],
  bottomMargin: number
): number {
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
    if (idx % 2 === 1) {
      doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), h).fill("#F5F7FA");
    }
    let cx = x;
    r.forEach((cell, i) => {
      doc.fillColor("#222222").text(cell || "-", cx + 4, y + 4, { width: colWidths[i] - 8 });
      cx += colWidths[i];
    });
    y += h;
  });
  return y + 14;
}

export async function GET(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;

  const data = await getFullDashboardData(month);
  const raw = await getMonthRawRows(data.month);

  const fontDir = path.join(process.cwd(), "public", "fonts");
  const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
  doc.registerFont("Regular", path.join(fontDir, "DejaVuSans.ttf"));
  doc.registerFont("Bold", path.join(fontDir, "DejaVuSans-Bold.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottomMargin = doc.page.margins.bottom;

  doc.font("Bold").fontSize(11).fillColor(ACCENT).text("TRUNG TÂM CTNC", { align: "center" });
  doc.font("Bold").fontSize(18).fillColor("#111111").text(`BÁO CÁO TỔNG HỢP THÁNG ${data.month}`, { align: "center" });
  doc.font("Regular").fontSize(9).fillColor(MUTED).text(`Xuất ngày ${new Date().toLocaleDateString("vi-VN")}`, { align: "center" });
  doc.moveDown(1);

  function heading(text: string) {
    doc.font("Bold").fontSize(13).fillColor(ACCENT).text(text, left, doc.y + 8);
    doc.moveDown(0.3);
  }

  heading("1. Tổng quan");
  let y = drawTable(
    doc,
    left,
    doc.y,
    [usableWidth * 0.6, usableWidth * 0.4],
    ["Chỉ số", "Giá trị"],
    [
      ["Báo cáo đã nộp / Tổng thành viên", data.kpi.reportsThisMonth],
      ["Tỷ lệ hoàn thành", `${data.kpi.completionRate}%`],
      ["Đang chờ duyệt", String(data.kpi.pendingApprovals)],
      ["Tổng số hoạt động", String(data.kpi.activitiesCompleted)],
      ["Vấn đề cần hỗ trợ", String(data.kpi.issuesNeedingSupport)],
    ],
    bottomMargin
  );
  doc.y = y;

  heading("2. Trạng thái nộp báo cáo theo thành viên");
  y = drawTable(
    doc,
    left,
    doc.y,
    [usableWidth * 0.15, usableWidth * 0.35, usableWidth * 0.25, usableWidth * 0.25],
    ["Mã", "Họ tên", "Trạng thái", "Số HĐ"],
    data.members.map((m) => [m.userId, m.name, STATUS_LABEL[m.status] || m.status, String(m.totalActs)]),
    bottomMargin
  );
  doc.y = y;

  heading("3. Hoạt động theo khu vực");
  const activeSites = data.siteStats.filter((s) => s.totalActs > 0);
  y = drawTable(
    doc,
    left,
    doc.y,
    [usableWidth * 0.7, usableWidth * 0.3],
    ["Khu vực", "Tổng hoạt động"],
    activeSites.length ? activeSites.map((s) => [s.name, String(s.totalActs)]) : [["Không có dữ liệu", "-"]],
    bottomMargin
  );
  doc.y = y;

  heading("4. Đề xuất");
  y = drawTable(
    doc,
    left,
    doc.y,
    [usableWidth * 0.25, usableWidth * 0.35, usableWidth * 0.2, usableWidth * 0.2],
    ["Thành viên", "Tên đề xuất", "Trạng thái", "Hạn chót"],
    raw.proposals.length ? raw.proposals.map((p) => [p.member, p.name, p.statusLabel, p.deadline]) : [["-", "Không có đề xuất trong tháng", "-", "-"]],
    bottomMargin
  );
  doc.y = y;

  heading("5. Vấn đề & Ưu tiên");
  y = drawTable(
    doc,
    left,
    doc.y,
    [usableWidth * 0.2, usableWidth * 0.15, usableWidth * 0.4, usableWidth * 0.25],
    ["Thành viên", "Loại", "Mô tả", "Phụ trách"],
    raw.issues.length
      ? raw.issues.map((i) => [i.member, i.type === "Priority" ? "Ưu tiên" : "Vấn đề", i.description, i.pic])
      : [["-", "-", "Không có vấn đề nào được ghi nhận", "-"]],
    bottomMargin
  );
  doc.y = y;

  doc.end();
  const buf = await done;
  const filename = `CTNC_BaoCao_${data.month.replace("/", "-")}.pdf`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
