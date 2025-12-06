// API Configuration - Import from config
import { API_BASE_URL } from './config.js';

// Helper function for fetch requests
export async function fetchAPI(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('API Error:', error);
        if (error.name === 'AbortError') {
            throw new Error('A kérés túllépte az időkorlátot (60mp). Kérjük ellenőrizze az internetkapcsolatot vagy próbálja újra később.');
        }
        throw error;
    }
}

// Products API
export const productsAPI = {
    getAll: () => fetchAPI('/products'),
    getById: (id) => fetchAPI(`/products/${id}`),
    search: (query) => fetchAPI(`/products/search/${encodeURIComponent(query)}`),
    create: (data) => fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/products/${id}`, {
        method: 'DELETE'
    }),
    bulkImport: (products) => fetchAPI('/products/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ products })
    })
};

// Warehouses API
export const warehousesAPI = {
    getAll: () => fetchAPI('/warehouses'),
    getOne: (id) => fetchAPI(`/warehouses/${id}`),
    getInventory: (id) => fetchAPI(`/warehouses/${id}/inventory`),
    create: (data) => fetchAPI('/warehouses', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/warehouses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/warehouses/${id}`, {
        method: 'DELETE'
    }),
    transfer: (data) => fetchAPI('/warehouses/transfer', {
        method: 'POST',
        body: JSON.stringify(data)
    })
};

// Transactions API
export const transactionsAPI = {
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/transactions${queryString ? '?' + queryString : ''}`);
    },
    receive: (data) => fetchAPI('/transactions/receive', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    sale: (data) => fetchAPI('/transactions/sale', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    manufacture: (data) => fetchAPI('/transactions/manufacture', {
        method: 'POST',
        body: JSON.stringify(data)
    })
};

// Reports API
export const reportsAPI = {
    getDashboard: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/dashboard${queryString ? '?' + queryString : ''}`);
    },
    getInventory: () => fetchAPI('/reports/inventory'),
    getSales: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/sales${queryString ? '?' + queryString : ''}`);
    },
    getPurchases: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/purchases${queryString ? '?' + queryString : ''}`);
    },
    getMargin: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/margin${queryString ? '?' + queryString : ''}`);
    },
    getTopCustomers: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/top-customers${queryString ? '?' + queryString : ''}`);
    },
    getProductMovement: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return fetchAPI(`/reports/product-movement${queryString ? '?' + queryString : ''}`);
    }
};

// Customers API
export const customersAPI = {
    getAll: () => fetchAPI('/customers'),
    create: (data) => fetchAPI('/customers', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getHistory: (id, filters = {}) => {
        const query = new URLSearchParams(filters).toString();
        return fetchAPI(`/customers/${id}/history?${query}`);
    },
    update: (id, data) => fetchAPI(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    })
};

// Pending Sales API
export const pendingSalesAPI = {
    getAll: () => fetchAPI('/pending-sales'),
    create: (data) => fetchAPI('/pending-sales', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    complete: (id) => fetchAPI(`/pending-sales/${id}/complete`, {
        method: 'PUT'
    }),
    delete: (id) => fetchAPI(`/pending-sales/${id}`, {
        method: 'DELETE'
    })
};

// Health check
export const healthCheck = () => fetchAPI('/health');
