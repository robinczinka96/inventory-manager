// Environment configuration
// Environment configuration
// Automatikus környezet detektálás
// Ha nem a localhost vagy 127.0.0.1, de nem is a production domain, akkor valószinűleg mobilról/hálózatról vagyunk.
const isProduction = window.location.hostname.includes('onrender.com') || window.location.hostname.includes('terrastock.hu'); // Vagy egyéb production domain check

// Ha production, használd a fix URL-t.
// Ha nem production (tehát local dev vagy LAN), használd a dinamikus hosztnevet a 3000-es porttal.
export const API_BASE_URL = isProduction
    ? 'https://inventory-backend-efva.onrender.com/api'
    : `http://${window.location.hostname}:3000/api`;

console.log('Environment:', isProduction ? 'Production' : 'Development/LAN');
console.log('API URL:', API_BASE_URL);
