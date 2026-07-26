// Shape of GET /api/dashboard — moved out of page.tsx (unchanged) so every dashboard
// subcomponent can import just the slice it needs without a circular import back to
// the page. The API route and its response shape are NOT touched by this refactor.
export type MemberStatus = {
  userId: string;
  name: string;
  role: string;
  status: "Draft" | "Submitted" | "Approved" | "Returned" | "Missing";
  submittedAt: string;
  reportId: string | null;
  totalActs: number;
};

export type DashboardData = {
  startDate: string;
  endDate: string;
  availableRanges: { startDate: string; endDate: string; label: string }[];
  kpi: {
    reportsThisMonth: string;
    pendingApprovals: number;
    activitiesCompleted: number;
    activeProposals: number;
    commsOutputs: number;
    issuesNeedingSupport: number;
    prioritiesSetThisMonth: number;
    completionRate: number;
    totalMembers: number;
  };
  members: MemberStatus[];
  siteStats: { code: string; name: string; totalActs: number }[];
  typeStats: { code: string; label: string; count: number }[];
  trend: { startDate: string; endDate: string; label: string; reportsSubmitted: number; totalActivities: number }[];
  proposals: { status: string; label: string; count: number }[];
  proposalsByDonor: { donor: string; count: number }[];
  commsChannels: { code: string; label: string; count: number }[];
  commsTrend: { startDate: string; endDate: string; label: string; channels: Record<string, number> }[];
  issues: { reportId: string; member: string; siteCode: string; description: string; actionNeeded: string; pic: string }[];
  priorities: { reportId: string; member: string; priorityNo: string; siteCode: string; activity: string; pic: string; deadline: string }[];
  deadlines: { reportId: string; member: string; date: string; event: string; siteDonor: string; pic: string }[];
};

export const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-info-soft text-accent-blue",
  Approved: "bg-success-soft text-primary-800",
  Returned: "bg-warning-soft text-amber-700",
  Missing: "bg-danger-soft text-danger",
};

export const GREEN = "#1B5E20";
// Kept for any remaining reference, but SiteActivityChart/ProposalsByDonorChart now use
// CHART_PALETTE below instead, since GREENS alone (7 shades of the same hue) made
// adjacent bars/slices hard to tell apart.
export const GREENS = ["#1B5E20", "#2E7D32", "#388E3C", "#43A047", "#66BB6A", "#81C784", "#A5D6A7"];
export const TYPE_COLORS = ["#1B5E20", "#388E3C", "#66BB6A", "#F9A825", "#0D47A1", "#5C6BC0", "#9E9E9E"];
export const COMM_COLORS = ["#0D47A1", "#1B5E20", "#66BB6A", "#F9A825", "#9E9E9E"];
// Multi-hue palette for charts with many same-family categories (8 sites, N donors) —
// alternates CTNC greens with the existing accent tokens (blue/amber/danger/grey) so
// every adjacent segment has clearly different hue, not just a slightly different
// shade of green. All colors reused 1:1 from src/app/globals.css design tokens.
export const CHART_PALETTE = ["#1B5E20", "#0D47A1", "#F9A825", "#66BB6A", "#C62828", "#5C6BC0", "#43A047", "#9E9E9E", "#2E7D32", "#81C784"];

export function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(-2).map((p) => p[0]).join("").toUpperCase();
}

export function daysUntil(dateStr: string): number | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(dateStr || "");
  let d: Date | null = null;
  if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (dmy) d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  if (!d || isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
