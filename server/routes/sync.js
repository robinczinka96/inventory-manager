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

// POST /api/sync
router.post('/', async (req, res) => {
    try {
        if (!SPREADSHEET_ID) {
            return res.status(400).json({ message: 'GOOGLE_SHEET_ID environment variable is not set' });
        }

        // 1. Fetch data from Google Sheet
        const sheetData = await pullFromSheet(SPREADSHEET_ID);

        // 2. Fetch local data
        const localProducts = await Product.find().populate('warehouseId');
        const warehouses = await Warehouse.find();

        // 3. Sync Logic (Simple "Last Write Wins" - effectively Sheet is master for import, DB is master for export)
        // Actually, user wants "continuous connection".
        // Let's implement: Import from Sheet -> Update DB -> Export to Sheet (to standardize formatting)

        const results = {
            imported: 0,
            updated: 0,
            errors: []
        };

        // Process Sheet Data (Import/Update)
        for (const row of sheetData) {
            try {
                const name = row['Név'];
                if (!name) continue;

                let product = await Product.findOne({ name });
                const warehouse = warehouses.find(w => w.name === row['Raktár név']);

                const productData = {
                    name,
                    barcode: row['Vonalkód'],
                    quantity: parseInt(row['Mennyiség']), // Don't default to 0 yet, check validity
                    purchasePrice: parseFloat(row['Beszerzési ár']),
                    salePrice: parseFloat(row['Eladási ár']),
                    warehouseId: warehouse?._id,
                    category: row['Kategória']
                };

                if (product) {
                    // Update existing - Non-destructive
                    if (productData.barcode) product.barcode = productData.barcode;
                    if (!isNaN(productData.quantity)) product.quantity = productData.quantity;
                    if (!isNaN(productData.purchasePrice)) product.purchasePrice = productData.purchasePrice;
                    if (!isNaN(productData.salePrice)) product.salePrice = productData.salePrice;
                    if (productData.warehouseId) product.warehouseId = productData.warehouseId;
                    if (productData.category) product.category = productData.category; // Only update if category exists in sheet

                    await product.save();
                    results.updated++;
                } else {
                    // Create new - Defaults needed
                    const newProduct = {
                        ...productData,
                        quantity: isNaN(productData.quantity) ? 0 : productData.quantity,
                        purchasePrice: isNaN(productData.purchasePrice) ? 0 : productData.purchasePrice,
                        salePrice: isNaN(productData.salePrice) ? 0 : productData.salePrice,
                        category: productData.category || 'Egyéb'
                    };

                    product = await Product.create(newProduct);

                    // Create initial batch for new product
                    if (product.quantity > 0) {
                        await InventoryBatch.create({
                            productId: product._id,
                            warehouseId: product.warehouseId,
                            remainingQuantity: product.quantity,
                            originalQuantity: product.quantity,
                            unitCost: product.purchasePrice,
                            purchasedAt: new Date(),
                            source: 'batch-import'
                        });
                    }
                    results.imported++;
                }
            } catch (error) {
                results.errors.push(`Error processing ${row['Név']}: ${error.message}`);
            }
        }

        // 4. Push updated DB state back to Sheet (to ensure consistency and add any locally created products)
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
