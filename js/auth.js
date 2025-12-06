// Simple authentication module
import { showToast, showModal, closeModal, getIcon } from './ui-components.js';
const AUTH_KEY = 'stockmate_auth';
const DEFAULT_CREDENTIALS = {
    username: 'klebikaletta',
    password: '1216'
};

export function initAuth() {
    // Check if already logged in
    if (isAuthenticated()) {
        return true;
    }

    // Show login screen
    showLoginScreen();
    return false;
}

export function isAuthenticated() {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return false;

    try {
        const { username, timestamp } = JSON.parse(authData);
        // Session expires after 24 hours
        const sessionDuration = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp > sessionDuration) {
            logout();
            return false;
        }
        return !!username;
    } catch {
        return false;
    }
}

export function login(username, password) {
    // Simple validation (in production, this should be server-side)
    if (username === DEFAULT_CREDENTIALS.username &&
        password === DEFAULT_CREDENTIALS.password) {

        localStorage.setItem(AUTH_KEY, JSON.stringify({
            username,
            timestamp: Date.now()
        }));

        return true;
    }

    return false;
}

export function logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.reload();
}

export function getCurrentUser() {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return null;

    try {
        const { username } = JSON.parse(authData);
        return username;
    } catch {
        return null;
    }
}

function showLoginScreen() {
    const loginHTML = `
        <div id="login-screen" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        ">
            <div style="
                background: rgba(255, 255, 255, 0.95);
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
            ">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem; color: var(--color-primary);">${getIcon('package', 'w-16 h-16')}</div>
                    <h1 style="
                        font-size: 1.75rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                    ">StockMate Pro</h1>
                    <p style="color: #666; margin-top: 0.5rem;">Jelentkezzen be a folytatáshoz</p>
                </div>
                
                <form id="login-form" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">
                            Felhasználónév
                        </label>
                        <input 
                            type="text" 
                            id="login-username" 
                            required
                            autocomplete="username"
                            style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 2px solid #e0e0e0;
                                border-radius: 0.5rem;
                                font-size: 1rem;
                                transition: all 0.3s;
                                box-sizing: border-box;
                            "
                            onfocus="this.style.borderColor='#667eea'"
                            onblur="this.style.borderColor='#e0e0e0'"
                        >
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">
                            Jelszó
                        </label>
                        <input 
                            type="password" 
                            id="login-password" 
                            required
                            autocomplete="current-password"
                            style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 2px solid #e0e0e0;
                                border-radius: 0.5rem;
                                font-size: 1rem;
                                transition: all 0.3s;
                                box-sizing: border-box;
                            "
                            onfocus="this.style.borderColor='#667eea'"
                            onblur="this.style.borderColor='#e0e0e0'"
                        >
                    </div>
                    
                    <div id="login-error" style="
                        color: #f55;
                        font-size: 0.875rem;
                        display: none;
                        padding: 0.5rem;
                        background: #fee;
                        border-radius: 0.25rem;
                        text-align: center;
                    "></div>
                    
                    <button 
                        type="submit"
                        style="
                            width: 100%;
                            padding: 0.875rem;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            border-radius: 0.5rem;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s;
                            margin-top: 0.5rem;
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 20px rgba(102, 126, 234, 0.3)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                    >
                        Bejelentkezés
                    </button>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', loginHTML);

    const form = document.getElementById('login-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        if (login(username, password)) {
            document.getElementById('login-screen').remove();
            window.location.reload();
        } else {
            errorDiv.textContent = 'Hibás felhasználónév vagy jelszó!';
            errorDiv.style.display = 'block';
        }
    });

    // Focus username field
    setTimeout(() => {
        document.getElementById('login-username').focus();
    }, 100);
}
