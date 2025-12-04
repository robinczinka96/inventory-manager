import { connectDB } from './_utils/db.js';
import Product from './_models/Product.js';

export default async function handler(req, res) {
    await connectDB();

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            if (req.query.id) {
                // Get single product
                const product = await Product.findById(req.query.id).populate('warehouseId', 'name');
                if (!product) {
                    return res.status(404).json({ message: 'Product not found' });
                }
                return res.json(product);
            } else if (req.query.search) {
                // Search products
                const query = req.query.search;
                const products = await Product.find({
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { barcode: { $regex: query, $options: 'i' } }
                    ]
                }).populate('warehouseId', 'name').limit(20);
                return res.json(products);
            } else {
                // Get all products
                const products = await Product.find().populate('warehouseId', 'name').sort({ createdAt: -1 });
                return res.json(products);
            }
        }

        if (req.method === 'POST') {
            const product = new Product(req.body);
            const savedProduct = await product.save();
            const populatedProduct = await Product.findById(savedProduct._id).populate('warehouseId', 'name');
            return res.status(201).json(populatedProduct);
        }

        if (req.method === 'PUT' && req.query.id) {
            const product = await Product.findByIdAndUpdate(
                req.query.id,
                req.body,
                { new: true, runValidators: true }
            ).populate('warehouseId', 'name');
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            return res.json(product);
        }

        if (req.method === 'DELETE' && req.query.id) {
            const product = await Product.findByIdAndDelete(req.query.id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            return res.json({ message: 'Product deleted successfully', product });
        }

        res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
