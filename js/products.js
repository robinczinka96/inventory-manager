import { productsAPI, warehousesAPI, fetchAPI } from './api.js';
import { setProducts, state, setLoading } from './state.js';
import { showToast, showModal, closeModal, debounce, populateWarehouseSelect } from './ui-components.js';

let allProducts = [];

// Initialize products view
export async function initProducts() {
    await loadProducts();

    // Search functionality
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Add product button
    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddProductModal);
    }



    // Sync button
    const syncBtn = document.getElementById('sync-products-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleSync);
    }

    // Listen for view changes
    window.addEventListener('viewchange', (e) => {
        if (e.detail.view === 'products') {
            loadProducts();
        }
    });
}

async function loadProducts() {
    try {
        setLoading(true);
        const products = await productsAPI.getAll();
        allProducts = products;
        setProducts(products);
        renderProducts(products);
    } catch (error) {
        showToast('Hiba a termékek betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderProducts(products) {
    const container = document.getElementById('products-list');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincsenek termékek. Adjon hozzá új terméket!</p>';
        return;
    }

    container.innerHTML = '';
    products.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
        renderProducts(allProducts);
        return;
    }

    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
    );

    renderProducts(filtered);
}

async function showAddProductModal() {
    try {
        const warehouses = await warehousesAPI.getAll();

        const content = `
            <form id="add-product-form">
                <div class="form-group">
                    <label for="product-name">Termék neve *</label>
                    <input type="text" id="product-name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="product-barcode">Vonalkód (opcionális)</label>
                    <input type="text" id="product-barcode" class="form-control" placeholder="Opcionális">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="product-quantity">Kezdő mennyiség *</label>
                        <input type="number" id="product-quantity" class="form-control" min="0" value="0" required>
                    </div>
                    <div class="form-group">
                        <label for="product-price">Beszerzési ár *</label>
                        <input type="number" id="product-price" class="form-control" min="0" step="0.01" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="product-warehouse">Raktár *</label>
                    <select id="product-warehouse" class="form-control" required></select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="document.getElementById('modal-container').innerHTML=''">Mégse</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Hozzáadás</button>
                </div>
            </form>
        `;

        showModal('Új termék hozzáadása', content);

        // Populate warehouse select
        const warehouseSelect = document.getElementById('product-warehouse');
        populateWarehouseSelect(warehouseSelect, warehouses);

        // Handle form submit
        const form = document.getElementById('add-product-form');
        form.addEventListener('submit', handleAddProduct);
    } catch (error) {
        showToast('Hiba a modal megnyitásakor: ' + error.message, 'error');
    }
}

async function handleAddProduct(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('product-name').value,
        barcode: document.getElementById('product-barcode').value,
        quantity: parseInt(document.getElementById('product-quantity').value),
        purchasePrice: parseFloat(document.getElementById('product-price').value),
        warehouseId: document.getElementById('product-warehouse').value
    };

    try {
        setLoading(true);
        await productsAPI.create(data);
        showToast('Termék sikeresen hozzáadva!', 'success');
        closeModal();
        await loadProducts();
    } catch (error) {
        showToast('Hiba a termék hozzáadásakor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Batches API
const batchesAPI = {
    getByProduct: (id) => fetchAPI(`/batches/product/${id}`)
};

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card product-card';
    card.dataset.id = product._id;

    // Add click event listener to show details
    card.addEventListener('click', (e) => {
        // Prevent opening modal if clicking on buttons
        if (e.target.closest('button')) return;
        showBatchDetails(product);
    });

    const lowStockClass = product.quantity < 5 ? 'low-stock' : '';

    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${product.name}</h3>
            <span class="stock-badge ${lowStockClass}">${product.quantity} db</span>
        </div>
        <div class="product-details">
            <p><strong>Vonalkód:</strong> ${product.barcode || '-'}</p>
            <p><strong>Beszerzési ár:</strong> ${formatCurrency(product.purchasePrice)}</p>
            <p><strong>Eladási ár:</strong> ${formatCurrency(product.salePrice)}</p>
            <p><strong>Raktár:</strong> ${product.warehouseId?.name || 'Nincs megadva'}</p>
        </div>

    `;

    return card;
}

// Show Batch Details Modal
async function showBatchDetails(product) {
    // Generate initial content with loading state
    const content = `
        <div class="batch-summary card" style="margin: 1rem 0; background: var(--color-bg-tertiary);">
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-label">Össz készlet</span>
                    <span class="stat-value">${product.quantity} db</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Átlagár (Súlyozott)</span>
                    <span class="stat-value">${formatCurrency(product.purchasePrice)}</span>
                </div>
            </div>
        </div>

        <h3>Készlet Batchek (Beszerzési árak szerint)</h3>
        <div class="table-responsive">
            <table class="table" id="batch-details-table">
                <thead>
                    <tr>
                        <th>Dátum</th>
                        <th>Mennyiség</th>
                        <th>Beszerzési Ár</th>
                        <th>Raktár</th>
                        <th>Forrás</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="5" style="text-align: center;">Betöltés...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    // Show modal using shared component
    showModal(`Termék Részletek: ${product.name}`, content);

    try {
        const batches = await batchesAPI.getByProduct(product._id);
        const tbody = document.querySelector('#batch-details-table tbody');

        if (!tbody) return; // Modal might have been closed

        if (batches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nincs részletes készletinformáció (régi készlet)</td></tr>';
            return;
        }

        tbody.innerHTML = batches.map(batch => `
            <tr>
                <td>${new Date(batch.purchasedAt).toLocaleDateString('hu-HU')}</td>
                <td style="font-weight: bold;">${batch.remainingQuantity} db</td>
                <td>${formatCurrency(batch.unitCost)}</td>
                <td>${batch.warehouseId?.name || '-'}</td>
                <td><span class="badge badge-secondary">${batch.source || 'manual'}</span></td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error fetching batches:', error);
        const tbody = document.querySelector('#batch-details-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Hiba az adatok betöltésekor</td></tr>';
        }
    }
}

// Sync Function
async function handleSync() {
    if (!confirm('Biztosan szinkronizálni szeretné az adatokat a Google Sheet-tel? Ez felülírhatja a helyi változtatásokat.')) {
        return;
    }

    try {
        setLoading(true);
        showToast('Szinkronizálás folyamatban... ⏳', 'info');

        const response = await fetchAPI('/sync', {
            method: 'POST'
        });

        let message = `Szinkronizálás kész! Importálva: ${response.results.imported}, Frissítve: ${response.results.updated}.`;
        if (response.results.errors.length > 0) {
            message += ` Hibák: ${response.results.errors.length}`;
        }

        showToast(message, response.results.errors.length > 0 ? 'warning' : 'success');

        await loadProducts();
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Hiba a szinkronizálás során: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
// Helper to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}
