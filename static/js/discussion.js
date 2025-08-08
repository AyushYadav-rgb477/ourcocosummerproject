// Discussion page JavaScript functionality

let currentUser = null;
let currentPage = 1;
let currentFilters = {
    search: '',
    category: '',
    sort: 'recent'
};
let currentDiscussion = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Setup filters and search
    setupFilters();
    
    // Setup modals
    setupModals();
    
    // Load initial discussions
    loadDiscussions();
    
    // Load community stats
    loadCommunityStats();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateNavbarForLoggedInUser();
            showStartDiscussionButton();
        }
    } catch (error) {
        console.log('User not authenticated');
    }
}

function updateNavbarForLoggedInUser() {
    const navAuth = document.getElementById('nav-auth');
    const dashboardLink = document.getElementById('dashboard-link');
    
    if (navAuth && currentUser) {
        navAuth.innerHTML = `
            <span class="user-greeting">Welcome, ${currentUser.username}!</span>
            <a href="profile.html" class="profile-link"><i class="fas fa-user"></i> Profile</a>
            <button class="logout-btn" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
        `;
    }
    
    if (dashboardLink) {
        dashboardLink.style.display = 'inline-flex';
    }
}

function showStartDiscussionButton() {
    const startDiscussionBtn = document.getElementById('start-discussion-btn');
    if (startDiscussionBtn) {
        startDiscussionBtn.style.display = 'block';
    }
}

function setupFilters() {
    const searchInput = document.getElementById('discussion-search');
    const categoryFilter = document.getElementById('discussion-category');
    const sortFilter = document.getElementById('discussion-sort');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleCategoryFilter);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', handleSortFilter);
    }
}

function handleSearch(e) {
    currentFilters.search = e.target.value;
    resetAndLoadDiscussions();
}

function handleCategoryFilter(e) {
    currentFilters.category = e.target.value;
    resetAndLoadDiscussions();
}

function handleSortFilter(e) {
    currentFilters.sort = e.target.value;
    resetAndLoadDiscussions();
}

function resetAndLoadDiscussions() {
    currentPage = 1;
    document.getElementById('discussions-container').innerHTML = '';
    loadDiscussions();
}

async function loadDiscussions() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingEl = document.getElementById('loading');
    const noDiscussionsEl = document.getElementById('no-discussions');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (noDiscussionsEl) noDiscussionsEl.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            per_page: 10,
            sort: currentFilters.sort
        });
        
        if (currentFilters.category) {
            params.append('category', currentFilters.category);
        }
        
        if (currentFilters.search) {
            params.append('search', currentFilters.search);
        }
        
        // Mock API call - replace with actual API endpoint
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
        
        // Mock data for now
        const mockDiscussions = [
            {
                id: 1,
                title: "Best practices for sustainable tech projects",
                content: "I'm looking for advice on how to make technology projects more environmentally friendly...",
                author: { full_name: "Alex Johnson", username: "alexj" },
                category: "tech",
                replies: 12,
                likes: 8,
                created_at: new Date().toISOString(),
                tags: ["sustainability", "technology", "environment"]
            },
            {
                id: 2,
                title: "Funding opportunities for healthcare innovations",
                content: "Does anyone know about specific funding programs for healthcare-related student projects?",
                author: { full_name: "Sarah Chen", username: "sarahc" },
                category: "healthcare",
                replies: 6,
                likes: 15,
                created_at: new Date().toISOString(),
                tags: ["funding", "healthcare", "innovation"]
            }
        ];
        
        displayDiscussions(mockDiscussions, currentPage === 1);
        
        // Show no results if no discussions
        if (mockDiscussions.length === 0 && currentPage === 1) {
            if (noDiscussionsEl) noDiscussionsEl.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading discussions:', error);
        showMessage('Error loading discussions', 'error');
    } finally {
        isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function displayDiscussions(discussions, clearExisting = false) {
    const discussionsContainer = document.getElementById('discussions-container');
    if (!discussionsContainer) return;
    
    if (clearExisting) {
        discussionsContainer.innerHTML = '';
    }
    
    const discussionsHTML = discussions.map(discussion => `
        <div class="discussion-item" onclick="openDiscussionModal(${discussion.id})">
            <div class="discussion-meta">
                <div class="author-info">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(discussion.author.full_name)}</span>
                    <span class="discussion-category">${discussion.category}</span>
                </div>
                <div class="discussion-stats-inline">
                    <span class="stat">
                        <i class="fas fa-comments"></i>
                        <span>${discussion.replies}</span>
                    </span>
                    <span class="stat">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${discussion.likes}</span>
                    </span>
                    <span class="stat">
                        <i class="fas fa-clock"></i>
                        <span>${formatDate(discussion.created_at)}</span>
                    </span>
                </div>
            </div>
            <h3 class="discussion-title">${escapeHtml(discussion.title)}</h3>
            <p class="discussion-preview">${escapeHtml(discussion.content.substring(0, 150))}</p>
            <div class="discussion-tags">
                ${discussion.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
    `).join('');
    
    discussionsContainer.insertAdjacentHTML('beforeend', discussionsHTML);
}

async function loadCommunityStats() {
    try {
        // Mock stats data
        const stats = {
            totalDiscussions: 142,
            activeMembers: 89,
            ideasShared: 67
        };
        
        document.getElementById('total-discussions').textContent = stats.totalDiscussions;
        document.getElementById('active-members').textContent = stats.activeMembers;
        document.getElementById('ideas-shared').textContent = stats.ideasShared;
        
    } catch (error) {
        console.error('Error loading community stats:', error);
    }
}

function setupModals() {
    const startDiscussionBtn = document.getElementById('start-discussion-btn');
    const createDiscussionBtn = document.getElementById('create-discussion-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    if (startDiscussionBtn) {
        startDiscussionBtn.addEventListener('click', openStartDiscussionModal);
    }
    
    if (createDiscussionBtn) {
        createDiscussionBtn.addEventListener('click', handleCreateDiscussion);
    }
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

function openStartDiscussionModal() {
    if (!currentUser) {
        showMessage('Please login to start a discussion', 'error');
        return;
    }
    
    const modal = document.getElementById('discussion-modal');
    modal.classList.add('show');
}

async function handleCreateDiscussion() {
    const title = document.getElementById('discussion-title').value;
    const category = document.getElementById('discussion-category-modal').value;
    const content = document.getElementById('discussion-content').value;
    const tags = document.getElementById('discussion-tags').value;
    
    if (!title.trim() || !content.trim()) {
        showMessage('Title and content are required', 'error');
        return;
    }
    
    const createBtn = document.getElementById('create-discussion-btn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        // Mock API call - replace with actual API endpoint
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showMessage('Discussion created successfully!', 'success');
        closeModals();
        
        // Clear form
        document.getElementById('discussion-title').value = '';
        document.getElementById('discussion-category-modal').value = '';
        document.getElementById('discussion-content').value = '';
        document.getElementById('discussion-tags').value = '';
        
        // Reload discussions
        resetAndLoadDiscussions();
        
    } catch (error) {
        console.error('Error creating discussion:', error);
        showMessage('Error creating discussion', 'error');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-plus"></i> Create Discussion';
    }
}

async function openDiscussionModal(discussionId) {
    try {
        // Mock API call - replace with actual API endpoint
        const mockDiscussion = {
            id: discussionId,
            title: "Best practices for sustainable tech projects",
            content: "I'm looking for advice on how to make technology projects more environmentally friendly. What are some strategies you've used in your projects?",
            author: { full_name: "Alex Johnson", username: "alexj" },
            category: "tech",
            replies: 12,
            likes: 8,
            created_at: new Date().toISOString(),
            tags: ["sustainability", "technology", "environment"]
        };
        
        currentDiscussion = mockDiscussion;
        displayDiscussionModal(mockDiscussion);
        loadDiscussionReplies(discussionId);
        
        const modal = document.getElementById('view-discussion-modal');
        modal.classList.add('show');
        
    } catch (error) {
        console.error('Error loading discussion:', error);
        showMessage('Error loading discussion details', 'error');
    }
}

function displayDiscussionModal(discussion) {
    document.getElementById('view-discussion-title').textContent = discussion.title;
    document.getElementById('view-discussion-author').textContent = discussion.author.full_name;
    document.getElementById('view-discussion-replies').textContent = discussion.replies;
    document.getElementById('view-discussion-likes').textContent = discussion.likes;
    document.getElementById('view-discussion-date').textContent = formatDate(discussion.created_at);
    document.getElementById('view-discussion-content').textContent = discussion.content;
    
    // Display tags
    const tagsContainer = document.getElementById('view-discussion-tags');
    tagsContainer.innerHTML = discussion.tags.map(tag => 
        `<span class="tag">${escapeHtml(tag)}</span>`
    ).join('');
}

async function loadDiscussionReplies(discussionId) {
    try {
        // Mock replies data
        const mockReplies = [
            {
                id: 1,
                content: "Great question! I've found that using renewable energy sources for development environments helps a lot.",
                author: { full_name: "Maria Garcia" },
                created_at: new Date().toISOString()
            }
        ];
        
        displayReplies(mockReplies);
    } catch (error) {
        console.error('Error loading replies:', error);
    }
}

function displayReplies(replies) {
    const repliesContainer = document.getElementById('discussion-replies');
    if (!repliesContainer) return;
    
    if (replies.length === 0) {
        repliesContainer.innerHTML = '<p style="color: #999; text-align: center;">No replies yet. Be the first to reply!</p>';
        return;
    }
    
    repliesContainer.innerHTML = replies.map(reply => `
        <div class="reply-item">
            <div class="reply-author">${escapeHtml(reply.author.full_name)}</div>
            <div class="reply-content">${escapeHtml(reply.content)}</div>
            <div class="reply-date">${formatDate(reply.created_at)}</div>
        </div>
    `).join('');
}

function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('show'));
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function showMessage(message, type) {
    // Create and show toast message
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}