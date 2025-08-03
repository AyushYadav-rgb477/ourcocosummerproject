// User Profile JavaScript functionality

let currentUser = null;
let profileUser = null;
let currentUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Get user ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
        showError('No user ID provided');
        return;
    }
    
    currentUserId = parseInt(userId);
    
    // Load user profile
    loadUserProfile(currentUserId);
    
    // Setup tab switching
    setupTabs();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                updateNavbarForLoggedInUser(data.user);
            }
        }
    } catch (error) {
        console.log('User not authenticated');
    }
}

function updateNavbarForLoggedInUser(user) {
    const navAuth = document.getElementById('nav-auth');
    if (navAuth) {
        navAuth.innerHTML = `
            <div class="user-dropdown">
                <button class="user-profile-btn" id="user-profile-btn">
                    <i class="fas fa-user-circle"></i>
                    <span>Welcome, ${user.username}!</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="dropdown-menu" id="dropdown-menu">
                    <a href="profile.html" class="dropdown-item">
                        <i class="fas fa-user"></i> View Profile
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item" onclick="handleLogout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>
        `;
        
        // Setup dropdown functionality
        setupUserDropdown();
    }
    
    // Hide auth-only elements for guests
    const authOnlyElements = document.querySelectorAll('.auth-only');
    authOnlyElements.forEach(element => {
        element.style.display = 'block';
    });
}

function setupUserDropdown() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    if (profileBtn && dropdownMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
            profileBtn.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('active');
            profileBtn.classList.remove('active');
        });
        
        // Prevent dropdown from closing when clicking inside
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

async function loadUserProfile(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        
        if (response.ok) {
            profileUser = data.user;
            displayUserProfile(data);
            hideLoading();
            showProfileContent();
        } else {
            showError(data.error || 'Failed to load user profile');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showError('Network error. Please try again.');
    }
}

function displayUserProfile(data) {
    const { user, projects, stats, following_status, can_interact } = data;
    
    // Update profile header
    document.getElementById('user-name').textContent = user.full_name;
    document.getElementById('user-college').textContent = user.college;
    document.getElementById('user-username').textContent = `@${user.username}`;
    
    // Update stats
    document.getElementById('followers-count').textContent = stats.followers_count;
    document.getElementById('following-count').textContent = stats.following_count;
    document.getElementById('projects-count').textContent = stats.projects_count;
    document.getElementById('posts-count').textContent = stats.posts_count;
    
    // Update about section
    document.getElementById('about-college').textContent = user.college;
    document.getElementById('total-funding').textContent = `$${stats.total_funding_received.toFixed(2)}`;
    document.getElementById('member-since').textContent = formatDate(user.created_at);
    
    // Display projects
    displayUserProjects(projects);
    
    // Setup action buttons
    setupActionButtons(following_status, can_interact, user);
}

function displayUserProjects(projects) {
    const container = document.getElementById('user-projects');
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No projects yet</h3>
                <p>This user hasn't created any projects yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="project-card" onclick="viewProject(${project.id})">
            <div class="project-header">
                <span class="project-category">${project.category}</span>
                <span class="project-status ${project.status}">${project.status}</span>
            </div>
            <h3 class="project-title">${escapeHtml(project.title)}</h3>
            <p class="project-description">${escapeHtml(project.description.substring(0, 150))}${project.description.length > 150 ? '...' : ''}</p>
            <div class="project-stats">
                <div class="project-stat">
                    <i class="fas fa-thumbs-up"></i>
                    <span>${project.vote_count}</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-dollar-sign"></i>
                    <span>$${project.current_funding.toFixed(2)}</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-users"></i>
                    <span>${project.collaboration_count}</span>
                </div>
                <div class="project-stat">
                    <i class="fas fa-comments"></i>
                    <span>${project.comment_count}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupActionButtons(followingStatus, canInteract, user) {
    const container = document.getElementById('profile-actions');
    
    if (!canInteract) {
        // Show login prompt or own profile message
        if (!currentUser) {
            container.innerHTML = `
                <p style="color: rgba(255, 255, 255, 0.7); text-align: center; margin: 0;">
                    <a href="login.html" style="color: #ffd700;">Login</a> to connect with this user
                </p>
            `;
        } else if (currentUser.id === currentUserId) {
            container.innerHTML = `
                <a href="profile.html" class="action-btn">
                    <i class="fas fa-edit"></i> Edit Profile
                </a>
            `;
        }
        return;
    }
    
    let followButton = '';
    if (followingStatus === 'following') {
        followButton = `
            <button class="action-btn following" disabled>
                <i class="fas fa-check"></i> Following
            </button>
        `;
    } else if (followingStatus === 'pending') {
        followButton = `
            <button class="action-btn pending" disabled>
                <i class="fas fa-clock"></i> Request Sent
            </button>
        `;
    } else {
        followButton = `
            <button class="action-btn" onclick="openFollowModal('${user.full_name}')">
                <i class="fas fa-user-plus"></i> Follow
            </button>
        `;
    }
    
    container.innerHTML = `
        ${followButton}
        <button class="action-btn secondary" onclick="openCollaborationModal()">
            <i class="fas fa-handshake"></i> Collaborate
        </button>
    `;
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            this.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Modal functions
function openFollowModal(userName) {
    document.getElementById('follow-user-name').textContent = userName;
    document.getElementById('follow-modal').classList.add('show');
}

function closeFollowModal() {
    document.getElementById('follow-modal').classList.remove('show');
}

function openCollaborationModal() {
    loadUserProjects().then(() => {
        document.getElementById('collaboration-modal').classList.add('show');
    });
}

function closeCollaborationModal() {
    document.getElementById('collaboration-modal').classList.remove('show');
}

async function loadUserProjects() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            const projectSelect = document.getElementById('project-select');
            
            projectSelect.innerHTML = '<option value="">Choose a project...</option>';
            
            data.projects.forEach(project => {
                if (project.status === 'active') {
                    projectSelect.innerHTML += `
                        <option value="${project.id}">${escapeHtml(project.title)}</option>
                    `;
                }
            });
        }
    } catch (error) {
        console.error('Error loading user projects:', error);
    }
}

async function sendFollowRequest() {
    if (!currentUser) {
        showMessage('Please login to send follow requests', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/follow-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUserId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Follow request sent successfully!', 'success');
            closeFollowModal();
            // Reload profile to update button state
            setTimeout(() => {
                loadUserProfile(currentUserId);
            }, 1000);
        } else {
            showMessage(data.error || 'Failed to send follow request', 'error');
        }
    } catch (error) {
        console.error('Error sending follow request:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function sendCollaborationRequest() {
    if (!currentUser) {
        showMessage('Please login to send collaboration requests', 'error');
        return;
    }
    
    const projectId = document.getElementById('project-select').value;
    const message = document.getElementById('collaboration-message').value;
    
    if (!projectId) {
        showMessage('Please select a project', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/collaboration-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                project_id: parseInt(projectId),
                message: message
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Collaboration request sent successfully!', 'success');
            closeCollaborationModal();
            // Reset form
            document.getElementById('project-select').value = '';
            document.getElementById('collaboration-message').value = '';
        } else {
            showMessage(data.error || 'Failed to send collaboration request', 'error');
        }
    } catch (error) {
        console.error('Error sending collaboration request:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// Helper functions
function viewProject(projectId) {
    window.location.href = `browse.html?project=${projectId}`;
}

function hideLoading() {
    document.getElementById('loading-container').style.display = 'none';
}

function showProfileContent() {
    document.getElementById('profile-content').style.display = 'block';
}

function showError(message) {
    hideLoading();
    document.getElementById('error-container').style.display = 'block';
    showMessage(message, 'error');
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.reload();
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
        month: 'long'
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
    
    // Remove message after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}