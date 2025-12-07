import { productsAPI, transactionsAPI } from './api.js';
import { state, addComponent, removeComponent, clearComponents, setLoading } from './state.js';
import { showToast, populateProductSelect, getIcon } from './ui-components.js';

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

        // Create unit selector if not exists
        let unitSelect = document.getElementById('component-unit');
        if (!unitSelect) {
            const quantityGroup = document.getElementById('component-quantity').parentElement;
            const wrapper = document.createElement('div');
            wrapper.className = 'input-group';
            wrapper.style.display = 'flex';
            wrapper.style.gap = '0.5rem';

            // Move quantity input to wrapper
            const qtyInput = document.getElementById('component-quantity');
            qtyInput.parentElement.replaceChild(wrapper, qtyInput);
            wrapper.appendChild(qtyInput);

            // Create unit select
            unitSelect = document.createElement('select');
            unitSelect.id = 'component-unit';
            unitSelect.className = 'form-control';
            unitSelect.style.width = '100px';
            unitSelect.innerHTML = `
                <option value="ml">ml</option>
                <option value="csepp">csepp</option>
                <option value="db">db</option>
            `;
            wrapper.appendChild(unitSelect);
        }

        populateProductSelect(componentSelect, products, 'Válasszon komponenst...');

        // Custom population for output select to include "New Product" option
        outputSelect.innerHTML = '<option value="">Válasszon késztermeket...</option>';
        outputSelect.innerHTML += '<option value="new" style="font-weight: bold; color: var(--color-primary);">+ Új termék létrehozása...</option>';
        products.forEach(p => {
            const option = document.createElement('option');
            option.value = p._id;
            option.textContent = p.name;
            outputSelect.appendChild(option);
        });

        // Add event listener for output select to show/hide new product name input
        outputSelect.addEventListener('change', (e) => {
            const newProductInput = document.getElementById('new-output-product-name');
            if (e.target.value === 'new') {
                newProductInput.style.display = 'block';
                newProductInput.required = true;
            } else {
                newProductInput.style.display = 'none';
                newProductInput.required = false;
            }
        });

        // Add event listener for component select to update unit label
        componentSelect.addEventListener('change', (e) => {
            const product = products.find(p => p._id === e.target.value);
            const label = document.querySelector('label[for="component-quantity"]');
            const unitSelect = document.getElementById('component-unit');

            if (product) {
                if (label) label.textContent = 'Mennyiség';

                // Set default unit based on product type
                if (product.unit === 'ml') {
                    unitSelect.value = 'ml';
                    unitSelect.disabled = false;
                } else {
                    unitSelect.value = 'db';
                    // If not ml-based, maybe restrict to db only? Or let them choose if it makes sense.
                    // For now, let's default to their unit or db.
                }
            }
        });

    } catch (error) {
        showToast('Hiba a termékek betöltésekor: ' + error.message, 'error');
    }
}

function handleAddComponent(e) {
    e.preventDefault();

    const productId = document.getElementById('component-product').value;
    const quantity = parseFloat(document.getElementById('component-quantity').value); // Allow decimals for ml
    const unit = document.getElementById('component-unit').value;

    if (!productId) {
        showToast('Válasszon ki egy komponenst!', 'error');
        return;
    }

    const product = products.find(p => p._id === productId);
    if (!product) {
        showToast('Termék nem található!', 'error');
        return;
    }

    // Validation: For non-ml items, check strict quantity. For ml, we allow "overdraft" via auto-opening bottles
    if (product.unit !== 'ml' && unit === 'db' && quantity > product.quantity) {
        showToast(`Nincs elegendő készlet! Elérhető: ${product.quantity} ${product.unit || 'db'}`, 'error');
        return;
    }

    addComponent({
        productId: product._id,
        productName: product.name,
        quantity,
        unit,
        availableQuantity: product.quantity
    });

    showToast('Komponens hozzáadva!', 'success');

    // Reset form
    e.target.reset();
    document.getElementById('component-unit').value = 'ml'; // Reset unit
    document.querySelector('label[for="component-quantity"]').textContent = 'Mennyiség';

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
                <p style="font-size: 0.875rem; color: var(--color-text-secondary);">${comp.quantity} ${comp.unit}</p>
            </div>
            <button class="btn btn-danger" data-index="${index}" style="padding: 0.5rem 1rem;">${getIcon('trash-2')}</button>
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
    const newOutputProductName = document.getElementById('new-output-product-name').value;

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
            components,
            newOutputProductName: outputProductId === 'new' ? newOutputProductName : undefined
        });

        showToast('Gyártás sikeresen végrehajtva!', 'success');

        // Clear components and form
        clearComponents();
        e.target.reset();
        document.getElementById('new-output-product-name').style.display = 'none';
        renderComponents();

        // Reload products
        await loadManufacturingProducts();
    } catch (error) {
        showToast('Hiba a gyártás végrehajtásakor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}
