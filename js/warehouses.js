import { warehousesAPI, productsAPI } from './api.js';
import { setWarehouses, setLoading } from './state.js';
import { showToast, showModal, closeModal, createWarehouseCard } from './ui-components.js';

// Initialize warehouses view
export async function initWarehouses() {
    await loadWarehouses();

    const addBtn = document.getElementById('add-warehouse-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddWarehouseModal);
    }

    // Transfer form
    const transferForm = document.getElementById('warehouse-transfer-form');
    if (transferForm) {
        transferForm.addEventListener('submit', handleWarehouseTransfer);
    }

    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'warehouses') {
            await loadWarehouses();
            await populateTransferForm();
        }
    });
}

async function loadWarehouses() {
    try {
        setLoading(true);
        const warehouses = await warehousesAPI.getAll();
        setWarehouses(warehouses);

        // Load inventory for each warehouse
        const warehousesWithInventory = await Promise.all(
            warehouses.map(async (warehouse) => {
                try {
                    const inventory = await warehousesAPI.getInventory(warehouse._id);
                    return { warehouse, inventory };
                } catch (error) {
                    return { warehouse, inventory: null };
                }
            })
        );

        renderWarehouses(warehousesWithInventory);
    } catch (error) {
        showToast('Hiba a raktárak betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function populateTransferForm() {
    try {
        const [products, warehouses] = await Promise.all([
            productsAPI.getAll(),
            warehousesAPI.getAll()
        ]);

        // Populate products
        const productSelect = document.getElementById('transfer-product');
        if (productSelect) {
            productSelect.innerHTML = '<option value="">Válasszon terméket...</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product._id;
                option.textContent = `${product.name} (Készlet: ${product.quantity} db)`;
                productSelect.appendChild(option);
            });
        }

        // Populate warehouses
        const fromSelect = document.getElementById('transfer-from');
        const toSelect = document.getElementById('transfer-to');

        if (fromSelect && toSelect) {
            const warehouseOptions = warehouses.map(w =>
                `<option value="${w._id}">${w.name}${w.location ? ' - ' + w.location : ''}</option>`
            ).join('');

            fromSelect.innerHTML = '<option value="">Válasszon raktárat...</option>' + warehouseOptions;
            toSelect.innerHTML = '<option value="">Válasszon raktárat...</option>' + warehouseOptions;
        }
    } catch (error) {
        console.error('Error populating transfer form:', error);
    }
}

async function handleWarehouseTransfer(e) {
    e.preventDefault();

    const productId = document.getElementById('transfer-product').value;
    const quantity = parseInt(document.getElementById('transfer-quantity').value);
    const fromWarehouseId = document.getElementById('transfer-from').value;
    const toWarehouseId = document.getElementById('transfer-to').value;

    if (fromWarehouseId === toWarehouseId) {
        showToast('A forrás és cél raktár nem lehet ugyanaz!', 'error');
        return;
    }

    try {
        setLoading(true);
        await warehousesAPI.transfer({
            productId,
            quantity,
            fromWarehouseId,
            toWarehouseId
        });

        showToast('Termék sikeresen átmozgatva! ✅', 'success');

        // Reset form
        e.target.reset();

        // Reload warehouses
        await loadWarehouses();
        await populateTransferForm();
    } catch (error) {
        showToast('Hiba a mozgatás során: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderWarehouses(warehousesData) {
    const container = document.getElementById('warehouses-list');
    if (!container) return;

    if (warehousesData.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincsenek raktárak. Adjon hozzá új raktárt!</p>';
        return;
    }

    container.innerHTML = '';
    warehousesData.forEach(({ warehouse, inventory }) => {
        const card = createWarehouseCard(warehouse, inventory);
        container.appendChild(card);
    });
}

function showAddWarehouseModal() {
    const content = `
        <form id="add-warehouse-form">
            <div class="form-group">
                <label for="warehouse-name">Raktár neve *</label>
                <input type="text" id="warehouse-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="warehouse-location">Helyszín</label>
                <input type="text" id="warehouse-location" class="form-control" placeholder="Pl. Budapest, 1. emelet">
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="document.getElementById('modal-container').innerHTML=''">Mégse</button>
                <button type="submit" class="btn btn-primary" style="flex: 1;">Hozzáadás</button>
            </div>
        </form>
    `;

    showModal('Új raktár hozzáadása', content);

    const form = document.getElementById('add-warehouse-form');
    form.addEventListener('submit', handleAddWarehouse);
}

async function handleAddWarehouse(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('warehouse-name').value,
        location: document.getElementById('warehouse-location').value
    };

    try {
        setLoading(true);
        await warehousesAPI.create(data);
        showToast('Raktár sikeresen hozzáadva!', 'success');
        closeModal();
        await loadWarehouses();
        await populateTransferForm();
    } catch (error) {
        showToast('Hiba a raktár hozzáadásakor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
