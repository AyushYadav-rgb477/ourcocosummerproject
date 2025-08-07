// Global Theme Management System
class ThemeManager {
    constructor() {
        this.storageKey = 'collabfund-theme';
        this.darkClass = 'dark-mode';
        this.lightClass = 'light-mode';
        this.init();
    }

    init() {
        // Get saved preference or default to light mode
        const savedTheme = localStorage.getItem(this.storageKey) || 'light';
        this.setTheme(savedTheme);
        this.createToggleButton();
        this.addEventListeners();
    }

    getCurrentTheme() {
        return document.documentElement.classList.contains(this.darkClass) ? 'dark' : 'light';
    }

    setTheme(theme) {
        const html = document.documentElement;
        const body = document.body;
        
        // Remove existing theme classes
        html.classList.remove(this.darkClass, this.lightClass);
        body.classList.remove(this.darkClass, this.lightClass);
        
        // Add new theme class
        if (theme === 'dark') {
            html.classList.add(this.darkClass);
            body.classList.add(this.darkClass);
        } else {
            html.classList.add(this.lightClass);
            body.classList.add(this.lightClass);
        }
        
        // Save preference
        localStorage.setItem(this.storageKey, theme);
        
        // Update toggle button
        this.updateToggleButton(theme);
    }

    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    createToggleButton() {
        // Check if toggle already exists
        if (document.getElementById('theme-toggle')) return;
        
        // Create toggle button
        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle dark mode');
        toggle.innerHTML = '<i class="fas fa-moon"></i>';
        
        // Add to navbar
        const navbar = document.querySelector('.navbar .nav-right') || document.querySelector('.navbar');
        if (navbar) {
            if (navbar.classList.contains('nav-right')) {
                navbar.insertBefore(toggle, navbar.firstChild);
            } else {
                navbar.appendChild(toggle);
            }
        }
    }

    updateToggleButton(theme) {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const icon = toggle.querySelector('i');
            if (theme === 'dark') {
                icon.className = 'fas fa-sun';
                toggle.setAttribute('aria-label', 'Switch to light mode');
            } else {
                icon.className = 'fas fa-moon';
                toggle.setAttribute('aria-label', 'Switch to dark mode');
            }
        }
    }

    addEventListeners() {
        // Toggle button click
        document.addEventListener('click', (e) => {
            if (e.target.closest('#theme-toggle')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener((e) => {
                // Only auto-switch if user hasn't manually set a preference
                const savedTheme = localStorage.getItem(this.storageKey);
                if (!savedTheme) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
}

// Initialize theme manager when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}