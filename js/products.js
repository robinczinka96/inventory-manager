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

    // Export button
    const exportBtn = document.getElementById('export-products-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportProductsToExcel);
    }

    // Import button
    const importBtn = document.getElementById('import-products-btn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            document.getElementById('excel-file-input').click();
        });
    }

    // File input change event
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleExcelImport);
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

    // Create table HTML
    let tableHTML = `
        <div style="overflow-x: auto;">
            <table class="products-table">
                <thead>
                    <tr>
                        <th>Név</th>
                        <th>Vonalkód</th>
                        <th>Mennyiség</th>
                        <th>Beszerzési ár</th>
                        <th>Eladási ár</th>
                        <th>Raktár</th>
                    </tr>
                </thead>
                <tbody>
    `;

    products.forEach(product => {
        tableHTML += `
            <tr>
                <td><strong>${product.name}</strong></td>
                <td>${product.barcode || '-'}</td>
                <td style="text-align: right; font-weight: 600;">${product.quantity} db</td>
                <td style="text-align: right;">${formatCurrency(product.purchasePrice)}</td>
                <td style="text-align: right; color: var(--color-success);">${formatCurrency(product.salePrice)}</td>
                <td>${product.warehouseId?.name || 'N/A'}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHTML;
}

// Helper function for currency formatting
function formatCurrency(amount) {
    return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
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

// Excel Export Function
function exportProductsToExcel() {
    try {
        if (!allProducts || allProducts.length === 0) {
            showToast('Nincsenek exportálható termékek!', 'error');
            return;
        }

        // Prepare data for export (only user-friendly fields)
        const exportData = allProducts.map(p => ({
            'Név': p.name,
            'Vonalkód': p.barcode || '',
            'Mennyiség': p.quantity,
            'Beszerzési ár': p.purchasePrice,
            'Eladási ár': p.salePrice,
            'Raktár név': p.warehouseId?.name || ''
        }));

        console.log('Export columns:', Object.keys(exportData[0])); // Debug

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        ws['!cols'] = [
            { wch: 30 }, // Név
            { wch: 15 }, // Vonalkód
            { wch: 12 }, // Mennyiség
            { wch: 15 }, // Beszerzési ár
            { wch: 15 }, // Eladási ár
            { wch: 20 }  // Raktár név
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Termékek');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `termekek_${timestamp}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
        showToast(`${allProducts.length} termék sikeresen exportálva!`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Hiba az export során: ' + error.message, 'error');
    }
}

// Excel Import Function
async function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        setLoading(true);

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
            showToast('Az Excel fájl üres!', 'error');
            return;
        }

        // Get all warehouses for matching
        const warehouses = await warehousesAPI.getAll();

        // Transform data back to API format
        const productsToImport = jsonData.map(row => {
            // Find warehouse by name
            const warehouse = warehouses.find(w => w.name === row['Raktár név']);

            return {
                name: row['Név'],
                barcode: row['Vonalkód'] || undefined,
                quantity: parseInt(row['Mennyiség']) || 0,
                purchasePrice: parseFloat(row['Beszerzési ár']) || 0,
                salePrice: parseFloat(row['Eladási ár']) || 0,
                warehouseId: warehouse?._id || undefined
            };
        });

        // Validate required fields
        const invalidProducts = productsToImport.filter(p => !p.name);
        if (invalidProducts.length > 0) {
            showToast(`${invalidProducts.length} termék neve hiányzik!`, 'error');
            return;
        }

        // Send to backend
        const result = await productsAPI.bulkImport(productsToImport);

        let message = `Import befejezve! `;
        if (result.results.created > 0) message += `Létrehozva: ${result.results.created}. `;
        if (result.results.updated > 0) message += `Frissítve: ${result.results.updated}. `;
        if (result.results.errors.length > 0) message += `Hibák: ${result.results.errors.length}.`;

        showToast(message, result.results.errors.length > 0 ? 'warning' : 'success');

        // Show errors if any
        if (result.results.errors.length > 0) {
            console.error('Import errors:', result.results.errors);
        }

        // Reset file input
        e.target.value = '';

        // Reload products
        await loadProducts();

    } catch (error) {
        console.error('Import error:', error);
        showToast('Hiba az import során: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
