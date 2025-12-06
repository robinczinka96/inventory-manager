import express from 'express';
import InventoryBatch from '../models/InventoryBatch.js';

const router = express.Router();

// GET /api/batches/product/:productId
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        // Csak a pozitív mennyiséggel rendelkező batch-eket kérjük le
        const batches = await InventoryBatch.find({
            productId,
            remainingQuantity: { $gt: 0 }
        })
            .populate('warehouseId', 'name')
            .sort({ purchasedAt: 1 }); // FIFO sorrend (legrégebbi elöl)

        res.json(batches);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching batches', error: error.message });
    }
});

export default router;
