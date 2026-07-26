// Single source of truth for the Word AND PDF monthly/periodic report exports.
// Both `api/export/word/route.ts` and `api/export/pdf/route.ts` build their document
// from the exact same `buildReportTemplateData()` output and the exact same
// `REPORT_STYLE` constants below — this is what keeps the two file formats visually
// and textually identical instead of drifting apart as two independently-maintained
// templates (which is what existed before this refactor).
import { formatDisplayDate } from "@/lib/dateRange";
import type { MasterItem } from "@/lib/sheets";
import { siteName } from "@/lib/sheets";
import type { RawSiteUpdate, RawProposal, RawReportsData, RawComm, RawIssue, RawPriority, RawDeadline } from "@/lib/reportData";

export type Lang = "vi" | "en";

// ---- Shared visual style ----
// `fontFamily` must match a font actually registered/available in BOTH renderers:
// PDF (pdfkit, via public/fonts/LiberationSans-*.ttf) and Word (docx-js "font" option,
// which resolves by family name against fonts installed on the machine opening the
// file — Liberation Sans ships with LibreOffice/most Linux distros and Word substitutes
// it visually with Arial if truly absent, since the two are metric-compatible).
export const REPORT_STYLE = {
  fontFamily: "Liberation Sans",
  colors: {
    accentGreen: "#0F9D58",
    accentOrange: "#F26522",
    ink: "#000000",
    muted: "#555555",
    zebra: "#F5F7FA",
  },
  fontSize: {
    orgName: 14,
    reportTitle: 18,
    periodLine: 11,
    heading1: 13,
    heading2: 11,
    label: 10,
    body: 12,
    table: 10,
  },
  // "Before: 6pt / After: 6pt" spacing for body paragraphs, per the approved header/body spec.
  bodySpacingPt: { before: 6, after: 6 },
} as const;

const STR = {
  vi: {
    orgName: "TRUNG TÂM CÔNG NGHỆ VÀ BẢO TỒN THIÊN NHIÊN (CTNC)",
    reportTitle: "BÁO CÁO THÁNG",
    reportingPeriod: "Thời gian báo cáo",
    fromTo: (a: string, b: string) => `Từ ngày ${a} đến ngày ${b}`,
    preparedBy: "Người chuẩn bị",
    exportedOn: "Ngày xuất",
    sectionI: "I. Tổng quan hoạt động theo khu vực",
    keyActivities: (n: number) => `${n}.1. Hoạt động chính`,
    keyResults: (n: number) => `${n}.2. Kết quả`,
    difficulties: (n: number) => `${n}.3. Khó khăn, thách thức`,
    followUp: (n: number) => `${n}.4. Việc cần theo dõi`,
    photos: (n: number) => `${n}.5. Hình ảnh hoạt động`,
    relatedDocs: (n: number) => `${n}.6. Tài liệu liên quan`,
    plan: (n: number) => `${n}.7. Kế hoạch kỳ tới`,
    noPhotos: "Không có ảnh đính kèm.",
    noDocs: "Không có tài liệu liên quan.",
    dash: "—",
    sectionII: "II. Đề xuất dự án",
    propHeaders: ["Tên đề xuất", "Người viết", "Nhà tài trợ", "Trạng thái", "Hạn chót", "Ghi chú"],
    propEmpty: "Không có đề xuất trong kỳ báo cáo.",
    sectionIII: "III. Báo cáo & cập nhật dữ liệu",
    dataHeaders: ["Báo cáo / bộ dữ liệu", "Loại", "Tiến độ", "Hạn chót & hành động"],
    dataEmpty: "Không có mục nào trong kỳ báo cáo.",
    sectionIV: "IV. Truyền thông",
    commHeaders: ["Kênh", "SL hoàn thành", "Diễn ra trong kỳ", "Kế hoạch kỳ tới"],
    sectionV: "V. Vấn đề cần hỗ trợ",
    issueHeaders: ["Vấn đề", "Khu vực", "Hành động cần thiết", "Phụ trách"],
    issueEmpty: "Không có vấn đề nào được ghi nhận.",
    sectionVI: "VI. Ưu tiên chính kỳ tới",
    priHeaders: ["Ưu tiên", "Khu vực", "Hoạt động dự kiến", "Phụ trách", "Hạn chót"],
    priEmpty: "Chưa xác định ưu tiên cho kỳ tới.",
    sectionVII: "VII. Deadline quan trọng kỳ tới",
    dlHeaders: ["Ngày", "Deadline / sự kiện", "Khu vực / Donor", "Phụ trách"],
    dlEmpty: "Không có deadline nào được ghi nhận.",
  },
  en: {
    orgName: "CENTER FOR TECHNOLOGY AND NATURE CONSERVATION (CTNC)",
    reportTitle: "MONTHLY REPORT",
    reportingPeriod: "Reporting Period",
    fromTo: (a: string, b: string) => `From ${a} to ${b}`,
    preparedBy: "Prepared by",
    exportedOn: "Exported on",
    sectionI: "I. Monthly overview by site",
    keyActivities: (n: number) => `${n}.1. Key activities`,
    keyResults: (n: number) => `${n}.2. Key results`,
    difficulties: (n: number) => `${n}.3. Difficulties, challenges`,
    followUp: (n: number) => `${n}.4. Follow-up`,
    photos: (n: number) => `${n}.5. Activity images`,
    relatedDocs: (n: number) => `${n}.6. Related documents`,
    plan: (n: number) => `${n}.7. Plan for next period`,
    noPhotos: "No images attached.",
    noDocs: "No related documents.",
    dash: "—",
    sectionII: "II. Project Proposal",
    propHeaders: ["Proposal name", "Writer", "Donor", "Status", "Deadline", "Note"],
    propEmpty: "No proposal in this reporting period.",
    sectionIII: "III. Reports and data updates",
    dataHeaders: ["Report / dataset", "Type", "Progress", "Deadline & action"],
    dataEmpty: "No items in this reporting period.",
    sectionIV: "IV. Communications",
    commHeaders: ["Channel", "Completed", "This period", "Plan for next period"],
    sectionV: "V. Key challenges or support needed",
    issueHeaders: ["Issue", "Site", "Action needed", "PIC"],
    issueEmpty: "No issues recorded.",
    sectionVI: "VI. Main priorities for next period",
    priHeaders: ["Priority", "Site", "Planned activity", "PIC", "Deadline"],
    priEmpty: "No priorities set for the next period yet.",
    sectionVII: "VII. Important deadlines next period",
    dlHeaders: ["Date", "Deadline / event", "Site / Donor", "PIC"],
    dlEmpty: "No deadlines recorded.",
  },
} as const;

export type TableSpec = { headers: string[]; rows: string[][] };

export type SiteSectionEntry = {
  heading: string; // e.g. "1. Tay Hoa PF" — short English site name only, no code, no count
  keyActivitiesLabel: string;
  keyActivitiesText: string;
  activityBullets: string[];
  keyResultsLabel: string;
  keyResultsText: string;
  difficultiesLabel: string;
  difficultiesText: string;
  followUpLabel: string;
  followUpText: string;
  photosLabel: string;
  photos: { url: string; caption: string }[];
  noPhotosText: string;
  relatedDocsLabel: string;
  relatedDocs: { url: string; label: string }[];
  noDocsText: string;
  planLabel: string;
  planText: string;
};

export type ReportTemplateData = {
  headerOrgName: string;
  headerReportTitle: string;
  headerPeriodLabel: string;
  headerPeriodText: string;
  preparedByLabel: string;
  preparedByValue: string;
  exportedOnLabel: string;
  exportedOnValue: string;
  sectionITitle: string;
  siteEntries: SiteSectionEntry[];
  sectionIITitle: string;
  proposalsTable: TableSpec;
  proposalsEmpty: string;
  sectionIIITitle: string;
  reportsDataTable: TableSpec;
  reportsDataEmpty: string;
  sectionIVTitle: string;
  commsTable: TableSpec;
  sectionVTitle: string;
  issuesTable: TableSpec;
  issuesEmpty: string;
  sectionVITitle: string;
  prioritiesTable: TableSpec;
  prioritiesEmpty: string;
  sectionVIITitle: string;
  deadlinesTable: TableSpec;
  deadlinesEmpty: string;
};

export function buildReportTemplateData(params: {
  lang: Lang;
  startDate: string;
  endDate: string;
  preparedByName: string;
  sites: MasterItem[];
  raw: {
    siteUpdates: RawSiteUpdate[];
    proposals: RawProposal[];
    reportsData: RawReportsData[];
    comms: RawComm[];
    issues: RawIssue[];
    priorities: RawPriority[];
    deadlines: RawDeadline[];
  };
}): ReportTemplateData {
  const { lang, startDate, endDate, preparedByName, sites, raw } = params;
  const t = STR[lang];
  const bySite = new Map(raw.siteUpdates.map((s) => [s.siteCode, s]));

  const siteEntries: SiteSectionEntry[] = sites.map((s, i) => {
    const n = i + 1;
    const up = bySite.get(s.code);
    const activityBullets = up?.activitiesList.length
      ? up.activitiesList.map((a) => `${a.typeLabel}${a.desc ? " — " + a.desc : ""}`)
      : [];
    return {
      // Report heading is ONLY the short English site name (e.g. "1. Tay Hoa PF") — no
      // site code abbreviation and no activity count in parentheses, per the approved
      // simplification. `siteName()` itself appends "(CODE)", so we deliberately do not
      // call it here — the heading is built from `enShort`/`en` directly instead.
      heading: `${n}. ${s.enShort || s.en}`,
      keyActivitiesLabel: t.keyActivities(n),
      keyActivitiesText: up?.keyActivities || (activityBullets.length ? "" : up?.desc || t.dash),
      activityBullets,
      keyResultsLabel: t.keyResults(n),
      keyResultsText: up?.keyResults || t.dash,
      difficultiesLabel: t.difficulties(n),
      difficultiesText: up?.difficulties || t.dash,
      followUpLabel: t.followUp(n),
      followUpText: up?.followUp || t.dash,
      photosLabel: t.photos(n),
      photos: up?.photos || [],
      noPhotosText: t.noPhotos,
      relatedDocsLabel: t.relatedDocs(n),
      relatedDocs: up?.relatedDocs || [],
      noDocsText: t.noDocs,
      planLabel: t.plan(n),
      planText: up?.plan || t.dash,
    };
  });

  return {
    headerOrgName: t.orgName,
    headerReportTitle: t.reportTitle,
    headerPeriodLabel: t.reportingPeriod,
    headerPeriodText: t.fromTo(formatDisplayDate(startDate), formatDisplayDate(endDate)),
    preparedByLabel: t.preparedBy,
    preparedByValue: preparedByName,
    exportedOnLabel: t.exportedOn,
    exportedOnValue: formatDisplayDate(new Date().toISOString().slice(0, 10)),

    sectionITitle: t.sectionI,
    siteEntries,

    sectionIITitle: t.sectionII,
    proposalsTable: {
      headers: [...t.propHeaders],
      rows: raw.proposals.map((p) => [p.name, p.writer, p.donor, p.statusLabel, p.deadline, p.note]),
    },
    proposalsEmpty: t.propEmpty,

    sectionIIITitle: t.sectionIII,
    reportsDataTable: {
      headers: [...t.dataHeaders],
      rows: raw.reportsData.map((r) => [r.itemName, r.typeLabel, r.statusUpdate, r.deadlineAction]),
    },
    reportsDataEmpty: t.dataEmpty,

    sectionIVTitle: t.sectionIV,
    commsTable: {
      headers: [...t.commHeaders],
      rows: raw.comms.length ? raw.comms.map((c) => [c.channelLabel, String(c.numCompleted), c.thisMonth, c.nextMonth]) : [["—", "0", "—", "—"]],
    },

    sectionVTitle: t.sectionV,
    issuesTable: {
      headers: [...t.issueHeaders],
      rows: raw.issues.map((i) => [i.description, i.siteCode, i.actionNeeded, i.pic]),
    },
    issuesEmpty: t.issueEmpty,

    sectionVITitle: t.sectionVI,
    prioritiesTable: {
      headers: [...t.priHeaders],
      rows: raw.priorities.map((p) => [p.priorityNo, p.siteCode, p.activity, p.pic, p.deadline]),
    },
    prioritiesEmpty: t.priEmpty,

    sectionVIITitle: t.sectionVII,
    deadlinesTable: {
      headers: [...t.dlHeaders],
      rows: raw.deadlines.map((d) => [d.date, d.event, d.siteDonor, d.pic]),
    },
    deadlinesEmpty: t.dlEmpty,
  };
}

// Re-exported so both export routes can resolve a report's "prepared by" name via
// SITES lookups without importing sheets.ts separately for just that one helper.
export { siteName };
