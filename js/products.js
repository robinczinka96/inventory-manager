import { productsAPI, warehousesAPI } from './api.js';
import { setProducts, state, setLoading } from './state.js';
import { showToast, showModal, closeModal, createProductCard, debounce, populateWarehouseSelect } from './ui-components.js';

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
