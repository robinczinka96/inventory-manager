import express from 'express';
import Todo from '../models/Todo.js';

const router = express.Router();

// GET /api/todos - Get all todos (optional filtering by date range could be added later)
router.get('/', async (req, res) => {
    try {
        const todos = await Todo.find()
            .populate('customer', 'name')
            .populate('product', 'name')
            .sort({ date: 1, createdAt: -1 }); // Sort by due date, then creation
        res.json(todos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/todos - Create a new todo
router.post('/', async (req, res) => {
    try {
        const todo = new Todo({
            customer: req.body.customer || undefined,
            product: req.body.product || undefined,
            date: req.body.date || undefined,
            description: req.body.description
        });
        const newTodo = await todo.save();

        // Populate returned doc for immediate UI update
        await newTodo.populate('customer', 'name');
        await newTodo.populate('product', 'name');

        res.status(201).json(newTodo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/todos/:id - Update a todo
router.put('/:id', async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if (!todo) return res.status(404).json({ message: 'Todo not found' });

        if (req.body.isCompleted !== undefined) todo.isCompleted = req.body.isCompleted;
        if (req.body.description !== undefined) todo.description = req.body.description;
        if (req.body.date !== undefined) todo.date = req.body.date;
        if (req.body.customer !== undefined) todo.customer = req.body.customer;
        if (req.body.product !== undefined) todo.product = req.body.product;

        const updatedTodo = await todo.save();
        await updatedTodo.populate('customer', 'name');
        await updatedTodo.populate('product', 'name');

        res.json(updatedTodo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/todos/:id - Delete a todo
router.delete('/:id', async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if (!todo) return res.status(404).json({ message: 'Todo not found' });

        await todo.deleteOne();
        res.json({ message: 'Todo deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
