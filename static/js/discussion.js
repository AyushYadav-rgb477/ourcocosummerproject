// Discussion Page JavaScript - LinkedIn-style functionality with public access

let currentUser = null;
let isAuthenticated = false;
let currentPosts = [];
let activeFilter = 'all';

// Initialize the page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initializeEventListeners();
    loadPosts();
    loadTrendingTopics();
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

    // Update sidebar user info
    document.getElementById('sidebar-user-name').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('sidebar-user-college').textContent = currentUser.college || 'Student';
    
    // Enable post input
    const postInput = document.getElementById('post-input');
    postInput.disabled = false;
    postInput.placeholder = "Share your thoughts with the community...";
    
    // Hide guest notice
    document.getElementById('guest-notice').style.display = 'none';
    
    // Setup profile dropdown
    setupProfileDropdown();
    
    // Load user stats
    loadUserStats();
}

// Update UI for guest users
function updateUIForGuestUser() {
    // Keep default navigation (login/register buttons)
    
    // Update sidebar for guests
    document.getElementById('sidebar-user-name').textContent = 'Welcome to Discussion';
    document.getElementById('sidebar-user-college').textContent = 'Join the conversation';
    document.getElementById('user-posts-count').textContent = '-';
    document.getElementById('user-connections-count').textContent = '-';
    
    // Disable post input but make it clickable
    const postInput = document.getElementById('post-input');
    postInput.disabled = true;
    postInput.placeholder = "Join the conversation - Login to post...";
    
    // Show guest notice
    document.getElementById('guest-notice').style.display = 'block';
}

// Initialize event listeners
function initializeEventListeners() {
    // Filter tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveFilter(this.dataset.filter);
        });
    });
    
    // Post type selector in modal
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActivePostType(this.dataset.type);
        });
    });
    
    // Post form submission
    document.getElementById('post-form').addEventListener('submit', handlePostSubmission);
    
    // Close modal when clicking outside
    document.getElementById('post-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closePostModal();
        }
    });
    
    // Tags functionality
    initializeTagsHandling();
}

// Handle post input click
function handlePostInputClick() {
    if (!isAuthenticated) {
        showLoginPrompt();
    } else {
        showPostModal();
    }
}

// Show login prompt for guests
function showLoginPrompt() {
    showMessage('Please login to create posts and interact with the community', 'info');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 2000);
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

// Load user statistics
async function loadUserStats() {
    try {
        const response = await fetch('/api/user/stats');
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('user-posts-count').textContent = stats.posts_count || '0';
            document.getElementById('user-connections-count').textContent = stats.connections_count || '0';
        }
    } catch (error) {
        console.log('Failed to load user stats');
    }
}

// Filter functionality
function setActiveFilter(filter) {
    activeFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Reload posts with filter
    loadPosts();
}

// Post type selection in modal
function setActivePostType(type) {
    // Update active type button
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // Update additional fields based on post type
    updateAdditionalFields(type);
}

// Update additional fields based on post type
function updateAdditionalFields(type) {
    const additionalFields = document.getElementById('additional-fields');
    
    switch (type) {
        case 'poll':
            additionalFields.innerHTML = `
                <div class="poll-options">
                    <label>Poll Options (one per line):</label>
                    <textarea id="poll-options" placeholder="Option 1&#10;Option 2&#10;Option 3" rows="4"></textarea>
                </div>
            `;
            break;
        case 'event':
            additionalFields.innerHTML = `
                <div class="event-fields">
                    <input type="datetime-local" id="event-date" placeholder="Event Date">
                    <input type="text" id="event-location" placeholder="Event Location">
                </div>
            `;
            break;
        default:
            additionalFields.innerHTML = '';
    }
}

// Load posts from API
async function loadPosts() {
    showLoadingSkeleton();
    
    try {
        const params = new URLSearchParams();
        if (activeFilter !== 'all') {
            params.append('type', activeFilter);
        }
        
        const response = await fetch(`/api/posts?${params}`);
        if (response.ok) {
            const data = await response.json();
            currentPosts = data.posts;
            displayPosts(currentPosts);
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
        showEmptyState();
    }
}

// Display posts in the feed
function displayPosts(posts) {
    const postsContainer = document.getElementById('posts-feed');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const emptyState = document.getElementById('empty-state');
    
    loadingSkeleton.style.display = 'none';
    
    if (posts.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }
    
    // Clear existing posts except skeleton and empty state
    const existingPosts = postsContainer.querySelectorAll('.post-card');
    existingPosts.forEach(post => post.remove());
    
    // Add new posts
    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
}

// Create a post element
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.dataset.postId = post.id;
    
    const authorName = post.anonymous ? 'Anonymous' : (post.author ? post.author.full_name : 'Unknown User');
    const authorCollege = post.anonymous ? 'Student' : (post.author ? post.author.college : '');
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    
    // Calculate total reactions
    const reactionCounts = post.reaction_counts || {};
    const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
    
    postDiv.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="post-meta">
                <h4>${authorName}</h4>
                <p>${authorCollege} • ${timeAgo}</p>
            </div>
            <div class="post-type-badge">${post.post_type}</div>
        </div>
        
        <div class="post-content">
            <h3>${post.title}</h3>
            <p>${post.content}</p>
        </div>
        
        <div class="post-reactions">
            ${createReactionButtons(post.id, reactionCounts, totalReactions)}
            <button class="reaction-btn" onclick="toggleComments(${post.id})">
                <i class="fas fa-comment"></i>
                <span class="reaction-text">Comment</span>
                <span class="reaction-count">${post.comments_count > 0 ? post.comments_count : ''}</span>
            </button>
            <button class="reaction-btn" onclick="sharePost(${post.id})">
                <i class="fas fa-share"></i>
                <span class="reaction-text">Share</span>
            </button>
        </div>
        
        <div class="post-comments" id="comments-${post.id}" style="display: none;">
            <div class="comment-input-area">
                <input type="text" class="comment-input" placeholder="${isAuthenticated ? 'Write a comment...' : 'Login to comment'}" ${!isAuthenticated ? 'disabled' : ''} onkeypress="handleCommentKeyPress(event, ${post.id})">
                <button class="comment-submit" onclick="submitComment(${post.id})" ${!isAuthenticated ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <div class="comments-list" id="comments-list-${post.id}">
                <!-- Comments will be loaded here -->
            </div>
        </div>
    `;
    
    return postDiv;
}

// Create simple reaction buttons in a single row
function createReactionButtons(postId, reactionCounts, totalReactions) {
    return `
        <button class="reaction-btn" onclick="handleSimpleReaction(${postId})">
            <i class="fas fa-thumbs-up"></i>
            <span class="reaction-text">Like</span>
            <span class="reaction-count">${totalReactions > 0 ? totalReactions : ''}</span>
        </button>
    `;
}

// Simplified reaction functions - no picker needed

// Handle simple reaction (like only)
function handleSimpleReaction(postId) {
    if (!isAuthenticated) {
        showLoginPrompt();
        return;
    }
    handleReaction(postId, 'like');
}

// Handle reaction selection
async function handleReaction(postId, reactionType) {
    if (!isAuthenticated) {
        showLoginPrompt();
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}/reactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reaction_type: reactionType })
        });
        
        if (response.ok) {
            const data = await response.json();
            updateReactionCounts(postId, data.reaction_counts);
            showMessage(`Reaction ${data.message.split(' ')[1]}!`, 'success');
        } else {
            showMessage('Failed to update reaction', 'error');
        }
    } catch (error) {
        showMessage('Failed to update reaction', 'error');
    }
    
    // No picker to hide in simplified version
}

// Update reaction counts in UI
function updateReactionCounts(postId, reactionCounts) {
    const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
    const reactionCountElement = document.querySelector(`[data-post-id="${postId}"] .reaction-count`);
    if (reactionCountElement) {
        reactionCountElement.textContent = totalReactions;
    }
}

// Toggle comments section
async function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    const isVisible = commentsSection.style.display !== 'none';
    
    if (isVisible) {
        commentsSection.style.display = 'none';
    } else {
        commentsSection.style.display = 'block';
        await loadComments(postId);
    }
}

// Load comments for a post
async function loadComments(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        if (response.ok) {
            const data = await response.json();
            displayComments(postId, data.comments);
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
    }
}

// Display comments
function displayComments(postId, comments) {
    const commentsList = document.getElementById(`comments-list-${postId}`);
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="comment-content">
                <h5>${comment.author ? comment.author.full_name : 'Anonymous'}</h5>
                <p>${comment.content}</p>
                <span class="comment-time">${formatTimeAgo(new Date(comment.created_at))}</span>
            </div>
        </div>
    `).join('');
}

// Handle comment input key press
function handleCommentKeyPress(event, postId) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitComment(postId);
    }
}

// Submit comment
async function submitComment(postId) {
    if (!isAuthenticated) {
        showLoginPrompt();
        return;
    }
    
    const commentInput = document.querySelector(`#comments-${postId} .comment-input`);
    const content = commentInput.value.trim();
    
    if (!content) {
        showMessage('Please enter a comment', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            commentInput.value = '';
            await loadComments(postId);
            showMessage('Comment added successfully', 'success');
        } else {
            showMessage('Failed to add comment', 'error');
        }
    } catch (error) {
        showMessage('Failed to add comment', 'error');
    }
}

// Share post functionality
function sharePost(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on CollabFund',
            url: `${window.location.origin}/discussion.html#post-${postId}`
        });
    } else {
        // Fallback: copy link to clipboard
        const url = `${window.location.origin}/discussion.html#post-${postId}`;
        navigator.clipboard.writeText(url).then(() => {
            showMessage('Link copied to clipboard!', 'success');
        });
    }
}

// Show/hide loading skeleton
function showLoadingSkeleton() {
    document.getElementById('loading-skeleton').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
}

// Show empty state
function showEmptyState() {
    document.getElementById('loading-skeleton').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
}

// Modal functions
function showPostModal() {
    document.getElementById('post-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closePostModal() {
    document.getElementById('post-modal').classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Reset form
    document.getElementById('post-form').reset();
    document.getElementById('additional-fields').innerHTML = '';
    
    // Reset active type
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-type="discussion"]').classList.add('active');
}

// Handle post form submission
async function handlePostSubmission(event) {
    event.preventDefault();
    
    if (!isAuthenticated) {
        showLoginPrompt();
        return;
    }
    
    const formData = new FormData(event.target);
    const postData = {
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        type: document.querySelector('.type-btn.active').dataset.type,
        anonymous: document.getElementById('anonymous-post').checked,
        allowComments: document.getElementById('allow-comments').checked,
        tags: selectedTags
    };
    
    // Add type-specific data
    const activeType = document.querySelector('.type-btn.active').dataset.type;
    if (activeType === 'poll') {
        const pollOptions = document.getElementById('poll-options')?.value;
        if (pollOptions) {
            postData.pollOptions = pollOptions.split('\n').filter(option => option.trim());
        }
    } else if (activeType === 'event') {
        postData.eventDate = document.getElementById('event-date')?.value;
        postData.eventLocation = document.getElementById('event-location')?.value;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        if (response.ok) {
            closePostModal();
            // Clear form and tags
            document.getElementById('post-form').reset();
            selectedTags = [];
            renderSelectedTags();
            loadPosts(); // Reload posts to show the new one
        } else {
            const error = await response.json();
            showMessage(error.error || 'Failed to create post', 'error');
        }
    } catch (error) {
        showMessage('Failed to create post', 'error');
    }
}

// This function was replaced with an enhanced version below

// Load trending topics from API
async function loadTrendingTopics() {
    try {
        const response = await fetch('/api/trending-topics');
        if (response.ok) {
            const data = await response.json();
            displayTrendingTopics(data.topics);
        } else {
            displayTrendingTopics([]);
        }
    } catch (error) {
        console.log('Failed to load trending topics');
        displayTrendingTopics([]);
    }
}

// Display trending topics in the sidebar
function displayTrendingTopics(topics) {
    const topicsList = document.getElementById('trending-topics-list');
    
    if (topics.length === 0) {
        topicsList.innerHTML = `
            <div class="no-topics">
                <i class="fas fa-hashtag"></i>
                <span>No trending topics yet. Be the first to add hashtags to your posts!</span>
            </div>
        `;
        return;
    }
    
    topicsList.innerHTML = topics.map(topic => `
        <div class="topic-item">
            <span class="hashtag">${topic.hashtag}</span>
            <span class="post-count">${topic.count} post${topic.count !== 1 ? 's' : ''}</span>
        </div>
    `).join('');
}

// Show message to user
function showMessage(text, type = 'info') {
    // Disabled popup messages as requested by user
    return;
}

// Tags handling functionality
let selectedTags = [];

function initializeTagsHandling() {
    const tagsInput = document.getElementById('post-tags');
    const suggestedTags = document.querySelectorAll('.tag-suggestion');
    
    // Handle tag suggestions click
    suggestedTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const tagValue = this.dataset.tag;
            addTag(tagValue);
        });
    });
    
    // Handle Enter key in tags input
    tagsInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tagValue = this.value.trim().toLowerCase();
            if (tagValue) {
                addTag(tagValue);
                this.value = '';
            }
        }
    });
    
    // Handle comma separation
    tagsInput.addEventListener('input', function(e) {
        const value = this.value;
        if (value.includes(',')) {
            const tags = value.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
            tags.forEach(tag => addTag(tag));
            this.value = '';
        }
    });
}

function addTag(tagValue) {
    if (!tagValue || selectedTags.includes(tagValue)) return;
    
    selectedTags.push(tagValue);
    renderSelectedTags();
}

function removeTag(tagValue) {
    selectedTags = selectedTags.filter(tag => tag !== tagValue);
    renderSelectedTags();
}

function renderSelectedTags() {
    const selectedTagsContainer = document.getElementById('selected-tags');
    selectedTagsContainer.innerHTML = selectedTags.map(tag => `
        <span class="selected-tag">
            #${tag}
            <span class="remove-tag" onclick="removeTag('${tag}')">&times;</span>
        </span>
    `).join('');
}

// Enhanced time formatting with proper date handling
function formatTimeAgo(dateInput) {
    let date;
    
    // Handle different date input types
    if (typeof dateInput === 'string') {
        // Try to parse ISO string or other formats
        date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        // Fallback to current time if invalid
        date = new Date();
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
        return 'Just now';
    }
    
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    // For older posts, show the actual date
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}