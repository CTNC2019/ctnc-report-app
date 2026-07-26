import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Google Sheets layer entirely so this test exercises only the pure
// aggregation/filtering logic in reportData.ts — no network calls, no live Sheet.
// This is the highest-risk logic from the Start/End Date migration: overlap-based
// filtering (replacing the old exact "Reporting_Month === targetMonth" check) and the
// "last 6 reporting periods actually used" trend grouping (replacing the old fixed
// 6-calendar-months window).
vi.mock("@/lib/sheets", () => {
  const SITES = [
    { code: "TH", vi: "Rừng phòng hộ Tây Hòa", en: "Tay Hoa Protection Forest", enShort: "Tay Hoa PF" },
    { code: "SH", vi: "Rừng phòng hộ Sông Hinh", en: "Song Hinh Protection Forest", enShort: "Song Hinh PF" },
  ];
  const ACTIVITY_TYPES = [{ code: "MEETING", vi: "Họp", en: "Meeting" }];
  const COMM_CHANNELS = [{ code: "Facebook", vi: "Facebook", en: "Facebook" }];
  const PROPOSAL_STATUSES = [{ code: "Writing", vi: "Đang xây dựng", en: "Writing" }];
  const REPORT_TYPES = [{ code: "Annual", vi: "Hàng năm", en: "Annual" }];

  const USERS = [
    { User_ID: "CTNC-01", Full_Name: "Nguyen A", Role: "staff", Is_Active: "true" },
    { User_ID: "CTNC-02", Full_Name: "Tran B", Role: "staff", Is_Active: "true" },
  ];

  // R1/R2 belong to CTNC-01 in consecutive earlier months; R3 is a Draft (must be
  // excluded from the trend, which only counts submitted reports); R4 is CTNC-02's
  // submitted report for the period actually being viewed in the "in range" tests.
  const REPORTS = [
    { Report_ID: "R1", User_ID: "CTNC-01", Start_Date: "2026-05-01", End_Date: "2026-05-31", Status: "Submitted", Submitted_At: "2026-05-28T00:00:00Z" },
    { Report_ID: "R2", User_ID: "CTNC-01", Start_Date: "2026-06-01", End_Date: "2026-06-30", Status: "Submitted", Submitted_At: "2026-06-28T00:00:00Z" },
    { Report_ID: "R3", User_ID: "CTNC-02", Start_Date: "2026-07-01", End_Date: "2026-07-31", Status: "Draft", Submitted_At: "" },
    { Report_ID: "R4", User_ID: "CTNC-02", Start_Date: "2026-07-01", End_Date: "2026-07-31", Status: "Submitted", Submitted_At: "2026-07-20T00:00:00Z" },
  ];

  const ACTIVITIES = [
    { Report_ID: "R1", Site_Code: "TH", Activity_Type: "MEETING", Activity_Desc: "May meeting" },
    { Report_ID: "R2", Site_Code: "SH", Activity_Type: "MEETING", Activity_Desc: "June meeting" },
    { Report_ID: "R4", Site_Code: "TH", Activity_Type: "MEETING", Activity_Desc: "July meeting" },
  ];

  const PROPOSALS = [{ Report_ID: "R4", Proposal_Name: "Grant X", Writer_UserID: "CTNC-02", Donor: "GIZ", Status_Code: "Writing", Deadline: "", Note: "" }];

  const TABLES: Record<string, Record<string, string>[]> = {
    Dim_Users: USERS,
    Fact_Reports: REPORTS,
    Data_Site_Updates: [],
    Data_Activities: ACTIVITIES,
    Data_Proposals: PROPOSALS,
    Data_Reports_Data: [],
    Data_Communications: [],
    Data_Challenges: [],
    Data_Priorities: [],
    Data_Deadlines: [],
  };

  return {
    readObjects: vi.fn(async (table: string) => TABLES[table] ?? []),
    getMasterData: vi.fn(async () => ({
      sites: SITES,
      activityTypes: ACTIVITY_TYPES,
      commChannels: COMM_CHANNELS,
      proposalStatuses: PROPOSAL_STATUSES,
      reportTypes: REPORT_TYPES,
    })),
    labelOf: (list: { code: string; vi: string; en: string }[], code: string, lang: "vi" | "en" = "vi") => {
      const item = list.find((x) => x.code === code);
      if (!item) return code;
      return lang === "vi" ? item.vi : item.en;
    },
    siteName: (sites: { code: string; enShort?: string; en: string }[], code: string) => {
      const s = sites.find((x) => x.code === code);
      if (!s) return code;
      return `${s.enShort || s.en} (${code})`;
    },
  };
});

import { getFullDashboardData, getRangeRawRows } from "@/lib/reportData";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFullDashboardData — overlap-based period filtering", () => {
  it("includes only reports whose Start/End Date overlaps the requested viewing range", async () => {
    const data = await getFullDashboardData("2026-07-01", "2026-07-31", "vi");
    expect(data.startDate).toBe("2026-07-01");
    expect(data.endDate).toBe("2026-07-31");
    // Only CTNC-02 has a report overlapping July (R3 Draft + R4 Submitted); CTNC-01's
    // May/June reports must not leak into this period's activity/proposal counts.
    expect(data.kpi.activitiesCompleted).toBe(1); // R4's single activity
    expect(data.kpi.activeProposals).toBe(1); // R4's "Writing" proposal
  });

  it("a partial-overlap custom range still pulls in the overlapping report", async () => {
    // Spans the last 2 weeks of May through the first 2 weeks of June — overlaps both
    // R1 (ends 2026-05-31) and R2 (starts 2026-06-01), even though neither report is
    // fully contained in the requested window.
    const data = await getFullDashboardData("2026-05-15", "2026-06-15", "vi");
    expect(data.kpi.activitiesCompleted).toBe(2); // R1's + R2's activity
  });

  it("falls back to the current calendar month when no valid range is given", async () => {
    const data = await getFullDashboardData(undefined, undefined, "vi");
    expect(data.startDate).toBeTruthy();
    expect(data.endDate).toBeTruthy();
    expect(data.startDate <= data.endDate).toBe(true);
  });
});

describe("getFullDashboardData — trend: last reporting periods actually used", () => {
  it("only counts SUBMITTED reports, excluding Draft ones, and orders periods oldest-first", async () => {
    const data = await getFullDashboardData("2026-07-01", "2026-07-31", "vi");
    // R1 (May), R2 (June), R4 (July, Submitted) should appear; R3 (July, Draft) must
    // be excluded from the trend even though it shares R4's exact period.
    const periods = data.trend.map((p) => `${p.startDate}|${p.endDate}`);
    expect(periods).toEqual(["2026-05-01|2026-05-31", "2026-06-01|2026-06-30", "2026-07-01|2026-07-31"]);
    // Oldest-first ordering (left-to-right chart reading).
    expect(new Date(data.trend[0].startDate).getTime()).toBeLessThan(new Date(data.trend[2].startDate).getTime());
  });

  it("each trend point reports the activity count for its own period only", async () => {
    const data = await getFullDashboardData("2026-07-01", "2026-07-31", "vi");
    const july = data.trend.find((p) => p.startDate === "2026-07-01");
    expect(july?.totalActivities).toBe(1); // only R4's activity, not R1/R2's
    expect(july?.reportsSubmitted).toBe(1); // R4 only — R3 is a Draft
  });
});

describe("getRangeRawRows — same overlap rule used by Word/PDF/Excel export", () => {
  it("resolves per-report site activity rows only for reports overlapping the given range", async () => {
    const raw = await getRangeRawRows("2026-05-01", "2026-05-31", "vi");
    expect(raw.proposals).toHaveLength(0); // R4's proposal is in July, out of range here
  });

  it("localizes labels according to the lang parameter", async () => {
    const rawVi = await getRangeRawRows("2026-07-01", "2026-07-31", "vi");
    const rawEn = await getRangeRawRows("2026-07-01", "2026-07-31", "en");
    expect(rawVi.proposals[0].statusLabel).toBe("Đang xây dựng");
    expect(rawEn.proposals[0].statusLabel).toBe("Writing");
  });
});
