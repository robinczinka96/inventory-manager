import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    location: {
        type: String,
        required: false,
        trim: true
    }
}, {
    timestamps: true
});

export default mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);
