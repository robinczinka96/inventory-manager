import { setCurrentView } from './state.js';
import { logout } from './auth.js';

// Initialize navigation
export function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const view = link.dataset.view;
            switchView(view);

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');

    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
        });

        // Close menu when clicking a nav link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinksContainer.classList.remove('active');
            });
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Biztosan ki szeretne jelentkezni?')) {
                logout();
            }
        });
    }
    // App Logo Navigation
    const appLogo = document.getElementById('app-logo');
    if (appLogo) {
        appLogo.addEventListener('click', () => {
            switchView('dashboard');
        });
    }
}

export function switchView(viewName) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewName);
    });

    // Update active view
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}-view`);
    });

    // Update state
    setCurrentView(viewName);

    // Dispatch custom event for view change
    window.dispatchEvent(new CustomEvent('viewchange', { detail: { view: viewName } }));
}
