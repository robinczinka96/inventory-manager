import mongoose from 'mongoose';
import PendingSale from './server/models/PendingSale.js';
import Product from './server/models/Product.js';
import InventoryBatch from './server/models/InventoryBatch.js';

const MONGODB_URI = 'mongodb://localhost:27017/inventory_manager';

async function debug() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        // 1. Find the Pending Sale
        const sale = await PendingSale.findOne({ customerName: /Vezér Beáta/i }).populate('items.productId');
        if (!sale) {
            console.log('❌ Pending Sale not found!');
            return;
        }

        console.log(`\n📄 SALE FOUND: ${sale._id}`);
        console.log(`Customer: ${sale.customerName}`);
        console.log(`Status: ${sale.status}`);

        for (const item of sale.items) {
            const product = item.productId; // Populated
            console.log(`\n  📦 Item: ${product.name} (Qty: ${item.quantity})`);
            console.log(`     Allocations: ${JSON.stringify(item.allocations)}`);

            console.log(`     Product Current Stock: ${product.quantity}`);

            // Check batches
            const batches = await InventoryBatch.find({ productId: product._id });
            console.log(`     Total Batch Stock: ${batches.reduce((sum, b) => sum + b.remainingQuantity, 0)}`);
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
