import { customersAPI } from './api.js';
import { showToast, getIcon } from './ui-components.js';
import { formatCurrency } from './state.js';

let customers = [];

export async function initCustomers() {
    // Initial load
    await loadCustomers();

    // Listen for view changes to reload
    window.addEventListener('viewchange', async (e) => {
        if (e.detail.view === 'customers') {
            await loadCustomers();
        }
    });

    // Close modal handler
    const modalCloseBtn = document.querySelector('#customer-details-modal .modal-close');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeCustomerModal);
    }

    // Close modal on overlay click
    const modalOverlay = document.getElementById('customer-details-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeCustomerModal();
        });
    }

    // Date filter handler
    const dateFilterBtn = document.getElementById('customer-history-filter-btn');
    if (dateFilterBtn) {
        dateFilterBtn.addEventListener('click', applyDateFilter);
    }
}

export async function loadCustomers() {
    try {
        const container = document.getElementById('customers-list');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"></div>';

        customers = await customersAPI.getAll();
        renderCustomers(customers);
    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('Hiba a vevők betöltésekor', 'error');
    }
}

function renderCustomers(list) {
    const container = document.getElementById('customers-list');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincsenek rögzített vevők.</p>';
        return;
    }

    // Group by Customer Group
    const grouped = list.reduce((acc, customer) => {
        const group = customer.group || 'Egyéb';
        if (!acc[group]) acc[group] = [];
        acc[group].push(customer);
        return acc;
    }, {});

    let html = '';

    Object.keys(grouped).sort().forEach(group => {
        html += `
            <div class="customer-group-section">
                <h3 class="group-title">${group}</h3>
                <div class="cards-grid">
        `;

        grouped[group].forEach(customer => {
            html += `
                <div class="card clickable-card customer-card" data-id="${customer._id}">
                    <div class="card-header">
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

    // Add click listeners
    document.querySelectorAll('.customer-card').forEach(card => {
        card.addEventListener('click', () => openCustomerDetails(card.dataset.id));
    });
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

function closeCustomerModal() {
    document.getElementById('customer-details-modal').classList.add('hidden');
    currentCustomerId = null;
}
