// const fetch = require('node-fetch'); // Using native fetch in Node 20+

const API_URL = 'http://localhost:3000/api';

const products = [
    {
        name: "Coca Cola 0.5L",
        barcode: "5449000000996",
        quantity: 50,
        purchasePrice: 250,
        price: 450,
        category: "Üdítő",
        minStock: 10,
        unit: "db"
    },
    {
        name: "Tej 2.8% 1L",
        barcode: "5991234567890",
        quantity: 20,
        purchasePrice: 300,
        price: 490,
        category: "Tejtermék",
        minStock: 5,
        unit: "db"
    },
    {
        name: "Snickers Szelet",
        barcode: "5000159461122",
        quantity: 100,
        purchasePrice: 150,
        price: 290,
        category: "Édesség",
        minStock: 20,
        unit: "db"
    },
    {
        name: "Kenyér (Fehér) 1kg",
        barcode: "5999887766554",
        quantity: 10,
        purchasePrice: 400,
        price: 800,
        category: "Pékáru",
        minStock: 2,
        unit: "kg"
    },
    {
        name: "Ásványvíz Mentes 1.5L",
        barcode: "5998888777766",
        quantity: 60,
        purchasePrice: 80,
        price: 180,
        category: "Víz",
        minStock: 12,
        unit: "db"
    }
];

const customers = [
    {
        name: "Teszt Elek",
        email: "teszt.elek@example.com",
        phone: "+36301234567",
        group: "VIP"
    },
    {
        name: "Minta Mária",
        email: "minta.maria@example.com",
        phone: "+36209876543",
        group: "Törzsvásárló"
    },
    {
        name: "Kovács János",
        email: "kovacs.janos@example.com",
        phone: "+36705555555",
        group: "Új"
    }
];

async function seed() {
    console.log('Seeding data to ' + API_URL + '...');

    // 1. Get or Create Warehouse
    let warehouseId;
    try {
        const whRes = await fetch(`${API_URL}/warehouses`);
        const warehouses = await whRes.json();

        if (warehouses.length > 0) {
            warehouseId = warehouses[0]._id;
            console.log(`Using existing warehouse: ${warehouses[0].name}`);
        } else {
            console.log('No warehouse found. Creating one...');
            const newWhRes = await fetch(`${API_URL}/warehouses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: "Teszt Raktár", location: "Budapest" })
            });
            const newWh = await newWhRes.json();
            warehouseId = newWh._id;
            console.log(`✅ Created warehouse: ${newWh.name}`);
        }
    } catch (err) {
        console.error("❌ Error getting warehouse:", err.message);
        return;
    }

    // 2. Create Customers
    console.log('Seeding Customers...');
    for (const c of customers) {
        try {
            // Check existence (simple check by name if API allows, or just try create)
            // The API might not have a search by name for customers, so we just try POST.
            // If it fails due to duplicate, we catch it.
            // Actually, let's fetch all customers to check.
            const custRes = await fetch(`${API_URL}/customers`);
            const existingCustomers = await custRes.json();
            const exists = existingCustomers.find(ec => ec.name === c.name);

            if (exists) {
                console.log(`Customer ${c.name} already exists. Skipping.`);
                continue;
            }

            const res = await fetch(`${API_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(c)
            });

            if (res.ok) {
                console.log(`✅ Created Customer: ${c.name}`);
            } else {
                const data = await res.json();
                console.error(`❌ Failed Customer: ${c.name}`, data);
            }
        } catch (err) {
            console.error(`❌ Error creating customer ${c.name}:`, err.message);
        }
    }

    // 3. Create Products
    console.log('Seeding Products...');
    for (const p of products) {
        try {
            // Include warehouseId
            const productData = { ...p, warehouseId };

            // Check if exists
            const searchRes = await fetch(`${API_URL}/products/search/${encodeURIComponent(p.barcode)}`);
            const searchData = await searchRes.json();

            if (searchData && searchData.length > 0) {
                console.log(`Product ${p.name} already exists. Skipping.`);
                continue;
            }

            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (res.ok) {
                console.log(`✅ Created Product: ${p.name}`);
            } else {
                const data = await res.json();
                console.error(`❌ Failed Product: ${p.name}`, data);
            }
        } catch (err) {
            console.error(`❌ Error creating product ${p.name}:`, err.message);
        }
    }
    console.log('🎉 Seeding complete.');
}

seed();
