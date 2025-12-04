import { warehousesAPI, productsAPI } from './api.js';
import { state, setWarehouses, setLoading, addToTransferCart, removeFromTransferCart, clearTransferCart } from './state.js';
import { showToast, showModal, closeModal, createWarehouseCard } from './ui-components.js';

let allProducts = [];
let allWarehouses = [];

// Initialize warehouses view
export async function initWarehouses() {
    await loadWarehouses();

    const addBtn = document.getElementById('add-warehouse-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddWarehouseModal);
    }

    // Transfer cart form
    const transferForm = document.getElementById('add-transfer-item-form');
    if (transferForm) {
        transferForm.addEventListener('submit', handleAddToTransferCart);
    }

    // Product search
    const searchInput = document.getElementById('transfer-product-search');
    if (searchInput) {
        searchInput.addEventListener('change', handleTransferProductSelect);
        searchInput.addEventListener('input', (e) => {
            if (!e.target.value) {
                document.getElementById('transfer-product-id').value = '';
            }
        });
    }

    // Execute transfer button
    const executeBtn = document.getElementById('execute-transfer-btn');
    if (executeBtn) {
        executeBtn.addEventListener('click', handleExecuteTransfer);
    }

    // Listen for cart changes
    window.addEventListener('transfercartchange', () => {
        renderTransferCart();
    });

    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'warehouses') {
            await loadWarehouses();
            await populateTransferForm();
            renderTransferCart();
        }
    });
}

async function loadWarehouses() {
    try {
        setLoading(true);
        const warehouses = await warehousesAPI.getAll();
        setWarehouses(warehouses);
        allWarehouses = warehouses;

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
        const products = await productsAPI.getAll();
        allProducts = products;

        // Populate products datalist
        const datalist = document.getElementById('transfer-product-list');
        if (datalist) {
            datalist.innerHTML = '';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = `${product.name} (Készlet: ${product.quantity} db)`;
                option.dataset.id = product._id;
                datalist.appendChild(option);
            });
        }

        // Populate warehouses
        const fromSelect = document.getElementById('transfer-from');
        const toSelect = document.getElementById('transfer-to');

        if (fromSelect && toSelect) {
            const warehouseOptions = allWarehouses.map(w =>
                `<option value="${w._id}">${w.name}${w.location ? ' - ' + w.location : ''}</option>`
            ).join('');

            fromSelect.innerHTML = '<option value="">Válasszon raktárat...</option>' + warehouseOptions;
            toSelect.innerHTML = '<option value="">Válasszon raktárat...</option>' + warehouseOptions;
        }
    } catch (error) {
        console.error('Error populating transfer form:', error);
    }
}

function handleTransferProductSelect(e) {
    const inputValue = e.target.value;
    const hiddenIdInput = document.getElementById('transfer-product-id');

    const product = allProducts.find(p => {
        const displayValue = `${p.name} (Készlet: ${p.quantity} db)`;
        return displayValue === inputValue;
    });

    if (product) {
        hiddenIdInput.value = product._id;
    } else {
        hiddenIdInput.value = '';
    }
}

function handleAddToTransferCart(e) {
    e.preventDefault();

    const productId = document.getElementById('transfer-product-id').value;
    const quantity = parseInt(document.getElementById('transfer-item-quantity').value);

    if (!productId) {
        showToast('Válasszon ki egy érvényes terméket!', 'error');
        return;
    }

    const product = allProducts.find(p => p._id === productId);
    if (!product) {
        showToast('Termék nem található!', 'error');
        return;
    }

    addToTransferCart({
        productId: product._id,
        productName: product.name,
        quantity,
        availableQuantity: product.quantity
    });

    showToast('Termék hozzáadva a listához!', 'success');

    // Reset form
    e.target.reset();
    document.getElementById('transfer-product-id').value = '';
}

function renderTransferCart() {
    const container = document.getElementById('transfer-cart');
    const executionSection = document.getElementById('transfer-execution');

    if (!container) return;

    if (state.transferCart.length === 0) {
        container.innerHTML = '<p class="empty-state">A mozgatási lista üres</p>';
        if (executionSection) executionSection.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    state.transferCart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.productName}</h4>
                <p>${item.quantity} db</p>
            </div>
            <button class="btn btn-danger" data-index="${index}" style="padding: 0.5rem 1rem;">🗑️</button>
        `;

        const deleteBtn = cartItem.querySelector('button');
        deleteBtn.addEventListener('click', () => {
            removeFromTransferCart(index);
        });

        container.appendChild(cartItem);
    });

    // Show execution section
    if (executionSection) executionSection.style.display = 'block';
}

async function handleExecuteTransfer() {
    if (state.transferCart.length === 0) {
        showToast('A mozgatási lista üres!', 'error');
        return;
    }

    const fromWarehouseId = document.getElementById('transfer-from').value;
    const toWarehouseId = document.getElementById('transfer-to').value;

    if (!fromWarehouseId || !toWarehouseId) {
        showToast('Válassza ki a forrás és cél raktárat!', 'error');
        return;
    }

    if (fromWarehouseId === toWarehouseId) {
        showToast('A forrás és cél raktár nem lehet ugyanaz!', 'error');
        return;
    }

    try {
        setLoading(true);

        // Execute transfer for each item
        for (const item of state.transferCart) {
            await warehousesAPI.transfer({
                productId: item.productId,
                quantity: item.quantity,
                fromWarehouseId,
                toWarehouseId
            });
        }

        showToast(`${state.transferCart.length} termék sikeresen átmozgatva! ✅`, 'success');

        // Clear cart
        clearTransferCart();

        // Reset selects
        document.getElementById('transfer-from').value = '';
        document.getElementById('transfer-to').value = '';

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

        // Add click handler to show inventory details
        card.addEventListener('click', () => {
            showWarehouseInventory(warehouse, inventory);
        });

        container.appendChild(card);
    });
}

function showWarehouseInventory(warehouse, inventory) {
    let content = `
        <div style="margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 0.5rem;">📍 ${warehouse.location || 'Helyszín nincs megadva'}</h4>
        </div>
    `;

    if (!inventory || !inventory.products || inventory.products.length === 0) {
        content += '<p class="empty-state">Ebben a raktárban nincsenek termékek.</p>';
    } else {
        content += `
            <div style="margin-bottom: 1rem;">
                <p><strong>Termékfajták:</strong> ${inventory.productCount}</p>
                <p><strong>Összes darab:</strong> ${inventory.totalItems} db</p>
                <p><strong>Összes érték:</strong> ${formatCurrency(inventory.totalValue)}</p>
            </div>
            <table style="width: 100%; font-size: 0.875rem; margin-top: 1rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--color-border);">
                        <th style="padding: 0.75rem; text-align: left;">Termék</th>
                        <th style="padding: 0.75rem; text-align: right;">Mennyiség</th>
                        <th style="padding: 0.75rem; text-align: right;">Ár</th>
                        <th style="padding: 0.75rem; text-align: right;">Érték</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventory.products.map(p => `
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <td style="padding: 0.75rem;">
                                <strong>${p.name}</strong>
                                ${p.barcode ? `<br><span style="color: var(--color-text-secondary); font-size: 0.75rem;">${p.barcode}</span>` : ''}
                            </td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${p.quantity} db</td>
                            <td style="padding: 0.75rem; text-align: right;">${formatCurrency(p.purchasePrice)}</td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: var(--color-success);">${formatCurrency(p.quantity * p.purchasePrice)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showModal(`🏭 ${warehouse.name} - Készlet`, content);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
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
