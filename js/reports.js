import { reportsAPI } from './api.js';
import { setLoading, formatCurrency, formatDate } from './state.js';
import { getIcon } from './ui-components.js';
import { showToast } from './ui-components.js';
import { switchView } from './navigation.js';

// Initialize reports view (now part of dashboard)
export async function initReports() {
    // Dropdown change handler
    const reportSelect = document.getElementById('dashboard-report-select');
    if (reportSelect) {
        reportSelect.addEventListener('change', (e) => {
            loadSelectedReport(e.target.value);
        });
    }

    // KPI Card Navigation Handlers
    const inventoryCard = document.getElementById('kpi-card-inventory');
    if (inventoryCard) {
        inventoryCard.addEventListener('click', () => switchView('warehouses'));
    }

    const salesCard = document.getElementById('kpi-card-sales');
    if (salesCard) {
        salesCard.addEventListener('click', () => switchView('sales'));
    }

    const productsCard = document.getElementById('kpi-card-products');
    if (productsCard) {
        productsCard.addEventListener('click', () => switchView('products'));
    }
}

async function loadSelectedReport(reportType) {
    const container = document.getElementById('dashboard-report-container');
    if (!container) return;

    // Show loading state in the container
    container.innerHTML = `
        <div class="loading-spinner" style="text-align: center; padding: 2rem;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--color-text-secondary);">Adatok betöltése...</p>
        </div>
    `;

    try {
        switch (reportType) {
            case 'inventory-report':
                await loadInventoryReport();
                break;
            case 'margin-report':
                await loadMarginReport();
                break;
            case 'customers-report':
                await loadCustomersReport();
                break;
            case 'movement-report':
                await loadMovementReport();
                break;
            case 'sales-report':
                await loadSalesReport();
                break;
            case 'purchases-report':
                await loadPurchasesReport();
                break;
            default:
                await loadInventoryReport();
        }
    } catch (error) {
        console.error('Error loading report:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--color-danger);">
                ${getIcon('alert-circle')}
                <p>Hiba a riport betöltésekor: ${error.message}</p>
            </div>
        `;
    }
}

async function loadMarginReport() {
    try {
        const margin = await reportsAPI.getMargin();
        renderMarginReport(margin);
    } catch (error) {
        throw error;
    }
}

function renderMarginReport(margin) {
    const container = document.getElementById('dashboard-report-container');
    if (!container) return;

    const html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
            <div style="text-align: center; padding: 1.5rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
                <p style="font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 0.5rem;">Bevétel</p>
                <p style="font-size: 1.5rem; font-weight: 700; color: var(--color-success);">${formatCurrency(margin.revenue)}</p>
            </div>
            <div style="text-align: center; padding: 1.5rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
                <p style="font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 0.5rem;">Költség</p>
                <p style="font-size: 1.5rem; font-weight: 700; color: var(--color-warning);">${formatCurrency(margin.costs)}</p>
            </div>
            <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); border-radius: var(--radius-md);">
                <p style="font-size: 0.875rem; color: white; margin-bottom: 0.5rem;">Árrés</p>
                <p style="font-size: 2rem; font-weight: 700; color: white;">${formatCurrency(margin.margin)}</p>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

async function loadCustomersReport() {
    try {
        const customers = await reportsAPI.getTopCustomers({ limit: 20 });
        renderCustomersReport(customers);
    } catch (error) {
        throw error;
    }
}

function renderCustomersReport(customers) {
    const container = document.getElementById('dashboard-report-container');
    if (!container) return;

    if (!customers || customers.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs vásárlói adat</p>';
        return;
    }

    const html = `
        <div class="table-responsive">
            <table style="width: 100%; font-size: 0.875rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--color-border);">
                        <th style="padding: 0.75rem; text-align: left;">Helyezés</th>
                        <th style="padding: 0.75rem; text-align: left;">Vásárló neve</th>
                        <th style="padding: 0.75rem; text-align: right;">Vásárlások</th>
                        <th style="padding: 0.75rem; text-align: right;">Összeg</th>
                        <th style="padding: 0.75rem; text-align: right;">Átlag/vásárlás</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.map(c => `
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <td style="padding: 0.75rem; font-weight: 700; color: ${c.rank <= 3 ? 'var(--color-primary)' : 'inherit'};">
                                ${c.rank === 1 ? '🥇' : c.rank === 2 ? '🥈' : c.rank === 3 ? '🥉' : c.rank + '.'}
                            </td>
                            <td style="padding: 0.75rem; font-weight: 600;">${c.name}</td>
                            <td style="padding: 0.75rem; text-align: right;">${c.purchaseCount}×</td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 700; color: var(--color-success);">${formatCurrency(c.totalAmount)}</td>
                            <td style="padding: 0.75rem; text-align: right; color: var(--color-text-secondary);">${formatCurrency(c.averageAmount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

async function loadMovementReport() {
    try {
        const movement = await reportsAPI.getProductMovement({ limit: 20 });
        renderMovementReport(movement);
    } catch (error) {
        throw error;
    }
}

function renderMovementReport(movement) {
    const container = document.getElementById('dashboard-report-container');
    if (!container) return;

    if (!movement || movement.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs termékfogyási adat</p>';
        return;
    }

    const html = `
        <div class="table-responsive">
            <table style="width: 100%; font-size: 0.875rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--color-border);">
                        <th style="padding: 0.75rem; text-align: left;">Top</th>
                        <th style="padding: 0.75rem; text-align: left;">Termék</th>
                        <th style="padding: 0.75rem; text-align: right;">Eladott (db)</th>
                        <th style="padding: 0.75rem; text-align: right;">Bevétel</th>
                        <th style="padding: 0.75rem; text-align: right;">Árrés</th>
                    </tr>
                </thead>
                <tbody>
                    ${movement.map(m => `
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <td style="padding: 0.75rem; font-weight: 700; color: ${m.rank <= 3 ? 'var(--color-primary)' : 'inherit'};">
                                ${m.rank <= 3 ? ['🥇', '🥈', '🥉'][m.rank - 1] : m.rank + '.'}
                            </td>
                            <td style="padding: 0.75rem; font-weight: 600;">${m.productName}</td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 700; color: var(--color-primary);">${m.totalQuantity} db</td>
                            <td style="padding: 0.75rem; text-align: right; color: var(--color-success);">${formatCurrency(m.totalRevenue)}</td>
                            <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: ${m.margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${formatCurrency(m.margin)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

async function loadInventoryReport() {
    try {
        const report = await reportsAPI.getInventory();
        renderInventoryReport(report);
    } catch (error) {
        throw error;
    }
}

function renderInventoryReport(report) {
    const container = document.getElementById('dashboard-report-container');
    if (!container) return;

    if (!report || report.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs készlet adat</p>';
        return;
    }

    let html = '';

    report.forEach(warehouse => {
        html += `
        <div class="card" style="margin-bottom: 1.5rem; border: 1px solid var(--color-border); box-shadow: none;">
            <h4 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">${getIcon('warehouse')} ${warehouse.warehouse.name}</h4>
                ${warehouse.warehouse.location ? `<p style="color: var(--color-text-secondary); margin-bottom: 1rem; font-size: 0.875rem;">📍 ${warehouse.warehouse.location}</p>` : ''}

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Termékfajták</p>
                    <p style="font-size: 1.125rem; font-weight: 600;">${warehouse.productCount}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Összes darab</p>
                    <p style="font-size: 1.125rem; font-weight: 600;">${warehouse.totalItems}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Érték</p>
                    <p style="font-size: 1.125rem; font-weight: 600; color: var(--color-success);">${formatCurrency(warehouse.totalValue)}</p>
                </div>
            </div>

            ${warehouse.products.length > 0 ? `
                <div class="table-responsive">
                    <table style="width: 100%; font-size: 0.875rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <th style="padding: 0.5rem; text-align: left;">Termék</th>
                                <th style="padding: 0.5rem; text-align: right;">Mennyiség</th>
                                <th style="padding: 0.5rem; text-align: right;">Érték</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${warehouse.products.map(p => `
                                <tr style="border-bottom: 1px solid var(--color-border);">
                                    <td style="padding: 0.5rem;">${p.name}</td>
                                    <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${p.quantity} db</td>
                                    <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(p.totalValue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p class="empty-state">Nincs termék ebben a raktárban</p>'}
        </div>
        `;
    });

    container.innerHTML = html;
}

async function loadSalesReport() {
    try {
        const report = await reportsAPI.getSales({ groupBy: 'product' });
        renderSalesReport(report);
    } catch (error) {
        throw error;
    }
}

function renderSalesReport(report) {
    const container = document.getElementById('dashboard-report-container');
    if (!container) return;

    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Összes bevétel</p>
                <p style="font-size: 1.25rem; font-weight: 700; color: var(--color-success);">${formatCurrency(report.summary.totalAmount)}</p>
            </div>
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Eladott termékek</p>
                <p style="font-size: 1.25rem; font-weight: 700;">${report.summary.totalQuantity} db</p>
            </div>
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Tranzakciók</p>
                <p style="font-size: 1.25rem; font-weight: 700;">${report.summary.transactionCount}</p>
            </div>
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Átlag tétel</p>
                <p style="font-size: 1.25rem; font-weight: 700;">${formatCurrency(report.summary.averageAmount)}</p>
            </div>
        </div>
    `;

    if (report.productSummary && report.productSummary.length > 0) {
        html += `
            <h4 style="margin-bottom: 1rem;">Termékenkénti bontás</h4>
            <div class="table-responsive" style="margin-bottom: 2rem;">
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <th style="padding: 0.5rem; text-align: left;">Termék</th>
                            <th style="padding: 0.5rem; text-align: right;">Mennyiség</th>
                            <th style="padding: 0.5rem; text-align: right;">Összeg</th>
                            <th style="padding: 0.5rem; text-align: right;">Eladások</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.productSummary.map(p => `
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <td style="padding: 0.5rem;">${p.productName}</td>
                                <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${p.quantity} db</td>
                                <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(p.totalAmount)}</td>
                                <td style="padding: 0.5rem; text-align: right;">${p.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (report.transactions && report.transactions.length > 0) {
        html += `
            <h4 style="margin-bottom: 1rem;">Legutóbbi tranzakciók</h4>
            <div class="table-responsive">
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <th style="padding: 0.5rem; text-align: left;">Termék</th>
                            <th style="padding: 0.5rem; text-align: left;">Vevő</th>
                            <th style="padding: 0.5rem; text-align: right;">Mennyiség</th>
                            <th style="padding: 0.5rem; text-align: right;">Összeg</th>
                            <th style="padding: 0.5rem; text-align: left;">Dátum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.transactions.slice(0, 20).map(t => `
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <td style="padding: 0.5rem;">${t.product || 'N/A'}</td>
                                <td style="padding: 0.5rem; color: var(--color-text-secondary);">${t.customer || '-'}</td>
                                <td style="padding: 0.5rem; text-align: right;">${t.quantity} db</td>
                                <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(t.totalAmount)}</td>
                                <td style="padding: 0.5rem; font-size: 0.75rem; color: var(--color-text-secondary);">${formatDate(t.date)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function loadPurchasesReport() {
    try {
        const report = await reportsAPI.getPurchases();
        renderPurchasesReport(report);
    } catch (error) {
        throw error;
    }
}

function renderPurchasesReport(report) {
    const container = document.getElementById('dashboard-report-container');
    if (!container) return;

    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Összes beszerzés</p>
                <p style="font-size: 1.25rem; font-weight: 700; color: var(--color-warning);">${formatCurrency(report.summary.totalAmount)}</p>
            </div>
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Bevételezett termékek</p>
                <p style="font-size: 1.25rem; font-weight: 700;">${report.summary.totalQuantity} db</p>
            </div>
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Tranzakciók</p>
                <p style="font-size: 1.25rem; font-weight: 700;">${report.summary.transactionCount}</p>
            </div>
            <div style="padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md); text-align: center;">
                <p style="font-size: 0.75rem; color: var(--color-text-muted);">Átlag tétel</p>
                <p style="font-size: 1.25rem; font-weight: 700;">${formatCurrency(report.summary.averageAmount)}</p>
            </div>
        </div>
    `;

    if (report.transactions && report.transactions.length > 0) {
        html += `
            <h4 style="margin-bottom: 1rem;">Legutóbbi bevételezések</h4>
            <div class="table-responsive">
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <th style="padding: 0.5rem; text-align: left;">Termék</th>
                            <th style="padding: 0.5rem; text-align: left;">Raktár</th>
                            <th style="padding: 0.5rem; text-align: right;">Mennyiség</th>
                            <th style="padding: 0.5rem; text-align: right;">Ár</th>
                            <th style="padding: 0.5rem; text-align: right;">Összeg</th>
                            <th style="padding: 0.5rem; text-align: left;">Dátum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.transactions.slice(0, 20).map(t => `
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <td style="padding: 0.5rem;">${t.product || 'N/A'}</td>
                                <td style="padding: 0.5rem; color: var(--color-text-secondary);">${t.warehouse || '-'}</td>
                                <td style="padding: 0.5rem; text-align: right;">${t.quantity} db</td>
                                <td style="padding: 0.5rem; text-align: right;">${formatCurrency(t.price)}</td>
                                <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${formatCurrency(t.totalAmount)}</td>
                                <td style="padding: 0.5rem; font-size: 0.75rem; color: var(--color-text-secondary);">${formatDate(t.date)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Dashboard integration
export async function loadDashboard() {
    try {
        setLoading(true);
        const dashboard = await reportsAPI.getDashboard();
        renderDashboard(dashboard);

        // Load default report (Inventory)
        const reportSelect = document.getElementById('dashboard-report-select');
        if (reportSelect) {
            await loadSelectedReport(reportSelect.value);
        }
    } catch (error) {
        showToast('Hiba a dashboard betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderDashboard(data) {
    // Update KPIs
    const kpiInventory = document.getElementById('kpi-inventory-value');
    const kpiSales = document.getElementById('kpi-sales');
    const kpiProducts = document.getElementById('kpi-products');
    const kpiMargin = document.getElementById('kpi-margin');

    if (kpiInventory) kpiInventory.textContent = formatCurrency(data.inventory.totalValue);
    if (kpiSales) kpiSales.textContent = formatCurrency(data.sales.totalAmount);
    if (kpiProducts) kpiProducts.textContent = `${data.inventory.productCount} db`;
    if (kpiMargin) kpiMargin.textContent = formatCurrency(data.profitMargin);

    // Render low stock products
    const lowStockContainer = document.getElementById('low-stock-list');
    if (lowStockContainer) {
        if (data.lowStockProducts.length === 0) {
            lowStockContainer.innerHTML = '<p class="empty-state">Nincs alacsony készletű termék</p>';
        } else {
            lowStockContainer.innerHTML = '';
            data.lowStockProducts.forEach(product => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div>
                        <strong>${product.name}</strong>
                        <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
                            Készlet: ${product.quantity} db
                        </p>
                    </div>
                    <span style="color: var(--color-warning); font-size: 1.5rem;">${getIcon('alert-triangle')}</span>
                `;
                lowStockContainer.appendChild(item);
            });
        }
    }
}
