import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getMonthRawRows } from "@/lib/reportData";

export const runtime = "nodejs";

const ACCENT = "0F9D58"; // emerald green
const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Submitted: "Đã nộp",
  Approved: "Đã duyệt",
  Returned: "Trả lại",
  Missing: "Chưa nộp",
};

const cellBorder = { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function headerCell(text: string) {
  return new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: ACCENT },
    borders,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })] })],
  });
}

function bodyCell(text: string) {
  return new TableCell({
    borders,
    children: [new Paragraph({ children: [new TextRun({ text: text || "-", size: 20 })] })],
  });
}

function dataTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r) => new TableRow({ children: r.map(bodyCell) })),
    ],
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, color: ACCENT })],
  });
}

export async function GET(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;

  const data = await getFullDashboardData(month);
  const raw = await getMonthRawRows(data.month);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "TRUNG TÂM CTNC", bold: true, size: 22, color: ACCENT })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: `BÁO CÁO TỔNG HỢP THÁNG ${data.month}`, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `Xuất ngày ${new Date().toLocaleDateString("vi-VN")}`, italics: true, color: "666666", size: 18 }),
            ],
          }),

          sectionHeading("1. Tổng quan"),
          dataTable(
            ["Chỉ số", "Giá trị"],
            [
              ["Báo cáo đã nộp / Tổng thành viên", data.kpi.reportsThisMonth],
              ["Tỷ lệ hoàn thành", `${data.kpi.completionRate}%`],
              ["Đang chờ duyệt", String(data.kpi.pendingApprovals)],
              ["Tổng số hoạt động", String(data.kpi.activitiesCompleted)],
              ["Vấn đề cần hỗ trợ", String(data.kpi.issuesNeedingSupport)],
            ]
          ),

          sectionHeading("2. Trạng thái nộp báo cáo theo thành viên"),
          dataTable(
            ["Mã", "Họ tên", "Trạng thái", "Số hoạt động"],
            data.members.map((m) => [m.userId, m.name, STATUS_LABEL[m.status] || m.status, String(m.totalActs)])
          ),

          sectionHeading("3. Hoạt động theo khu vực"),
          dataTable(
            ["Khu vực", "Tổng hoạt động"],
            data.siteStats.filter((s) => s.totalActs > 0).map((s) => [s.name, String(s.totalActs)])
          ),

          ...(raw.siteUpdates.length
            ? [
                new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "Chi tiết hoạt động:", bold: true, size: 20 })] }),
                dataTable(
                  ["Thành viên", "Khu vực", "SL", "Mô tả"],
                  raw.siteUpdates.map((s) => [s.member, s.siteName, String(s.numActs), s.desc])
                ),
              ]
            : []),

          sectionHeading("4. Đề xuất"),
          raw.proposals.length
            ? dataTable(
                ["Thành viên", "Tên đề xuất", "Trạng thái", "Hạn chót"],
                raw.proposals.map((p) => [p.member, p.name, p.statusLabel, p.deadline])
              )
            : new Paragraph({ children: [new TextRun({ text: "Không có đề xuất trong tháng.", italics: true })] }),

          sectionHeading("5. Vấn đề & Ưu tiên"),
          raw.issues.length
            ? dataTable(
                ["Thành viên", "Loại", "Mô tả", "Phụ trách", "Hạn chót"],
                raw.issues.map((i) => [i.member, i.type === "Priority" ? "Ưu tiên" : "Vấn đề", i.description, i.pic, i.deadline])
              )
            : new Paragraph({ children: [new TextRun({ text: "Không có vấn đề nào được ghi nhận.", italics: true })] }),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const filename = `CTNC_BaoCao_${data.month.replace("/", "-")}.docx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
