import { customersAPI, productsAPI, transactionsAPI, pendingSalesAPI } from './api.js';
import { showModal, closeModal, showToast, getIcon, formatCurrency } from './ui-components.js';
import { setLoading } from './state.js';

let quickSaleCart = [];
let allProducts = [];
let allCustomers = [];
let selectedCustomer = null;
let currentPhase = 'customer-selection'; // 'customer-selection' or 'sales-interface'

export function initQuickSale() {
    console.log('Initializing Quick Sale FAB...');
    const fab = document.getElementById('quick-sale-fab');
    if (fab) {
        console.log('FAB element found, attaching listener');
        fab.addEventListener('click', (e) => {
            console.log('FAB clicked');
            e.preventDefault();
            openQuickSaleModal();
        });
    } else {
        console.error('Quick Sale FAB element NOT found in DOM');
    }
}

async function openQuickSaleModal() {
    try {
        setLoading(true);
        // Load data fresh
        [allProducts, allCustomers] = await Promise.all([
            productsAPI.getAll(),
            customersAPI.getAll()
        ]);

        quickSaleCart = [];
        selectedCustomer = null;
        currentPhase = 'customer-selection';

        renderModal();

    } catch (error) {
        showToast('Hiba az adatok betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderModal() {
    if (currentPhase === 'customer-selection') {
        renderCustomerSelectionPhase();
    } else {
        renderSalesPhase();
    }
}

// ==========================================
// PHASE 1: Customer Selection
// ==========================================

function renderCustomerSelectionPhase() {
    const content = `
        <div class="qs-phase-container">
            <div class="qs-header-actions">
                <div class="search-bar-wrapper" style="flex: 1;">
                    <input type="text" id="qs-customer-search" class="form-control" placeholder="Vevő keresése..." autofocus>
                </div>
                <button id="qs-new-customer-btn" class="btn btn-primary">
                    ${getIcon('user-plus')} Új Vevő
                </button>
            </div>

            <div id="qs-customer-list" class="qs-customer-grid">
                <!-- Customer cards will be injected here -->
            </div>
        </div>
    `;

    showModal('Vevő Kiválasztása', content);

    // Initial Render of List
    renderCustomerList(allCustomers);

    // Event Listeners
    document.getElementById('qs-customer-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCustomers.filter(c => c.name.toLowerCase().includes(term));
        renderCustomerList(filtered);
    });

    document.getElementById('qs-new-customer-btn').addEventListener('click', openNewCustomerSubModal);
}

function renderCustomerList(customers) {
    const container = document.getElementById('qs-customer-list');
    if (!container) return;

    if (customers.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs találat.</p>';
        return;
    }

    container.innerHTML = customers.map(c => `
        <div class="qs-customer-card" onclick="window.selectQsCustomer('${c._id}')">
            <div class="qs-customer-avatar">
                ${getIcon('user')}
            </div>
            <div class="qs-customer-info">
                <div class="qs-customer-name">${c.name}</div>
                <div class="qs-customer-group">${c.group || 'Egyéb'}</div>
            </div>
            <div class="qs-customer-arrow">
                ${getIcon('chevron-right')}
            </div>
        </div>
    `).join('');

    // Expose selection function
    window.selectQsCustomer = (id) => {
        const customer = allCustomers.find(c => c._id === id);
        if (customer) {
            selectedCustomer = customer;
            currentPhase = 'sales-interface';
            renderModal(); // Re-render to switch phase
        }
    };
}

function openNewCustomerSubModal() {
    // We'll use a simple prompt-like overlay or replace the content temporarily
    // For simplicity and speed, let's replace the modal content temporarily
    const content = `
        <div class="qs-new-customer-form">
            <div class="form-group">
                <label>Név</label>
                <input type="text" id="qs-new-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Csoport</label>
                <input type="text" id="qs-new-group" class="form-control" value="Egyéb">
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button id="qs-cancel-new" class="btn btn-secondary" style="flex: 1;">Mégse</button>
                <button id="qs-save-new" class="btn btn-primary" style="flex: 1;">Mentés</button>
            </div>
        </div>
    `;

    // Save current modal content to restore if cancelled? 
    // Easier to just re-render Phase 1.

    showModal('Új Vevő Hozzáadása', content);

    document.getElementById('qs-cancel-new').addEventListener('click', () => {
        renderModal(); // Go back to list
    });

    document.getElementById('qs-save-new').addEventListener('click', async () => {
        const name = document.getElementById('qs-new-name').value;
        const group = document.getElementById('qs-new-group').value;

        if (!name) {
            showToast('A név kötelező!', 'error');
            return;
        }

        try {
            setLoading(true);
            const newCustomer = await customersAPI.create({ name, group });
            allCustomers.push(newCustomer); // Add to local list
            showToast('Vevő létrehozva!', 'success');

            // Auto-select and move to next phase
            selectedCustomer = newCustomer;
            currentPhase = 'sales-interface';
            renderModal();

        } catch (error) {
            showToast('Hiba: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    });
}

// ==========================================
// PHASE 2: Sales Interface
// ==========================================

function renderSalesPhase() {
    const content = `
        <div class="quick-sale-grid">
            <!-- Locked Customer Header -->
            <div class="qs-locked-customer">
                <div class="qs-customer-avatar small">
                    ${getIcon('user')}
                </div>
                <div>
                    <div class="qs-customer-name">${selectedCustomer.name}</div>
                    <div class="qs-customer-group">${selectedCustomer.group || 'Egyéb'}</div>
                </div>
                <div style="margin-left: auto; color: var(--color-success);">
                    ${getIcon('lock', 'w-4 h-4')} Rögzítve
                </div>
            </div>

            <!-- Product Selection -->
            <div class="form-group">
                <label>Termék hozzáadása</label>
                <datalist id="qs-product-list">
                    ${allProducts.map(p => {
        const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
        return `<option value="${p.name}${barcodeStr}" data-id="${p._id}">`;
    }).join('')}
                </datalist>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="qs-product" class="form-control" list="qs-product-list" placeholder="Termék keresése..." style="flex: 2;">
                    <input type="number" id="qs-price" class="form-control" placeholder="Ár" style="width: 100px;">
                    <input type="number" id="qs-quantity" class="form-control" value="1" min="1" style="width: 80px;">
                    <button id="qs-add-btn" class="btn btn-secondary" style="padding: 0.5rem;">
                        ${getIcon('plus')}
                    </button>
                </div>
            </div>

            <!-- Mini Cart -->
            <div class="quick-sale-cart" id="qs-cart-container">
                <p class="empty-state" style="padding: 1rem;">A kosár üres</p>
            </div>

            <!-- Task Toggle -->
            <div class="form-group" style="margin-top: 1rem; border-top: 1px solid var(--color-border); padding-top: 1rem;">
                <div class="toggle-container">
                    <span style="font-weight: 500;">Feladatlistához adom</span>
                    <label class="toggle-wrapper">
                        <input type="checkbox" id="qs-add-to-tasks">
                        <span class="toggle-switch"></span>
                    </label>
                </div>
                
                <div id="qs-task-fields" style="display: none; margin-top: 0.5rem; padding-left: 0;">
                    <div class="form-group">
                        <label>Feladat típusa</label>
                        <select id="qs-task-type" class="form-control">
                            <option value="missing_stock">Hiányzó készlet</option>
                            <option value="later_pickup">Későbbi átvétel</option>
                            <option value="shipping">Kiszállítás</option>
                            <option value="baks">Baks</option>
                        </select>
                    </div>
                    <div class="form-group" id="qs-pickup-date-field" style="display: none;">
                        <label>Átvétel dátuma</label>
                        <input type="date" id="qs-pickup-date" class="form-control">
                    </div>
                </div>
            </div>

            <!-- Total & Actions -->
            <div class="quick-sale-total" id="qs-total">
                Összesen: 0 Ft
            </div>

            <div style="display: flex; gap: 1rem;">
                <button id="qs-back-btn" class="btn btn-secondary" style="flex: 1;">
                    ${getIcon('arrow-left')} Vissza
                </button>
                <button id="qs-submit-btn" class="btn btn-primary" style="flex: 2;" disabled>
                    Eladás Rögzítése
                </button>
            </div>
        </div>
    `;

    showModal('Eladás Rögzítése', content);

    // Attach Event Listeners
    document.getElementById('qs-add-btn').addEventListener('click', handleAddItem);
    document.getElementById('qs-submit-btn').addEventListener('click', handleSubmitSale);
    document.getElementById('qs-back-btn').addEventListener('click', () => {
        currentPhase = 'customer-selection';
        selectedCustomer = null;
        renderModal();
    });

    // Auto-fill price on product selection
    document.getElementById('qs-product').addEventListener('input', (e) => {
        const val = e.target.value;
        // Try to find product
        let product = allProducts.find(p => {
            const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
            return `${p.name}${barcodeStr}` === val;
        });

        if (!product) {
            product = allProducts.find(p => p.name === val);
        }

        if (product) {
            document.getElementById('qs-price').value = product.salePrice || '';
        }
    });

    // Task Toggle Logic
    const taskToggle = document.getElementById('qs-add-to-tasks');
    const taskFields = document.getElementById('qs-task-fields');
    const taskType = document.getElementById('qs-task-type');
    const pickupField = document.getElementById('qs-pickup-date-field');

    taskToggle.addEventListener('change', (e) => {
        taskFields.style.display = e.target.checked ? 'block' : 'none';
        const submitBtn = document.getElementById('qs-submit-btn');
        submitBtn.textContent = e.target.checked ? 'Feladat Létrehozása' : 'Eladás Rögzítése';
    });

    taskType.addEventListener('change', (e) => {
        pickupField.style.display = e.target.value === 'later_pickup' ? 'block' : 'none';
        if (e.target.value === 'later_pickup') {
            document.getElementById('qs-pickup-date').value = new Date().toISOString().split('T')[0];
        }
    });

    // Enter key support
    document.getElementById('qs-quantity').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddItem();
    });

    document.getElementById('qs-price').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddItem();
    });

    // Focus product input
    setTimeout(() => {
        const prodInput = document.getElementById('qs-product');
        if (prodInput) prodInput.focus();
    }, 100);

    // Initial Cart Render (in case we are coming back?)
    // Actually we reset cart on open, so it's empty. 
    // But if we want to persist cart when going back/forth, we should NOT reset it in openQuickSaleModal if just switching phases.
    // For now, let's keep cart persistent during the session.
    renderCart();
}

function handleAddItem() {
    const productInput = document.getElementById('qs-product');
    const quantityInput = document.getElementById('qs-quantity');
    const priceInput = document.getElementById('qs-price');

    const inputValue = productInput.value;
    const quantity = parseInt(quantityInput.value);
    const price = parseFloat(priceInput.value);

    if (!inputValue || quantity < 1) return;

    let product = allProducts.find(p => {
        const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
        return `${p.name}${barcodeStr}` === inputValue;
    });

    if (!product) {
        product = allProducts.find(p => p.name === inputValue);
    }

    if (!product) {
        showToast('Termék nem található!', 'error');
        return;
    }

    if (isNaN(price)) {
        showToast('Kérjük adjon meg egy érvényes árat!', 'error');
        return;
    }

    if (product.quantity < quantity) {
        showToast(`Nincs elegendő készlet! (${product.quantity} db)`, 'warning');
    }

    const existingItem = quickSaleCart.find(item => item.productId === product._id && item.price === price);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        quickSaleCart.push({
            productId: product._id,
            name: product.name,
            price: price,
            quantity: quantity
        });
    }

    productInput.value = '';
    quantityInput.value = 1;
    priceInput.value = '';
    productInput.focus();

    renderCart();
}

function renderCart() {
    const container = document.getElementById('qs-cart-container');
    const totalEl = document.getElementById('qs-total');
    const submitBtn = document.getElementById('qs-submit-btn');

    if (!container) return;

    if (quickSaleCart.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding: 1rem;">A kosár üres</p>';
        totalEl.textContent = 'Összesen: 0 Ft';
        submitBtn.disabled = true;
        return;
    }

    let total = 0;
    container.innerHTML = quickSaleCart.map((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border);">
                <div>
                    <div style="font-weight: 500;">${item.name}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary);">
                        ${item.quantity} x ${formatCurrency(item.price)}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 600;">${formatCurrency(itemTotal)}</span>
                    <button class="btn-icon-danger" onclick="window.removeQsItem(${index})">
                        ${getIcon('trash-2', 'w-4 h-4')}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    window.removeQsItem = (index) => {
        quickSaleCart.splice(index, 1);
        renderCart();
    };

    totalEl.textContent = `Összesen: ${formatCurrency(total)}`;
    submitBtn.disabled = false;
}

async function handleSubmitSale() {
    if (!selectedCustomer) {
        showToast('Hiba: Nincs kiválasztva vevő!', 'error');
        return;
    }

    const addToTasks = document.getElementById('qs-add-to-tasks').checked;

    const items = quickSaleCart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
    }));

    const total = quickSaleCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    try {
        setLoading(true);

        if (addToTasks) {
            // Create pending sale (task)
            const taskType = document.getElementById('qs-task-type').value;
            const pickupDate = taskType === 'later_pickup'
                ? document.getElementById('qs-pickup-date').value
                : null;

            await pendingSalesAPI.create({
                customerName: selectedCustomer.name,
                items,
                taskType,
                pickupDate,
                totalAmount: total
            });

            showToast('Feladat létrehozva!', 'success');
        } else {
            // Normal sale
            await transactionsAPI.sale({
                items,
                customer: selectedCustomer.name,
                customerGroup: selectedCustomer.group || 'Egyéb'
            });

            showToast('Eladás sikeresen rögzítve!', 'success');
        }

        closeModal();

        // Refresh dashboard if we are on it
        window.dispatchEvent(new CustomEvent('viewchange', { detail: { view: 'dashboard' } }));

    } catch (error) {
        showToast('Hiba: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
