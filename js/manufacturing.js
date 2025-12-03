import { productsAPI, transactionsAPI } from './api.js';
import { state, addComponent, removeComponent, clearComponents, setLoading } from './state.js';
import { showToast, populateProductSelect } from './ui-components.js';

let products = [];

// Initialize manufacturing view
export async function initManufacturing() {
    const addComponentForm = document.getElementById('add-component-form');
    if (addComponentForm) {
        addComponentForm.addEventListener('submit', handleAddComponent);
    }

    const manufacturingForm = document.getElementById('manufacturing-form');
    if (manufacturingForm) {
        manufacturingForm.addEventListener('submit', handleManufacturing);
    }

    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'manufacturing') {
            await loadManufacturingProducts();
            renderComponents();
        }
    });
}

async function loadManufacturingProducts() {
    try {
        products = await productsAPI.getAll();

        const componentSelect = document.getElementById('component-product');
        const outputSelect = document.getElementById('output-product');

        populateProductSelect(componentSelect, products, 'Válasszon komponenst...');
        populateProductSelect(outputSelect, products, 'Válasszon késztermeket...');
    } catch (error) {
        showToast('Hiba a termékek betöltésekor: ' + error.message, 'error');
    }
}

function handleAddComponent(e) {
    e.preventDefault();

    const productId = document.getElementById('component-product').value;
    const quantity = parseInt(document.getElementById('component-quantity').value);

    if (!productId) {
        showToast('Válasszon ki egy komponenst!', 'error');
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

    addComponent({
        productId: product._id,
        productName: product.name,
        quantity,
        availableQuantity: product.quantity
    });

    showToast('Komponens hozzáadva!', 'success');

    // Reset form
    e.target.reset();

    renderComponents();
}

function renderComponents() {
    const container = document.getElementById('components-list');
    if (!container) return;

    if (state.manufacturingComponents.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincsenek hozzáadott komponensek</p>';
        return;
    }

    container.innerHTML = '';

    state.manufacturingComponents.forEach((comp, index) => {
        const item = document.createElement('div');
        item.className = 'component-item';
        item.innerHTML = `
            <div>
                <h4 style="font-size: 1rem; margin-bottom: 0.25rem;">${comp.productName}</h4>
                <p style="font-size: 0.875rem; color: var(--color-text-secondary);">${comp.quantity} db</p>
            </div>
            <button class="btn btn-danger" data-index="${index}" style="padding: 0.5rem 1rem;">🗑️</button>
        `;

        const deleteBtn = item.querySelector('button');
        deleteBtn.addEventListener('click', () => {
            removeComponent(index);
            renderComponents();
        });

        container.appendChild(item);
    });
}

async function handleManufacturing(e) {
    e.preventDefault();

    if (state.manufacturingComponents.length === 0) {
        showToast('Adjon hozzá legalább egy komponenst!', 'error');
        return;
    }

    const outputProductId = document.getElementById('output-product').value;
    const outputQuantity = parseInt(document.getElementById('output-quantity').value);

    if (!outputProductId) {
        showToast('Válasszon ki egy késztermeket!', 'error');
        return;
    }

    const components = state.manufacturingComponents.map(comp => ({
        productId: comp.productId,
        quantity: comp.quantity
    }));

    try {
        setLoading(true);
        await transactionsAPI.manufacture({
            outputProductId,
            outputQuantity,
            components
        });

        showToast('Gyártás sikeresen végrehajtva!', 'success');

        // Clear components and form
        clearComponents();
        e.target.reset();
        renderComponents();

        // Reload products
        await loadManufacturingProducts();
    } catch (error) {
        showToast('Hiba a gyártás végrehajtásakor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
