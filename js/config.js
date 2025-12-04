// Environment configuration
const ENV = {
    development: {
        API_URL: 'http://localhost:3000/api'
    },
    production: {
        API_URL: 'https://inventory-backend-efva.onrender.com/api'
    }
};

// Automatikus környezet detektálás
const isProduction = window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

export const API_BASE_URL = isProduction ? ENV.production.API_URL : ENV.development.API_URL;

console.log('Environment:', isProduction ? 'Production' : 'Development');
console.log('API URL:', API_BASE_URL);
