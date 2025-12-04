import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes with correct paths
import productsRouter from '../server/routes/products.js';
import warehousesRouter from '../server/routes/warehouses.js';
import transactionsRouter from '../server/routes/transactions.js';
import reportsRouter from '../server/routes/reports.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Connect to MongoDB (only once, cache connection)
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
        const conn = await mongoose.connect(MONGODB_URI);
        cachedDb = conn;
        console.log('✅ Connected to MongoDB');
        return conn;
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        throw err;
    }
}

// Routes
app.use('/api/products', productsRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await connectToDatabase();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Root endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Inventory Manager API',
        version: '1.0.0',
        endpoints: {
            products: '/api/products',
            warehouses: '/api/warehouses',
            transactions: '/api/transactions',
            reports: '/api/reports',
            health: '/api/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Export for Vercel serverless
export default async function handler(req, res) {
    await connectToDatabase();
    return app(req, res);
}
