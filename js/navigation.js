import { setCurrentView } from './state.js';

// Initialize navigation
export function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const viewName = link.dataset.view;
            switchView(viewName);
        });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavLinksContainer = document.querySelector('.nav-links'); // Renamed to avoid conflict with 'navLinks' above

    if (mobileMenuToggle && mobileNavLinksContainer) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            mobileNavLinksContainer.classList.toggle('active');
        });

        // Close menu when a link is clicked
        mobileNavLinksContainer.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                mobileNavLinksContainer.classList.remove('active');
            });
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
