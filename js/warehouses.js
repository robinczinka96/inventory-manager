import { warehousesAPI } from './api.js';
import { setWarehouses, setLoading } from './state.js';
import { showToast, showModal, closeModal, createWarehouseCard } from './ui-components.js';

// Initialize warehouses view
export async function initWarehouses() {
    await loadWarehouses();

    const addBtn = document.getElementById('add-warehouse-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddWarehouseModal);
    }

    window.addEventListener('viewchange', (e) => {
        if (e.detail.view === 'warehouses') {
            loadWarehouses();
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
    } catch (error) {
        showToast('Hiba a raktár hozzáadásakor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
