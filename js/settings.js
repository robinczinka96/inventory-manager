import { fetchAPI, transactionsAPI } from './api.js';
import { showToast, getIcon, formatCurrency } from './ui-components.js';

let taskTypes = [];
let salesHistory = [];

export async function initSettings() {
    // Add logic for Settings view interactions
    const addBtn = document.getElementById('add-task-type-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openTaskTypeModal());
    }

    const form = document.getElementById('task-type-form');
    if (form) {
        form.addEventListener('submit', handleTaskTypeSubmit);
    }

    // Modal close
    const modal = document.getElementById('task-type-modal');
    if (modal) {
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    // Refresh history btn
    const refreshBtn = document.getElementById('refresh-history-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadSalesHistory);
    }

    // Tab Navigation
    const tabs = document.querySelectorAll('.settings-tabs .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            // UI Toggle
            document.querySelectorAll('.settings-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            e.target.classList.add('active');
            const tabName = e.target.dataset.tab;
            document.getElementById(`tab-${tabName}`).classList.remove('hidden');

            // Load data based on tab
            if (tabName === 'sales-history') {
                await loadSalesHistory();
            } else if (tabName === 'task-types') {
                await loadTaskTypes();
            }
        });
    });

    // Listen for general view change to reload default tab
    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'settings') {
            await loadTaskTypes();
            // Optional: reset to first tab? Or keep state.
        }
    });
}

export async function loadTaskTypes() {
    try {
        const types = await fetchAPI('/task-types');
        taskTypes = types;
        renderTaskTypesTable();
        return types;
    } catch (error) {
        console.error('Error loading task types:', error);
        showToast('Hiba a feladat típusok betöltésekor', 'error');
        return [];
    }
}

async function loadSalesHistory() {
    try {
        const transactions = await transactionsAPI.getAll({ type: 'sale', limit: 100 }); // Assuming limit support or manual slice
        salesHistory = transactions; // API likely returns array
        renderSalesHistoryTable();
    } catch (error) {
        console.error('Error loading sales history:', error);
        showToast('Hiba az előzmények betöltésekor', 'error');
    }
}

function renderSalesHistoryTable() {
    const tbody = document.getElementById('sales-history-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!salesHistory || salesHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nincs megjeleníthető adat</td></tr>';
        return;
    }

    salesHistory.forEach(tx => {
        const tr = document.createElement('tr');
        const dateStr = new Date(tx.createdAt).toLocaleString('hu-HU');
        const total = tx.quantity * tx.price;
        const productName = tx.productId ? tx.productId.name : 'Ismeretlen termék';

        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${tx.customer || '-'}</td>
            <td>${productName}</td>
            <td>${tx.quantity} db</td>
            <td>${formatCurrency(tx.price)}</td>
            <td><strong>${formatCurrency(total)}</strong></td>
            <td>
                <button class="btn-icon btn-danger" onclick="window.deleteTransaction('${tx._id}')" title="Tranzakció törlése (Visszavonás)">
                    ${getIcon('trash-2')}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderTaskTypesTable() {
    const tbody = document.getElementById('task-types-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (taskTypes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nincs rögzített típus</td></tr>';
        return;
    }

    taskTypes.forEach(type => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${type.name}</td>
            <td>
                <span style="display: inline-block; width: 20px; height: 20px; background-color: ${type.color}; border-radius: 4px; vertical-align: middle;"></span>
                <span style="margin-left: 8px;">${type.color}</span>
            </td>
            <td>${type.requiresDate ? 'Igen' : 'Nem'}</td>
            <td>${type.description || '-'}</td>
            <td>
                <button class="btn-icon" onclick="window.editTaskType('${type._id}')" title="Szerkesztés">
                    ${getIcon('edit-2')}
                </button>
                <button class="btn-icon btn-danger" onclick="window.deleteTaskType('${type._id}')" title="Törlés">
                    ${getIcon('trash-2')}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openTaskTypeModal(typeId = null) {
    const modal = document.getElementById('task-type-modal');
    const title = document.getElementById('task-type-modal-title');
    const form = document.getElementById('task-type-form');

    form.reset();
    document.getElementById('task-type-id').value = '';

    if (typeId) {
        const type = taskTypes.find(t => t._id === typeId);
        if (type) {
            title.textContent = 'Feladat Típus Szerkesztése';
            document.getElementById('task-type-id').value = type._id;
            document.getElementById('task-type-name').value = type.name;
            document.getElementById('task-type-color').value = type.color;
            document.getElementById('task-type-description').value = type.description || '';
            document.getElementById('task-type-requires-date').checked = type.requiresDate;
        }
    } else {
        title.textContent = 'Új Feladat Típus';
        document.getElementById('task-type-color').value = '#3b82f6'; // Reset color
    }

    modal.classList.remove('hidden');
}

async function handleTaskTypeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('task-type-id').value;
    const name = document.getElementById('task-type-name').value;
    const color = document.getElementById('task-type-color').value;
    const description = document.getElementById('task-type-description').value;
    const requiresDate = document.getElementById('task-type-requires-date').checked;

    const data = { name, color, description, requiresDate };

    try {
        if (id) {
            await fetchAPI(`/task-types/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Típus frissítve', 'success');
        } else {
            await fetchAPI('/task-types', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Új típus létrehozva', 'success');
        }

        document.getElementById('task-type-modal').classList.add('hidden');
        await loadTaskTypes();
    } catch (error) {
        showToast('Hiba: ' + error.message, 'error');
    }
}

// Global handlers for buttons
window.editTaskType = (id) => openTaskTypeModal(id);
window.deleteTaskType = async (id) => {
    if (!confirm('Biztosan törlöd ezt a típust?')) return;
    try {
        await fetchAPI(`/task-types/${id}`, { method: 'DELETE' });
        showToast('Típus törölve', 'success');
        await loadTaskTypes();
    } catch (error) {
        showToast('Hiba: ' + error.message, 'error');
    }
};

window.deleteTransaction = async (id) => {
    if (!confirm('Biztosan VISSZAVONOD ezt az eladást? A készlet visszakerül a raktárba.')) return;
    try {
        await transactionsAPI.delete(id);
        showToast('Tranzakció visszavonva, készlet visszaállítva', 'success');
        await loadSalesHistory();
    } catch (error) {
        showToast('Hiba: ' + error.message, 'error');
    }
};
