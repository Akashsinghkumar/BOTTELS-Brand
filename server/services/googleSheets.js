import fs from 'fs';
import path from 'path';

export const initGoogleSheets = async () => {
    console.log('Google Sheets integration running in mock/offline mode for Cloudflare Workers.');
};

export const appendOrder = async (orderData) => {
    console.log('[Mock] Syncing Order to Sheets:', orderData.name || orderData.customerName);
};

export const appendEnquiry = async (enquiryData) => {
    console.log('[Mock] Syncing Enquiry to Sheets:', enquiryData.email);
};

export default { initGoogleSheets, appendOrder, appendEnquiry };
