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
            valueRenderOption: 'UNFORMATTED_VALUE', // Get raw values (numbers as numbers)
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return [];
        }

        // Assume first row is header
        const originalHeaders = rows[0];

        // Use fixed column indices as requested by user
        // 0: Név, 1: Vonalkód, 2: Mennyiség, 3: Beszerzési ár, 4: Eladási ár, 5: Raktár név, 6: Kategória, 7: Törlés
        const data = rows.slice(1).map(row => {
            const obj = {};

            obj['Név'] = row[0];
            obj['Vonalkód'] = row[1];
            obj['Mennyiség'] = row[2];
            obj['Beszerzési ár'] = row[3];
            obj['Eladási ár'] = row[4];
            obj['Raktár név'] = row[5];
            obj['Kategória'] = row[6];
            obj['Törlés'] = row[7];

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
