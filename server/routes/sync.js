import express from 'express';
import Product from '../models/Product.js';
import InventoryBatch from '../models/InventoryBatch.js';
import Warehouse from '../models/Warehouse.js';
import { pullFromSheet, pushToSheet } from '../services/googleSheets.js';

const router = express.Router();

// Hardcoded Spreadsheet ID for now (or move to env var)
// User didn't provide it in the prompt, so I'll use a placeholder or ask for it.
// Wait, the user said "A fájlt megoszottam", but didn't give the ID.
// I will use a placeholder env var GOOGLE_SHEET_ID.
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Helper to parse numbers robustly (handles spaces, currency symbols, etc.)
const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return NaN;
    if (typeof value === 'number') return value;

    // Remove all non-numeric chars except dot, comma, and minus
    // Replace comma with dot for decimal parsing if it looks like a decimal separator
    let clean = value.toString().replace(/[^0-9.,-]/g, '');

    // If multiple dots/commas, keep only the last one as decimal separator
    // Simple heuristic: replace ',' with '.'
    clean = clean.replace(/,/g, '.');

    return parseFloat(clean);
};

// POST /api/sync
router.post('/', async (req, res) => {
    try {
        if (!SPREADSHEET_ID) {
            return res.status(400).json({ message: 'GOOGLE_SHEET_ID environment variable is not set' });
        }

        // 1. Fetch data from Google Sheet
        const sheetData = await pullFromSheet(SPREADSHEET_ID);

        // 2. Fetch local data (for warehouse mapping)
        const warehouses = await Warehouse.find();
        const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase(), w._id]));

        // 3. Prepare Bulk Operations
        const bulkOps = [];
        const results = {
            imported: 0,
            updated: 0,
            errors: []
        };

        for (const row of sheetData) {
            try {
                const name = row['Név'];
                if (!name) continue;

                // Robust parsing
                const qty = parseNumber(row['Mennyiség']);
                const pPrice = parseNumber(row['Beszerzési ár']);
                const sPrice = parseNumber(row['Eladási ár']);

                // Warehouse mapping (case-insensitive)
                const whName = row['Raktár név']?.toString().toLowerCase();
                const warehouseId = warehouseMap.get(whName);

                // Build update object (only set fields if they are valid in sheet)
                const updateFields = {};
                if (row['Vonalkód']) updateFields.barcode = row['Vonalkód'];
                if (!isNaN(qty)) updateFields.quantity = qty;
                if (!isNaN(pPrice)) updateFields.purchasePrice = pPrice;
                if (!isNaN(sPrice)) updateFields.salePrice = sPrice;
                if (warehouseId) updateFields.warehouseId = warehouseId;
                if (row['Kategória']) updateFields.category = row['Kategória'];

                // Upsert operation
                bulkOps.push({
                    updateOne: {
                        filter: { name: name },
                        update: {
                            $set: updateFields,
                            $setOnInsert: {
                                name: name,
                                category: updateFields.category || 'Egyéb',
                                quantity: !isNaN(qty) ? qty : 0,
                                purchasePrice: !isNaN(pPrice) ? pPrice : 0,
                                salePrice: !isNaN(sPrice) ? sPrice : 0
                            }
                        },
                        upsert: true
                    }
                });

            } catch (error) {
                results.errors.push(`Error processing ${row['Név']}: ${error.message}`);
            }
        }

        // 4. Execute Bulk Write
        if (bulkOps.length > 0) {
            const bulkResult = await Product.bulkWrite(bulkOps);
            results.updated = bulkResult.modifiedCount;
            results.imported = bulkResult.upsertedCount;
        }

        // 5. Push updated DB state back to Sheet
        // Re-fetch all products to get the definitive state
        const allProducts = await Product.find().populate('warehouseId');
        await pushToSheet(SPREADSHEET_ID, allProducts);

        res.json({
            message: 'Sync completed successfully',
            results,
            totalProducts: allProducts.length
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
});

export default router;
