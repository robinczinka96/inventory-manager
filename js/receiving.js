import { productsAPI, transactionsAPI } from './api.js';
import { state, setLoading } from './state.js';
import { showToast } from './ui-components.js';

let receivingProducts = [];

// Initialize receiving view
export async function initReceiving() {
    const form = document.getElementById('receiving-form');
    if (form) {
        form.addEventListener('submit', handleReceiving);
    }

    // Barcode filter handler
    const barcodeInput = document.getElementById('receiving-barcode-filter');
    if (barcodeInput) {
        barcodeInput.addEventListener('input', handleBarcodeInput);
    }

    // Clear barcode button
    const clearBtn = document.getElementById('clear-barcode-btn');
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
    const searchInput = document.getElementById('receiving-product-search');
    if (searchInput) {
        searchInput.addEventListener('change', handleProductSelect);
        searchInput.addEventListener('input', (e) => {
            // Clear hidden ID if user clears input
            if (!e.target.value) {
                document.getElementById('receiving-product-id').value = '';
            }
        });
    }

    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'receiving') {
            await loadReceivingProducts();
        }
    });
}

async function loadReceivingProducts() {
    try {
        const products = await productsAPI.getAll();
        receivingProducts = products;
        populateProductDatalist(products);
    } catch (error) {
        showToast('Hiba a termékek betöltésekor: ' + error.message, 'error');
    }
}

function populateProductDatalist(products) {
    const datalist = document.getElementById('receiving-product-list');
    if (!datalist) return;

    datalist.innerHTML = '';
    products.forEach(product => {
        const option = document.createElement('option');
        const barcodeStr = product.barcode ? ` [${product.barcode}]` : '';
        option.value = `${product.name}${barcodeStr}`; // Value shown in input
        option.dataset.id = product._id; // Store ID in dataset (not directly accessible in input value, handled by logic)
        datalist.appendChild(option);
    });
}

function handleBarcodeInput(e) {
    const barcode = e.target.value.trim().toLowerCase();
    filterProductList(barcode);
}

function filterProductList(barcode) {
    const searchInput = document.getElementById('receiving-product-search');
    const hiddenIdInput = document.getElementById('receiving-product-id');

    if (!barcode) {
        // Reset list if barcode is empty
        populateProductDatalist(receivingProducts);
        return;
    }

    // Find exact match first
    const exactMatch = receivingProducts.find(p => p.barcode && p.barcode.toLowerCase() === barcode);

    if (exactMatch) {
        // Auto-select if exact match found
        const barcodeStr = exactMatch.barcode ? ` [${exactMatch.barcode}]` : '';
        searchInput.value = `${exactMatch.name}${barcodeStr}`;
        hiddenIdInput.value = exactMatch._id;
        showToast(`Termék kiválasztva: ${exactMatch.name}`, 'success');
    } else {
        // Filter list for partial matches
        const filtered = receivingProducts.filter(p => p.barcode && p.barcode.toLowerCase().includes(barcode));
        populateProductDatalist(filtered);
    }
}

function handleProductSelect(e) {
    const inputValue = e.target.value;
    const hiddenIdInput = document.getElementById('receiving-product-id');

    // Find product based on input value string
    // Format: "Name [Barcode]"
    const product = receivingProducts.find(p => {
        const barcodeStr = p.barcode ? ` [${p.barcode}]` : '';
        return `${p.name}${barcodeStr}` === inputValue;
    });

    if (product) {
        hiddenIdInput.value = product._id;
    } else {
        hiddenIdInput.value = ''; // Invalid selection
    }
}

async function handleReceiving(e) {
    e.preventDefault();

    const productId = document.getElementById('receiving-product-id').value;
    const quantity = parseInt(document.getElementById('receiving-quantity').value);
    const price = parseFloat(document.getElementById('receiving-price').value);

    if (!productId) {
        showToast('Válasszon ki egy érvényes terméket a listából!', 'error');
        return;
    }

    try {
        setLoading(true);
        await transactionsAPI.receive({
            productId,
            quantity,
            price
        });

        showToast('Bevételezés sikeresen rögzítve!', 'success');

        // Reset form
        e.target.reset();
        document.getElementById('receiving-product-id').value = '';

        // Reload products
        await loadReceivingProducts();
    } catch (error) {
        showToast('Hiba a bevételezés rögzítésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
