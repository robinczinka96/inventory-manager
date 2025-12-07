```javascript
import { getIcon } from './ui-components.js';
// Theme toggle functionality
export function initTheme() {
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
    // Icon update is handled by manipulating innerHTML directly below

    // We need to import showToast, but for simplicity, we'll use a custom event
    window.dispatchEvent(new CustomEvent('themechange', {
        detail: { isLightMode, message: `${ icon } ${ message } ` }
    }));
}

function updateThemeButton(isLightMode) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const iconSpan = document.querySelector('.theme-icon');
    if (iconSpan) {
        iconSpan.innerHTML = isLightMode ? getIcon('sun') : getIcon('moon');
    }

    // Update aria-label for accessibility
    themeToggle.setAttribute('aria-label', isLightMode ? 'Váltás sötét módra' : 'Váltás világos módra');
}
