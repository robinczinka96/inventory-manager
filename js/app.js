import { initNavigation } from './navigation.js';
import { initProducts } from './products.js';
import { initWarehouses } from './warehouses.js';
import { initReceiving } from './receiving.js';
import { initSales } from './sales.js';
import { initTasks } from './tasks.js';
import { initManufacturing } from './manufacturing.js';
import { initQuickSale } from './quick-sale.js';
import { initCustomers } from './customers.js';
import { initTodos } from './todos.js';
import { initReports, loadDashboard } from './reports.js';
import { initTheme } from './theme.js';
import { initAuth, isAuthenticated } from './auth.js';
import { healthCheck } from './api.js';
import { setLoading } from './state.js';
import { showToast } from './ui-components.js';
import { initSettings } from './settings.js';

// Application initialization
async function init() {
    try {
        console.log('🚀 Initializing Inventory Manager...');

        // Initialize theme (before anything visual)
        initTheme();

        // Check authentication
        if (!initAuth()) {
            console.log('Waiting for authentication...');
            return; // Stop initialization until logged in
        }

        console.log('User authenticated');

        // Check backend connection
        setLoading(true);
        try {
            const health = await healthCheck();
            console.log('Backend connection successful:', health);
            showToast('Sikeres kapcsolódás az adatbázishoz!', 'success');
        } catch (error) {
            console.error('Backend connection failed:', error);
            import('./ui-components.js').then(({ showConnectionErrorModal }) => {
                showConnectionErrorModal(error);
            });
            setLoading(false);
            return;
        }

        // Initialize all modules
        initNavigation();
        await initProducts();
        await initWarehouses();
        await initReceiving();
        await initSales();
        await initTasks();
        await initManufacturing();
        await initCustomers();
        await initTodos();
        await initReports();
        await initSettings(); // New
        initQuickSale(); // Initialize Quick Sale FAB

        // Load initial dashboard data
        await loadDashboard();

        // Listen for theme changes
        window.addEventListener('themechange', (e) => {
            showToast(e.detail.message, 'info');
        });

        console.log('Application initialized successfully');
        setLoading(false);
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Hiba az alkalmazás inicializálásakor: ' + error.message, 'error');
        setLoading(false);
    }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('Váratlan hiba történt: ' + event.reason, 'error');
});

console.log('Inventory Manager loaded');
