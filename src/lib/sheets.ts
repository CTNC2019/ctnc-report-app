import { google } from "googleapis";
import path from "path";

export const SPREADSHEET_ID = "1HrCiINzXArLTGXxR_atGxScFbcQkHCioFWoaWKXzo3o";

export type MasterItem = { code: string; vi: string; en: string };

// ---- Built-in fallback wording ----
// These are ONLY used if the "Master_Data" sheet tab is missing, empty, or fails to
// read (e.g. before it's been set up, or a transient API error) — so the app never
// breaks. Once "Master_Data" has rows, getMasterData() below reads live from there
// instead, and these arrays are ignored. Codes here (e.g. "SMART_TRAINING") must never
// change — every historical report row references these codes, not the labels.

const DEFAULT_SITES: MasterItem[] = [
  { code: "TH", vi: "Rừng phòng hộ Tây Hòa", en: "Tay Hoa Protection Forest" },
  { code: "SH", vi: "Rừng phòng hộ Sông Hinh", en: "Song Hinh Protection Forest" },
  { code: "DC", vi: "Rừng đặc dụng Đèo Cả", en: "Deo Ca Special-use Forest" },
  { code: "VP", vi: "Rừng phòng hộ Núi Vọng Phu", en: "Nui Vong Phu Protection Forest" },
  { code: "ES", vi: "Khu BTTN Ea Sô", en: "Ea So Nature Reserve" },
  { code: "NV", vi: "RPH Ninh Hòa – Vạn Ninh", en: "Ninh Hoa Van Ninh Protection Forest" },
  { code: "BH", vi: "Khu BTTN Bắc Hải Vân", en: "Bac Hai Van Nature Reserve" },
  { code: "CD", vi: "VQG Côn Đảo", en: "Con Dao National Park" },
];

const DEFAULT_ACTIVITY_TYPES: MasterItem[] = [
  { code: "SMART_TRAINING", vi: "Tập huấn SMART", en: "SMART training" },
  { code: "SMART_REPORTING", vi: "Báo cáo/phân tích SMART", en: "SMART reporting" },
  { code: "AWARENESS", vi: "Nâng cao nhận thức", en: "Awareness raising" },
  { code: "MEETING", vi: "Họp", en: "Meeting" },
  { code: "FIELD_SURVEY", vi: "Khảo sát thực địa", en: "Field survey" },
  { code: "INTERVIEW", vi: "Phỏng vấn", en: "Interview survey" },
  { code: "OTHER", vi: "Khác", en: "Other" },
];

const DEFAULT_REPORT_TYPES: MasterItem[] = [
  { code: "Annual", vi: "Hàng năm", en: "Annual" },
  { code: "Quarterly", vi: "Hàng quý", en: "Quarterly" },
  { code: "Donor", vi: "Báo cáo donor", en: "Donor" },
  { code: "SMART", vi: "SMART", en: "SMART" },
  { code: "Other", vi: "Khác", en: "Other" },
];

const DEFAULT_COMM_CHANNELS: MasterItem[] = [
  { code: "Donor communication", vi: "Truyền thông với donor", en: "Donor communication" },
  { code: "Facebook", vi: "Facebook", en: "Facebook" },
  { code: "Website", vi: "Website", en: "Website" },
  { code: "Monthly newsletter", vi: "Bản tin hàng tháng", en: "Monthly newsletter" },
  { code: "Other platforms / media", vi: "Kênh/nền tảng khác", en: "Other platforms / media" },
];

const DEFAULT_PROPOSAL_STATUSES: MasterItem[] = [
  { code: "Successful", vi: "Thành công", en: "Successful" },
  { code: "Unsuccessful", vi: "Không thành công", en: "Unsuccessful" },
  { code: "Writing", vi: "Đang xây dựng", en: "Writing" },
  { code: "Needs review", vi: "Cần rà soát", en: "Needs review" },
];

export function labelOf(list: MasterItem[], code: string, lang: "vi" | "en" = "vi") {
  const item = list.find((x) => x.code === code);
  if (!item) return code;
  return lang === "vi" ? item.vi : item.en;
}

type Row = Record<string, string>;

let sheetsClientPromise: ReturnType<typeof buildClient> | null = null;

async function buildClient() {
  const options: {
    scopes: string[];
    credentials?: Record<string, unknown>;
    keyFile?: string;
  } = { scopes: ["https://www.googleapis.com/auth/spreadsheets"] };

  if (process.env.GOOGLE_CREDENTIALS) {
    options.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else {
    options.keyFile = path.join(process.cwd(), "credentials.json");
  }
  const auth = new google.auth.GoogleAuth(options);
  return google.sheets({ version: "v4", auth });
}

async function getSheets() {
  if (!sheetsClientPromise) sheetsClientPromise = buildClient();
  return sheetsClientPromise;
}

/** Convert a 1-based column count to a spreadsheet column letter (1 -> A, 27 -> AA). */
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || "A";
}

async function getRawRows(sheetName: string): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:ZZ`,
  });
  return (res.data.values as string[][]) || [];
}

/** Read a full sheet tab as an array of objects, keyed by its header row. */
export async function readObjects(sheetName: string): Promise<Row[]> {
  const rows = await getRawRows(sheetName);
  if (!rows.length) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c !== "" && c != null))
    .map((row) => {
      const o: Row = {};
      headers.forEach((h, i) => (o[h] = row[i] ?? ""));
      return o;
    });
}

/** Append one or more objects to a sheet tab, positioning values by header name. */
export async function appendObjects(sheetName: string, objs: Row[]): Promise<void> {
  if (!objs.length) return;
  const sheets = await getSheets();
  const rows = await getRawRows(sheetName);
  const headers = rows[0] || [];
  const values = objs.map((obj) => headers.map((h) => obj[h] ?? ""));
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:${colLetter(headers.length)}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

/** Patch the first row whose keyCol === keyVal. Only columns present in `patch` are changed;
 *  any patch keys that don't match an existing header are silently ignored. */
export async function updateObjectByKey(
  sheetName: string,
  keyCol: string,
  keyVal: string,
  patch: Row
): Promise<boolean> {
  const sheets = await getSheets();
  const rows = await getRawRows(sheetName);
  if (!rows.length) return false;
  const headers = rows[0];
  const keyIdx = headers.indexOf(keyCol);
  if (keyIdx === -1) return false;
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[keyIdx] === keyVal);
  if (rowIdx === -1) return false;
  const newRow = headers.map((h, idx) =>
    Object.prototype.hasOwnProperty.call(patch, h) ? patch[h] : rows[rowIdx][idx] ?? ""
  );
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIdx + 1}:${colLetter(headers.length)}${rowIdx + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [newRow] },
  });
  return true;
}

async function getSheetId(sheetName: string): Promise<number> {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties",
  });
  const sh = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  if (!sh || sh.properties?.sheetId == null) throw new Error(`Sheet tab "${sheetName}" not found`);
  return sh.properties.sheetId;
}

/** Delete every row whose keyCol === keyVal (used to replace child rows on report edit). */
export async function deleteRowsByKey(sheetName: string, keyCol: string, keyVal: string): Promise<void> {
  const sheets = await getSheets();
  const rows = await getRawRows(sheetName);
  if (!rows.length) return;
  const headers = rows[0];
  const keyIdx = headers.indexOf(keyCol);
  if (keyIdx === -1) return;
  const matches: number[] = [];
  rows.forEach((r, i) => {
    if (i > 0 && r[keyIdx] === keyVal) matches.push(i);
  });
  if (!matches.length) return;
  const sheetId = await getSheetId(sheetName);
  const requests = matches
    .sort((a, b) => b - a)
    .map((i) => ({
      deleteDimension: { range: { sheetId, dimension: "ROWS" as const, startIndex: i, endIndex: i + 1 } },
    }));
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });
}

export function nowMonth(): string {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

export function siteName(sites: MasterItem[], code: string, lang: "vi" | "en" = "vi"): string {
  const s = sites.find((x) => x.code === code);
  if (!s) return code;
  return `${lang === "vi" ? s.vi : s.en} (${code})`;
}

// ---- Sheet-driven master data (dropdown labels: sites, activity types, etc.) ----
//
// Category values expected in the "Master_Data" tab's Category column:
//   Site | ActivityType | ReportType | CommChannel | ProposalStatus
// Columns: Category | Code | Label_VI | Label_EN | Sort_Order | Active
//
// IMPORTANT for whoever edits the sheet: only ever change the Label_VI / Label_EN /
// Sort_Order / Active columns. Never rename or delete a Code that's already in use —
// every historical report row stores the Code, not the label, so changing a Code
// orphans old data. To retire an option, set Active to FALSE instead of deleting it.

export type MasterData = {
  sites: MasterItem[];
  activityTypes: MasterItem[];
  reportTypes: MasterItem[];
  commChannels: MasterItem[];
  proposalStatuses: MasterItem[];
};

const MASTER_DATA_TTL_MS = 60_000; // re-read the sheet at most once a minute per server instance
let masterDataCache: { data: MasterData; ts: number } | null = null;

const CATEGORY_MAP: Record<string, keyof MasterData> = {
  Site: "sites",
  ActivityType: "activityTypes",
  ReportType: "reportTypes",
  CommChannel: "commChannels",
  ProposalStatus: "proposalStatuses",
};

const DEFAULTS: MasterData = {
  sites: DEFAULT_SITES,
  activityTypes: DEFAULT_ACTIVITY_TYPES,
  reportTypes: DEFAULT_REPORT_TYPES,
  commChannels: DEFAULT_COMM_CHANNELS,
  proposalStatuses: DEFAULT_PROPOSAL_STATUSES,
};

export async function getMasterData(): Promise<MasterData> {
  const now = Date.now();
  if (masterDataCache && now - masterDataCache.ts < MASTER_DATA_TTL_MS) {
    return masterDataCache.data;
  }

  let result: MasterData = { ...DEFAULTS };
  try {
    const rows = await readObjects("Master_Data");
    const grouped: Partial<Record<keyof MasterData, (MasterItem & { sort: number })[]>> = {};
    for (const row of rows) {
      const active = (row.Active ?? "TRUE").trim().toUpperCase();
      if (active === "FALSE") continue;
      const key = CATEGORY_MAP[(row.Category || "").trim()];
      if (!key || !row.Code) continue;
      (grouped[key] ||= []).push({
        code: row.Code,
        vi: row.Label_VI || row.Code,
        en: row.Label_EN || row.Label_VI || row.Code,
        sort: Number(row.Sort_Order) || 0,
      });
    }
    // Only override a category's defaults if the sheet actually has rows for it —
    // this way a half-filled Master_Data tab can't accidentally wipe out categories
    // nobody has migrated yet.
    for (const key of Object.keys(grouped) as (keyof MasterData)[]) {
      const list = grouped[key];
      if (list && list.length) {
        result[key] = list.sort((a, b) => a.sort - b.sort).map(({ code, vi, en }) => ({ code, vi, en }));
      }
    }
  } catch {
    // Sheet tab missing or a transient API error — silently keep the built-in defaults
    // so the app stays usable even before Master_Data has been set up.
    result = { ...DEFAULTS };
  }

  masterDataCache = { data: result, ts: now };
  return result;
}
