import mongoose from 'mongoose';

const pendingSaleSchema = new mongoose.Schema({
    customerName: {
        type: String,
        default: ''
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    taskType: {
        type: String,
        required: true
        // Removed enum validation here to allow dynamic types
    },
    note: {
        type: String,
        default: ''
    },
    pickupDate: {
        type: Date
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('PendingSale', pendingSaleSchema);
