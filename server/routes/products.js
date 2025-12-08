import express from 'express';
import Product from '../models/Product.js';
import InventoryBatch from '../models/InventoryBatch.js';

const router = express.Router();

// GET all products with weighted average cost
router.get('/', async (req, res) => {
    try {
        // 1. Fetch all products
        const products = await Product.find().populate('warehouseId', 'name').sort({ createdAt: -1 }).lean();

        // 2. Fetch all active batches
        const batches = await InventoryBatch.find({ remainingQuantity: { $gt: 0 } })
            .select('productId remainingQuantity unitCost')
            .lean();

        // 3. Fetch all open stock
        const openStocks = await import('../models/OpenStock.js').then(m => m.default.find({ remainingDrops: { $gt: 0 } }).lean());

        // 4. Calculate weighted average and open stock for each product
        const batchMap = {};
        batches.forEach(b => {
            const pId = b.productId.toString();
            if (!batchMap[pId]) batchMap[pId] = { qty: 0, val: 0 };
            batchMap[pId].qty += b.remainingQuantity;
            batchMap[pId].val += (b.remainingQuantity * b.unitCost);
        });

        const openStockMap = {};
        openStocks.forEach(os => {
            const pId = os.productId.toString();
            if (!openStockMap[pId]) openStockMap[pId] = 0;
            openStockMap[pId] += os.remainingDrops;
        });

        // 5. Merge data
        const productsWithAvg = products.map(p => {
            const pId = p._id.toString();
            const batchData = batchMap[pId];
            const openDrops = openStockMap[pId] || 0;

            let productData = { ...p };

            if (batchData && batchData.qty > 0) {
                // Calculate weighted average
                const avgCost = batchData.val / batchData.qty;
                // Only override if avgCost is meaningful (greater than 0), otherwise fallback to product price
                if (avgCost > 0) {
                    productData.purchasePrice = avgCost;
                }
            }

            if (openDrops > 0) {
                productData.openStock = {
                    drops: openDrops,
                    ml: parseFloat((openDrops / (p.dropsPerMl || 20)).toFixed(1))
                };
            }

            return productData;
        });

        res.json(productsWithAvg);
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

        // Create initial batch if quantity > 0
        if (savedProduct.quantity > 0) {
            await InventoryBatch.create({
                productId: savedProduct._id,
                warehouseId: savedProduct.warehouseId,
                remainingQuantity: savedProduct.quantity,
                originalQuantity: savedProduct.quantity,
                unitCost: savedProduct.purchasePrice,
                purchasedAt: new Date(),
                source: 'manual'
            });
        }

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
                    // Note: We don't create batches for updates to avoid messing up FIFO
                    // unless we implement a complex stock adjustment logic.
                    // For now, we just update the product record.
                    existingProduct.barcode = productData.barcode;
                    existingProduct.quantity = productData.quantity; // This might cause sync issues with batches if changed drastically
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

                    const savedProduct = await newProduct.save();

                    // Create initial batch if quantity > 0
                    if (savedProduct.quantity > 0) {
                        await InventoryBatch.create({
                            productId: savedProduct._id,
                            warehouseId: savedProduct.warehouseId,
                            remainingQuantity: savedProduct.quantity,
                            originalQuantity: savedProduct.quantity,
                            unitCost: savedProduct.purchasePrice,
                            purchasedAt: new Date(),
                            source: 'batch-import'
                        });
                    }

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
