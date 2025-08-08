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
        
        const response = await fetch(`/api/discussions?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayDiscussions(data.discussions, currentPage === 1);
            
            // Show no results if no discussions
            if (data.discussions.length === 0 && currentPage === 1) {
                if (noDiscussionsEl) noDiscussionsEl.style.display = 'block';
            }
        } else {
            console.error('Failed to load discussions');
            if (noDiscussionsEl) noDiscussionsEl.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading discussions:', error);
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
                        <i class="fas fa-calendar"></i>
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
        const response = await fetch('/api/discussions/stats');
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('total-discussions').textContent = stats.totalDiscussions || 0;
            document.getElementById('active-members').textContent = stats.activeMembers || 0;
            document.getElementById('ideas-shared').textContent = stats.ideasShared || 0;
        }
    } catch (error) {
        console.error('Error loading community stats:', error);
        // Set default values on error
        document.getElementById('total-discussions').textContent = '0';
        document.getElementById('active-members').textContent = '0';
        document.getElementById('ideas-shared').textContent = '0';
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
        window.location.href = '/login.html';
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
        alert('Title and content are required');
        return;
    }
    
    if (!category) {
        alert('Please select a category');
        return;
    }
    
    const createBtn = document.getElementById('create-discussion-btn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        const response = await fetch('/api/discussions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title.trim(),
                category,
                content: content.trim(),
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModals();
            
            // Clear form
            document.getElementById('discussion-title').value = '';
            document.getElementById('discussion-category-modal').value = '';
            document.getElementById('discussion-content').value = '';
            document.getElementById('discussion-tags').value = '';
            
            // Reload discussions
            resetAndLoadDiscussions();
        } else {
            alert(data.error || 'Error creating discussion');
        }
        
    } catch (error) {
        console.error('Error creating discussion:', error);
        alert('Error creating discussion');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-plus"></i> Create Discussion';
    }
}

async function openDiscussionModal(discussionId) {
    try {
        const response = await fetch(`/api/discussions/${discussionId}`);
        
        if (response.ok) {
            const data = await response.json();
            currentDiscussion = data.discussion;
            displayDiscussionModal(data.discussion);
            loadDiscussionReplies(discussionId);
            setupDiscussionActions();
            
            const modal = document.getElementById('view-discussion-modal');
            modal.classList.add('show');
        } else {
            console.error('Error loading discussion details');
        }
        
    } catch (error) {
        console.error('Error loading discussion:', error);
    }
}

function displayDiscussionModal(discussion) {
    document.getElementById('view-discussion-title').textContent = discussion.title;
    document.getElementById('view-discussion-author').textContent = discussion.author.full_name;
    document.getElementById('view-discussion-replies').textContent = discussion.reply_count || 0;
    document.getElementById('view-discussion-likes').textContent = discussion.like_count || 0;
    document.getElementById('like-count').textContent = discussion.like_count || 0;
    document.getElementById('view-discussion-date').textContent = formatDate(discussion.created_at);
    document.getElementById('view-discussion-content').textContent = discussion.content;
    
    // Display tags
    const tagsContainer = document.getElementById('view-discussion-tags');
    if (discussion.tags && discussion.tags.length > 0) {
        tagsContainer.innerHTML = discussion.tags.map(tag => 
            `<span class="tag">${escapeHtml(tag)}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '';
    }
    
    // Update like button state
    const likeBtn = document.getElementById('like-discussion-btn');
    if (discussion.is_liked) {
        likeBtn.classList.add('liked');
    } else {
        likeBtn.classList.remove('liked');
    }
}

async function loadDiscussionReplies(discussionId) {
    try {
        const response = await fetch(`/api/discussions/${discussionId}/replies`);
        if (response.ok) {
            const data = await response.json();
            displayReplies(data.replies);
        }
    } catch (error) {
        console.error('Error loading replies:', error);
        displayReplies([]);
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
        <div class="reply-item" data-reply-id="${reply.id}">
            <div class="reply-author">${escapeHtml(reply.author.full_name)}</div>
            <div class="reply-content">${escapeHtml(reply.content)}</div>
            <div class="reply-date">${formatDate(reply.created_at)}</div>
            <div class="reply-actions">
                <button class="reaction-btn" onclick="toggleReplyReaction(${reply.id}, 'like')">
                    <i class="fas fa-thumbs-up"></i> <span class="reaction-count">${reply.likes || 0}</span>
                </button>
                <button class="reaction-btn" onclick="toggleReplyReaction(${reply.id}, 'heart')">
                    <i class="fas fa-heart"></i> <span class="reaction-count">${reply.hearts || 0}</span>
                </button>
                <button class="reply-to-reply-btn" onclick="showReplyToReply(${reply.id})">
                    <i class="fas fa-reply"></i> Reply
                </button>
            </div>
            <div class="nested-replies" id="nested-replies-${reply.id}">
                <!-- Nested replies will be loaded here -->
            </div>
        </div>
    `).join('');
}

function setupDiscussionActions() {
    const likeBtn = document.getElementById('like-discussion-btn');
    const replyBtn = document.getElementById('reply-discussion-btn');
    const shareBtn = document.getElementById('share-discussion-btn');
    
    if (likeBtn) {
        likeBtn.removeEventListener('click', handleLikeDiscussion);
        likeBtn.addEventListener('click', handleLikeDiscussion);
    }
    
    if (replyBtn) {
        replyBtn.removeEventListener('click', showReplyForm);
        replyBtn.addEventListener('click', showReplyForm);
    }
    
    if (shareBtn) {
        shareBtn.removeEventListener('click', handleShareDiscussion);
        shareBtn.addEventListener('click', handleShareDiscussion);
    }
    
    // Setup reply form submission
    const submitReplyBtn = document.getElementById('submit-reply');
    if (submitReplyBtn) {
        submitReplyBtn.removeEventListener('click', handleSubmitReply);
        submitReplyBtn.addEventListener('click', handleSubmitReply);
    }
    
    const cancelReplyBtn = document.getElementById('cancel-reply');
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', hideReplyForm);
    }
}

async function handleLikeDiscussion() {
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }
    
    if (!currentDiscussion) return;
    
    const likeBtn = document.getElementById('like-discussion-btn');
    const likeCountEl = document.getElementById('like-count');
    const originalText = likeBtn.innerHTML;
    
    likeBtn.disabled = true;
    likeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    
    try {
        const response = await fetch(`/api/discussions/${currentDiscussion.id}/like`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            likeCountEl.textContent = data.like_count;
            document.getElementById('view-discussion-likes').textContent = data.like_count;
            
            if (data.is_liked) {
                likeBtn.classList.add('liked');
                showMessage('Discussion liked!', 'success');
            } else {
                likeBtn.classList.remove('liked');
                showMessage('Like removed', 'info');
            }
            
            currentDiscussion.like_count = data.like_count;
            currentDiscussion.is_liked = data.is_liked;
        } else {
            showMessage(data.error || 'Error updating like', 'error');
        }
    } catch (error) {
        console.error('Like error:', error);
        showMessage('Error updating like', 'error');
    } finally {
        likeBtn.disabled = false;
        likeBtn.innerHTML = `<i class="fas fa-thumbs-up"></i> <span id="like-count">${currentDiscussion.like_count || 0}</span> Like`;
    }
}

function handleShareDiscussion() {
    if (!currentDiscussion) return;
    
    const shareUrl = `${window.location.origin}/discussion.html?id=${currentDiscussion.id}`;
    
    if (navigator.share) {
        navigator.share({
            title: currentDiscussion.title,
            text: currentDiscussion.content.substring(0, 100) + '...',
            url: shareUrl
        }).then(() => {
            showMessage('Discussion shared successfully!', 'success');
        }).catch(error => {
            console.log('Error sharing:', error);
            fallbackShare(shareUrl);
        });
    } else {
        fallbackShare(shareUrl);
    }
}

function fallbackShare(shareUrl) {
    navigator.clipboard.writeText(shareUrl).then(() => {
        showMessage('Discussion link copied to clipboard!', 'success');
    }).catch(() => {
        // Create a temporary input element to copy the URL
        const tempInput = document.createElement('input');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showMessage('Discussion link copied to clipboard!', 'success');
    });
}

function showReplyForm() {
    if (!currentUser) {
        showMessage('Please login to reply', 'error');
        return;
    }
    
    const replyForm = document.getElementById('add-reply-form');
    if (replyForm) {
        replyForm.style.display = 'block';
        document.getElementById('reply-content').focus();
    }
}

function hideReplyForm() {
    const replyForm = document.getElementById('add-reply-form');
    if (replyForm) {
        replyForm.style.display = 'none';
        document.getElementById('reply-content').value = '';
    }
}

// Reply reaction functions
async function toggleReplyReaction(replyId, reactionType) {
    if (!currentUser) {
        alert('Please login to react');
        return;
    }

    try {
        const response = await fetch(`/api/reply/${replyId}/reaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reaction_type: reactionType
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            const replyElement = document.querySelector(`[data-reply-id="${replyId}"]`);
            if (replyElement) {
                const reactionBtn = replyElement.querySelector(`[onclick*="${reactionType}"]`);
                const countSpan = reactionBtn.querySelector('.reaction-count');
                
                countSpan.textContent = data.count;
                
                if (data.user_reacted) {
                    reactionBtn.classList.add('active');
                } else {
                    reactionBtn.classList.remove('active');
                }
            }
        } else {
            console.error('Error updating reaction:', data.error);
        }
    } catch (error) {
        console.error('Error toggling reaction:', error);
    }
}

function showReplyToReply(replyId) {
    if (!currentUser) {
        alert('Please login to reply');
        return;
    }

    const nestedRepliesContainer = document.getElementById(`nested-replies-${replyId}`);
    if (!nestedRepliesContainer) return;

    // Check if reply form already exists
    if (nestedRepliesContainer.querySelector('.nested-reply-form')) {
        return;
    }

    const replyForm = `
        <div class="nested-reply-form">
            <textarea class="nested-reply-input" placeholder="Write your reply..." rows="2"></textarea>
            <div class="nested-reply-actions">
                <button class="btn-secondary" onclick="cancelNestedReply(${replyId})">Cancel</button>
                <button class="btn-primary" onclick="submitNestedReply(${replyId})">
                    <i class="fas fa-paper-plane"></i> Reply
                </button>
            </div>
        </div>
    `;

    nestedRepliesContainer.insertAdjacentHTML('beforeend', replyForm);
    nestedRepliesContainer.querySelector('.nested-reply-input').focus();
}

function cancelNestedReply(replyId) {
    const nestedRepliesContainer = document.getElementById(`nested-replies-${replyId}`);
    const replyForm = nestedRepliesContainer.querySelector('.nested-reply-form');
    if (replyForm) {
        replyForm.remove();
    }
}

async function submitNestedReply(parentReplyId) {
    const nestedRepliesContainer = document.getElementById(`nested-replies-${parentReplyId}`);
    const replyInput = nestedRepliesContainer.querySelector('.nested-reply-input');
    const content = replyInput.value.trim();

    if (!content) {
        alert('Please enter a reply');
        return;
    }

    const submitBtn = nestedRepliesContainer.querySelector('.btn-primary');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Replying...';

    try {
        const response = await fetch(`/api/reply/${parentReplyId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Remove the reply form
            cancelNestedReply(parentReplyId);
            
            // Add the new nested reply
            const newReplyHTML = `
                <div class="nested-reply">
                    <div class="reply-author">${escapeHtml(currentUser.full_name)}</div>
                    <div class="reply-content">${escapeHtml(content)}</div>
                    <div class="reply-date">Just now</div>
                </div>
            `;
            
            nestedRepliesContainer.insertAdjacentHTML('beforeend', newReplyHTML);
        } else {
            alert(data.error || 'Error posting reply');
        }
    } catch (error) {
        console.error('Error submitting nested reply:', error);
        alert('Error posting reply');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Reply';
    }
}

async function handleSubmitReply() {
    const content = document.getElementById('reply-content').value.trim();
    
    if (!content) {
        showMessage('Please enter a reply', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-reply');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    
    try {
        const response = await fetch(`/api/discussions/${currentDiscussion.id}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Reply posted successfully!', 'success');
            hideReplyForm();
            loadDiscussionReplies(currentDiscussion.id);
            
            // Update reply count
            const newReplyCount = (currentDiscussion.reply_count || 0) + 1;
            document.getElementById('view-discussion-replies').textContent = newReplyCount;
            currentDiscussion.reply_count = newReplyCount;
        } else {
            showMessage(data.error || 'Error posting reply', 'error');
        }
    } catch (error) {
        console.error('Reply error:', error);
        showMessage('Error posting reply', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Reply';
    }
}

function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('show'));
    
    // Hide reply form when closing modal
    hideReplyForm();
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
    try {
        const date = new Date(dateString);
        // Always return only the date part, no time
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
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