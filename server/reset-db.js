require('dotenv').config();
const mongoose = require('mongoose');

// Import all models based on actual file names
const Product = require('./models/Product');
const Customer = require('./models/Customer'); // Was Partner
const Transaction = require('./models/Transaction');
const InventoryBatch = require('./models/InventoryBatch');
const Warehouse = require('./models/Warehouse');
const Todo = require('./models/Todo');
const PendingSale = require('./models/PendingSale');
const OpenStock = require('./models/OpenStock');

const resetDatabase = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env file');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        console.log('Clearing database...');

        // Delete all documents from collections
        await Product.deleteMany({});
        console.log('✅ Products cleared');

        await Customer.deleteMany({});
        console.log('✅ Customers cleared');

        await Transaction.deleteMany({});
        console.log('✅ Transactions cleared');

        await InventoryBatch.deleteMany({});
        console.log('✅ Inventory Batches cleared');

        await Warehouse.deleteMany({});
        console.log('✅ Warehouses cleared');

        await Todo.deleteMany({});
        console.log('✅ Todos cleared');

        await PendingSale.deleteMany({});
        console.log('✅ Pending Sales cleared');

        await OpenStock.deleteMany({});
        console.log('✅ Open Stock cleared');

        console.log('🎉 Database reset successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    }
};

resetDatabase();
