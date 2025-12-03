// API Configuration - Import from config
import { API_BASE_URL } from './config.js';

// Helper function for fetch requests
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Products API
export const productsAPI = {
    getAll: () => fetchAPI('/products'),
    getOne: (id) => fetchAPI(`/products/${id}`),
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
    }
};

// Health check
export const healthCheck = () => fetchAPI('/health');
