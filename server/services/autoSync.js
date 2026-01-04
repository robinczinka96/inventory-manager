import Product from '../models/Product.js';
import { pushToSheet } from './googleSheets.js';

// Environment variable for Sheet ID
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

/**
 * Triggers a background sync to Google Sheets.
 * This function is "fire and forget" - it does not block the caller.
 * It fetches the current state of all products and pushes them to the sheet.
 */
export async function triggerAutoSync() {
    if (!SPREADSHEET_ID) {
        console.warn('[AutoSync] Skipping sync: GOOGLE_SHEET_ID not set');
        return;
    }

    console.log('[AutoSync] Triggered background sync...');

    // Run in background (don't await)
    performSync().catch(err => {
        console.error('[AutoSync] Background sync failed:', err);
    });
}

/**
 * The actual sync logic
 */
async function performSync() {
    // 1. Fetch definitive state from DB
    const allProducts = await Product.find().populate('warehouseId');

    // 2. Push to Sheet
    // Note: pushToSheet clears and overwrites, ensuring consistency
    await pushToSheet(SPREADSHEET_ID, allProducts);

    console.log(`[AutoSync] Successfully synced ${allProducts.length} products to Sheet.`);
}
