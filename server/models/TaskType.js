import mongoose from 'mongoose';

const taskTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    key: { // 'later_pickup', 'shipping', etc.
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: '#3b82f6' // Default Blue
    },
    requiresDate: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('TaskType', taskTypeSchema);
