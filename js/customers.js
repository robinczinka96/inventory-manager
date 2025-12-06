import { customersAPI } from './api.js';
import { showToast, getIcon } from './ui-components.js';
import { formatCurrency } from './state.js';

let customers = [];
let searchTerm = '';
let groupFilter = '';

export async function initCustomers() {
    // Initial load
    await loadCustomers();

    // Listen for view changes to reload
    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'customers') {
            await loadCustomers();
        }
    });

    // Search and Filter Handlers
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            renderCustomers();
        });
    }

    const groupSelect = document.getElementById('customer-group-filter');
    if (groupSelect) {
        groupSelect.addEventListener('change', (e) => {
            groupFilter = e.target.value;
            renderCustomers();
        });
    }

    // New Customer Button
    const addBtn = document.getElementById('add-customer-btn');
    if (addBtn) {
        addBtn.addEventListener('click', openNewCustomerModal);
    }

    // New Customer Form
    const newCustomerForm = document.getElementById('new-customer-form');
    if (newCustomerForm) {
        newCustomerForm.addEventListener('submit', handleNewCustomerSubmit);
    }

    // Group Select in Modal (for "New..." option)
    const newGroupSelect = document.getElementById('new-customer-group-select');
    const newGroupInput = document.getElementById('new-customer-group-input');
    if (newGroupSelect && newGroupInput) {
        newGroupSelect.addEventListener('change', (e) => {
            if (e.target.value === 'new') {
                newGroupInput.classList.remove('hidden');
                newGroupInput.required = true;
            } else {
                newGroupInput.classList.add('hidden');
                newGroupInput.required = false;
            }
        });
    }

    // Close modal handlers
    setupModalHandlers();
}

function setupModalHandlers() {
    // Details Modal
    const detailsModal = document.getElementById('customer-details-modal');
    if (detailsModal) {
        detailsModal.querySelector('.modal-close').addEventListener('click', () => {
            detailsModal.classList.add('hidden');
            currentCustomerId = null;
        });
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                detailsModal.classList.add('hidden');
                currentCustomerId = null;
            }
        });
    }

    // New Customer Modal
    const newModal = document.getElementById('new-customer-modal');
    if (newModal) {
        newModal.querySelector('.modal-close').addEventListener('click', () => {
            newModal.classList.add('hidden');
        });
        newModal.addEventListener('click', (e) => {
            if (e.target === newModal) newModal.classList.add('hidden');
        });
    }

    // Date filter
    const dateFilterBtn = document.getElementById('customer-history-filter-btn');
    if (dateFilterBtn) {
        dateFilterBtn.addEventListener('click', applyDateFilter);
    }
}

export async function loadCustomers() {
    try {
        const container = document.getElementById('customers-list');
        if (!container) return;

        // Don't show spinner if we already have data (for smoother search/filter)
        if (customers.length === 0) {
            container.innerHTML = '<div class="loading-spinner"></div>';
        }

        customers = await customersAPI.getAll();
        updateFilterOptions();
        renderCustomers();
    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('Hiba a vevők betöltésekor', 'error');
    }
}

function updateFilterOptions() {
    const groupSelect = document.getElementById('customer-group-filter');
    if (!groupSelect) return;

    const groups = [...new Set(customers.map(c => c.group || 'Egyéb'))].sort();
    const currentVal = groupSelect.value;

    groupSelect.innerHTML = '<option value="">Összes csoport</option>';
    groups.forEach(group => {
        groupSelect.innerHTML += `<option value="${group}">${group}</option>`;
    });

    groupSelect.value = currentVal;
}

function renderCustomers() {
    const container = document.getElementById('customers-list');
    if (!container) return;

    // Filter list
    const filtered = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm) ||
            (c.group || '').toLowerCase().includes(searchTerm);
        const matchesGroup = !groupFilter || c.group === groupFilter;
        return matchesSearch && matchesGroup;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs a keresésnek megfelelő vevő.</p>';
        return;
    }

    // Group by Customer Group
    const grouped = filtered.reduce((acc, customer) => {
        const group = customer.group || 'Egyéb';
        if (!acc[group]) acc[group] = [];
        acc[group].push(customer);
        return acc;
    }, {});

    let html = '';
    const allGroups = [...new Set(customers.map(c => c.group || 'Egyéb'))].sort();

    Object.keys(grouped).sort().forEach(group => {
        html += `
            <div class="customer-group-section">
                <h3 class="group-title">${group}</h3>
                <div class="cards-grid">
        `;

        grouped[group].forEach(customer => {
            // Generate group options for this customer
            const groupOptions = allGroups.map(g =>
                `<option value="${g}" ${g === customer.group ? 'selected' : ''}>${g}</option>`
            ).join('');

            html += `
                <div class="card customer-card" data-id="${customer._id}">
                    <div class="card-header clickable-area" onclick="window.openCustomerDetails('${customer._id}')">
                        <div class="customer-avatar">
                            ${getIcon('user', 'w-6 h-6')}
                        </div>
                        <div class="customer-info">
                            <h3 class="card-title" style="margin-bottom: 0.25rem;">${customer.name}</h3>
                            <span class="customer-group-badge">${customer.group}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="stat-row">
                            <span class="stat-label">Összforgalom:</span>
                            <span class="stat-value text-primary">${formatCurrency(customer.totalRevenue)}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Utolsó vásárlás:</span>
                            <span class="stat-value">${customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString('hu-HU') : '-'}</span>
                        </div>
                        
                        <div class="customer-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
                            <div class="form-group" style="margin-bottom: 0.5rem;">
                                <label style="font-size: 0.75rem;">Csoport módosítása:</label>
                                <select class="form-control customer-group-select" data-id="${customer._id}" style="padding: 0.25rem; font-size: 0.875rem;">
                                    ${groupOptions}
                                    <option value="new">+ Új...</option>
                                </select>
                            </div>
                            <button class="btn btn-primary btn-block start-sale-btn" data-id="${customer._id}">
                                ${getIcon('shopping-cart', 'w-4 h-4')} Eladás indítása
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Add event listeners
    // Group Change
    container.querySelectorAll('.customer-group-select').forEach(select => {
        select.addEventListener('change', handleGroupChange);
    });

    // Start Sale
    container.querySelectorAll('.start-sale-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleStartSale(e.target.closest('.start-sale-btn').dataset.id);
        });
    });

    // Make openCustomerDetails globally available for the onclick handler
    window.openCustomerDetails = openCustomerDetails;
}

async function handleGroupChange(e) {
    const select = e.target;
    const customerId = select.dataset.id;
    let newGroup = select.value;

    if (newGroup === 'new') {
        const input = prompt('Kérem az új csoport nevét:');
        if (input && input.trim()) {
            newGroup = input.trim();
        } else {
            // Revert selection
            const customer = customers.find(c => c._id === customerId);
            select.value = customer.group;
            return;
        }
    }

    try {
        await customersAPI.update(customerId, { group: newGroup });
        showToast('Vevő csoport frissítve', 'success');
        await loadCustomers(); // Reload to update lists and filters
    } catch (error) {
        console.error('Error updating group:', error);
        showToast('Hiba a csoport frissítésekor', 'error');
    }
}

function handleStartSale(id) {
    const customer = customers.find(c => c._id === id);
    if (!customer) return;

    // Dispatch event for Sales module
    window.dispatchEvent(new CustomEvent('start-sale-for-customer', {
        detail: { customer }
    }));

    // Switch view
    const salesBtn = document.querySelector('.nav-link[data-view="sales"]');
    if (salesBtn) salesBtn.click();
}

function openNewCustomerModal() {
    document.getElementById('new-customer-modal').classList.remove('hidden');
}

async function handleNewCustomerSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('new-customer-name').value;
    const groupSelect = document.getElementById('new-customer-group-select');
    let group = groupSelect.value;

    if (group === 'new') {
        group = document.getElementById('new-customer-group-input').value;
    }

    try {
        await customersAPI.create({ name, group });
        showToast('Új vevő sikeresen létrehozva', 'success');
        document.getElementById('new-customer-modal').classList.add('hidden');
        e.target.reset();
        await loadCustomers();
    } catch (error) {
        console.error('Error creating customer:', error);
        showToast('Hiba a vevő létrehozásakor: ' + error.message, 'error');
    }
}

let currentCustomerId = null;

async function openCustomerDetails(id) {
    const customer = customers.find(c => c._id === id);
    if (!customer) return;

    currentCustomerId = id;
    const modal = document.getElementById('customer-details-modal');

    // Set basic info
    document.getElementById('modal-customer-name').textContent = customer.name;
    document.getElementById('modal-customer-group').textContent = customer.group;
    document.getElementById('modal-customer-revenue').textContent = formatCurrency(customer.totalRevenue);

    // Reset filters
    document.getElementById('history-start-date').value = '';
    document.getElementById('history-end-date').value = '';

    // Load history
    await loadCustomerHistory(id);

    modal.classList.remove('hidden');
}

async function loadCustomerHistory(id, filters = {}) {
    const historyContainer = document.getElementById('customer-history-list');
    historyContainer.innerHTML = '<tr><td colspan="3" class="text-center">Betöltés...</td></tr>';

    try {
        const transactions = await customersAPI.getHistory(id, filters);

        if (transactions.length === 0) {
            historyContainer.innerHTML = '<tr><td colspan="3" class="text-center">Nincs megjeleníthető előzmény.</td></tr>';
            return;
        }

        historyContainer.innerHTML = transactions.map(tx => `
            <tr>
                <td>${new Date(tx.createdAt).toLocaleDateString('hu-HU')} ${new Date(tx.createdAt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                    ${tx.items ? tx.items.map(item =>
            `<div>${item.quantity}x ${item.productId?.name || 'Ismeretlen termék'}</div>`
        ).join('') :
                // Fallback for old transaction structure if any
                `${tx.quantity}x ${tx.productId?.name || 'Termék'}`
            }
                </td>
                <td class="text-right font-bold">
                    ${formatCurrency(tx.items ? tx.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) : (tx.price * tx.quantity))}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading history:', error);
        historyContainer.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Hiba az előzmények betöltésekor.</td></tr>';
    }
}

function applyDateFilter() {
    if (!currentCustomerId) return;

    const startDate = document.getElementById('history-start-date').value;
    const endDate = document.getElementById('history-end-date').value;

    loadCustomerHistory(currentCustomerId, { startDate, endDate });
}
