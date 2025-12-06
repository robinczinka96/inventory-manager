import { google } from 'googleapis';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

// Initialize Google Sheets API client
function getGoogleSheetsClient() {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        return google.sheets({ version: 'v4', auth });
    } catch (error) {
        throw new Error(`Failed to initialize Google Sheets client: ${error.message}`);
    }
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'Sheet1!A2:F'; // Header in row 1, data starts at row 2

/**
 * Pull products from Google Sheets
 * Columns: Név | Vonalkód | Mennyiség | Beszerzési ár | Eladási ár | Raktár név
 */
export async function pullFromGoogleSheets() {
    const sheets = await getGoogleSheetsClient();

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: RANGE
        });

        const rows = response.data.values || [];

        // Get all warehouses for matching
        const warehouses = await Warehouse.find();

        // Transform rows to products
        const products = rows.map(row => {
            const [name, barcode, quantity, purchasePrice, salePrice, warehouseName] = row;

            // Find warehouse by name
            const warehouse = warehouses.find(w => w.name === warehouseName);

            return {
                name: name || '',
                barcode: barcode || undefined,
                quantity: parseInt(quantity) || 0,
                purchasePrice: parseFloat(purchasePrice) || 0,
                salePrice: parseFloat(salePrice) || 0,
                warehouseId: warehouse?._id || undefined
            };
        }).filter(p => p.name); // Filter out empty rows

        return products;
    } catch (error) {
        throw new Error(`Failed to pull from Google Sheets: ${error.message}`);
    }
}

/**
 * Push products to Google Sheets
 * Overwrites all data (except header row)
 */
export async function pushToGoogleSheets(products) {
    const sheets = await getGoogleSheetsClient();

    try {
        // Transform products to rows
        const rows = products.map(p => [
            p.name,
            p.barcode || '',
            p.quantity,
            p.purchasePrice,
            p.salePrice,
            p.warehouseId?.name || ''
        ]);

        // Clear existing data (preserve header)
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: RANGE
        });

        // Write new data
        if (rows.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: RANGE,
                valueInputOption: 'RAW',
                resource: { values: rows }
            });
        }

        return rows.length;
    } catch (error) {
        throw new Error(`Failed to push to Google Sheets: ${error.message}`);
    }
}
