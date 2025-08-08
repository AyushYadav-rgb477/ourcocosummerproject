// Dashboard JavaScript functionality

let currentUser = null;
let currentSection = 'overview';
let notifications = [];
let unreadCount = 0;
let currentNotificationFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthAndLoadDashboard();
    
    // Setup navigation
    setupSidebarNavigation();
    
    // Setup forms
    setupProjectForm();
    
    // Setup logout
    setupLogout();
    
    // Setup notifications
    setupNotifications();
    
    // Start notification polling
    startNotificationPolling();
});

async function checkAuthAndLoadDashboard() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserGreeting();
            loadDashboardData();
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

function updateUserGreeting() {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl && currentUser) {
        greetingEl.textContent = `Welcome, ${currentUser.username}!`;
    }
}

function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const section = this.getAttribute('data-section');
            if (section) {
                switchSection(section);
            }
        });
    });
}

function switchSection(section) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Show/hide content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');
    
    currentSection = section;
    
    // Load section-specific data
    loadSectionData(section);
}

async function loadSectionData(section) {
    switch(section) {
        case 'overview':
            loadDashboardStats();
            break;
        case 'my-projects':
            loadUserProjects();
            break;
        case 'collaborations':
            loadCollaborations();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

async function loadDashboardData() {
    await loadDashboardStats();
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data);
            displayRecentProjects(data.projects);
        } else {
            console.error('Failed to load dashboard stats');
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function updateDashboardStats(data) {
    document.getElementById('total-projects-count').textContent = data.total_projects;
    document.getElementById('total-funding-amount').textContent = `$${data.total_funding.toFixed(2)}`;
    document.getElementById('total-votes-count').textContent = data.total_votes;
    document.getElementById('total-collabs-count').textContent = '0'; // Will be updated when collaborations are loaded
}

function displayRecentProjects(projects) {
    const container = document.getElementById('recent-projects');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No projects yet</h3>
                <p>Create your first project to get started!</p>
            </div>
        `;
        return;
    }
    
    const recentProjects = projects.slice(0, 5);
    container.innerHTML = recentProjects.map(project => `
        <div class="activity-item">
            <div class="activity-info">
                <h4>${escapeHtml(project.title)}</h4>
                <p>${project.category} • Created ${formatDate(project.created_at)}</p>
            </div>
            <div class="activity-stats">
                <div class="activity-stat">
                    <i class="fas fa-thumbs-up"></i>
                    <span>${project.vote_count}</span>
                </div>
                <div class="activity-stat">
                    <i class="fas fa-dollar-sign"></i>
                    <span>$${project.current_funding.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupProjectForm() {
    const form = document.getElementById('project-form');
    if (form) {
        form.addEventListener('submit', handleProjectSubmission);
    }
}

async function handleProjectSubmission(e) {
    e.preventDefault();
    
    const title = document.getElementById('project-title').value;
    const category = document.getElementById('project-category').value;
    const description = document.getElementById('project-description').value;
    const fundingGoal = document.getElementById('funding-goal').value;
    
    const submitBtn = e.target.querySelector('.submit-btn');
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Project...';
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                category: category,
                description: description,
                fundingGoal: fundingGoal ? parseFloat(fundingGoal) : 0
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Project created successfully!', 'success');
            
            // Reset form
            e.target.reset();
            
            // Refresh dashboard data
            loadDashboardStats();
            
            // Switch to my projects section
            switchSection('my-projects');
        } else {
            showMessage(data.error || 'Failed to create project', 'error');
        }
    } catch (error) {
        console.error('Project creation error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Launch Project';
    }
}

async function loadUserProjects() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            displayUserProjects(data.projects);
        }
    } catch (error) {
        console.error('Error loading user projects:', error);
    }
}

function displayUserProjects(projects) {
    const container = document.getElementById('user-projects');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-plus-circle"></i>
                <h3>No projects yet</h3>
                <p>Create your first project to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="user-project-card">
            <div class="project-header">
                <h3>${escapeHtml(project.title)}</h3>
                <span class="project-status ${project.status}">${project.status}</span>
            </div>
            <div class="project-meta">
                <span class="project-category">${project.category}</span>
                <span class="project-date">${formatDate(project.created_at)}</span>
            </div>
            <p class="project-description">${escapeHtml(project.description.substring(0, 150))}${project.description.length > 150 ? '...' : ''}</p>
            <div class="project-stats">
                <div class="project-stat">
                    <i class="fas fa-thumbs-up"></i>
                    <span>${project.vote_count} votes</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-dollar-sign"></i>
                    <span>$${project.current_funding.toFixed(2)} / $${project.funding_goal.toFixed(2)}</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-users"></i>
                    <span>${project.collaboration_count} collaborators</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-comments"></i>
                    <span>${project.comment_count} comments</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadCollaborations() {
    const container = document.getElementById('collaboration-requests');
    if (!container) return;
    
    try {
        const response = await fetch('/api/collaborations');
        if (response.ok) {
            const data = await response.json();
            displayCollaborations(data.collaborations || []);
        } else {
            displayEmptyCollaborations();
        }
    } catch (error) {
        console.error('Error loading collaborations:', error);
        displayEmptyCollaborations();
    }
}

function displayCollaborations(collaborations) {
    const container = document.getElementById('collaboration-requests');
    if (!container) return;
    
    if (collaborations.length === 0) {
        displayEmptyCollaborations();
        return;
    }
    
    container.innerHTML = collaborations.map(collab => `
        <div class="collaboration-item">
            <div class="collaboration-header">
                <div class="collaboration-user">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(collab.requester?.full_name || 'Unknown User')}</span>
                </div>
                <span class="collaboration-status ${collab.status}">${collab.status}</span>
            </div>
            <div class="collaboration-project">
                <strong>Project:</strong> ${escapeHtml(collab.project?.title || 'Unknown Project')}
            </div>
            <div class="collaboration-message">
                "${escapeHtml(collab.message || 'No message provided')}"
            </div>
            <div class="collaboration-date">
                Requested ${formatDate(collab.created_at)}
            </div>
            ${collab.status === 'pending' ? `
                <div class="collaboration-actions">
                    <button class="action-btn accept" onclick="handleCollaborationResponse(${collab.id}, 'accept')">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="action-btn reject" onclick="handleCollaborationResponse(${collab.id}, 'reject')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function displayEmptyCollaborations() {
    const container = document.getElementById('collaboration-requests');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-handshake"></i>
            <h3>No collaboration requests</h3>
            <p>Collaboration requests will appear here when other users want to work with you.</p>
        </div>
    `;
}

async function handleCollaborationResponse(collabId, action) {
    try {
        const response = await fetch(`/api/collaborations/${collabId}/${action}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(`Collaboration request ${action}ed successfully!`, 'success');
            loadCollaborations(); // Reload collaborations
        } else {
            showMessage(data.error || `Error ${action}ing collaboration request`, 'error');
        }
    } catch (error) {
        console.error(`Error ${action}ing collaboration:`, error);
        showMessage(`Error ${action}ing collaboration request`, 'error');
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Error logging out', 'error');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container') || createMessageContainer();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}

// Notification System
function setupNotifications() {
    // Setup notification filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentNotificationFilter = this.getAttribute('data-filter');
            displayFilteredNotifications();
        });
    });
    
    // Setup notification action buttons
    const markAllReadBtn = document.getElementById('mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    }
    
    const clearAllBtn = document.getElementById('clear-notifications');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllNotifications);
    }
}

async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
            const data = await response.json();
            notifications = data.notifications || [];
            unreadCount = data.unread_count || 0;
            updateNotificationCount();
            displayFilteredNotifications();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        displayEmptyNotifications('Error loading notifications');
    }
}

function updateNotificationCount() {
    const countEl = document.getElementById('notification-count');
    if (countEl) {
        countEl.textContent = unreadCount;
        countEl.setAttribute('data-count', unreadCount);
    }
}

function displayFilteredNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    
    let filteredNotifications = notifications;
    
    if (currentNotificationFilter !== 'all') {
        filteredNotifications = notifications.filter(n => n.type === currentNotificationFilter);
    }
    
    if (filteredNotifications.length === 0) {
        displayEmptyNotifications('No notifications found');
        return;
    }
    
    container.innerHTML = filteredNotifications.map(notification => `
        <div class="notification-item ${notification.is_read ? '' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon ${notification.type}">
                ${getNotificationIcon(notification.type)}
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <div class="notification-message">${escapeHtml(notification.message)}</div>
                <div class="notification-time">${formatNotificationTime(notification.created_at)}</div>
                ${!notification.is_read ? `
                    <div class="notification-actions">
                        <button class="notification-action" onclick="markNotificationAsRead(${notification.id})">
                            <i class="fas fa-check"></i> Mark as Read
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function displayEmptyNotifications(message = 'No notifications yet') {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-bell"></i>
            <h3>${message}</h3>
            <p>You'll see notifications about your projects, collaborations, and interactions here.</p>
        </div>
    `;
}

function getNotificationIcon(type) {
    const icons = {
        'like': '<i class="fas fa-thumbs-up"></i>',
        'likes': '<i class="fas fa-thumbs-up"></i>',
        'comment': '<i class="fas fa-comment"></i>',
        'comments': '<i class="fas fa-comment"></i>',
        'collaboration': '<i class="fas fa-handshake"></i>',
        'collaborations': '<i class="fas fa-handshake"></i>',
        'project': '<i class="fas fa-rocket"></i>',
        'projects': '<i class="fas fa-rocket"></i>'
    };
    return icons[type] || '<i class="fas fa-bell"></i>';
}

function formatNotificationTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
        return 'Just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Update the notification in the local array
            const notification = notifications.find(n => n.id === notificationId);
            if (notification && !notification.is_read) {
                notification.is_read = true;
                unreadCount = Math.max(0, unreadCount - 1);
                updateNotificationCount();
                displayFilteredNotifications();
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        showMessage('Error updating notification', 'error');
    }
}

async function markAllNotificationsAsRead() {
    try {
        const response = await fetch('/api/notifications/mark-all-read', {
            method: 'POST'
        });
        
        if (response.ok) {
            notifications.forEach(n => n.is_read = true);
            unreadCount = 0;
            updateNotificationCount();
            displayFilteredNotifications();
            showMessage('All notifications marked as read', 'success');
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showMessage('Error updating notifications', 'error');
    }
}

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
            unreadCount = 0;
            updateNotificationCount();
            displayEmptyNotifications();
            showMessage('All notifications cleared', 'success');
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
        showMessage('Error clearing notifications', 'error');
    }
}

function startNotificationPolling() {
    // Poll for new notifications every 30 seconds
    setInterval(async () => {
        try {
            const response = await fetch('/api/notifications/count');
            if (response.ok) {
                const data = await response.json();
                const newUnreadCount = data.unread_count || 0;
                
                if (newUnreadCount > unreadCount) {
                    // New notifications arrived
                    if (currentSection === 'notifications') {
                        loadNotifications();
                    } else {
                        unreadCount = newUnreadCount;
                        updateNotificationCount();
                    }
                }
            }
        } catch (error) {
            console.log('Notification polling error:', error);
        }
    }, 30000);
}
