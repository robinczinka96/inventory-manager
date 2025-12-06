import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('warehouseId', 'name').sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
});

// GET single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('warehouseId', 'name');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
});

// Search products by name or barcode
router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const products = await Product.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { barcode: { $regex: query, $options: 'i' } }
            ]
        }).populate('warehouseId', 'name').limit(20);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error searching products', error: error.message });
    }
});

// CREATE new product
router.post('/', async (req, res) => {
    try {
        const product = new Product(req.body);
        const savedProduct = await product.save();
        const populatedProduct = await Product.findById(savedProduct._id).populate('warehouseId', 'name');
        res.status(201).json(populatedProduct);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error: error.message });
    }
});

// UPDATE product
router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('warehouseId', 'name');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error updating product', error: error.message });
    }
});

// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully', product });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
});

// BULK IMPORT products
router.post('/bulk-import', async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ message: 'Invalid products data' });
        }

        const results = {
            created: 0,
            updated: 0,
            errors: []
        };

        for (const productData of products) {
            try {
                // Try to find existing product by name
                const existingProduct = await Product.findOne({ name: productData.name });

                if (existingProduct) {
                    // Update existing product
                    existingProduct.barcode = productData.barcode;
                    existingProduct.quantity = productData.quantity;
                    existingProduct.purchasePrice = productData.purchasePrice;
                    existingProduct.salePrice = productData.salePrice;
                    if (productData.warehouseId) {
                        existingProduct.warehouseId = productData.warehouseId;
                    }

                    await existingProduct.save();
                    results.updated++;
                } else {
                    // Create new product
                    const newProduct = new Product({
                        name: productData.name,
                        barcode: productData.barcode,
                        quantity: productData.quantity || 0,
                        purchasePrice: productData.purchasePrice || 0,
                        salePrice: productData.salePrice || 0,
                        warehouseId: productData.warehouseId || null
                    });

                    await newProduct.save();
                    results.created++;
                }
            } catch (error) {
                results.errors.push(`${productData.name}: ${error.message}`);
            }
        }

        res.json({
            message: 'Bulk import completed',
            results
        });
    } catch (error) {
        res.status(500).json({ message: 'Error during bulk import', error: error.message });
    }
});

export default router;
