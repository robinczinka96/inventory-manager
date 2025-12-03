import { reportsAPI } from './api.js';
import { setLoading, formatCurrency, formatDate } from './state.js';
import { showToast } from './ui-components.js';

// Initialize reports view
export async function initReports() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    window.addEventListener('viewchange', (e) => {
        if (e.detail.view === 'reports') {
            loadAllReports();
        }
    });
}

function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update active tab content
    document.querySelectorAll('.report-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });
}

async function loadAllReports() {
    await Promise.all([
        loadInventoryReport(),
        loadSalesReport(),
        loadPurchasesReport()
    ]);
}

async function loadInventoryReport() {
    try {
        setLoading(true);
        const report = await reportsAPI.getInventory();
        renderInventoryReport(report);
    } catch (error) {
        showToast('Hiba a készlet riport betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderInventoryReport(report) {
    const container = document.getElementById('inventory-report-content');
    if (!container) return;

    if (!report || report.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs készlet adat</p>';
        return;
    }

    let html = '';

    report.forEach(warehouse => {
        html += `
            <div class="card" style="margin-bottom: 1.5rem;">
                <h3 class="card-title">🏭 ${warehouse.warehouse.name}</h3>
                ${warehouse.warehouse.location ? `<p style="color: var(--color-text-secondary); margin-bottom: 1rem;">📍 ${warehouse.warehouse.location}</p>` : ''}
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
                    <div>
                        <p style="font-size: 0.75rem; color: var(--color-text-muted);">Termékfajták</p>
                        <p style="font-size: 1.25rem; font-weight: 600;">${warehouse.productCount}</p>
                    </div>
                    <div>
                        <p style="font-size: 0.75rem; color: var(--color-text-muted);">Összes darab</p>
                        <p style="font-size: 1.25rem; font-weight: 600;">${warehouse.totalItems}</p>
                    </div>
                    <div>
                        <p style="font-size: 0.75rem; color: var(--color-text-muted);">Érték</p>
                        <p style="font-size: 1.25rem; font-weight: 600; color: var(--color-success);">${formatCurrency(warehouse.totalValue)}</p>
                    </div>
                </div>

                ${warehouse.products.length > 0 ? `
                    <table style="width: 100%; font-size: 0.875rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <th style="padding: 0.75rem; text-align: left;">Termék</th>
                                <th style="padding: 0.75rem; text-align: left;">Vonalkód</th>
                                <th style="padding: 0.75rem; text-align: right;">Mennyiség</th>
                                <th style="padding: 0.75rem; text-align: right;">Ár</th>
                                <th style="padding: 0.75rem; text-align: right;">Érték</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${warehouse.products.map(p => `
                                <tr style="border-bottom: 1px solid var(--color-border);">
                                    <td style="padding: 0.75rem;">${p.name}</td>
                                    <td style="padding: 0.75rem; color: var(--color-text-secondary);">${p.barcode || '-'}</td>
                                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${p.quantity} db</td>
                                    <td style="padding: 0.75rem; text-align: right;">${formatCurrency(p.purchasePrice)}</td>
                                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${formatCurrency(p.totalValue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
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
        showToast('Hiba az eladási riport betöltésekor: ' + error.message, 'error');
    }
}

function renderSalesReport(report) {
    const container = document.getElementById('sales-report-content');
    if (!container) return;

    let html = `
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3 class="card-title">Összesítés</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Összes bevétel</p>
                    <p style="font-size: 1.5rem; font-weight: 700; color: var(--color-success);">${formatCurrency(report.summary.totalAmount)}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Eladott termékek</p>
                    <p style="font-size: 1.5rem; font-weight: 700;">${report.summary.totalQuantity} db</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Tranzakciók</p>
                    <p style="font-size: 1.5rem; font-weight: 700;">${report.summary.transactionCount}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Átlag tétel</p>
                    <p style="font-size: 1.5rem; font-weight: 700;">${formatCurrency(report.summary.averageAmount)}</p>
                </div>
            </div>
        </div>
    `;

    if (report.productSummary && report.productSummary.length > 0) {
        html += `
            <div class="card" style="margin-bottom: 1.5rem;">
                <h3 class="card-title">Termékenkénti bontás</h3>
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <th style="padding: 0.75rem; text-align: left;">Termék</th>
                            <th style="padding: 0.75rem; text-align: right;">Mennyiség</th>
                            <th style="padding: 0.75rem; text-align: right;">Összeg</th>
                            <th style="padding: 0.75rem; text-align: right;">Eladások</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.productSummary.map(p => `
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <td style="padding: 0.75rem;">${p.productName}</td>
                                <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${p.quantity} db</td>
                                <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${formatCurrency(p.totalAmount)}</td>
                                <td style="padding: 0.75rem; text-align: right;">${p.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (report.transactions && report.transactions.length > 0) {
        html += `
            <div class="card">
                <h3 class="card-title">Legutóbbi tranzakciók</h3>
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <th style="padding: 0.75rem; text-align: left;">Termék</th>
                            <th style="padding: 0.75rem; text-align: left;">Vevő</th>
                            <th style="padding: 0.75rem; text-align: right;">Mennyiség</th>
                            <th style="padding: 0.75rem; text-align: right;">Összeg</th>
                            <th style="padding: 0.75rem; text-align: left;">Dátum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.transactions.slice(0, 20).map(t => `
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <td style="padding: 0.75rem;">${t.product || 'N/A'}</td>
                                <td style="padding: 0.75rem; color: var(--color-text-secondary);">${t.customer || '-'}</td>
                                <td style="padding: 0.75rem; text-align: right;">${t.quantity} db</td>
                                <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${formatCurrency(t.totalAmount)}</td>
                                <td style="padding: 0.75rem; font-size: 0.75rem; color: var(--color-text-secondary);">${formatDate(t.date)}</td>
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
        showToast('Hiba a beszerzési riport betöltésekor: ' + error.message, 'error');
    }
}

function renderPurchasesReport(report) {
    const container = document.getElementById('purchases-report-content');
    if (!container) return;

    let html = `
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3 class="card-title">Összesítés</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Összes beszerzés</p>
                    <p style="font-size: 1.5rem; font-weight: 700; color: var(--color-warning);">${formatCurrency(report.summary.totalAmount)}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Bevételezett termékek</p>
                    <p style="font-size: 1.5rem; font-weight: 700;">${report.summary.totalQuantity} db</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Tranzakciók</p>
                    <p style="font-size: 1.5rem; font-weight: 700;">${report.summary.transactionCount}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted);">Átlag tétel</p>
                    <p style="font-size: 1.5rem; font-weight: 700;">${formatCurrency(report.summary.averageAmount)}</p>
                </div>
            </div>
        </div>
    `;

    if (report.transactions && report.transactions.length > 0) {
        html += `
            <div class="card">
                <h3 class="card-title">Legutóbbi bevételezések</h3>
                <table style="width: 100%; font-size: 0.875rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--color-border);">
                            <th style="padding: 0.75rem; text-align: left;">Termék</th>
                            <th style="padding: 0.75rem; text-align: left;">Raktár</th>
                            <th style="padding: 0.75rem; text-align: right;">Mennyiség</th>
                            <th style="padding: 0.75rem; text-align: right;">Ár</th>
                            <th style="padding: 0.75rem; text-align: right;">Összeg</th>
                            <th style="padding: 0.75rem; text-align: left;">Dátum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.transactions.slice(0, 20).map(t => `
                            <tr style="border-bottom: 1px solid var(--color-border);">
                                <td style="padding: 0.75rem;">${t.product || 'N/A'}</td>
                                <td style="padding: 0.75rem; color: var(--color-text-secondary);">${t.warehouse || '-'}</td>
                                <td style="padding: 0.75rem; text-align: right;">${t.quantity} db</td>
                                <td style="padding: 0.75rem; text-align: right;">${formatCurrency(t.price)}</td>
                                <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${formatCurrency(t.totalAmount)}</td>
                                <td style="padding: 0.75rem; font-size: 0.75rem; color: var(--color-text-secondary);">${formatDate(t.date)}</td>
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
    } catch (error) {
        showToast('Hiba a dashboard betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderDashboard(data) {
    // Update KPIs
    document.getElementById('kpi-inventory-value').textContent = formatCurrency(data.inventory.totalValue);
    document.getElementById('kpi-sales').textContent = formatCurrency(data.sales.totalAmount);
    document.getElementById('kpi-products').textContent = `${data.inventory.productCount} db`;
    document.getElementById('kpi-margin').textContent = formatCurrency(data.profitMargin);

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
                    <span style="color: var(--color-warning); font-size: 1.5rem;">⚠️</span>
                `;
                lowStockContainer.appendChild(item);
            });
        }
    }
}
