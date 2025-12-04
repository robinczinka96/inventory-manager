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
    const icon = isLightMode ? '☀️' : '🌙';

    // We need to import showToast, but for simplicity, we'll use a custom event
    window.dispatchEvent(new CustomEvent('themechange', {
        detail: { isLightMode, message: `${icon} ${message}` }
    }));
}

function updateThemeButton(isLightMode) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const iconSpan = themeToggle.querySelector('.theme-icon');

    if (iconSpan) {
        iconSpan.textContent = isLightMode ? '☀️' : '🌙';
    }

    // Update aria-label for accessibility
    themeToggle.setAttribute('aria-label', isLightMode ? 'Váltás sötét módra' : 'Váltás világos módra');
}
```
