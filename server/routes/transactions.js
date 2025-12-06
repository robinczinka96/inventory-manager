import express from 'express';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import InventoryBatch from '../models/InventoryBatch.js';
import Customer from '../models/Customer.js';

const router = express.Router();

// GET all transactions with filters
router.get('/', async (req, res) => {
    try {
        const { type, startDate, endDate, productId } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (productId) filter.productId = productId;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(filter)
            .populate('productId', 'name barcode')
            .populate('warehouseId', 'name')
            .populate('fromWarehouseId', 'name')
            .populate('toWarehouseId', 'name')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error: error.message });
    }
});

// POST receiving (bevételezés) - with FIFO batch tracking
router.post('/receive', async (req, res) => {
    try {
        const { productId, quantity, price, warehouseId, source } = req.body;

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const targetWarehouseId = warehouseId || product.warehouseId;

        // Create inventory batch for FIFO tracking
        const batch = new InventoryBatch({
            productId,
            warehouseId: targetWarehouseId,
            remainingQuantity: quantity,
            originalQuantity: quantity,
            unitCost: price || product.purchasePrice || 0,
            purchasedAt: new Date(),
            source: source || 'manual'
        });
        await batch.save();

        // Update product quantity
        product.quantity += quantity;

        // Update weighted average purchase price
        const batches = await InventoryBatch.find({
            productId,
            remainingQuantity: { $gt: 0 }
        });

        let totalQty = 0;
        let totalValue = 0;
        batches.forEach(b => {
            totalQty += b.remainingQuantity;
            totalValue += b.remainingQuantity * b.unitCost;
        });

        if (totalQty > 0) {
            product.purchasePrice = Math.round(totalValue / totalQty);
        }

        await product.save();

        // Create transaction record
        const transaction = new Transaction({
            type: 'receiving',
            productId,
            quantity,
            price: price || product.purchasePrice,
            warehouseId: targetWarehouseId
        });
        await transaction.save();

        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate('productId', 'name barcode')
            .populate('warehouseId', 'name');

        res.status(201).json({
            message: 'Receiving completed successfully',
            transaction: populatedTransaction,
            product,
            batch: {
                id: batch._id,
                remainingQuantity: batch.remainingQuantity,
                unitCost: batch.unitCost
            }
        });
    } catch (error) {
        res.status(400).json({ message: 'Error processing receiving', error: error.message });
    }
});

// POST sale (eladás) - with FIFO batch consumption
router.post('/sale', async (req, res) => {
    try {
        const { items, customer: customerName, customerGroup } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items provided' });
        }

        // Handle Customer (Upsert)
        let customerId = null;
        if (customerName) {
            const customer = await Customer.findOneAndUpdate(
                { name: customerName },
                {
                    $set: {
                        lastPurchase: new Date(),
                        // Only update group if provided and not empty, otherwise keep existing
                        ...(customerGroup ? { group: customerGroup } : {})
                    },
                    $inc: { totalRevenue: 0 } // Will increment later with total amount
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            customerId = customer._id;
        }

        const transactions = [];
        const updatedProducts = [];
        let totalAmount = 0;
        let totalCost = 0; // For COGS tracking

        // Process each item
        for (const item of items) {
            const { productId, quantity, price } = item;

            // Find product
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: `Product ${productId} not found` });
            }

            // Check sufficient quantity
            if (product.quantity < quantity) {
                return res.status(400).json({
                    message: `Insufficient quantity for ${product.name}`,
                    available: product.quantity,
                    requested: quantity
                });
            }

            // ===== FIFO BATCH CONSUMPTION =====
            // Get batches ordered by purchase date (oldest first)
            const batches = await InventoryBatch.find({
                productId,
                warehouseId: product.warehouseId,
                remainingQuantity: { $gt: 0 }
            }).sort({ purchasedAt: 1 }); // FIFO: oldest first

            // SAFETY FALLBACK: Check if we have enough batch quantity
            const totalBatchQty = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
            if (totalBatchQty < quantity) {
                const diff = quantity - totalBatchQty;
                console.log(`[Sale] Insufficient batches for ${product.name}. Creating correction batch for ${diff} items.`);

                const correctionBatch = await InventoryBatch.create({
                    productId: product._id,
                    warehouseId: product.warehouseId,
                    remainingQuantity: diff,
                    originalQuantity: diff,
                    unitCost: product.purchasePrice || 0,
                    purchasedAt: new Date(),
                    source: 'sale-correction' // Mark as created during sale
                });

                // Add to our local list so we can consume it immediately
                batches.push(correctionBatch);
            }

            let remainingToSell = quantity;
            let itemCost = 0;

            let remainingToSell = quantity;
            let itemCost = 0;

            for (const batch of batches) {
                if (remainingToSell <= 0) break;

                const usedQty = Math.min(batch.remainingQuantity, remainingToSell);

                // Decrease batch quantity
                batch.remainingQuantity -= usedQty;
                await batch.save();

                // Track cost for this item
                itemCost += usedQty * batch.unitCost;
                remainingToSell -= usedQty;
            }

            if (remainingToSell > 0) {
                // Should not happen if product.quantity was correct, but safety check
                return res.status(500).json({
                    message: `Batch allocation error for ${product.name}`,
                    details: 'Batch quantities don\'t match product quantity'
                });
            }

            totalCost += itemCost;

            // Update product quantity
            product.quantity -= quantity;

            // Recalculate weighted average if batches remain
            const remainingBatches = await InventoryBatch.find({
                productId,
                remainingQuantity: { $gt: 0 }
            });

            if (remainingBatches.length > 0) {
                let totalQty = 0;
                let totalValue = 0;
                remainingBatches.forEach(b => {
                    totalQty += b.remainingQuantity;
                    totalValue += b.remainingQuantity * b.unitCost;
                });

                if (totalQty > 0) {
                    product.purchasePrice = Math.round(totalValue / totalQty);
                }
            }

            await product.save();
            updatedProducts.push(product);

            // Create transaction record
            const transaction = new Transaction({
                type: 'sale',
                productId,
                quantity,
                price,
                customer: customerName,
                warehouseId: product.warehouseId
            });
            await transaction.save();
            transactions.push(transaction);

            totalAmount += price * quantity;
        }

        // Update Customer Revenue
        if (customerId) {
            await Customer.findByIdAndUpdate(customerId, {
                $inc: { totalRevenue: totalAmount }
            });
        }

        const profit = totalAmount - totalCost;
        const margin = totalAmount > 0 ? ((profit / totalAmount) * 100).toFixed(2) : 0;

        res.status(201).json({
            message: 'Sale completed successfully',
            transactions,
            products: updatedProducts,
            totalAmount,
            totalCost,
            profit,
            margin: `${margin}%`,
            itemCount: items.length
        });
    } catch (error) {
        res.status(400).json({ message: 'Error processing sale', error: error.message });
    }
});

// POST manufacturing (gyártás)
router.post('/manufacture', async (req, res) => {
    try {
        const { outputProductId, outputQuantity, components } = req.body;

        if (!components || components.length === 0) {
            return res.status(400).json({ message: 'No components provided' });
        }

        // Validate all components have sufficient quantity
        for (const comp of components) {
            const product = await Product.findById(comp.productId);
            if (!product) {
                return res.status(404).json({ message: `Component ${comp.productId} not found` });
            }
            if (product.quantity < comp.quantity) {
                return res.status(400).json({
                    message: `Insufficient quantity for component ${product.name}`,
                    available: product.quantity,
                    requested: comp.quantity
                });
            }
        }

        // Decrease component quantities
        const usedComponents = [];
        for (const comp of components) {
            const product = await Product.findById(comp.productId);
            product.quantity -= comp.quantity;
            await product.save();
            usedComponents.push({
                productId: product._id,
                name: product.name,
                quantity: comp.quantity
            });
        }

        // Increase output product quantity
        const outputProduct = await Product.findById(outputProductId);
        if (!outputProduct) {
            return res.status(404).json({ message: 'Output product not found' });
        }
        outputProduct.quantity += outputQuantity;
        await outputProduct.save();

        // Create manufacturing transaction
        const transaction = new Transaction({
            type: 'manufacturing',
            productId: outputProductId,
            quantity: outputQuantity,
            components: components.map(c => ({ productId: c.productId, quantity: c.quantity })),
            warehouseId: outputProduct.warehouseId
        });
        await transaction.save();

        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate('productId', 'name barcode')
            .populate('components.productId', 'name barcode');

        res.status(201).json({
            message: 'Manufacturing completed successfully',
            transaction: populatedTransaction,
            outputProduct,
            usedComponents
        });
    } catch (error) {
        res.status(400).json({ message: 'Error processing manufacturing', error: error.message });
    }
});

export default router;
