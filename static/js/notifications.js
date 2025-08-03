// Notifications Page JavaScript

let currentUser = null;
let isAuthenticated = false;
let notifications = [];
let activeFilter = 'all';

// Initialize the page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initializeEventListeners();
});

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                isAuthenticated = true;
                updateUIForAuthenticatedUser();
                loadNotifications();
            } else {
                updateUIForGuestUser();
            }
        } else {
            updateUIForGuestUser();
        }
    } catch (error) {
        console.log('Auth check failed, assuming guest user');
        updateUIForGuestUser();
    }
}

// Update UI for authenticated users
function updateUIForAuthenticatedUser() {
    // Update navigation
    const navAuth = document.getElementById('nav-auth');
    navAuth.innerHTML = `
        <div class="user-profile">
            <button class="profile-btn" id="user-profile-btn">
                <i class="fas fa-user-circle"></i>
                <span id="user-greeting">${currentUser.username}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="dropdown-menu" id="dropdown-menu">
                <a href="dashboard.html" class="dropdown-item">
                    <i class="fas fa-tachometer-alt"></i>
                    Dashboard
                </a>
                <a href="profile.html" class="dropdown-item">
                    <i class="fas fa-user"></i>
                    View Profile
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item" id="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </a>
            </div>
        </div>
    `;
    
    // Hide guest notice
    document.getElementById('guest-notice').style.display = 'none';
    
    // Setup profile dropdown
    setupProfileDropdown();
}

// Update UI for guest users
function updateUIForGuestUser() {
    // Show guest notice
    document.getElementById('guest-notice').style.display = 'block';
    document.getElementById('loading-skeleton').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
}

// Setup profile dropdown functionality
function setupProfileDropdown() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (profileBtn) {
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

// Initialize event listeners
function initializeEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveFilter(this.dataset.filter);
        });
    });
    
    // Action buttons
    document.getElementById('mark-all-read').addEventListener('click', markAllAsRead);
    document.getElementById('clear-all').addEventListener('click', clearAllNotifications);
    
    // Close modal when clicking outside
    document.getElementById('reaction-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeReactionModal();
        }
    });
}

// Set active filter
function setActiveFilter(filter) {
    activeFilter = filter;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Filter and display notifications
    displayNotifications();
}

// Load notifications from API
async function loadNotifications() {
    showLoadingSkeleton();
    
    try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
            const data = await response.json();
            notifications = data.notifications || [];
            displayNotifications();
            updateNotificationBadge();
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
        showEmptyState();
    }
}

// Display notifications
function displayNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const emptyState = document.getElementById('empty-state');
    const guestNotice = document.getElementById('guest-notice');
    
    // Hide loading and other states
    loadingSkeleton.style.display = 'none';
    guestNotice.style.display = 'none';
    
    // Filter notifications
    let filteredNotifications = notifications;
    if (activeFilter !== 'all') {
        filteredNotifications = notifications.filter(n => n.type === activeFilter);
    }
    
    if (filteredNotifications.length === 0) {
        emptyState.style.display = 'block';
        // Clear existing notifications
        const existingNotifications = notificationsList.querySelectorAll('.notification-item');
        existingNotifications.forEach(item => item.remove());
        return;
    } else {
        emptyState.style.display = 'none';
    }
    
    // Clear existing notifications
    const existingNotifications = notificationsList.querySelectorAll('.notification-item');
    existingNotifications.forEach(item => item.remove());
    
    // Add filtered notifications
    filteredNotifications.forEach(notification => {
        const notificationElement = createNotificationElement(notification);
        notificationsList.appendChild(notificationElement);
    });
}

// Create notification element
function createNotificationElement(notification) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification-item ${!notification.read ? 'unread' : ''}`;
    notificationDiv.dataset.notificationId = notification.id;
    
    const timeAgo = formatTimeAgo(new Date(notification.created_at));
    const typeIcon = getNotificationTypeIcon(notification.type);
    const typeClass = notification.type.replace('s', ''); // Remove 's' from types like 'reactions'
    
    notificationDiv.innerHTML = `
        <div class="notification-content">
            <div class="notification-avatar">
                ${typeIcon}
            </div>
            <div class="notification-details">
                <p class="notification-text">
                    ${notification.message}
                    <span class="notification-type ${typeClass}">
                        <i class="${getNotificationTypeIcon(notification.type, true)}"></i>
                        ${notification.type}
                    </span>
                </p>
                <span class="notification-time">${timeAgo}</span>
            </div>
        </div>
    `;
    
    // Add click handler to mark as read and navigate
    notificationDiv.addEventListener('click', () => {
        markNotificationAsRead(notification.id);
        if (notification.link) {
            window.location.href = notification.link;
        }
    });
    
    return notificationDiv;
}

// Get notification type icon
function getNotificationTypeIcon(type, small = false) {
    const iconMap = {
        'reaction': small ? 'fas fa-heart' : '<i class="fas fa-heart"></i>',
        'reactions': small ? 'fas fa-heart' : '<i class="fas fa-heart"></i>',
        'comment': small ? 'fas fa-comment' : '<i class="fas fa-comment"></i>',
        'comments': small ? 'fas fa-comment' : '<i class="fas fa-comment"></i>',
        'collaboration': small ? 'fas fa-handshake' : '<i class="fas fa-handshake"></i>',
        'collaborations': small ? 'fas fa-handshake' : '<i class="fas fa-handshake"></i>',
        'donation': small ? 'fas fa-coins' : '<i class="fas fa-coins"></i>',
        'donations': small ? 'fas fa-coins' : '<i class="fas fa-coins"></i>'
    };
    
    return iconMap[type] || (small ? 'fas fa-bell' : '<i class="fas fa-bell"></i>');
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Update notification in local array
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
            }
            
            // Update UI
            const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.classList.remove('unread');
            }
            
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

// Mark all notifications as read
async function markAllAsRead() {
    try {
        const response = await fetch('/api/notifications/mark-all-read', {
            method: 'POST'
        });
        
        if (response.ok) {
            // Update all notifications in local array
            notifications.forEach(n => n.read = true);
            
            // Update UI
            document.querySelectorAll('.notification-item').forEach(item => {
                item.classList.remove('unread');
            });
            
            updateNotificationBadge();
            showMessage('All notifications marked as read', 'success');
        }
    } catch (error) {
        showMessage('Failed to mark all notifications as read', 'error');
    }
}

// Clear all notifications
async function clearAllNotifications() {
    if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/notifications/clear-all', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            notifications = [];
            displayNotifications();
            updateNotificationBadge();
            showMessage('All notifications cleared', 'success');
        }
    } catch (error) {
        showMessage('Failed to clear notifications', 'error');
    }
}

// Update notification badge
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Show loading skeleton
function showLoadingSkeleton() {
    document.getElementById('loading-skeleton').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('guest-notice').style.display = 'none';
}

// Show empty state
function showEmptyState() {
    document.getElementById('loading-skeleton').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('guest-notice').style.display = 'none';
}

// Logout functionality
async function logout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            showMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        showMessage('Logout failed', 'error');
    }
}

// Reaction modal functions
function showReactionModal(postId) {
    loadReactionDetails(postId);
    document.getElementById('reaction-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeReactionModal() {
    document.getElementById('reaction-modal').classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Load reaction details for modal
async function loadReactionDetails(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/reactions/details`);
        if (response.ok) {
            const data = await response.json();
            displayReactionDetails(data);
        }
    } catch (error) {
        console.error('Failed to load reaction details:', error);
    }
}

// Display reaction details in modal
function displayReactionDetails(data) {
    const tabs = document.getElementById('reaction-tabs');
    const usersList = document.getElementById('reaction-users-list');
    
    // Create reaction tabs
    tabs.innerHTML = '';
    const reactionTypes = Object.keys(data.reactions);
    
    reactionTypes.forEach((type, index) => {
        const count = data.reactions[type].length;
        const tab = document.createElement('button');
        tab.className = `reaction-tab ${index === 0 ? 'active' : ''}`;
        tab.dataset.reactionType = type;
        tab.innerHTML = `
            ${getReactionEmoji(type)} ${type} (${count})
        `;
        tab.addEventListener('click', () => showReactionUsers(type, data.reactions[type]));
        tabs.appendChild(tab);
    });
    
    // Show first reaction type by default
    if (reactionTypes.length > 0) {
        showReactionUsers(reactionTypes[0], data.reactions[reactionTypes[0]]);
    }
}

// Show users for specific reaction type
function showReactionUsers(reactionType, users) {
    const usersList = document.getElementById('reaction-users-list');
    
    // Update active tab
    document.querySelectorAll('.reaction-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-reaction-type="${reactionType}"]`).classList.add('active');
    
    // Display users
    usersList.innerHTML = users.map(user => `
        <div class="reaction-user-item">
            <div class="reaction-user-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="reaction-user-info">
                <p class="reaction-user-name">${user.full_name || user.username}</p>
                <p class="reaction-user-college">${user.college || 'Student'}</p>
            </div>
            <span class="reaction-emoji">${getReactionEmoji(reactionType)}</span>
        </div>
    `).join('');
}

// Get reaction emoji
function getReactionEmoji(reactionType) {
    const emojiMap = {
        'like': '👍',
        'celebrate': '🎉',
        'support': '❤️',
        'insightful': '💡',
        'curious': '🤔'
    };
    return emojiMap[reactionType] || '👍';
}

// Utility function to format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
}

// Show message to user
function showMessage(text, type = 'info') {
    const messageContainer = document.getElementById('message-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    messageContainer.appendChild(messageDiv);
    
    // Auto-remove after 1.5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 1500);
}