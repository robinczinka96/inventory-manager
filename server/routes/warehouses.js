import express from 'express';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// GET all warehouses
router.get('/', async (req, res) => {
    try {
        const warehouses = await Warehouse.find().sort({ name: 1 });
        res.json(warehouses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching warehouses', error: error.message });
    }
});

// GET single warehouse
router.get('/:id', async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse not found' });
        }
        res.json(warehouse);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching warehouse', error: error.message });
    }
});

// GET warehouse inventory
router.get('/:id/inventory', async (req, res) => {
    try {
        const products = await Product.find({ warehouseId: req.params.id });
        const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
        const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);

        res.json({
            warehouse: await Warehouse.findById(req.params.id),
            products,
            totalValue,
            totalItems,
            productCount: products.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching warehouse inventory', error: error.message });
    }
});

// CREATE new warehouse
router.post('/', async (req, res) => {
    try {
        const warehouse = new Warehouse(req.body);
        const savedWarehouse = await warehouse.save();
        res.status(201).json(savedWarehouse);
    } catch (error) {
        res.status(400).json({ message: 'Error creating warehouse', error: error.message });
    }
});

// UPDATE warehouse
router.put('/:id', async (req, res) => {
    try {
        const warehouse = await Warehouse.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse not found' });
        }
        res.json(warehouse);
    } catch (error) {
        res.status(400).json({ message: 'Error updating warehouse', error: error.message });
    }
});

// DELETE warehouse
router.delete('/:id', async (req, res) => {
    try {
        // Check if warehouse has products
        const productsCount = await Product.countDocuments({ warehouseId: req.params.id });
        if (productsCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete warehouse with products. Please move or delete products first.',
                productsCount
            });
        }

        const warehouse = await Warehouse.findByIdAndDelete(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse not found' });
        }
        res.json({ message: 'Warehouse deleted successfully', warehouse });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting warehouse', error: error.message });
    }
});

// TRANSFER stock between warehouses
router.post('/transfer', async (req, res) => {
    try {
        const { productId, fromWarehouseId, toWarehouseId, quantity } = req.body;

        // Validate product exists in source warehouse
        const product = await Product.findOne({ _id: productId, warehouseId: fromWarehouseId });
        if (!product) {
            return res.status(404).json({ message: 'Product not found in source warehouse' });
        }

        // Check sufficient quantity
        if (product.quantity < quantity) {
            return res.status(400).json({
                message: 'Insufficient quantity',
                available: product.quantity,
                requested: quantity
            });
        }

        // Decrease quantity in source warehouse
        product.quantity -= quantity;
        await product.save();

        // Check if product exists in destination warehouse
        let destProduct = await Product.findOne({
            name: product.name,
            barcode: product.barcode,
            warehouseId: toWarehouseId
        });

        if (destProduct) {
            // Product exists, increase quantity
            destProduct.quantity += quantity;
            await destProduct.save();
        } else {
            // Create new product in destination warehouse
            destProduct = new Product({
                name: product.name,
                barcode: product.barcode,
                quantity: quantity,
                purchasePrice: product.purchasePrice,
                warehouseId: toWarehouseId
            });
            await destProduct.save();
        }

        // Record transfer transaction
        const transaction = new Transaction({
            type: 'transfer',
            productId: product._id,
            quantity,
            fromWarehouseId,
            toWarehouseId
        });
        await transaction.save();

        res.json({
            message: 'Transfer completed successfully',
            sourceProduct: product,
            destinationProduct: destProduct,
            transaction
        });
    } catch (error) {
        res.status(500).json({ message: 'Error transferring stock', error: error.message });
    }
});

export default router;
