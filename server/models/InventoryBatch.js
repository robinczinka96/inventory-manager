const mongoose = require('mongoose');

const inventoryBatchSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    remainingQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    originalQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    unitCost: {
        type: Number,
        required: true,
        min: 0
    },
    purchasedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    batchReference: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        enum: ['manual', 'batch-import', 'transfer', 'other'],
        default: 'manual'
    }
}, {
    timestamps: true
});

// Index for efficient FIFO queries
inventoryBatchSchema.index({ productId: 1, warehouseId: 1, purchasedAt: 1 });
inventoryBatchSchema.index({ productId: 1, remainingQuantity: 1 });

module.exports = mongoose.model('InventoryBatch', inventoryBatchSchema);
