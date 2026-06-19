const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Placeholder, user needs to set this

let sheets = null;

const initGoogleSheets = async () => {
    if (fs.existsSync(CREDENTIALS_PATH)) {
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: CREDENTIALS_PATH,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            const authClient = await auth.getClient();
            sheets = google.sheets({ version: 'v4', auth: authClient });
            console.log('Google Sheets API Authenticated');
        } catch (error) {
            console.error('Failed to authenticate Google Sheets:', error.message);
        }
    } else {
        console.warn('Warning: credentials.json not found. Google Sheets sync will be skipped.');
    }
};

const appendOrder = async (orderData) => {
    if (!sheets) {
        console.log('[Mock] Syncing Order to Sheets:', orderData);
        return;
    }
    // Real implementation would go here
    // await sheets.spreadsheets.values.append(...)
};

const appendEnquiry = async (enquiryData) => {
    if (!sheets) {
        console.log('[Mock] Syncing Enquiry to Sheets:', enquiryData);
        return;
    }
    // Real implementation would go here
};

module.exports = { initGoogleSheets, appendOrder, appendEnquiry };
