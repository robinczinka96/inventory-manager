import { fetchAPI } from './api.js';
import { showToast, getIcon } from './ui-components.js';

let taskTypes = [];

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

    // Listen for view change
    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'settings') {
            await loadTaskTypes();
        }
    });

    // Initial load? maybe not needed until view is shown
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
