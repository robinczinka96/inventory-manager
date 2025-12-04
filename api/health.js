import { connectDB } from './_utils/db.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await connectDB();

        return res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            mongodb_uri_set: !!process.env.MONGODB_URI
        });
    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
}
