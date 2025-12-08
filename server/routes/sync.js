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

// Helper to parse numbers robustly (Hungarian-centric: comma is decimal, dot/space is thousand)
const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return NaN;
    if (typeof value === 'number') return value;

    let str = value.toString().trim();
    // Remove all non-numeric characters except dot, comma, minus
    str = str.replace(/[^\d.,-]/g, '');

    // If it has a comma, it's the decimal separator (Hungarian standard)
    if (str.includes(',')) {
        str = str.replace(/\./g, ''); // Remove thousand separators (dots)
        str = str.replace(',', '.');  // Replace decimal separator
        return parseFloat(str);
    }

    // No comma present. Check for dots.
    if (str.includes('.')) {
        // Heuristic: If multiple dots, or dot followed by exactly 3 digits at end, treat as thousand separator.
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1 || /\.\d{3}$/.test(str)) {
            str = str.replace(/\./g, '');
            return parseFloat(str);
        }
        // Otherwise (e.g. 1.5, 12.50), treat as decimal.
        return parseFloat(str);
    }

    // No comma, no dot -> Integer
    return parseFloat(str);
};

// POST /api/sync
router.post('/', async (req, res) => {
    try {
        if (!SPREADSHEET_ID) {
            return res.status(400).json({ message: 'GOOGLE_SHEET_ID environment variable is not set' });
        }

        // 1. Fetch data from Google Sheet
        const sheetData = await pullFromSheet(SPREADSHEET_ID);

        // 2. Fetch local data
        const allLocalProducts = await Product.find();
        const warehouses = await Warehouse.find();

        // Build Lookup Maps for Smart Matching
        const barcodeMap = new Map();
        const nameMap = new Map();

        allLocalProducts.forEach(p => {
            if (p.barcode) barcodeMap.set(p.barcode.toLowerCase().trim(), p._id);
            nameMap.set(p.name.toLowerCase().trim(), p._id);
        });

        const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase(), w._id]));

        // 3. Prepare Bulk Operations
        const bulkOps = [];
        const idsToDelete = []; // Track IDs to delete explicitly
        const results = {
            imported: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };

        for (const row of sheetData) {
            try {
                // Deep debug logging for the first item
                if (results.imported + results.updated === 0) {
                    console.log('[Sync Debug] First Row Data:', JSON.stringify(row, null, 2));
                }

                const name = row['Név'];
                if (!name) continue;

                // Robust parsing
                const qty = parseNumber(row['Mennyiség']);
                const pPrice = parseNumber(row['Beszerzési ár']);
                const sPrice = parseNumber(row['Eladási ár']);
                const barcode = row['Vonalkód'] ? row['Vonalkód'].toString().trim() : null;

                // Debug logging for first item ONLY
                if (results.imported + results.updated === 0 && bulkOps.length === 0) {
                    // Only log once
                }

                // Targeted debug for "Lemon 15 ml" or any item with price > 0
                if (name.includes('Lemon 15 ml') || (pPrice > 0 && bulkOps.length < 5)) {
                    console.log(`[Sync Trace] Item: ${name}`);
                    console.log(`  Raw Price: ${row['Beszerzési ár']}, Parsed: ${pPrice}`);
                    console.log(`  Barcode: ${barcode}`);
                }

                // Smart Match Logic:
                let matchId = null;
                if (barcode && barcodeMap.has(barcode.toLowerCase())) {
                    matchId = barcodeMap.get(barcode.toLowerCase());
                } else if (nameMap.has(name.toLowerCase().trim())) {
                    matchId = nameMap.get(name.toLowerCase().trim());
                }

                // CHECK FOR DELETION MARKER
                const deleteMarker = row['Törlés'] ? row['Törlés'].toString().toLowerCase().trim() : '';
                if (deleteMarker === 'x') {
                    if (matchId) {
                        idsToDelete.push(matchId);
                    }
                    continue; // Skip further processing for this row
                }

                // Warehouse mapping (case-insensitive)
                const whName = row['Raktár név']?.toString().toLowerCase();
                const warehouseId = warehouseMap.get(whName);

                // Build update object (only set fields if they are valid in sheet)
                const updateFields = {};
                // Always update name if matched (allows renaming via barcode match)
                updateFields.name = name;

                if (barcode) updateFields.barcode = barcode;
                if (!isNaN(qty)) updateFields.quantity = qty;
                if (!isNaN(pPrice)) updateFields.purchasePrice = pPrice;
                if (!isNaN(sPrice)) updateFields.salePrice = sPrice;
                if (warehouseId) updateFields.warehouseId = warehouseId;
                if (row['Kategória']) updateFields.category = row['Kategória'];

                // Build defaults for insert (only if NOT in updateFields)
                const insertDefaults = {
                    name: name,
                    category: 'Egyéb',
                    quantity: 0,
                    purchasePrice: 0,
                    salePrice: 0
                };

                const setOnInsert = {};
                for (const [key, val] of Object.entries(insertDefaults)) {
                    if (updateFields[key] === undefined) {
                        setOnInsert[key] = val;
                    }
                }

                if (name.includes('Lemon 15 ml') || (pPrice > 0 && bulkOps.length < 5)) {
                    console.log(`  Matched ID: ${matchId}`);
                    console.log(`  Update Fields:`, JSON.stringify(updateFields));
                }

                if (matchId) {
                    // Update existing
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: matchId },
                            update: { $set: updateFields }
                        }
                    });
                } else {
                    // Insert new
                    // Note: For insert, we use the name as the filter for upsert to be safe, 
                    // but effectively it acts as an insert since we checked maps.
                    // However, to be perfectly safe against race conditions or map staleness,
                    // we can use the same logic or just standard upsert.
                    // Actually, since we have matchId, we can be explicit.

                    bulkOps.push({
                        updateOne: {
                            filter: { name: name }, // Fallback to name for new items
                            update: {
                                $set: updateFields,
                                $setOnInsert: setOnInsert
                            },
                            upsert: true
                        }
                    });
                }

            } catch (error) {
                results.errors.push(`Error processing ${row['Név']}: ${error.message}`);
            }
        }

        // 4. Execute Bulk Write (Updates & Inserts)
        if (bulkOps.length > 0) {
            const bulkResult = await Product.bulkWrite(bulkOps);
            results.updated = bulkResult.modifiedCount;
            results.imported = bulkResult.upsertedCount;
        }

        // 5. Execute Explicit Deletions
        if (idsToDelete.length > 0) {
            const deleteResult = await Product.deleteMany({ _id: { $in: idsToDelete } });
            results.deleted = deleteResult.deletedCount;
        }

        // 6. Reconcile Inventory Batches (Fix for "Batch allocation error")
        // Ensure every product has enough batch quantity to match its product.quantity
        const allProductsAfterSync = await Product.find();
        let reconciledCount = 0;

        for (const product of allProductsAfterSync) {
            if (product.quantity > 0) {
                const batches = await InventoryBatch.find({
                    productId: product._id,
                    remainingQuantity: { $gt: 0 }
                });

                const totalBatchQty = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);

                if (totalBatchQty < product.quantity) {
                    const diff = product.quantity - totalBatchQty;
                    // Create correction batch
                    await InventoryBatch.create({
                        productId: product._id,
                        warehouseId: product.warehouseId,
                        remainingQuantity: diff,
                        originalQuantity: diff,
                        unitCost: product.purchasePrice || 0,
                        purchasedAt: new Date(),
                        source: 'sync-correction'
                    });
                    reconciledCount++;
                }
            }
        }
        if (reconciledCount > 0) {
            console.log(`Reconciled batches for ${reconciledCount} products`);
        }

        // 6. Push updated DB state back to Sheet
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
