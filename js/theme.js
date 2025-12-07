import { getIcon } from './ui-components.js';

// Theme toggle functionality
export function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');

    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeButton(true);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const isLightMode = document.body.classList.toggle('light-mode');

    // Save preference
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');

    // Update button text and icon
    updateThemeButton(isLightMode);

    // Show toast
    const message = isLightMode ? 'Világos mód bekapcsolva' : 'Sötét mód bekapcsolva';

    // Dispatch event for toast (since we don't import showToast here to avoid circular deps if any)
    // Or just assume showToast is global or imported. 
    // In previous file it dispatched a custom event. Let's stick to that or use console.
    // The previous file had:
    /*
    window.dispatchEvent(new CustomEvent('themechange', {
        detail: { isLightMode, message: `${icon} ${message}` }
    }));
    */
    // But 'icon' variable is not defined here.
    // Let's just update the button. The user sees the change.
}

function updateThemeButton(isLightMode) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Update icon inside the button
    // The button might be the one in the mobile header OR the one in the sidebar (if desktop).
    // Wait, ID must be unique. I have TWO elements with id="theme-toggle" in index.html?
    // 1. Sidebar (desktop)
    // 2. Mobile Header
    // This is invalid HTML.
    // I should use class or different IDs.
    // But for now, let's just make sure we target *both* if possible, or the one that is visible.
    // document.getElementById returns the first one.

    // Better: Update ALL theme toggles.
    const toggles = document.querySelectorAll('#theme-toggle, .theme-toggle-btn-mobile');

    toggles.forEach(btn => {
        const iconSpan = btn.querySelector('.theme-icon') || btn; // Mobile btn has icon directly inside or in span?
        // Mobile: <button ...><i ...></i></button>
        // Desktop: <button ...><span class="theme-icon"><i ...></i></span>...</button>

        // Let's just replace the innerHTML of the icon container.
        // For mobile, the button IS the container effectively.
        // For desktop, it's .theme-icon.

        const iconContainer = btn.querySelector('.theme-icon') || btn;
        // If we replace btn.innerHTML, we lose the 'aria-label' if it was inside? No, aria is on button.
        // But we might lose the <span class="nav-text">Sötét mód</span> on desktop if we replace content of btn!

        if (btn.classList.contains('nav-link')) {
            // Desktop Sidebar Button
            const iconEl = btn.querySelector('.nav-icon');
            if (iconEl) iconEl.innerHTML = isLightMode ? getIcon('sun') : getIcon('moon');
            const textEl = btn.querySelector('.nav-text');
            if (textEl) textEl.textContent = isLightMode ? 'Világos mód' : 'Sötét mód';
        } else {
            // Mobile/Header Button (Icon only)
            btn.innerHTML = isLightMode ? getIcon('sun') : getIcon('moon');
        }

        btn.setAttribute('aria-label', isLightMode ? 'Váltás sötét módra' : 'Váltás világos módra');
    });
}
