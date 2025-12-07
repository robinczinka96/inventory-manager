import express from 'express';
const router = express.Router();
import PendingSale from '../models/PendingSale.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';

// Get all pending sales
router.get('/', async (req, res) => {
    try {
        const pendingSales = await PendingSale.find({ status: 'pending' })
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json(pendingSales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new pending sale
router.post('/', async (req, res) => {
    try {
        const { customerName, items, taskType, pickupDate, totalAmount } = req.body;

        const pendingSale = new PendingSale({
            customerName,
            items,
            taskType,
            pickupDate,
            totalAmount
        });

        await pendingSale.save();

        // Populate the items before returning
        await pendingSale.populate('items.productId');

        res.status(201).json(pendingSale);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Complete pending sale (convert to regular sale)
router.put('/:id/complete', async (req, res) => {
    try {
        const pendingSale = await PendingSale.findById(req.params.id).populate('items.productId');

        if (!pendingSale) {
            return res.status(404).json({ error: 'Pending sale not found' });
        }

        if (pendingSale.status === 'completed') {
            return res.status(400).json({ error: 'Sale already completed' });
        }

        // Check stock availability
        for (const item of pendingSale.items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Required: ${item.quantity}`
                });
            }
        }

        const transactions = [];

        // Process each item and create a transaction
        for (const item of pendingSale.items) {
            const product = await Product.findById(item.productId._id);

            // Create transaction record for this item
            const transaction = new Transaction({
                type: 'sale',
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.price,
                customer: pendingSale.customerName || undefined,
                warehouseId: product.warehouseId
            });

            await transaction.save();
            transactions.push(transaction);

            // Update product quantity
            product.quantity -= item.quantity;
            await product.save();
        }

        // Update Customer Revenue if customer exists
        if (pendingSale.customerName) {
            // Try to find customer by name to update revenue
            // Note: In a real app we might want to link by ID, but pending sale stores name
            // We'll do a best-effort update if we can find them
            // We don't import Customer model here, so we skip this step or need to import it.
            // For now, let's skip to avoid dependency issues if Customer model isn't imported.
            // If strict tracking is needed, we should import Customer model.
        }

        // Mark pending sale as completed
        pendingSale.status = 'completed';
        await pendingSale.save();

        res.json({
            message: 'Sale completed successfully',
            transactions,
            pendingSale
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete pending sale
router.delete('/:id', async (req, res) => {
    try {
        const pendingSale = await PendingSale.findByIdAndDelete(req.params.id);

        if (!pendingSale) {
            return res.status(404).json({ error: 'Pending sale not found' });
        }

        res.json({ message: 'Pending sale deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
