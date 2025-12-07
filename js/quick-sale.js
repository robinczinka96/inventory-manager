import { customersAPI, productsAPI, transactionsAPI } from './api.js';
import { showModal, closeModal, showToast, getIcon, formatCurrency } from './ui-components.js';
import { setLoading } from './state.js';

let quickSaleCart = [];
let allProducts = [];
let allCustomers = [];

export function initQuickSale() {
    const fab = document.getElementById('quick-sale-fab');
    if (fab) {
        fab.addEventListener('click', openQuickSaleModal);
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

        quickSaleCart = []; // Reset cart
        renderModalContent();

    } catch (error) {
        showToast('Hiba az adatok betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderModalContent() {
    const content = `
        <div class="quick-sale-grid">
            <!-- Customer Selection -->
            <div class="form-group">
                <label>Vevő kiválasztása</label>
                <input type="text" id="qs-customer" class="form-control" list="qs-customer-list" placeholder="Kezdjen gépelni...">
                <datalist id="qs-customer-list">
                    ${allCustomers.map(c => `<option value="${c.name}">`).join('')}
                </datalist>
            </div>

            <!-- Product Selection -->
            <div class="form-group">
                <label>Termék hozzáadása</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="qs-product" class="form-control" list="qs-product-list" placeholder="Termék keresése..." style="flex: 2;">
                    <datalist id="qs-product-list">
                        ${allProducts.map(p => {
        const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
        return `<option value="${p.name}${barcodeStr}" data-id="${p._id}">`;
    }).join('')}
                    </datalist>
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

            <!-- Total & Actions -->
            <div class="quick-sale-total" id="qs-total">
                Összesen: 0 Ft
            </div>

            <button id="qs-submit-btn" class="btn btn-primary btn-block" disabled>
                Eladás Rögzítése
            </button>
        </div>
    `;

    showModal('Gyors Eladás ⚡️', content);

    // Attach Event Listeners
    document.getElementById('qs-add-btn').addEventListener('click', handleAddItem);
    document.getElementById('qs-submit-btn').addEventListener('click', handleSubmitSale);

    // Enter key support for adding items
    document.getElementById('qs-quantity').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddItem();
    });
}

function handleAddItem() {
    const productInput = document.getElementById('qs-product');
    const quantityInput = document.getElementById('qs-quantity');

    const inputValue = productInput.value;
    const quantity = parseInt(quantityInput.value);

    if (!inputValue || quantity < 1) return;

    // Find product (fuzzy match logic similar to sales.js)
    // We try to match exact name + barcode string first
    let product = allProducts.find(p => {
        const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
        return `${p.name}${barcodeStr}` === inputValue;
    });

    // If not found, try exact name match
    if (!product) {
        product = allProducts.find(p => p.name === inputValue);
    }

    if (!product) {
        showToast('Termék nem található!', 'error');
        return;
    }

    if (product.quantity < quantity) {
        showToast(`Nincs elegendő készlet! (${product.quantity} db)`, 'warning');
        // We allow adding but warn
    }

    // Add to cart
    const existingItem = quickSaleCart.find(item => item.productId === product._id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        quickSaleCart.push({
            productId: product._id,
            name: product.name,
            price: product.salePrice || 0, // Use sale price
            quantity: quantity
        });
    }

    // Reset inputs
    productInput.value = '';
    quantityInput.value = 1;
    productInput.focus();

    renderCart();
}

function renderCart() {
    const container = document.getElementById('qs-cart-container');
    const totalEl = document.getElementById('qs-total');
    const submitBtn = document.getElementById('qs-submit-btn');

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

    // Expose remove function globally for the inline onclick
    window.removeQsItem = (index) => {
        quickSaleCart.splice(index, 1);
        renderCart();
    };

    totalEl.textContent = `Összesen: ${formatCurrency(total)}`;
    submitBtn.disabled = false;
}

async function handleSubmitSale() {
    const customerName = document.getElementById('qs-customer').value;

    if (!customerName) {
        showToast('Kérjük válasszon vevőt!', 'error');
        return;
    }

    // Find customer group
    const customer = allCustomers.find(c => c.name === customerName);
    const customerGroup = customer ? customer.group : 'Egyéb';

    const items = quickSaleCart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
    }));

    try {
        setLoading(true);
        await transactionsAPI.sale({
            items,
            customer: customerName,
            customerGroup
        });

        showToast('Eladás sikeresen rögzítve!', 'success');
        closeModal();

        // Refresh dashboard if we are on it
        window.dispatchEvent(new CustomEvent('viewchange', { detail: { view: 'dashboard' } }));

    } catch (error) {
        showToast('Hiba: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
