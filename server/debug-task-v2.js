import mongoose from 'mongoose';
import PendingSale from './models/PendingSale.js';
import Product from './models/Product.js';
import InventoryBatch from './models/InventoryBatch.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_manager';

async function debug() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const sale = await PendingSale.findOne({ customerName: /Vezér Beáta/i }).populate('items.productId');
        if (!sale) {
            console.log('❌ Pending Sale not found!');
            return;
        }

        console.log(`\n📄 SALE FOUND: ${sale._id}`);
        console.log(`Customer: ${sale.customerName}`);

        for (const item of sale.items) {
            const product = item.productId;
            if (!product) {
                console.log(`❌ Product not found for item: ${item.productId}`);
                continue;
            }
            console.log(`\n  📦 Item: ${product.name}`);
            console.log(`     Requested Qty: ${item.quantity}`);
            console.log(`     Current Product Stock (Available): ${product.quantity}`);

            const batches = await InventoryBatch.find({ productId: product._id });
            const totalBatchStock = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
            console.log(`     Total Batch Stock: ${totalBatchStock}`);

            // Check if Pending Sale has allocations
            console.log(`     Allocations in Sale: ${JSON.stringify(item.allocations)}`);
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

debug();
