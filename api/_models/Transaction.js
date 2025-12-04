import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['receiving', 'sale', 'manufacturing', 'transfer']
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: false,
        min: 0
    },
    customer: {
        type: String,
        required: false,
        trim: true
    },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    fromWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    toWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    components: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: Number
    }],
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    }
}, {
    timestamps: true
});

transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
