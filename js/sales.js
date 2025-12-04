import { productsAPI, transactionsAPI, pendingSalesAPI } from './api.js';
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

    // Pending task toggle handler
    const taskToggle = document.getElementById('sale-add-to-tasks');
    if (taskToggle) {
        taskToggle.addEventListener('change', handleTaskToggle);
    }

    // Task type change handler (show date picker for "later_pickup")
    const taskTypeSelect = document.getElementById('task-type');
    if (taskTypeSelect) {
        taskTypeSelect.addEventListener('change', handleTaskTypeChange);
    }

    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'sales') {
            await loadSalesProducts();
            renderCart();
        }
    });

    // Listen for cart changes
    window.addEventListener('cartchange', () => {
        renderCart();
        checkMissingStock();
    });
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

function handleTaskToggle(e) {
    const taskFields = document.getElementById('task-fields');
    if (taskFields) {
        taskFields.style.display = e.target.checked ? 'block' : 'none';
    }
}

function handleTaskTypeChange(e) {
    const pickupDateField = document.getElementById('pickup-date-field');
    if (pickupDateField) {
        pickupDateField.style.display = e.target.value === 'later_pickup' ? 'block' : 'none';
    }

    // Set default date to today for later_pickup
    if (e.target.value === 'later_pickup') {
        const dateInput = document.getElementById('pickup-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }
}

function checkMissingStock() {
    // Check if any item in cart has missing stock
    const hasMissingStock = state.saleCart.some(item => {
        const product = products.find(p => p._id === item.productId);
        return product && product.quantity < item.quantity;
    });

    const taskToggle = document.getElementById('sale-add-to-tasks');
    const taskTypeSelect = document.getElementById('task-type');

    if (hasMissingStock && taskToggle && taskTypeSelect) {
        // Auto-enable toggle and select missing_stock
        taskToggle.checked = true;
        taskToggle.disabled = true;
        taskTypeSelect.value = 'missing_stock';
        taskTypeSelect.disabled = true;
        handleTaskToggle({ target: taskToggle });
    } else if (taskToggle && taskTypeSelect) {
        // Enable controls if stock is sufficient
        taskToggle.disabled = false;
        taskTypeSelect.disabled = false;
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

    // Allow adding to cart even if insufficient stock (for pending tasks)
    if (quantity > product.quantity) {
        showToast(`Figyelem! Csak ${product.quantity} db van raktáron (${quantity} kérve). Feladat listára kerül.`, 'warning');
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
    const addToTasks = document.getElementById('sale-add-to-tasks').checked;

    // Validate customer name if adding to tasks
    if (addToTasks && !customerName.trim()) {
        showToast('Feladat létrehozásához kötelező megadni a vevő nevét!', 'error');
        document.getElementById('sale-customer').focus();
        return;
    }

    const items = state.saleCart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
    }));

    const total = state.saleCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    try {
        setLoading(true);

        if (addToTasks) {
            // Create pending sale (task)
            const taskType = document.getElementById('task-type').value;
            const pickupDate = taskType === 'later_pickup'
                ? document.getElementById('pickup-date').value
                : null;

            await pendingSalesAPI.create({
                customerName,
                items,
                taskType,
                pickupDate,
                totalAmount: total
            });

            showToast('Feladat létrehozva! 📋', 'success');
        } else {
            // Normal sale
            await transactionsAPI.sale({
                items,
                customer: customerName || undefined
            });

            showToast('Eladás sikeresen rögzítve!', 'success');
        }

        // Clear cart and form
        clearCart();
        document.getElementById('sale-customer').value = '';
        document.getElementById('sale-add-to-tasks').checked = false;
        document.getElementById('task-fields').style.display = 'none';
        renderCart();

        // Reload products
        await loadSalesProducts();
    } catch (error) {
        showToast('Hiba az eladás rögzítésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
