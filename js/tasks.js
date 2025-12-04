import { pendingSalesAPI, productsAPI } from './api.js';
import { setLoading, formatCurrency } from './state.js';
import { showToast } from './ui-components.js';

let currentTasks = [];
let allProducts = [];

// Initialize tasks view
export async function initTasks() {
    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'tasks') {
            await loadTasks();
        }
    });
}

async function loadTasks() {
    try {
        setLoading(true);

        // Load tasks and products
        const [tasks, products] = await Promise.all([
            pendingSalesAPI.getAll(),
            productsAPI.getAll()
        ]);

        currentTasks = tasks;
        allProducts = products;

        renderTasks();
    } catch (error) {
        showToast('Hiba a feladatok betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderTasks() {
    const container = document.getElementById('tasks-list');
    if (!container) return;

    if (currentTasks.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs feldolgozás alatt lévő feladat</p>';
        return;
    }

    container.innerHTML = '';

    currentTasks.forEach(task => {
        const card = createTaskCard(task);
        container.appendChild(card);
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'card task-card';

    // Task type labels
    const taskTypeLabels = {
        'later_pickup': 'Később tudja átvenni',
        'shipping': 'Csomagfeladást kért',
        'missing_stock': 'Hiányzó termék'
    };

    // Format date if exists
    const dateStr = task.pickupDate
        ? `<p class="task-date">📅 ${new Date(task.pickupDate).toLocaleDateString('hu-HU')}</p>`
        : '';

    // Generate items list with stock indicators
    const itemsHTML = task.items.map(item => {
        const product = allProducts.find(p => p._id === item.productId._id);
        const hasStock = product && product.quantity >= item.quantity;
        const indicator = hasStock ? '✅' : '❌';
        const stockClass = hasStock ? 'has-stock' : 'no-stock';

        return `
            <div class="task-item ${stockClass}">
                <span>${indicator} ${item.productId.name}</span>
                <span>${item.quantity} db × ${formatCurrency(item.price)}</span>
            </div>
        `;
    }).join('');

    card.innerHTML = `
        <div class="task-header">
            <h3 class="card-title">${task.customerName || 'Ügyfél'}</h3>
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <span class="task-type-badge">${taskTypeLabels[task.taskType]}</span>
                <button class="btn-icon btn-danger" onclick="window.deleteTask('${task._id}')" title="Feladat törlése">
                    🗑️
                </button>
            </div>
        </div>
        ${dateStr}
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

// Delete task handler
window.deleteTask = async function (taskId) {
    if (!confirm('Biztosan törli ezt a feladatot? Ez a művelet nem vonható vissza.')) {
        return;
    }

    try {
        setLoading(true);
        await pendingSalesAPI.delete(taskId);

        showToast('Feladat törölve! 🗑️', 'success');

        // Reload tasks
        await loadTasks();
    } catch (error) {
        showToast('Hiba a feladat törlésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
};

// Complete task handler
window.completeTask = async function (taskId) {
    if (!confirm('Biztosan lezárja ezt a feladatot?')) {
        return;
    }

    try {
        setLoading(true);
        await pendingSalesAPI.complete(taskId);

        showToast('Feladat sikeresen lezárva! ✅', 'success');

        // Reload tasks
        await loadTasks();
    } catch (error) {
        showToast('Hiba a feladat lezárásakor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
};
