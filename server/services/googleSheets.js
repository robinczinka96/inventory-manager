import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_FILE_PATH = path.join(__dirname, '../service-account.json');

// Scopes for Google Sheets API
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize auth
let auth;

if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Production: Use environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
    });
} else {
    // Development: Use local file
    auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: SCOPES,
    });
}

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Read all data from the spreadsheet
 * @param {string} spreadsheetId 
 * @returns {Promise<Array>} Array of row objects
 */
export async function pullFromSheet(spreadsheetId) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:Z', // Read all columns to capture Category
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return [];
        }

        // Assume first row is header
        const originalHeaders = rows[0];

        // Create normalized headers map (e.g., 'Kategória' -> 'kategoria')
        // Fix: Use NFD normalization to separate accents, then remove them
        const normalize = (str) => str.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');

        const headerMap = {};

        originalHeaders.forEach((header, index) => {
            headerMap[normalize(header)] = index;
        });

        const data = rows.slice(1).map(row => {
            const obj = {};
            // Helper to get value by normalized key
            const getVal = (key) => {
                const index = headerMap[normalize(key)];
                return index !== undefined ? row[index] : undefined;
            };

            // Map standard keys to found values
            obj['Név'] = getVal('nev') || getVal('name') || getVal('termeknev');
            obj['Vonalkód'] = getVal('vonalkod') || getVal('barcode');
            obj['Mennyiség'] = getVal('mennyiseg') || getVal('quantity') || getVal('keszlet');
            obj['Beszerzési ár'] = getVal('beszerzesiar') || getVal('purchaseprice') || getVal('nettoar');
            obj['Eladási ár'] = getVal('eladasiar') || getVal('saleprice') || getVal('bruttoar') || getVal('eladasi') || getVal('brutto') || getVal('fogyasztoiar');
            obj['Raktár név'] = getVal('raktarnev') || getVal('warehouse') || getVal('raktar');
            obj['Kategória'] = getVal('kategoria') || getVal('category');
            obj['Törlés'] = getVal('torles') || getVal('delete') || getVal('torolni');

            return obj;
        });

        return data;
    } catch (error) {
        console.error('Error pulling from sheet:', error);
        throw error;
    }
}

/**
 * Write data to the spreadsheet (overwrites existing data)
 * @param {string} spreadsheetId 
 * @param {Array} products Array of product objects
 */
export async function pushToSheet(spreadsheetId, products) {
    try {
        // Format data for sheet
        const headers = ['Név', 'Vonalkód', 'Mennyiség', 'Beszerzési ár', 'Eladási ár', 'Raktár név', 'Kategória', 'Törlés'];
        const values = [headers];

        products.forEach(p => {
            values.push([
                p.name,
                p.barcode || '',
                p.quantity,
                p.purchasePrice,
                p.salePrice,
                p.warehouseId?.name || '',
                p.warehouseId?.name || '',
                p.category || 'Egyéb',
                '' // Törlés column (empty by default)
            ]);
        });

        // Clear existing content first
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'A:Z',
        });

        // Write new data
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            resource: { values },
        });

        return true;
    } catch (error) {
        console.error('Error pushing to sheet:', error);
        throw error;
    }
}
