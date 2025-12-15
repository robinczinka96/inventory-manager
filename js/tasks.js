import { pendingSalesAPI, productsAPI, fetchAPI } from './api.js';
import { setLoading, formatCurrency } from './state.js';
import { showToast, getIcon } from './ui-components.js';

let currentTasks = [];
let allProducts = [];
let currentFilter = 'all';

// Initialize tasks view
// Store globally
let currentTaskTypes = [];

export async function initTasks() {
    // Edit Modal Handlers
    const editModal = document.getElementById('edit-task-modal');
    if (editModal) {
        editModal.querySelector('.modal-close').addEventListener('click', () => {
            editModal.classList.add('hidden');
        });
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) editModal.classList.add('hidden');
        });

        const editForm = document.getElementById('edit-task-form');
        if (editForm) {
            editForm.addEventListener('submit', handleEditTaskSubmit);
        }
    }

    // Filter change handler
    const filterSelect = document.getElementById('tasks-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderTasks();
            updateStatistics();
        });
    }

    // Add Item Button in Edit Modal
    const addItemBtn = document.getElementById('edit-task-add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', handleAddEditItem);
    }

    // Product search in Edit Modal
    const productInput = document.getElementById('edit-task-new-product');
    if (productInput) {
        productInput.addEventListener('change', handleEditProductSelect);
    }

    // Restore view change listener
    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'tasks') {
            await loadTasks();
        }
    });
}

let editingTaskItems = []; // Temporary state for modal

async function loadTasks() {
    try {
        setLoading(true);

        // Load tasks, products, AND task types
        const [tasks, products, types] = await Promise.all([
            pendingSalesAPI.getAll(),
            productsAPI.getAll(),
            fetchAPI('/task-types')
        ]);

        currentTasks = tasks;
        allProducts = products;
        currentTaskTypes = types;

        // Update filter options dynamically
        updateTaskFilterOptions();

        renderTasks();
        updateStatistics();

        // Populate edit modal datalist once
        populateEditProductDatalist();

    } catch (error) {
        showToast('Hiba a feladatok betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function populateEditProductDatalist() {
    const datalist = document.getElementById('edit-task-product-dataset');
    if (!datalist) return;

    datalist.innerHTML = '';
    allProducts.forEach(product => {
        const option = document.createElement('option');
        const stockStr = ` (Készlet: ${product.quantity})`;
        option.value = product.name; // Use name for input value
        option.dataset.id = product._id;
        option.dataset.price = product.price;
        option.textContent = `${product.name} [${product.barcode || ''}]${stockStr}`;
        datalist.appendChild(option);
    });
}

function updateTaskFilterOptions() {
    const filterSelect = document.getElementById('tasks-filter');
    if (!filterSelect) return;

    const currentVal = filterSelect.value;

    // Keep 'all' option
    filterSelect.innerHTML = '<option value="all">Minden feladat</option>';

    currentTaskTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.key;
        option.textContent = type.name;
        filterSelect.appendChild(option);
    });

    if (currentVal) filterSelect.value = currentVal;
}

function getFilteredTasks() {
    if (currentFilter === 'all') {
        return currentTasks;
    }
    // Filter by taskType key
    return currentTasks.filter(task => task.taskType === currentFilter);
}

function renderTasks() {
    const container = document.getElementById('tasks-list');
    if (!container) return;

    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs feldolgozás alatt lévő feladat</p>';
        return;
    }

    container.innerHTML = '';

    filteredTasks.forEach(task => {
        const card = createTaskCard(task);
        container.appendChild(card);
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'card task-card';

    // Find task type info
    const typeInfo = currentTaskTypes.find(t => t.key === task.taskType) || {
        name: task.taskType, // Fallback
        color: '#666'
    };

    // Format date if exists
    const dateStr = task.pickupDate
        ? `<p class="task-date">${getIcon('calendar', 'w-4 h-4')} ${new Date(task.pickupDate).toLocaleDateString('hu-HU')}</p>`
        : '';

    // Note
    const noteStr = task.note
        ? `<div style="background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; font-style: italic; font-size: 0.9em;">
            ${getIcon('message-square', 'w-3 h-3')} ${task.note}
           </div>`
        : '';

    // Generate items list with stock indicators
    const itemsHTML = task.items.map(item => {
        const product = allProducts.find(p => p._id === item.productId._id);
        const hasStock = product && product.quantity >= item.quantity;
        const indicator = hasStock ? getIcon('check-circle-2', 'text-success w-4 h-4') : getIcon('alert-circle', 'text-danger w-4 h-4');
        const stockClass = hasStock ? 'has-stock' : 'no-stock';

        return `
            <div class="task-item ${stockClass}">
                <span style="display: flex; align-items: center; gap: 0.5rem;">${indicator} ${item.productId.name}</span>
                <span>${item.quantity} db × ${formatCurrency(item.price)}</span>
            </div>
        `;
    }).join('');

    card.innerHTML = `
        <div class="task-header">
            <h3 class="card-title">${task.customerName || 'Ügyfél'}</h3>
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <span class="task-type-badge" style="background-color: ${typeInfo.color}20; color: ${typeInfo.color}; border: 1px solid ${typeInfo.color}40;">
                    ${typeInfo.name}
                </span>
                <button class="btn-icon" onclick="window.editTask('${task._id}')" title="Feladat szerkesztése">
                    ${getIcon('edit-2')}
                </button>
                <button class="btn-icon btn-danger" onclick="window.deleteTask('${task._id}')" title="Feladat törlése">
                    ${getIcon('trash-2')}
                </button>
            </div>
        </div>
        ${dateStr}
        ${noteStr}
        <div class="task-items">
            ${itemsHTML}
        </div>
        <div class="task-footer">
            <div class="task-total">
                <span>Végösszeg:</span>
                <span><strong>${formatCurrency(task.totalAmount)}</strong></span>
            </div>
            <button class="btn btn-primary" onclick="window.completeTask('${task._id}')">
                Feladat lezárása
            </button>
        </div>
    `;

    return card;
}

// Calculate and update statistics
function updateStatistics() {
    const filteredTasks = getFilteredTasks();

    let totalRevenue = 0;
    let totalCost = 0;

    filteredTasks.forEach(task => {
        totalRevenue += task.totalAmount || 0;

        // Calculate cost from items
        task.items.forEach(item => {
            const product = allProducts.find(p => p._id === item.productId._id);
            if (product) {
                totalCost += (product.purchasePrice || 0) * item.quantity;
            }
        });
    });

    const profit = totalRevenue - totalCost;
    // const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0;

    // Update UI
    document.getElementById('tasks-total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('tasks-total-margin').textContent = formatCurrency(profit);
    document.getElementById('tasks-count').textContent = `${filteredTasks.length} db`;
}

// Delete task handler
window.deleteTask = async function (taskId) {
    if (!confirm('Biztosan törli ezt a feladatot? Ez a művelet nem vonható vissza.')) {
        return;
    }

    try {
        setLoading(true);
        await pendingSalesAPI.delete(taskId);

        showToast('Feladat törölve!', 'success');

        // Reload tasks
        await loadTasks();
    } catch (error) {
        showToast('Hiba a feladat törlésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
};

// Edit Task Logic
window.editTask = function (taskId) {
    const task = currentTasks.find(t => t._id === taskId);
    if (!task) return;

    const modal = document.getElementById('edit-task-modal');
    if (!modal) return;

    // Reset and populate form
    document.getElementById('edit-task-id').value = task._id;
    document.getElementById('edit-task-note').value = task.note || '';

    // Initialize temporary items
    // Deep clone to avoid mutating local state before save
    editingTaskItems = task.items.map(item => ({
        productId: item.productId._id, // Back to ID for references
        productName: item.productId.name, // Keep name for display
        quantity: item.quantity,
        price: item.price
    }));

    renderEditItemsTable();

    // Reset new item inputs
    document.getElementById('edit-task-new-product').value = '';
    document.getElementById('edit-task-new-qty').value = 1;
    document.getElementById('edit-task-new-price').value = '';

    // Populate type select based on global types
    const typeSelect = document.getElementById('edit-task-type');
    typeSelect.innerHTML = '';
    currentTaskTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.key;
        option.textContent = type.name;
        typeSelect.appendChild(option);
    });
    typeSelect.value = task.taskType;

    // Date
    const dateInput = document.getElementById('edit-task-date');
    if (task.pickupDate) {
        dateInput.value = new Date(task.pickupDate).toISOString().split('T')[0];
    } else {
        dateInput.value = '';
    }

    modal.classList.remove('hidden');
};

function renderEditItemsTable() {
    const container = document.getElementById('edit-task-items-list');
    if (!container) return;

    container.innerHTML = '';

    editingTaskItems.forEach((item, index) => {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '2fr 1fr 1fr 30px';
        row.style.gap = '0.5rem';
        row.style.marginBottom = '0.5rem';
        row.style.alignItems = 'center';
        row.style.fontSize = '0.9em';

        row.innerHTML = `
            <div>${item.productName}</div>
            <div>${item.quantity} db</div>
            <div>${formatCurrency(item.price)}</div>
            <button type="button" class="btn-icon btn-danger" style="margin: 0; padding: 2px;" data-index="${index}">
                ${getIcon('trash-2', 'w-4 h-4')}
            </button>
        `;

        container.appendChild(row);
    });

    // Add delete listeners
    container.querySelectorAll('.btn-danger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.index);
            editingTaskItems.splice(idx, 1);
            renderEditItemsTable();
        });
    });
}

function handleEditProductSelect(e) {
    const val = e.target.value;
    const datalist = document.getElementById('edit-task-product-dataset');

    // Find option in datalist by value (name)
    // Note: iterating options is not super efficient but safe for small catalogs.
    // Better: use the allProducts array since we have it.
    const product = allProducts.find(p => p.name === val);

    if (product) {
        document.getElementById('edit-task-new-price').value = product.price;
        document.getElementById('edit-task-new-qty').focus();
    }
}

function handleAddEditItem() {
    const nameInput = document.getElementById('edit-task-new-product');
    const qtyInput = document.getElementById('edit-task-new-qty');
    const priceInput = document.getElementById('edit-task-new-price');

    const name = nameInput.value;
    const qty = parseInt(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;

    const product = allProducts.find(p => p.name === name);

    if (!product) {
        showToast('Kérlek válassz érvényes terméket!', 'error');
        return;
    }

    if (qty <= 0) {
        showToast('Kérlek adj meg pozitív mennyiséget!', 'error');
        return;
    }

    // Add to state
    editingTaskItems.push({
        productId: product._id,
        productName: product.name,
        quantity: qty,
        price: price
    });

    // Reset inputs
    nameInput.value = '';
    qtyInput.value = 1;
    priceInput.value = '';

    renderEditItemsTable();
}

async function handleEditTaskSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('edit-task-id').value;
    const taskType = document.getElementById('edit-task-type').value;
    const note = document.getElementById('edit-task-note').value;
    const pickupDate = document.getElementById('edit-task-date').value || null;

    if (editingTaskItems.length === 0) {
        showToast('A feladat nem lehet üres (tételek nélkül)!', 'warning');
        return;
    }

    try {
        setLoading(true);
        // Send items along with other fields
        await pendingSalesAPI.update(id, {
            taskType,
            note,
            pickupDate,
            items: editingTaskItems // Send the updated list
        });

        showToast('Feladat frissítve', 'success');
        document.getElementById('edit-task-modal').classList.add('hidden');
        await loadTasks();
    } catch (error) {
        showToast('Hiba: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// Complete task handler
window.completeTask = async function (taskId) {
    if (!confirm('Biztosan lezárja ezt a feladatot?')) {
        return;
    }

    try {
        setLoading(true);
        await pendingSalesAPI.complete(taskId);

        showToast('Feladat sikeresen lezárva!', 'success');

        // Reload tasks
        await loadTasks();
    } catch (error) {
        showToast('Hiba a feladat lezárásakor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
};
