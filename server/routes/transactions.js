import express from 'express';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import InventoryBatch from '../models/InventoryBatch.js';
import Customer from '../models/Customer.js';
import OpenStock from '../models/OpenStock.js';

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

            let remainingToSell = quantity;
            let itemCost = 0;

            // HANDLE SPECIFIC BATCH SELECTION
            if (item.batchId) {
                const specificBatch = await InventoryBatch.findById(item.batchId);
                if (!specificBatch) {
                    return res.status(404).json({ message: `A kiválasztott batch nem található (${product.name})` });
                }

                if (specificBatch.remainingQuantity < quantity) {
                    return res.status(400).json({
                        message: `Nincs elég mennyiség a kiválasztott beszerzésből (${product.name})`,
                        available: specificBatch.remainingQuantity,
                        requested: quantity
                    });
                }

                // Consume validation passed
                specificBatch.remainingQuantity -= quantity;
                await specificBatch.save();

                itemCost = quantity * specificBatch.unitCost;
                remainingToSell = 0; // Fulfilled
            } else {
                // FALLBACK TO FIFO
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
        const { outputProductId, outputQuantity, components, newOutputProductName } = req.body;

        if (!components || components.length === 0) {
            return res.status(400).json({ message: 'No components provided' });
        }

        // 1. Handle Output Product (Existing or New)
        let outputProduct;

        if (outputProductId === 'new') {
            if (!newOutputProductName) {
                return res.status(400).json({ message: 'New product name is required' });
            }

            // Create new product
            // We need a warehouse ID. We'll take it from the first component's product
            const firstComponentProduct = await Product.findById(components[0].productId);
            if (!firstComponentProduct) {
                return res.status(404).json({ message: 'Component product not found' });
            }

            outputProduct = new Product({
                name: newOutputProductName,
                quantity: 0, // Will be increased later
                purchasePrice: 0, // Should be calculated from components, but 0 for now
                warehouseId: firstComponentProduct.warehouseId,
                category: 'Keverék', // Default category for manufactured items
                size: 10, // Default size for blends (can be edited later)
                unit: 'ml'
            });
            await outputProduct.save();
        } else {
            outputProduct = await Product.findById(outputProductId);
            if (!outputProduct) {
                return res.status(404).json({ message: 'Output product not found' });
            }
        }

        const usedComponents = [];

        // 2. Process Components (Consume Drops/Units)
        for (const comp of components) {
            const product = await Product.findById(comp.productId);
            if (!product) {
                return res.status(404).json({ message: `Component ${comp.productId} not found` });
            }

            // Logic for Essential Oils (ml -> drops)
            if (product.unit === 'ml') {
                const dropsPerMl = product.dropsPerMl || 20;
                let requiredDrops = 0;

                // Calculate required drops based on unit
                if (comp.unit === 'db') {
                    // Full bottle(s)
                    requiredDrops = comp.quantity * (product.size || 15) * dropsPerMl;
                } else if (comp.unit === 'csepp') {
                    // Exact drops
                    requiredDrops = comp.quantity;
                } else {
                    // Default to ml
                    requiredDrops = comp.quantity * dropsPerMl;
                }

                let remainingRequiredDrops = requiredDrops;

                // A. Check Open Stock first
                const openBottles = await OpenStock.find({
                    productId: product._id,
                    warehouseId: product.warehouseId,
                    remainingDrops: { $gt: 0 }
                }).sort({ openedAt: 1 }); // Oldest first

                for (const bottle of openBottles) {
                    if (remainingRequiredDrops <= 0) break;

                    const take = Math.min(bottle.remainingDrops, remainingRequiredDrops);
                    bottle.remainingDrops -= take;
                    remainingRequiredDrops -= take;

                    if (bottle.remainingDrops === 0) {
                        await OpenStock.findByIdAndDelete(bottle._id); // Remove empty bottle
                    } else {
                        await bottle.save();
                    }
                }

                // B. Open new bottles if needed
                while (remainingRequiredDrops > 0) {
                    if (product.quantity <= 0) {
                        return res.status(400).json({
                            message: `Insufficient stock for ${product.name}. Need more drops.`,
                            details: `Missing ${remainingRequiredDrops} drops`
                        });
                    }

                    // Open a full bottle
                    product.quantity -= 1;
                    await product.save();

                    const bottleSizeMl = product.size || 15;
                    const bottleDrops = bottleSizeMl * dropsPerMl;

                    // Consume from this new bottle
                    const take = Math.min(bottleDrops, remainingRequiredDrops);
                    const leftOver = bottleDrops - take;
                    remainingRequiredDrops -= take;

                    // Save remainder to OpenStock
                    if (leftOver > 0) {
                        await OpenStock.create({
                            productId: product._id,
                            warehouseId: product.warehouseId,
                            remainingDrops: leftOver,
                            openedAt: new Date()
                        });
                    }
                }
            } else {
                // Standard Unit Logic (db, kg, etc.) - Direct deduction
                if (product.quantity < comp.quantity) {
                    return res.status(400).json({
                        message: `Insufficient quantity for component ${product.name}`,
                        available: product.quantity,
                        requested: comp.quantity
                    });
                }
                product.quantity -= comp.quantity;
                await product.save();
            }

            usedComponents.push({
                productId: product._id,
                name: product.name,
                quantity: comp.quantity,
                unit: comp.unit || product.unit // Store the unit used for manufacturing
            });
        }

        // 3. Increase Output Product Quantity
        outputProduct.quantity += outputQuantity;
        await outputProduct.save();

        // 4. Create Transaction Record
        const transaction = new Transaction({
            type: 'manufacturing',
            productId: outputProduct._id,
            quantity: outputQuantity,
            components: components.map(c => ({
                productId: c.productId,
                quantity: c.quantity,
                unit: c.unit // Save the unit used
            })),
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
        console.error('Manufacturing error:', error);
        res.status(400).json({ message: 'Error processing manufacturing', error: error.message });
    }
});

// DELETE transaction (Reverse sale)
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.type !== 'sale') {
            return res.status(400).json({ message: 'Only sales transactions can be reversed' });
        }

        const { productId, quantity, price, customer: customerName, warehouseId } = transaction;

        // 1. Restore Product Stock
        const product = await Product.findById(productId);
        if (product) {
            // Create a "Return" batch to restore FIFO consistency
            const returnBatch = new InventoryBatch({
                productId: product._id,
                warehouseId: warehouseId || product.warehouseId,
                remainingQuantity: quantity,
                originalQuantity: quantity,
                unitCost: product.purchasePrice || 0, // Best guess for cost is current avg
                purchasedAt: new Date(),
                source: 'return'
            });
            await returnBatch.save();

            product.quantity += quantity;
            await product.save();
        }

        // 2. Revert Customer Revenue
        if (customerName) {
            const totalAmount = price * quantity;
            const customer = await Customer.findOne({ name: customerName });
            if (customer) {
                customer.totalRevenue = Math.max(0, customer.totalRevenue - totalAmount);
                await customer.save();
            }
        }

        // 3. Delete the transaction record
        await Transaction.findByIdAndDelete(req.params.id);

        res.json({ message: 'Transaction reversed successfully' });

    } catch (error) {
        console.error('Error reversing transaction:', error);
        res.status(500).json({ message: 'Error reversing transaction', error: error.message });
    }
});

export default router;
