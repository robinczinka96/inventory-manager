import express from 'express';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';

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

// POST receiving (bevételezés)
router.post('/receive', async (req, res) => {
    try {
        const { productId, quantity, price, warehouseId } = req.body;

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Update product quantity and purchase price
        product.quantity += quantity;
        if (price !== undefined) {
            product.purchasePrice = price;
        }
        await product.save();

        // Create transaction record
        const transaction = new Transaction({
            type: 'receiving',
            productId,
            quantity,
            price,
            warehouseId: warehouseId || product.warehouseId
        });
        await transaction.save();

        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate('productId', 'name barcode')
            .populate('warehouseId', 'name');

        res.status(201).json({
            message: 'Receiving completed successfully',
            transaction: populatedTransaction,
            product
        });
    } catch (error) {
        res.status(400).json({ message: 'Error processing receiving', error: error.message });
    }
});

// POST sale (eladás)
router.post('/sale', async (req, res) => {
    try {
        const { items, customer } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items provided' });
        }

        const transactions = [];
        const updatedProducts = [];
        let totalAmount = 0;

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

            // Update product quantity
            product.quantity -= quantity;
            await product.save();
            updatedProducts.push(product);

            // Create transaction record
            const transaction = new Transaction({
                type: 'sale',
                productId,
                quantity,
                price,
                customer,
                warehouseId: product.warehouseId
            });
            await transaction.save();
            transactions.push(transaction);

            totalAmount += price * quantity;
        }

        res.status(201).json({
            message: 'Sale completed successfully',
            transactions,
            products: updatedProducts,
            totalAmount,
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
