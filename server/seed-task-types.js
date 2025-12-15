import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TaskType from './models/TaskType.js';

dotenv.config();

const defaultTaskTypes = [
    {
        name: 'Később tudja átvenni',
        key: 'later_pickup',
        description: 'Az ügyfél kifizette vagy megrendelte, de egy későbbi időpontban viszi el.',
        color: '#3b82f6', // Blue
        requiresDate: true
    },
    {
        name: 'Csomagfeladást kért',
        key: 'shipping',
        description: 'A terméket futárszolgálattal kell elküldeni.',
        color: '#f59e0b', // Amber
        requiresDate: false
    },
    {
        name: 'Hiányzó termék',
        key: 'missing_stock',
        description: 'Nincs raktáron a kért mennyiség.',
        color: '#ef4444', // Red
        requiresDate: false
    },
    {
        name: 'Baks',
        key: 'baks',
        description: 'Bakshoz kapcsolódó speciális feladat.',
        color: '#10b981', // Emerald/Green
        requiresDate: false
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        for (const type of defaultTaskTypes) {
            const existing = await TaskType.findOne({ key: type.key });
            if (!existing) {
                await TaskType.create(type);
                console.log(`Created task type: ${type.name}`);
            } else {
                console.log(`Task type already exists: ${type.name}`);
                // Optional: Update existing if needed
                // existing.requiresDate = type.requiresDate;
                // await existing.save();
            }
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding task types:', error);
        process.exit(1);
    }
}

seed();
