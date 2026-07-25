import { google } from "googleapis";
import path from "path";

export const SPREADSHEET_ID = "1HrCiINzXArLTGXxR_atGxScFbcQkHCioFWoaWKXzo3o";

// Reference data that mirrors the Dim_Sites tab (static, rarely changes).
export const SITES = [
  { code: "TH", vi: "Rừng phòng hộ Tây Hòa", en: "Tay Hoa Protection Forest" },
  { code: "SH", vi: "Rừng phòng hộ Sông Hinh", en: "Song Hinh Protection Forest" },
  { code: "DC", vi: "Rừng đặc dụng Đèo Cả", en: "Deo Ca Special-use Forest" },
  { code: "VP", vi: "Rừng phòng hộ Núi Vọng Phu", en: "Nui Vong Phu Protection Forest" },
  { code: "ES", vi: "Khu BTTN Ea Sô", en: "Ea So Nature Reserve" },
  { code: "NV", vi: "RPH Ninh Hòa – Vạn Ninh", en: "Ninh Hoa Van Ninh Protection Forest" },
  { code: "BH", vi: "Khu BTTN Bắc Hải Vân", en: "Bac Hai Van Nature Reserve" },
  { code: "CD", vi: "VQG Côn Đảo", en: "Con Dao National Park" },
];

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

export function siteName(code: string, lang: "vi" | "en" = "vi"): string {
  const s = SITES.find((x) => x.code === code);
  if (!s) return code;
  return `${lang === "vi" ? s.vi : s.en} (${code})`;
}
