const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1HrCiINzXArLTGXxR_atGxScFbcQkHCioFWoaWKXzo3o';

async function initSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Define the new relational structure
    const requiredSheets = [
      { name: 'Fact_Reports', headers: ['Report_ID', 'User_ID', 'Reporting_Month', 'Submitted_At', 'Status'] },
      { name: 'Data_Site_Updates', headers: ['Update_ID', 'Report_ID', 'Site_Code', 'Num_Acts', 'Activities', 'Results', 'Next_Plan'] },
      { name: 'Data_Proposals', headers: ['Prop_ID', 'Report_ID', 'Type', 'Name', 'Status_Code', 'Deadline', 'Note'] },
      { name: 'Data_Issues_Priorities', headers: ['Task_ID', 'Report_ID', 'Type', 'Site_Code', 'Description', 'PIC', 'Deadline'] },
      { name: 'Dim_Users', headers: ['User_ID', 'Full_Name', 'Email', 'Role', 'Is_Active'] },
      { name: 'Dim_Sites', headers: ['Site_Code', 'Site_Name'] },
    ];

    console.log('Fetching spreadsheet info...');
    const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingTitles = res.data.sheets.map(s => s.properties.title);
    
    // Batch update to add new sheets
    const requests = [];
    for (const sheet of requiredSheets) {
      if (!existingTitles.includes(sheet.name)) {
        requests.push({
          addSheet: { properties: { title: sheet.name } }
        });
      }
    }

    if (requests.length > 0) {
      console.log('Adding new relational sheets...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests }
      });
    }

    // Now write headers
    console.log('Writing headers...');
    for (const sheet of requiredSheets) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.name}!A1`,
        valueInputOption: 'RAW',
        resource: { values: [sheet.headers] }
      });
    }

    console.log('Initialization complete! Database is ready.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

initSheets();
