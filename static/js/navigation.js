// Standardized Navigation System for CollabFund
// Enforces consistent navigation structure across all pages

let currentUser = null;
let isAuthenticated = false;

// Initialize navigation when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
});

// Initialize the navigation system
async function initializeNavigation() {
    await checkAuthStatus();
    renderNavigation();
    enforceAccessControl();
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                isAuthenticated = true;
            } else {
                isAuthenticated = false;
                currentUser = null;
            }
        } else {
            isAuthenticated = false;
            currentUser = null;
        }
    } catch (error) {
        isAuthenticated = false;
        currentUser = null;
    }
}

// Render navigation based on authentication status
function renderNavigation() {
    const navLinksContainer = document.querySelector('.nav-links');
    const navAuthContainer = document.getElementById('nav-auth');
    
    if (!navLinksContainer || !navAuthContainer) {
        console.error('Navigation containers not found');
        return;
    }

    // Get current page for active state
    const currentPage = window.location.pathname;
    
    if (isAuthenticated) {
        // Authenticated user navigation: CollabFund, Home, Browse Projects, Discussion, Dashboard, Notification Center, Profile
        navLinksContainer.innerHTML = `
            <a href="/" ${currentPage === '/' || currentPage === '/index.html' ? 'class="active"' : ''}><i class="bi bi-house-door-fill"></i> Home</a>
            <a href="/browse.html" ${currentPage.includes('browse') ? 'class="active"' : ''}><i class="bi bi-search-heart-fill"></i> Browse Projects</a>
            <a href="/discussion.html" ${currentPage.includes('discussion') ? 'class="active"' : ''}><i class="fas fa-comments"></i> Discussion</a>
            <a href="/dashboard.html" ${currentPage.includes('dashboard') ? 'class="active"' : ''}><i class="fas fa-tachometer-alt"></i> Dashboard</a>
            <a href="#" onclick="toggleNotifications()" ${currentPage.includes('notifications') ? 'class="active"' : ''}><i class="fas fa-bell"></i> Notification Center</a>
        `;
        
        navAuthContainer.innerHTML = `
            <div class="user-profile">
                <button class="profile-btn" id="user-profile-btn">
                    <i class="fas fa-user-circle"></i>
                    <span id="user-greeting">${currentUser.username}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="dropdown-menu" id="dropdown-menu">
                    <a href="/profile.html" class="dropdown-item">
                        <i class="fas fa-user"></i>
                        Profile
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item" id="logout-btn">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </a>
                </div>
            </div>
            <div class="notification-panel" id="notification-panel" style="display: none;">
                <div class="notification-header">
                    <h3>Notifications</h3>
                    <button class="close-notifications" onclick="closeNotifications()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-content">
                    <div class="notification-item">
                        <i class="fas fa-info-circle"></i>
                        <span>Welcome to CollabFund! Complete your profile to get started.</span>
                    </div>
                    <div class="notification-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No new notifications</p>
                    </div>
                </div>
            </div>
        `;
        
        setupAuthenticatedEventListeners();
    } else {
        // Guest user navigation: CollabFund, Home, Browse Projects, Discussion, Login/Register
        navLinksContainer.innerHTML = `
            <a href="/" ${currentPage === '/' || currentPage === '/index.html' ? 'class="active"' : ''}><i class="bi bi-house-door-fill"></i> Home</a>
            <a href="/browse.html" ${currentPage.includes('browse') ? 'class="active"' : ''}><i class="bi bi-search-heart-fill"></i> Browse Projects</a>
            <a href="/discussion.html" ${currentPage.includes('discussion') ? 'class="active"' : ''}><i class="fas fa-comments"></i> Discussion</a>
        `;
        
        navAuthContainer.innerHTML = `
            <a href="/login.html" class="login-btn"><i class="fas fa-sign-in-alt"></i> Login</a>
            <a href="/register.html" class="register-btn"><i class="fas fa-user-plus"></i> Register</a>
        `;
    }
}

// Setup event listeners for authenticated users
function setupAuthenticatedEventListeners() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (profileBtn && dropdownMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        if (dropdownMenu) {
            dropdownMenu.style.display = 'none';
        }
    });
}

// Enforce access control based on authentication status
function enforceAccessControl() {
    const currentPage = window.location.pathname;
    const protectedPages = ['/dashboard.html', '/profile.html'];
    const publicPages = ['/', '/index.html', '/browse.html', '/discussion.html', '/login.html', '/register.html'];
    
    // If user is not authenticated and trying to access protected pages
    if (!isAuthenticated && protectedPages.some(page => currentPage.includes(page.substring(1)))) {
        showMessage('Please login to access this page', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }
    
    // If user is authenticated and trying to access login/register pages
    if (isAuthenticated && (currentPage.includes('login') || currentPage.includes('register'))) {
        window.location.href = '/dashboard.html';
        return;
    }
}

// Notification Center functionality
function toggleNotifications() {
    const notificationPanel = document.getElementById('notification-panel');
    if (notificationPanel) {
        const isVisible = notificationPanel.style.display === 'block';
        notificationPanel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            // Mark notifications as read when opened
            markNotificationsAsRead();
        }
    }
}

function closeNotifications() {
    const notificationPanel = document.getElementById('notification-panel');
    if (notificationPanel) {
        notificationPanel.style.display = 'none';
    }
}

function markNotificationsAsRead() {
    // Future implementation for marking notifications as read
    console.log('Notifications marked as read');
}

// Logout functionality
async function logout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            showMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showMessage('Logout failed', 'error');
        }
    } catch (error) {
        showMessage('Logout failed', 'error');
    }
}

// Show message to user (if not already defined)
function showMessage(text, type = 'info') {
    // Check if showMessage function already exists
    if (typeof window.showMessage === 'function') {
        window.showMessage(text, type);
        return;
    }
    
    // Create message container if it doesn't exist
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(messageContainer);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.style.cssText = `
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-width: 300px;
        word-wrap: break-word;
        background-color: ${
            type === 'success' ? '#10b981' :
            type === 'error' ? '#ef4444' :
            type === 'warning' ? '#f59e0b' :
            '#3b82f6'
        };
    `;
    messageDiv.textContent = text;
    
    messageContainer.appendChild(messageDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Export functions for global use
window.initializeNavigation = initializeNavigation;
window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;