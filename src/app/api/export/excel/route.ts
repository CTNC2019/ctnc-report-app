import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { getFullDashboardData, getMonthRawRows } from "@/lib/reportData";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Submitted: "Đã nộp",
  Approved: "Đã duyệt",
  Returned: "Trả lại",
  Missing: "Chưa nộp",
};

export async function GET(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;

  const data = await getFullDashboardData(month);
  const raw = await getMonthRawRows(data.month);

  const wb = XLSX.utils.book_new();

  const overviewSheet = XLSX.utils.aoa_to_sheet([
    ["BÁO CÁO TỔNG HỢP CTNC — Tháng " + data.month],
    ["Xuất lúc", new Date().toLocaleString("vi-VN")],
    [],
    ["Chỉ số", "Giá trị"],
    ["Báo cáo đã nộp / Tổng thành viên", data.kpi.reportsThisMonth],
    ["Tỷ lệ hoàn thành (%)", data.kpi.completionRate],
    ["Đang chờ duyệt", data.kpi.pendingApprovals],
    ["Tổng hoạt động", data.kpi.activitiesCompleted],
    ["Vấn đề cần hỗ trợ", data.kpi.issuesNeedingSupport],
  ]);
  XLSX.utils.book_append_sheet(wb, overviewSheet, "Tong_Quan");

  const memberRows = data.members.map((m) => ({
    "Mã": m.userId,
    "Họ tên": m.name,
    "Vai trò": m.role,
    "Trạng thái": STATUS_LABEL[m.status] || m.status,
    "Mã báo cáo": m.reportId || "",
    "Số hoạt động": m.totalActs,
    "Thời điểm nộp": m.submittedAt || "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberRows), "Thanh_Vien");

  const siteRows = data.siteStats.map((s) => ({ "Mã khu vực": s.code, "Tên khu vực": s.name, "Tổng hoạt động": s.totalActs }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siteRows), "Hoat_Dong_Tong_Hop");

  const siteDetailRows = raw.siteUpdates.map((s) => ({
    "Mã báo cáo": s.reportId,
    "Thành viên": s.member,
    "Khu vực": s.siteName,
    "Số hoạt động": s.numActs,
    "Mô tả": s.desc,
    "Kết quả & khó khăn": s.results,
    "Kế hoạch tháng tới": s.plan,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siteDetailRows), "Chi_Tiet_Hoat_Dong");

  const proposalRows = raw.proposals.map((p) => ({
    "Mã báo cáo": p.reportId,
    "Thành viên": p.member,
    "Tên đề xuất": p.name,
    "Trạng thái": p.statusLabel,
    "Hạn chót": p.deadline,
    "Ghi chú": p.note,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(proposalRows), "De_Xuat");

  const issueRows = raw.issues
    .concat()
    .map((i) => ({
      "Mã báo cáo": i.reportId,
      "Thành viên": i.member,
      "Loại": i.type === "Priority" ? "Ưu tiên tháng tới" : "Vấn đề",
      "Khu vực": i.siteCode,
      "Mô tả": i.description,
      "Người phụ trách": i.pic,
      "Hạn chót": i.deadline,
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows), "Van_De_Uu_Tien");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `CTNC_BaoCao_${data.month.replace("/", "-")}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
