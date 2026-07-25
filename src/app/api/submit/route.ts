import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const SPREADSHEET_ID = '1HrCiINzXArLTGXxR_atGxScFbcQkHCioFWoaWKXzo3o';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Auth
    let authOptions: any = { scopes: ['https://www.googleapis.com/auth/spreadsheets'] };
    
    // Support Vercel Environment Variables
    if (process.env.GOOGLE_CREDENTIALS) {
      authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } else {
      authOptions.keyFile = path.join(process.cwd(), 'credentials.json');
    }
    
    const auth = new google.auth.GoogleAuth(authOptions);
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 1. Insert into Fact_Reports
    const reportRow = [
      data.reportId,
      data.preparedBy,
      data.reportingMonth,
      new Date().toISOString(),
      'Submitted'
    ];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Fact_Reports!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [reportRow] },
    });

    // 2. Insert into Data_Site_Updates
    if (data.siteUpdates && data.siteUpdates.length > 0) {
      const siteRows = data.siteUpdates.map((site: any) => [
        `${data.reportId}-${site.siteCode}`, // Update_ID
        data.reportId,
        site.siteCode,
        site.numActs || 0,
        site.desc || '',
        site.results || '',
        site.plan || ''
      ]);
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Data_Site_Updates!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: siteRows },
      });
    }

    // 3. Insert into Data_Proposals
    if (data.proposals && data.proposals.length > 0) {
      const propRows = data.proposals.map((prop: any) => [
        `P${Date.now().toString().slice(-6)}${Math.floor(Math.random()*100)}`, // Prop_ID
        data.reportId,
        'Proposal',
        prop.name || '',
        prop.status || 'W',
        prop.deadline || '',
        prop.note || ''
      ]);
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Data_Proposals!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: propRows },
      });
    }

    return NextResponse.json({ success: true, message: "Data inserted successfully" });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
