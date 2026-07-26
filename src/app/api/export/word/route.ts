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
  ImageRun,
} from "docx";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getMonthRawRows, siteName } from "@/lib/reportData";
import { getMasterData } from "@/lib/sheets";

export const runtime = "nodejs";

const ACCENT = "0F9D58"; // CTNC green

const cellBorder = { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function headerCell(text: string) {
  return new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: ACCENT },
    borders,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 19 })] })],
  });
}
function bodyCell(text: string) {
  return new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: text || "-", size: 19 })] })] });
}
function dataTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ tableHeader: true, children: headers.map(headerCell) }), ...rows.map((r) => new TableRow({ children: r.map(bodyCell) }))],
  });
}
function h1(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 150 }, children: [new TextRun({ text, bold: true, color: ACCENT })] });
}
function h2(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text, bold: true })] });
}
function label(text: string) {
  return new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text, bold: true, size: 19, color: "444444" })] });
}
function body(text: string) {
  return new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: text || "—", size: 20 })] });
}
function italic(text: string) {
  return new Paragraph({ children: [new TextRun({ text, italics: true, color: "888888", size: 19 })] });
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
  const month = searchParams.get("month") || undefined;

  const data = await getFullDashboardData(month);
  const raw = await getMonthRawRows(data.month);
  const { sites: SITES } = await getMasterData();

  const bySite = new Map(raw.siteUpdates.map((s) => [s.siteCode, s]));

  const siteSections: Paragraph[] = [];
  for (let i = 0; i < SITES.length; i++) {
    const s = SITES[i];
    const up = bySite.get(s.code);
    siteSections.push(h2(`${i + 1}. ${siteName(SITES, s.code, "vi")} (${up?.numActs || 0} hoạt động / activities)`));

    siteSections.push(label(`${i + 1}.1. Hoạt động chính / Key activities`));
    if (up?.keyActivities) siteSections.push(body(up.keyActivities));
    if (up?.activitiesList.length) {
      up.activitiesList.forEach((a) => siteSections.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `${a.typeLabel}${a.desc ? " — " + a.desc : ""}`, size: 20 })] })));
    } else if (!up?.keyActivities) {
      siteSections.push(body(up?.desc || "—"));
    }

    siteSections.push(label(`${i + 1}.2. Kết quả / Key results`));
    siteSections.push(body(up?.keyResults || "—"));

    siteSections.push(label(`${i + 1}.3. Khó khăn, thách thức / Difficulties, challenges`));
    siteSections.push(body(up?.difficulties || "—"));

    siteSections.push(label(`${i + 1}.4. Việc cần theo dõi / Follow-up`));
    siteSections.push(body(up?.followUp || "—"));

    siteSections.push(label(`${i + 1}.5. Hình ảnh hoạt động / Activity images`));
    if (up?.photos.length) {
      for (const p of up.photos) {
        const img = await fetchImage(p.url);
        if (img) {
          siteSections.push(
            new Paragraph({
              children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: 320, height: 200 } })],
            })
          );
          if (p.caption) siteSections.push(italic(p.caption));
        } else {
          siteSections.push(italic(`${p.caption || "Ảnh"}: ${p.url}`));
        }
      }
    } else {
      siteSections.push(italic("Không có ảnh đính kèm."));
    }

    siteSections.push(label(`${i + 1}.6. Tài liệu liên quan / Related documents`));
    if (up?.relatedDocs.length) {
      up.relatedDocs.forEach((d) =>
        siteSections.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `${d.label || d.url}${d.label ? " — " + d.url : ""}`, size: 20, color: "0563C1", underline: {} })] }))
      );
    } else {
      siteSections.push(italic("Không có tài liệu liên quan."));
    }

    siteSections.push(label(`${i + 1}.7. Kế hoạch tháng tới / Plan for next month`));
    siteSections.push(body(up?.plan || "—"));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TRUNG TÂM CTNC", bold: true, size: 22, color: ACCENT })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [new TextRun({ text: "CTNC MONTHLY REPORT", bold: true })] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "Tổng quan hoạt động, ghi chú chính và ưu tiên tháng tới", italics: true, color: "666666", size: 19 })],
          }),
          dataTable(
            ["Tháng báo cáo", "Người chuẩn bị", "Ngày"],
            [[data.month, data.members.find((m) => m.reportId)?.name || me.name || "-", new Date().toLocaleDateString("vi-VN")]]
          ),

          h1("I. Tổng quan hoạt động theo khu vực / Monthly overview by site"),
          ...siteSections,

          h1("II. Đề xuất dự án / Project Proposal"),
          raw.proposals.length
            ? dataTable(
                ["Tên đề xuất", "Người viết", "Nhà tài trợ", "Trạng thái", "Hạn chót", "Ghi chú / hành động tiếp theo"],
                raw.proposals.map((p) => [p.name, p.writer, p.donor, p.statusLabel, p.deadline, p.note])
              )
            : italic("Không có đề xuất trong tháng."),

          h1("III. Báo cáo & cập nhật dữ liệu / Reports and data updates"),
          raw.reportsData.length
            ? dataTable(
                ["Báo cáo / bộ dữ liệu", "Loại", "Tiến độ / cập nhật", "Hạn chót & hành động"],
                raw.reportsData.map((r) => [r.itemName, r.typeLabel, r.statusUpdate, r.deadlineAction])
              )
            : italic("Không có mục nào trong tháng."),

          h1("IV. Truyền thông / Communications"),
          dataTable(
            ["Kênh", "Số lượng hoàn thành", "Diễn ra trong tháng", "Kế hoạch tháng tới"],
            raw.comms.length
              ? raw.comms.map((c) => [c.channelLabel, String(c.numCompleted), c.thisMonth, c.nextMonth])
              : [["—", "0", "—", "—"]]
          ),

          h1("V. Vấn đề cần hỗ trợ / Key challenges or support needed"),
          raw.issues.length
            ? dataTable(
                ["Vấn đề", "Khu vực / hạng mục", "Hành động / hỗ trợ cần thiết", "Người phụ trách"],
                raw.issues.map((i) => [i.description, i.siteCode, i.actionNeeded, i.pic])
              )
            : italic("Không có vấn đề nào được ghi nhận."),

          h1("VI. Ưu tiên chính tháng tới / Main priorities for next month"),
          raw.priorities.length
            ? dataTable(
                ["Ưu tiên", "Khu vực / hạng mục", "Hoạt động dự kiến", "Người phụ trách", "Hạn chót"],
                raw.priorities.map((p) => [p.priorityNo, p.siteCode, p.activity, p.pic, p.deadline])
              )
            : italic("Chưa xác định ưu tiên cho tháng tới."),

          h1("VII. Deadline quan trọng tháng tới / Important deadlines next month"),
          raw.deadlines.length
            ? dataTable(
                ["Ngày", "Deadline / sự kiện", "Khu vực / Donor", "Người phụ trách"],
                raw.deadlines.map((d) => [d.date, d.event, d.siteDonor, d.pic])
              )
            : italic("Không có deadline nào được ghi nhận."),
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
