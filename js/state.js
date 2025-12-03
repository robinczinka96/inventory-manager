// Global application state
export const state = {
    products: [],
    warehouses: [],
    currentView: 'dashboard',
    saleCart: [],
    manufacturingComponents: [],
    loading: false
};

// State update listeners
const listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
}

function notifyListeners() {
    listeners.forEach(listener => listener(state));
}

// State setters
export function setState(updates) {
    Object.assign(state, updates);
    notifyListeners();
}

export function setProducts(products) {
    state.products = products;
    notifyListeners();
}

export function setWarehouses(warehouses) {
    state.warehouses = warehouses;
    notifyListeners();
}

export function setCurrentView(view) {
    state.currentView = view;
    notifyListeners();
}

export function setLoading(loading) {
    state.loading = loading;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !loading);
    }
    notifyListeners();
}

// Sale cart management
export function addToCart(item) {
    state.saleCart.push(item);
    notifyListeners();
}

export function removeFromCart(index) {
    state.saleCart.splice(index, 1);
    notifyListeners();
}

export function clearCart() {
    state.saleCart = [];
    notifyListeners();
}

// Manufacturing components management
export function addComponent(component) {
    state.manufacturingComponents.push(component);
    notifyListeners();
}

export function removeComponent(index) {
    state.manufacturingComponents.splice(index, 1);
    notifyListeners();
}

export function clearComponents() {
    state.manufacturingComponents = [];
    notifyListeners();
}

// Utility functions
export function formatCurrency(amount) {
    return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatDate(date) {
    return new Intl.DateTimeFormat('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}
