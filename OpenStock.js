import mongoose from 'mongoose';

const openStockSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    remainingDrops: {
        type: Number,
        required: true,
        min: 0
    },
    openedAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true
});

// Index for quick lookup of open bottles for a product
openStockSchema.index({ productId: 1, warehouseId: 1 });

const OpenStock = mongoose.model('OpenStock', openStockSchema);

export default OpenStock;
