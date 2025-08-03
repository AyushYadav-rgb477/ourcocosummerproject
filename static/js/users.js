// Users Discovery JavaScript functionality

let currentUser = null;
let currentPage = 1;
let currentSearch = '';
let isLoading = false;
let hasNextPage = false;
let totalUsers = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Load initial users
    loadUsers();
    
    // Setup search functionality
    setupSearch();
    
    // Setup enter key for search
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Setup search input changes
    document.getElementById('search-input').addEventListener('input', function() {
        const searchInput = this;
        const clearBtn = document.getElementById('clear-search');
        
        if (searchInput.value.trim()) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
        }
    });
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                updateNavbarForLoggedInUser(data.user);
            } else {
                showGuestNotice();
            }
        } else {
            showGuestNotice();
        }
    } catch (error) {
        console.log('User not authenticated');
        showGuestNotice();
    }
}

function updateNavbarForLoggedInUser(user) {
    const navAuth = document.getElementById('nav-auth');
    if (navAuth) {
        navAuth.innerHTML = `
            <div class="user-profile">
                <button class="profile-btn" id="user-profile-btn">
                    <i class="fas fa-user-circle"></i>
                    <span id="user-greeting">${user.username}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="dropdown-menu" id="dropdown-menu">
                    <a href="/dashboard.html" class="dropdown-item">
                        <i class="fas fa-tachometer-alt"></i>
                        Dashboard
                    </a>
                    <a href="/profile.html" class="dropdown-item">
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
        
        // Setup dropdown functionality
        setupUserDropdown();
    }
}

function setupUserDropdown() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (profileBtn && dropdownMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            if (dropdownMenu) {
                dropdownMenu.style.display = 'none';
            }
        });
        
        // Prevent dropdown from closing when clicking inside
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
}

function showGuestNotice() {
    document.getElementById('guest-notice').style.display = 'block';
}

function setupSearch() {
    // Setup search functionality is already handled in DOMContentLoaded
}

async function loadUsers(page = 1, search = '') {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: '20'
        });
        
        if (search.trim()) {
            params.append('search', search.trim());
        }
        
        const response = await fetch(`/api/users?${params}`);
        const data = await response.json();
        
        if (response.ok) {
            // Filter out current user from the list if authenticated
            let filteredUsers = data.users;
            if (currentUser) {
                filteredUsers = data.users.filter(user => user.id !== currentUser.id);
            }
            displayUsers(filteredUsers);
            totalUsers = data.total;
            hasNextPage = data.has_next;
            
            updateSearchStats();
            updatePagination(page, data.has_prev, data.has_next);
            
            if (data.users.length === 0) {
                showEmptyState();
            } else {
                hideEmptyState();
            }
        } else {
            showMessage(data.error || 'Failed to load users', 'error');
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Network error. Please try again.', 'error');
        showEmptyState();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-grid');
    
    container.innerHTML = users.map(user => {
        const canInteract = currentUser && currentUser.id !== user.id;
        const isOwnProfile = currentUser && currentUser.id === user.id;
        
        let actionButtons = '';
        
        if (isOwnProfile) {
            actionButtons = `
                <div class="user-actions">
                    <a href="profile.html" class="action-btn">
                        <i class="fas fa-edit"></i> Edit Profile
                    </a>
                </div>
            `;
        } else if (canInteract) {
            actionButtons = `
                <div class="user-actions">
                    <button class="action-btn" onclick="followUser(${user.id})">
                        <i class="fas fa-user-plus"></i> Follow
                    </button>
                    <button class="action-btn secondary" onclick="viewProfile(${user.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            `;
        } else if (!currentUser) {
            actionButtons = `
                <div class="user-actions">
                    <button class="action-btn login-required" onclick="promptLogin()">
                        <i class="fas fa-sign-in-alt"></i> Login to Connect
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="user-card" onclick="viewProfile(${user.id})">
                <div class="user-header">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-info">
                        <h3>${escapeHtml(user.full_name)}</h3>
                        <p class="username">@${escapeHtml(user.username)}</p>
                        <p class="college">${escapeHtml(user.college)}</p>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="user-stat">
                        <span class="stat-number">0</span>
                        <span class="stat-label">Followers</span>
                    </div>
                    <div class="user-stat">
                        <span class="stat-number">0</span>
                        <span class="stat-label">Projects</span>
                    </div>
                    <div class="user-stat">
                        <span class="stat-number">0</span>
                        <span class="stat-label">Posts</span>
                    </div>
                </div>
                ${actionButtons}
            </div>
        `;
    }).join('');
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.trim();
    
    currentSearch = searchTerm;
    currentPage = 1;
    
    loadUsers(currentPage, currentSearch);
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    
    currentSearch = '';
    currentPage = 1;
    
    loadUsers(currentPage, currentSearch);
}

function updateSearchStats() {
    document.getElementById('total-users').textContent = totalUsers;
}

function updatePagination(page, hasPrev, hasNext) {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    
    if (totalUsers > 20) {
        pagination.style.display = 'flex';
        
        prevBtn.disabled = !hasPrev;
        nextBtn.disabled = !hasNext;
        pageInfo.textContent = `Page ${page}`;
        
        currentPage = page;
        hasNextPage = hasNext;
    } else {
        pagination.style.display = 'none';
    }
}

function loadPreviousPage() {
    if (currentPage > 1 && !isLoading) {
        loadUsers(currentPage - 1, currentSearch);
    }
}

function loadNextPage() {
    if (hasNextPage && !isLoading) {
        loadUsers(currentPage + 1, currentSearch);
    }
}

function viewProfile(userId) {
    window.location.href = `user-profile.html?id=${userId}`;
}

async function followUser(userId) {
    if (!currentUser) {
        promptLogin();
        return;
    }
    
    try {
        const response = await fetch('/api/follow-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Follow request sent successfully!', 'success');
            // You could update the button state here
        } else {
            showMessage(data.error || 'Failed to send follow request', 'error');
        }
    } catch (error) {
        console.error('Error sending follow request:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

function promptLogin() {
    showMessage('Please login to connect with users', 'info');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

function showLoading() {
    document.getElementById('loading-container').style.display = 'flex';
    document.getElementById('users-grid').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading-container').style.display = 'none';
    document.getElementById('users-grid').style.display = 'grid';
}

function showEmptyState() {
    document.getElementById('empty-container').style.display = 'flex';
    document.getElementById('users-grid').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
}

function hideEmptyState() {
    document.getElementById('empty-container').style.display = 'none';
    document.getElementById('users-grid').style.display = 'grid';
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
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type = 'info') {
    // Disabled popup messages as requested by user
    return;
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}