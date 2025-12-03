import { productsAPI, transactionsAPI } from './api.js';
import { state, setLoading } from './state.js';
import { showToast, populateProductSelect } from './ui-components.js';

// Initialize receiving view
export async function initReceiving() {
    const form = document.getElementById('receiving-form');
    if (form) {
        form.addEventListener('submit', handleReceiving);
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
        const selectElement = document.getElementById('receiving-product');
        populateProductSelect(selectElement, products);
    } catch (error) {
        showToast('Hiba a termékek betöltésekor: ' + error.message, 'error');
    }
}

async function handleReceiving(e) {
    e.preventDefault();

    const productId = document.getElementById('receiving-product').value;
    const quantity = parseInt(document.getElementById('receiving-quantity').value);
    const price = parseFloat(document.getElementById('receiving-price').value);

    if (!productId) {
        showToast('Válasszon ki egy terméket!', 'error');
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

        // Reload products
        await loadReceivingProducts();
    } catch (error) {
        showToast('Hiba a bevételezés rögzítésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
