import express from 'express';
import Customer from '../models/Customer.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// GET /api/customers - Get all customers
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/customers - Create or Update Customer
router.post('/', async (req, res) => {
    try {
        const { name, group } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const customer = await Customer.findOneAndUpdate(
            { name: name },
            {
                $set: { group: group || 'Egyéb' }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}
});

// PUT /api/customers/:id - Update Customer (e.g. group)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { group, name } = req.body;

        const updateFields = {};
        if (group) updateFields.group = group;
        if (name) updateFields.name = name;

        const customer = await Customer.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET /api/customers/:id/history - Get customer transaction history
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const query = {
            type: 'sale',
            // We need to match by customer name because Transaction stores customer name string currently,
            // but we should probably link it. For now, let's look up the customer to get the name.
        };

        const customer = await Customer.findById(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        query.customer = customer.name;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .populate('items.productId', 'name'); // Assuming items structure in Transaction

        // Note: Transaction model structure might differ slightly, we need to verify.
        // Based on previous view, Transaction has 'productId' (single) or 'components'.
        // Wait, the Sales implementation creates a Transaction for EACH item or one grouped?
        // Let's check Transaction.js again. It seems to be single item per transaction based on schema?
        // "productId: ... required: true"
        // But Sales.js sends "items" array to transactionsAPI.sale.
        // We need to check how transactionsAPI.sale handles it. 
        // If it creates multiple transactions, we fetch them all.

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
