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
    ["Đề xuất đang triển khai", data.kpi.activeProposals],
    ["Sản phẩm truyền thông", data.kpi.commsOutputs],
    ["Vấn đề cần hỗ trợ", data.kpi.issuesNeedingSupport],
    ["Ưu tiên đặt ra cho tháng tới", data.kpi.prioritiesSetThisMonth],
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siteRows), "Hoat_Dong_Theo_Khu_Vuc");

  const typeRows = data.typeStats.map((t) => ({ "Loại hoạt động": t.label, "Số lượng": t.count }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(typeRows), "Hoat_Dong_Theo_Loai");

  const siteDetailRows = raw.siteUpdates.flatMap((s) =>
    s.activitiesList.length
      ? s.activitiesList.map((a) => ({
          "Mã báo cáo": s.reportId,
          "Thành viên": s.member,
          "Khu vực": s.siteName,
          "Loại hoạt động": a.typeLabel,
          "Mô tả": a.desc,
          "Ghi chú hoạt động trong tháng": s.notes,
          "Kết quả & khó khăn": s.results,
          "Kế hoạch tháng tới": s.plan,
        }))
      : [
          {
            "Mã báo cáo": s.reportId,
            "Thành viên": s.member,
            "Khu vực": s.siteName,
            "Loại hoạt động": "",
            "Mô tả": s.desc,
            "Ghi chú hoạt động trong tháng": s.notes,
            "Kết quả & khó khăn": s.results,
            "Kế hoạch tháng tới": s.plan,
          },
        ]
  );
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

  const reportsDataRows = raw.reportsData.map((r) => ({
    "Mã báo cáo": r.reportId,
    "Thành viên": r.member,
    "Báo cáo / bộ dữ liệu": r.itemName,
    "Loại": r.typeLabel,
    "Tiến độ / cập nhật": r.statusUpdate,
    "Hạn chót & hành động": r.deadlineAction,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportsDataRows), "Bao_Cao_Cap_Nhat");

  const commRows = raw.comms.map((c) => ({
    "Mã báo cáo": c.reportId,
    "Thành viên": c.member,
    "Kênh": c.channelLabel,
    "SL hoàn thành": c.numCompleted,
    "Diễn ra trong tháng": c.thisMonth,
    "Kế hoạch tháng tới": c.nextMonth,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commRows), "Truyen_Thong");

  const issueRows = raw.issues.map((i) => ({
    "Mã báo cáo": i.reportId,
    "Thành viên": i.member,
    "Vấn đề": i.description,
    "Khu vực": i.siteCode,
    "Hành động cần thiết": i.actionNeeded,
    "Người phụ trách": i.pic,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows), "Van_De");

  const priorityRows = raw.priorities.map((p) => ({
    "Mã báo cáo": p.reportId,
    "Thành viên": p.member,
    "Ưu tiên": p.priorityNo,
    "Khu vực": p.siteCode,
    "Hoạt động dự kiến": p.activity,
    "Người phụ trách": p.pic,
    "Hạn chót": p.deadline,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(priorityRows), "Uu_Tien");

  const deadlineRows = raw.deadlines.map((d) => ({
    "Mã báo cáo": d.reportId,
    "Thành viên": d.member,
    "Ngày": d.date,
    "Deadline / sự kiện": d.event,
    "Khu vực / Donor": d.siteDonor,
    "Người phụ trách": d.pic,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deadlineRows), "Deadline");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `CTNC_BaoCao_${data.month.replace("/", "-")}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
