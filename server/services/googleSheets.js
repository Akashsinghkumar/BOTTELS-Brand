const fs = require('fs');
const path = require('path');

let google = null;
try {
    const googleapis = require('googleapis');
    google = googleapis.google;
} catch (e) {
    console.warn('googleapis optional module notice:', e.message);
}

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, '../../credentials.json');
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || 'YOUR_SPREADSHEET_ID';

let sheets = null;

const initGoogleSheets = async () => {
    try {
        if (!google) {
            console.log('Google Sheets integration running in mock/offline mode.');
            return;
        }

        let auth;
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            try {
                const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
                auth = new google.auth.GoogleAuth({
                    credentials,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });
                console.log('Using service account credentials from GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
            } catch (jsonErr) {
                console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON env variable:', jsonErr.message);
            }
        }

        if (!auth && fs.existsSync(CREDENTIALS_PATH)) {
            auth = new google.auth.GoogleAuth({
                keyFile: CREDENTIALS_PATH,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            console.log(`Using credentials from key file: ${CREDENTIALS_PATH}`);
        }

        if (auth) {
            const authClient = await auth.getClient();
            sheets = google.sheets({ version: 'v4', auth: authClient });
            console.log('Google Sheets API Authenticated');
        } else {
            console.warn('Warning: No Google Sheets credentials found. Sync will be skipped.');
        }
    } catch (error) {
        console.error('Failed to authenticate Google Sheets:', error.message);
    }
};

const appendOrder = async (orderData) => {
    if (!sheets) {
        console.log('[Mock] Syncing Order to Sheets:', orderData.name || orderData.customerName);
        return;
    }
};

const appendEnquiry = async (enquiryData) => {
    if (!sheets) {
        console.log('[Mock] Syncing Enquiry to Sheets:', enquiryData.email);
        return;
    }
};

module.exports = { initGoogleSheets, appendOrder, appendEnquiry };
