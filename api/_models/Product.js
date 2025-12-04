import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    barcode: {
        type: String,
        required: false,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    purchasePrice: {
        type: Number,
        required: true,
        min: 0
    },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    }
}, {
    timestamps: true
});

productSchema.index({ name: 'text', barcode: 'text' });

export default mongoose.models.Product || mongoose.model('Product', productSchema);
