import { productsAPI, transactionsAPI } from './api.js';
import { state, addToCart, removeFromCart, clearCart, setLoading, formatCurrency } from './state.js';
import { showToast } from './ui-components.js';

let products = [];

// Initialize sales view
export async function initSales() {
    const addItemForm = document.getElementById('add-sale-item-form');
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddToCart);
    }

    const completeSaleBtn = document.getElementById('complete-sale-btn');
    if (completeSaleBtn) {
        completeSaleBtn.addEventListener('click', handleCompleteSale);
    }

    // Barcode filter handler
    const barcodeInput = document.getElementById('sale-barcode-filter');
    if (barcodeInput) {
        barcodeInput.addEventListener('input', handleBarcodeInput);
    }

    // Clear barcode button
    const clearBtn = document.getElementById('clear-sale-barcode-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (barcodeInput) {
                barcodeInput.value = '';
                barcodeInput.focus();
                filterProductList('');
            }
        });
    }

    // Product search input handler (for selecting ID)
    const searchInput = document.getElementById('sale-product-search');
    if (searchInput) {
        searchInput.addEventListener('change', handleProductSelect);
        searchInput.addEventListener('input', (e) => {
            // Clear hidden ID if user clears input
            if (!e.target.value) {
                document.getElementById('sale-product-id').value = '';
            }
        });
    }

    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'sales') {
            await loadSalesProducts();
            renderCart();
        }
    });

    // Listen for cart changes
    window.addEventListener('cartchange', renderCart);
}

async function loadSalesProducts() {
    try {
        products = await productsAPI.getAll();
        populateProductDatalist(products);
    } catch (error) {
        showToast('Hiba a termékek betöltésekor: ' + error.message, 'error');
    }
}

function populateProductDatalist(productList) {
    const datalist = document.getElementById('sale-product-list');
    if (!datalist) return;

    datalist.innerHTML = '';
    productList.forEach(product => {
        const option = document.createElement('option');
        const barcodeStr = product.barcode ? ` [${product.barcode}]` : '';
        const stockInfo = ` (Készlet: ${product.quantity} db)`;
        option.value = `${product.name}${barcodeStr}${stockInfo}`;
        option.dataset.id = product._id;
        datalist.appendChild(option);
    });
}

function handleBarcodeInput(e) {
    const barcode = e.target.value.trim().toLowerCase();
    filterProductList(barcode);
}

function filterProductList(barcode) {
    const searchInput = document.getElementById('sale-product-search');
    const hiddenIdInput = document.getElementById('sale-product-id');

    if (!barcode) {
        // Reset list if barcode is empty
        populateProductDatalist(products);
        return;
    }

    // Find exact match first
    const exactMatch = products.find(p => p.barcode && p.barcode.toLowerCase() === barcode);

    if (exactMatch) {
        // Auto-select if exact match found
        const barcodeStr = exactMatch.barcode ? ` [${exactMatch.barcode}]` : '';
        const stockInfo = ` (Készlet: ${exactMatch.quantity} db)`;
        searchInput.value = `${exactMatch.name}${barcodeStr}${stockInfo}`;
        hiddenIdInput.value = exactMatch._id;
        showToast(`Termék kiválasztva: ${exactMatch.name}`, 'success');
    } else {
        // Filter list for partial matches
        const filtered = products.filter(p => p.barcode && p.barcode.toLowerCase().includes(barcode));
        populateProductDatalist(filtered);
    }
}

function handleProductSelect(e) {
    const inputValue = e.target.value;
    const hiddenIdInput = document.getElementById('sale-product-id');

    // Find product based on input value string
    // Format: "Name [Barcode] (Készlet: X db)"
    const product = products.find(p => {
        const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
        const stockInfo = ` (Készlet: ${p.quantity} db)`;
        return `${p.name}${barcodeStr}${stockInfo}` === inputValue;
    });

    if (product) {
        hiddenIdInput.value = product._id;
    } else {
        hiddenIdInput.value = ''; // Invalid selection
    }
}

function handleAddToCart(e) {
    e.preventDefault();

    const productId = document.getElementById('sale-product-id').value;
    const quantity = parseInt(document.getElementById('sale-quantity').value);
    const price = parseFloat(document.getElementById('sale-price').value);

    if (!productId) {
        showToast('Válasszon ki egy érvényes terméket a listából!', 'error');
        return;
    }

    const product = products.find(p => p._id === productId);
    if (!product) {
        showToast('Termék nem található!', 'error');
        return;
    }

    if (quantity > product.quantity) {
        showToast(`Nincs elegendő készlet! Elérhető: ${product.quantity} db`, 'error');
        return;
    }

    addToCart({
        productId: product._id,
        productName: product.name,
        quantity,
        price,
        availableQuantity: product.quantity
    });

    showToast('Tétel hozzáadva a kosárhoz!', 'success');

    // Reset form
    e.target.reset();
    document.getElementById('sale-product-id').value = '';

    renderCart();
}

function renderCart() {
    const cartContainer = document.getElementById('sale-cart');
    const totalElement = document.getElementById('sale-total-amount');
    const completeBtn = document.getElementById('complete-sale-btn');

    if (!cartContainer) return;

    if (state.saleCart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-state">A kosár üres</p>';
        if (totalElement) totalElement.textContent = formatCurrency(0);
        if (completeBtn) completeBtn.disabled = true;
        return;
    }

    let total = 0;
    cartContainer.innerHTML = '';

    state.saleCart.forEach((item, index) => {
        const itemTotal = item.quantity * item.price;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.productName}</h4>
                <p>${item.quantity} db × ${formatCurrency(item.price)} = ${formatCurrency(itemTotal)}</p>
            </div>
            <button class="btn btn-danger" data-index="${index}" style="padding: 0.5rem 1rem;">🗑️</button>
        `;

        const deleteBtn = cartItem.querySelector('button');
        deleteBtn.addEventListener('click', () => {
            removeFromCart(index);
            renderCart();
        });

        cartContainer.appendChild(cartItem);
    });

    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }

    if (completeBtn) {
        completeBtn.disabled = false;
    }
}

async function handleCompleteSale() {
    if (state.saleCart.length === 0) {
        showToast('A kosár üres!', 'error');
        return;
    }

    const customerName = document.getElementById('sale-customer').value;

    const items = state.saleCart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
    }));

    try {
        setLoading(true);
        await transactionsAPI.sale({
            items,
            customer: customerName || undefined
        });

        showToast('Eladás sikeresen rögzítve!', 'success');

        // Clear cart and form
        clearCart();
        document.getElementById('sale-customer').value = '';
        renderCart();

        // Reload products
        await loadSalesProducts();
    } catch (error) {
        showToast('Hiba az eladás rögzítésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

