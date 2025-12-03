import express from 'express';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

const router = express.Router();

// GET dashboard KPIs
router.get('/dashboard', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        // Total inventory value
        const products = await Product.find();
        const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
        const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);

        // Sales data
        const salesTransactions = await Transaction.find({
            type: 'sale',
            ...dateFilter
        });
        const totalSalesAmount = salesTransactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const salesCount = salesTransactions.length;

        // Purchases data
        const purchaseTransactions = await Transaction.find({
            type: 'receiving',
            ...dateFilter
        });
        const totalPurchaseAmount = purchaseTransactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const purchaseCount = purchaseTransactions.length;

        // Manufacturing data
        const manufacturingCount = await Transaction.countDocuments({
            type: 'manufacturing',
            ...dateFilter
        });

        // Profit margin (simplified)
        const profitMargin = totalSalesAmount - totalPurchaseAmount;

        // Low stock products (less than 10 items)
        const lowStockProducts = products.filter(p => p.quantity < 10);

        res.json({
            inventory: {
                totalValue: Math.round(totalInventoryValue),
                totalItems,
                productCount: products.length,
                lowStockCount: lowStockProducts.length
            },
            sales: {
                totalAmount: Math.round(totalSalesAmount),
                count: salesCount,
                averageAmount: salesCount > 0 ? Math.round(totalSalesAmount / salesCount) : 0
            },
            purchases: {
                totalAmount: Math.round(totalPurchaseAmount),
                count: purchaseCount
            },
            manufacturing: {
                count: manufacturingCount
            },
            profitMargin: Math.round(profitMargin),
            lowStockProducts: lowStockProducts.map(p => ({
                id: p._id,
                name: p.name,
                quantity: p.quantity
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating dashboard', error: error.message });
    }
});

// GET inventory report
router.get('/inventory', async (req, res) => {
    try {
        const warehouses = await Warehouse.find();
        const report = [];

        for (const warehouse of warehouses) {
            const products = await Product.find({ warehouseId: warehouse._id });
            const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.purchasePrice), 0);
            const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);

            report.push({
                warehouse: {
                    id: warehouse._id,
                    name: warehouse.name,
                    location: warehouse.location
                },
                productCount: products.length,
                totalItems,
                totalValue: Math.round(totalValue),
                products: products.map(p => ({
                    id: p._id,
                    name: p.name,
                    barcode: p.barcode,
                    quantity: p.quantity,
                    purchasePrice: p.purchasePrice,
                    totalValue: Math.round(p.quantity * p.purchasePrice)
                }))
            });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error generating inventory report', error: error.message });
    }
});

// GET sales report
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;
        const filter = { type: 'sale' };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(filter)
            .populate('productId', 'name barcode')
            .populate('warehouseId', 'name')
            .sort({ createdAt: -1 });

        const totalAmount = transactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const totalQuantity = transactions.reduce((sum, t) => sum + t.quantity, 0);

        // Group by product if requested
        let productSummary = [];
        if (groupBy === 'product') {
            const grouped = {};
            transactions.forEach(t => {
                const key = t.productId?._id?.toString() || 'unknown';
                if (!grouped[key]) {
                    grouped[key] = {
                        productId: t.productId?._id,
                        productName: t.productId?.name || 'Unknown',
                        quantity: 0,
                        totalAmount: 0,
                        count: 0
                    };
                }
                grouped[key].quantity += t.quantity;
                grouped[key].totalAmount += t.price * t.quantity;
                grouped[key].count += 1;
            });
            productSummary = Object.values(grouped);
        }

        res.json({
            summary: {
                totalAmount: Math.round(totalAmount),
                totalQuantity,
                transactionCount: transactions.length,
                averageAmount: transactions.length > 0 ? Math.round(totalAmount / transactions.length) : 0
            },
            productSummary,
            transactions: transactions.map(t => ({
                id: t._id,
                product: t.productId?.name,
                quantity: t.quantity,
                price: t.price,
                totalAmount: t.price * t.quantity,
                customer: t.customer,
                warehouse: t.warehouseId?.name,
                date: t.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating sales report', error: error.message });
    }
});

// GET purchases report
router.get('/purchases', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = { type: 'receiving' };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(filter)
            .populate('productId', 'name barcode')
            .populate('warehouseId', 'name')
            .sort({ createdAt: -1 });

        const totalAmount = transactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const totalQuantity = transactions.reduce((sum, t) => sum + t.quantity, 0);

        res.json({
            summary: {
                totalAmount: Math.round(totalAmount),
                totalQuantity,
                transactionCount: transactions.length,
                averageAmount: transactions.length > 0 ? Math.round(totalAmount / transactions.length) : 0
            },
            transactions: transactions.map(t => ({
                id: t._id,
                product: t.productId?.name,
                quantity: t.quantity,
                price: t.price,
                totalAmount: t.price * t.quantity,
                warehouse: t.warehouseId?.name,
                date: t.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating purchases report', error: error.message });
    }
});

export default router;
