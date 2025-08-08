// Dashboard JavaScript functionality

let currentUser = null;
let currentSection = 'overview';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthAndLoadDashboard();
    
    // Setup navigation
    setupSidebarNavigation();
    
    // Setup forms
    setupProjectForm();
    
    // Setup logout
    setupLogout();
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
    
    // For now, show empty state as collaboration management would require additional backend endpoints
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-handshake"></i>
            <h3>No collaboration requests</h3>
            <p>Collaboration requests will appear here when other users want to work with you.</p>
        </div>
    `;
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
