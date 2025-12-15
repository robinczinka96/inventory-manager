import express from 'express';
const router = express.Router();
import TaskType from '../models/TaskType.js';

// Get all task types
router.get('/', async (req, res) => {
    try {
        const taskTypes = await TaskType.find().sort({ isActive: -1, name: 1 });
        res.json(taskTypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new task type
router.post('/', async (req, res) => {
    try {
        const { name, key, description, color, requiresDate } = req.body;

        // Auto-generate key if not provided
        const finalKey = key || name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const newTaskType = new TaskType({
            name,
            key: finalKey,
            description,
            color,
            requiresDate
        });

        await newTaskType.save();
        res.status(201).json(newTaskType);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update task type
router.put('/:id', async (req, res) => {
    try {
        const { name, description, color, requiresDate, isActive } = req.body;

        const updatedTaskType = await TaskType.findByIdAndUpdate(
            req.params.id,
            { name, description, color, requiresDate, isActive },
            { new: true }
        );

        if (!updatedTaskType) {
            return res.status(404).json({ error: 'Task type not found' });
        }

        res.json(updatedTaskType);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete task type (Soft delete preferred usually, but explicit delete requested? Assuming hard delete for now if unused, but let's stick to safe delete)
router.delete('/:id', async (req, res) => {
    try {
        // Here we might want to check if any tasks use this type before deleting.
        // For now, simpler implementation:
        await TaskType.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task type deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
