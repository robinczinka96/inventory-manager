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
    category: {
        type: String,
        required: false,
        default: 'Egyéb',
        trim: true,
        index: true
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

// Index for search functionality
productSchema.index({ name: 'text', barcode: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
