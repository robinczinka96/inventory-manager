import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    group: {
        type: String,
        default: 'Egyéb',
        trim: true
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    lastPurchase: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for searching
customerSchema.index({ name: 'text' });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
