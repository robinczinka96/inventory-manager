// Toast notification system
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div>
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong>
            ${message}
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal system
export function showModal(title, content, onClose = null) {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    container.appendChild(modal);

    const closeBtn = modal.querySelector('.modal-close');
    const closeModal = () => {
        modal.remove();
        if (onClose) onClose();
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    return modal;
}

export function closeModal() {
    const container = document.getElementById('modal-container');
    if (container) {
        container.innerHTML = '';
    }
}

// Product card component
export function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
            <div>
                <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">${product.name}</h3>
                ${product.barcode ? `<p style="color: var(--color-text-secondary); font-size: 0.875rem;">📊 ${product.barcode}</p>` : ''}
            </div>
            <div style="text-align: right;">
                <p style="font-size: 1.5rem; font-weight: 700; color: var(--color-primary);">${product.quantity} db</p>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--color-border);">
            <div>
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Beszerzési ár</p>
                <p style="font-size: 1rem; font-weight: 600;">${formatCurrency(product.purchasePrice)}</p>
            </div>
            <div>
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Raktár</p>
                <p style="font-size: 0.875rem; font-weight: 500;">${product.warehouseId?.name || 'N/A'}</p>
            </div>
        </div>
    `;
    return card;
}

// Warehouse card component
export function createWarehouseCard(warehouse, inventory = null) {
    const card = document.createElement('div');
    card.className = 'card clickable-card';
    card.style.cursor = 'pointer';
    card.dataset.warehouseId = warehouse._id;

    card.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">🏭 ${warehouse.name}</h3>
            ${warehouse.location ? `<p style="color: var(--color-text-secondary); font-size: 0.875rem;">📍 ${warehouse.location}</p>` : ''}
        </div>
        ${inventory ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Termékek</p>
                    <p style="font-size: 1.25rem; font-weight: 600;">${inventory.productCount || 0} db</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Érték</p>
                    <p style="font-size: 1.25rem; font-weight: 600; color: var(--color-success);">${formatCurrency(inventory.totalValue || 0)}</p>
                </div>
            </div>
        ` : ''}
        <p style="color: var(--color-text-secondary); font-size: 0.75rem; margin-top: 1rem; text-align: center;">
            👆 Kattintson a részletekért
        </p>
    `;

    return card;
}

// Helper to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Debounce function for search
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Create select option element
export function createOption(value, text, selected = false) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = selected;
    return option;
}

// Populate select element with products
export function populateProductSelect(selectElement, products, placeholder = 'Válasszon terméket...') {
    selectElement.innerHTML = '';
    selectElement.appendChild(createOption('', placeholder));

    products.forEach(product => {
        const text = `${product.name}${product.barcode ? ' (' + product.barcode + ')' : ''} - ${product.quantity} db`;
        selectElement.appendChild(createOption(product._id, text));
    });
}

// Populate select element with warehouses
export function populateWarehouseSelect(selectElement, warehouses, placeholder = 'Válasszon raktárt...') {
    selectElement.innerHTML = '';
    selectElement.appendChild(createOption('', placeholder));

    warehouses.forEach(warehouse => {
        const text = warehouse.name;
        selectElement.appendChild(createOption(warehouse._id, text));
    });
}
