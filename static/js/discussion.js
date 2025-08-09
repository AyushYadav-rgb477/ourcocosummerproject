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
let selectedMedia = null;
let mediaData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Setup filters and search
    setupFilters();
    
    // Setup modals
    setupModals();
    
    // Setup media upload
    setupMediaUpload();
    
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
        <div class="discussion-card" data-discussion-id="${discussion.id}">
            <div class="discussion-header">
                <div class="user-info" onclick="viewUserProfile(${discussion.author.id})">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">${escapeHtml(discussion.author.full_name)}</div>
                        <div class="post-time">${formatDate(discussion.created_at)}</div>
                    </div>
                </div>
                <div class="discussion-category-badge">${getCategoryIcon(discussion.category)} ${discussion.category}</div>
                ${currentUser && discussion.can_edit ? `
                    <div class="discussion-actions">
                        <button class="edit-discussion-btn" onclick="editDiscussion(${discussion.id})" title="Edit Discussion">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-discussion-btn" onclick="deleteDiscussion(${discussion.id})" title="Delete Discussion">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="discussion-content">
                <h3 class="discussion-title">${escapeHtml(discussion.title)}</h3>
                <p class="discussion-text">${escapeHtml(discussion.content)}</p>
                ${discussion.image_url ? `
                    <div class="discussion-image">
                        <img src="${discussion.image_url}" alt="Discussion image" onclick="showImageModal('${discussion.image_url}')">
                    </div>
                ` : ''}
                ${discussion.tags && discussion.tags.length > 0 ? `
                    <div class="discussion-tags">
                        ${discussion.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="discussion-stats">
                <div class="engagement-stats">
                    <span class="stat-item">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${discussion.likes || 0}</span>
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-comments"></i>
                        <span>${discussion.replies || 0}</span>
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-share"></i>
                        <span>${discussion.shares || 0}</span>
                    </span>
                </div>
            </div>
            
            <div class="discussion-interactions">
                <button class="interaction-btn like-btn ${discussion.is_liked ? 'active' : ''}" onclick="toggleDiscussionLike(${discussion.id})">
                    <i class="fas fa-thumbs-up"></i>
                    <span>Like</span>
                </button>
                <button class="interaction-btn comment-btn" onclick="openDiscussionModal(${discussion.id})">
                    <i class="fas fa-comment"></i>
                    <span>Comment</span>
                </button>
                <button class="interaction-btn share-btn" onclick="shareDiscussion(${discussion.id})">
                    <i class="fas fa-share"></i>
                    <span>Share</span>
                </button>
            </div>
        </div>
    `).join('');
    
    discussionsContainer.insertAdjacentHTML('beforeend', discussionsHTML);
}

// Helper functions for social media features
function getCategoryIcon(category) {
    const icons = {
        'General': '💬',
        'Ideas': '💡', 
        'Feedback': '🔍',
        'Collaboration': '🤝',
        'Questions': '❓',
        'Announcements': '📢'
    };
    return icons[category] || '💬';
}

function viewUserProfile(userId) {
    window.location.href = `profile.html?user_id=${userId}`;
}

async function toggleDiscussionLike(discussionId) {
    if (!currentUser) {
        alert('Please log in to like discussions');
        return;
    }
    
    try {
        const response = await fetch(`/api/discussions/${discussionId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update like button and count
            const discussionCard = document.querySelector(`[data-discussion-id="${discussionId}"]`);
            if (discussionCard) {
                const likeBtn = discussionCard.querySelector('.like-btn');
                const likeCount = discussionCard.querySelector('.stat-item:first-child span');
                
                if (data.liked) {
                    likeBtn.classList.add('active');
                } else {
                    likeBtn.classList.remove('active');
                }
                
                if (likeCount) {
                    likeCount.textContent = data.like_count;
                }
            }
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

async function shareDiscussion(discussionId) {
    const url = `${window.location.origin}/discussion.html?id=${discussionId}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Check out this discussion',
                url: url
            });
        } catch (error) {
            copyToClipboard(url);
        }
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Link copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link copied to clipboard!');
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 1rem;
        border-radius: 4px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.opacity = '1', 100);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

function showImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <span class="close-image-modal">&times;</span>
            <img src="${imageUrl}" alt="Full size image">
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const content = modal.querySelector('.image-modal-content');
    content.style.cssText = `
        position: relative;
        max-width: 90%;
        max-height: 90%;
    `;
    
    const img = modal.querySelector('img');
    img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        border-radius: 8px;
    `;
    
    const closeBtn = modal.querySelector('.close-image-modal');
    closeBtn.style.cssText = `
        position: absolute;
        top: -10px;
        right: -10px;
        background: #fff;
        color: #000;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
    `;
    
    closeBtn.onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
    
    document.body.appendChild(modal);
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
        createDiscussionBtn.addEventListener('click', createDiscussion);
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

async function createDiscussion() {
    const title = document.getElementById('discussion-title').value.trim();
    const category = document.getElementById('discussion-category-modal').value;
    const content = document.getElementById('discussion-content').value.trim();
    const tagsInput = document.getElementById('discussion-tags').value.trim();
    
    // Validate input
    if (!title || !category || !content) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Prepare tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    // Prepare discussion data
    const discussionData = {
        title,
        category,
        content,
        tags
    };
    
    // Add media data if present
    if (selectedMedia && mediaData) {
        discussionData.media_data = mediaData;
        discussionData.media_type = selectedMedia.type.startsWith('image/') ? 'image' : 'video';
        discussionData.media_filename = selectedMedia.name;
    }
    
    try {
        const response = await fetch('/api/discussions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(discussionData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('Discussion created successfully!');
            
            // Close modal
            closeStartDiscussionModal();
            
            // Reload discussions
            resetAndLoadDiscussions();
            
            // Reset form
            resetDiscussionForm();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to create discussion');
        }
    } catch (error) {
        console.error('Error creating discussion:', error);
        alert('Failed to create discussion. Please try again.');
    }
}

function resetDiscussionForm() {
    document.getElementById('discussion-title').value = '';
    document.getElementById('discussion-category-modal').value = '';
    document.getElementById('discussion-content').value = '';
    document.getElementById('discussion-tags').value = '';
    removeMedia();
}

function openStartDiscussionModal() {
    const modal = document.getElementById('discussion-modal');
    modal.classList.add('show');
}

function closeStartDiscussionModal() {
    const modal = document.getElementById('discussion-modal');
    modal.classList.remove('show');
}

async function handleCreateDiscussion() {
    const title = document.getElementById('discussion-title').value.trim();
    const category = document.getElementById('discussion-category-modal').value;
    const content = document.getElementById('discussion-content').value.trim();
    const tagsInput = document.getElementById('discussion-tags').value.trim();
    
    // Validate input
    if (!title || !category || !content) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Prepare tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    // Prepare discussion data
    const discussionData = {
        title,
        category,
        content,
        tags
    };
    
    // Add media data if present
    if (selectedMedia && mediaData) {
        discussionData.media_data = mediaData;
        discussionData.media_type = selectedMedia.type.startsWith('image/') ? 'image' : 'video';
        discussionData.media_filename = selectedMedia.name;
    }
    
    try {
        const response = await fetch('/api/discussions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(discussionData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('Discussion created successfully!');
            
            // Close modal
            closeStartDiscussionModal();
            
            // Reload discussions
            resetAndLoadDiscussions();
            
            // Reset form
            resetDiscussionForm();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to create discussion');
        }
    } catch (error) {
        console.error('Error creating discussion:', error);
        alert('Failed to create discussion. Please try again.');
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
    
    // Display content with media if available
    const contentElement = document.getElementById('view-discussion-content');
    contentElement.textContent = discussion.content;
    
    // Add media display after content if available
    const existingMedia = contentElement.nextElementSibling;
    if (existingMedia && existingMedia.classList.contains('discussion-media')) {
        existingMedia.remove();
    }
    
    if (discussion.media_url && discussion.media_type) {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'discussion-media';
        
        if (discussion.media_type === 'image') {
            mediaContainer.innerHTML = `<img src="${discussion.media_url}" alt="${discussion.media_filename || 'Uploaded image'}" loading="lazy">`;
        } else if (discussion.media_type === 'video') {
            mediaContainer.innerHTML = `<video controls><source src="${discussion.media_url}" type="video/mp4">Your browser does not support the video tag.</video>`;
        }
        
        contentElement.parentNode.insertBefore(mediaContainer, contentElement.nextSibling);
    }
    
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
            <div class="reply-author">
                <i class="fas fa-user"></i>
                ${escapeHtml(reply.author.full_name)}
            </div>
            <div class="reply-content">${escapeHtml(reply.content)}</div>
            <div class="reply-date">${formatDate(reply.created_at)}</div>
            <div class="reply-actions">
                <button class="reaction-btn ${reply.user_reactions?.like ? 'active' : ''}" onclick="toggleReplyReaction(${reply.id}, 'like')">
                    <i class="fas fa-thumbs-up"></i> <span class="reaction-count">${reply.likes || 0}</span>
                </button>
                <button class="reaction-btn ${reply.user_reactions?.heart ? 'active' : ''}" onclick="toggleReplyReaction(${reply.id}, 'heart')">
                    <i class="fas fa-heart"></i> <span class="reaction-count">${reply.hearts || 0}</span>
                </button>
                <button class="reply-to-reply-btn" onclick="showReplyToReply(${reply.id})">
                    <i class="fas fa-reply"></i> Reply
                </button>
                ${currentUser && reply.can_edit ? `
                    <button class="edit-reply-btn" onclick="editDiscussionReply(${reply.id})" title="Edit Reply">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-reply-btn" onclick="deleteDiscussionReply(${reply.id})" title="Delete Reply">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
            <div class="nested-replies" id="nested-replies-${reply.id}">
                ${reply.nested_replies ? reply.nested_replies.map(nestedReply => `
                    <div class="nested-reply">
                        <div class="reply-author">
                            <i class="fas fa-user"></i>
                            ${escapeHtml(nestedReply.author.full_name)}
                        </div>
                        <div class="reply-content">${escapeHtml(nestedReply.content)}</div>
                        <div class="reply-date">${formatDate(nestedReply.created_at)}</div>
                    </div>
                `).join('') : ''}
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
        const response = await fetch(`/api/reply/${parentReplyId}/replies`, {
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
                    <div class="reply-author">
                        <i class="fas fa-user"></i>
                        ${escapeHtml(currentUser.full_name)}
                    </div>
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

// Media upload functionality
function setupMediaUpload() {
    const mediaInput = document.getElementById('discussion-media');
    if (mediaInput) {
        mediaInput.addEventListener('change', handleMediaSelection);
    }
}

function handleMediaSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        event.target.value = '';
        return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image (JPG, PNG, GIF) or video (MP4, WebM) file');
        event.target.value = '';
        return;
    }

    selectedMedia = file;
    previewMedia(file);
}

function previewMedia(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        mediaData = e.target.result;
        
        const preview = document.getElementById('media-preview');
        const previewContent = preview.querySelector('.media-preview-content');
        
        if (file.type.startsWith('image/')) {
            previewContent.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        } else if (file.type.startsWith('video/')) {
            previewContent.innerHTML = `<video controls><source src="${e.target.result}" type="${file.type}">Your browser does not support the video tag.</video>`;
        }
        
        preview.style.display = 'block';
        document.querySelector('.media-upload-button').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removeMedia() {
    selectedMedia = null;
    mediaData = null;
    
    const preview = document.getElementById('media-preview');
    preview.style.display = 'none';
    document.querySelector('.media-upload-button').style.display = 'block';
    
    const mediaInput = document.getElementById('discussion-media');
    if (mediaInput) {
        mediaInput.value = '';
    }
}

// Discussion CRUD Functions
async function editDiscussion(discussionId) {
    if (!currentUser) {
        showMessage('Please login to edit discussions', 'error');
        return;
    }
    
    try {
        // Get current discussion data
        const response = await fetch(`/api/discussions/${discussionId}`);
        if (!response.ok) {
            showMessage('Error loading discussion data', 'error');
            return;
        }
        
        const data = await response.json();
        const discussion = data.discussion;
        
        // Check permission
        if (!discussion.can_edit) {
            showMessage('You can only edit your own discussions', 'error');
            return;
        }
        
        // Create and show edit modal
        const editModal = `
            <div class="modal show" id="edit-discussion-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Discussion</h2>
                        <button class="close-modal" onclick="closeEditDiscussionModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-discussion-form">
                            <div class="form-group">
                                <label for="edit-discussion-title">Discussion Title</label>
                                <input type="text" id="edit-discussion-title" value="${escapeHtml(discussion.title)}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-discussion-content">Content</label>
                                <textarea id="edit-discussion-content" rows="8" required>${escapeHtml(discussion.content)}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="edit-discussion-category">Category</label>
                                <select id="edit-discussion-category" required>
                                    <option value="General" ${discussion.category === 'General' ? 'selected' : ''}>General</option>
                                    <option value="Ideas" ${discussion.category === 'Ideas' ? 'selected' : ''}>Ideas</option>
                                    <option value="Feedback" ${discussion.category === 'Feedback' ? 'selected' : ''}>Feedback</option>
                                    <option value="Collaboration" ${discussion.category === 'Collaboration' ? 'selected' : ''}>Collaboration</option>
                                    <option value="Questions" ${discussion.category === 'Questions' ? 'selected' : ''}>Questions</option>
                                    <option value="Announcements" ${discussion.category === 'Announcements' ? 'selected' : ''}>Announcements</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-discussion-tags">Tags (comma-separated)</label>
                                <input type="text" id="edit-discussion-tags" value="${discussion.tags.join(', ')}" placeholder="innovation, technology, startup">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeEditDiscussionModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="saveDiscussionEdit(${discussionId})">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', editModal);
        
    } catch (error) {
        console.error('Error setting up discussion edit:', error);
        showMessage('Error setting up discussion edit', 'error');
    }
}

async function saveDiscussionEdit(discussionId) {
    try {
        const title = document.getElementById('edit-discussion-title').value.trim();
        const content = document.getElementById('edit-discussion-content').value.trim();
        const category = document.getElementById('edit-discussion-category').value;
        const tags = document.getElementById('edit-discussion-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        if (!title || !content || !category) {
            showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        const saveBtn = document.querySelector('#edit-discussion-modal .btn-primary');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const response = await fetch(`/api/discussions/${discussionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                category: category,
                tags: tags
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Discussion updated successfully!', 'success');
            closeEditDiscussionModal();
            
            // Refresh the discussions list
            currentPage = 1;
            loadDiscussions();
            
            // Update current discussion if modal is open
            if (currentDiscussion && currentDiscussion.id === discussionId) {
                currentDiscussion = data.discussion;
                displayDiscussionModal(currentDiscussion);
            }
        } else {
            showMessage(data.error || 'Failed to update discussion', 'error');
        }
        
    } catch (error) {
        console.error('Network error:', error);
        showMessage('Network error while updating discussion', 'error');
    } finally {
        const saveBtn = document.querySelector('#edit-discussion-modal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
    }
}

function closeEditDiscussionModal() {
    const modal = document.getElementById('edit-discussion-modal');
    if (modal) {
        modal.remove();
    }
}

async function deleteDiscussion(discussionId) {
    if (!currentUser) {
        showMessage('Please login to delete discussions', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this discussion? This action cannot be undone and will remove all associated replies.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/discussions/${discussionId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Discussion deleted successfully!', 'success');
            
            // Close modal if current discussion was deleted
            if (currentDiscussion && currentDiscussion.id === discussionId) {
                closeModals();
                currentDiscussion = null;
            }
            
            // Refresh the discussions list
            currentPage = 1;
            loadDiscussions();
            
        } else {
            showMessage(data.error || 'Failed to delete discussion', 'error');
        }
        
    } catch (error) {
        console.error('Network error:', error);
        showMessage('Network error while deleting discussion', 'error');
    }
}

// Discussion Reply CRUD Functions
async function editDiscussionReply(replyId) {
    if (!currentUser) {
        showMessage('Please login to edit replies', 'error');
        return;
    }
    
    const replyElement = document.querySelector(`[data-reply-id="${replyId}"]`);
    if (!replyElement) return;
    
    const replyContent = replyElement.querySelector('.reply-content');
    const originalContent = replyContent.textContent;
    
    const editForm = `
        <div class="reply-edit-form">
            <textarea class="reply-edit-textarea" rows="3">${originalContent}</textarea>
            <div class="reply-edit-actions">
                <button class="btn-secondary" onclick="cancelReplyEdit(${replyId}, '${originalContent.replace(/'/g, "&apos;")}')">Cancel</button>
                <button class="btn-primary" onclick="saveReplyEdit(${replyId})">Save</button>
            </div>
        </div>
    `;
    
    replyContent.innerHTML = editForm;
    replyElement.querySelector('.reply-edit-textarea').focus();
}

function cancelReplyEdit(replyId, originalContent) {
    const replyElement = document.querySelector(`[data-reply-id="${replyId}"]`);
    if (!replyElement) return;
    
    const replyContent = replyElement.querySelector('.reply-content');
    replyContent.innerHTML = escapeHtml(originalContent.replace(/&apos;/g, "'"));
}

async function saveReplyEdit(replyId) {
    const replyElement = document.querySelector(`[data-reply-id="${replyId}"]`);
    if (!replyElement) return;
    
    const textarea = replyElement.querySelector('.reply-edit-textarea');
    const content = textarea.value.trim();
    
    if (!content) {
        showMessage('Reply content cannot be empty', 'error');
        return;
    }
    
    const saveBtn = replyElement.querySelector('.btn-primary');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        const response = await fetch(`/api/reply/${replyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const replyContent = replyElement.querySelector('.reply-content');
            replyContent.innerHTML = escapeHtml(content);
            showMessage('Reply updated successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to update reply', 'error');
        }
        
    } catch (error) {
        console.error('Network error:', error);
        showMessage('Network error while updating reply', 'error');
    }
}

async function deleteDiscussionReply(replyId) {
    if (!currentUser) {
        showMessage('Please login to delete replies', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this reply? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/reply/${replyId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const replyElement = document.querySelector(`[data-reply-id="${replyId}"]`);
            if (replyElement) {
                replyElement.remove();
            }
            showMessage('Reply deleted successfully!', 'success');
            
            // Update reply count
            if (currentDiscussion) {
                const newReplyCount = Math.max(0, (currentDiscussion.reply_count || 0) - 1);
                document.getElementById('view-discussion-replies').textContent = newReplyCount;
                currentDiscussion.reply_count = newReplyCount;
            }
        } else {
            showMessage(data.error || 'Failed to delete reply', 'error');
        }
        
    } catch (error) {
        console.error('Network error:', error);
        showMessage('Network error while deleting reply', 'error');
    }
}
    
    const preview = document.getElementById('media-preview');
    const uploadButton = document.querySelector('.media-upload-button');
    
    if (preview) {
        preview.style.display = 'none';
        preview.querySelector('.media-preview-content').innerHTML = '';
    }
    
    if (uploadButton) {
        uploadButton.style.display = 'block';
    }
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
// Discussion CRUD Functions
async function editDiscussion(discussionId) {
    try {
        // Fetch discussion details
        const response = await fetch(`/api/discussions/${discussionId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch discussion details");
        }
        
        const data = await response.json();
        const discussion = data.discussion;
        
        // Create edit modal
        const modalHtml = `
            <div class="modal-overlay" id="edit-discussion-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> Edit Discussion</h2>
                        <button class="modal-close" onclick="closeEditDiscussionModal()">&times;</button>
                    </div>
                    <form id="edit-discussion-form">
                        <div class="form-group">
                            <label for="edit-discussion-title">Title</label>
                            <input type="text" id="edit-discussion-title" value="${escapeHtml(discussion.title)}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-discussion-category">Category</label>
                            <select id="edit-discussion-category" required>
                                <option value="idea" ${discussion.category === "idea" ? "selected" : ""}>💡 Ideas & Innovations</option>
                                <option value="question" ${discussion.category === "question" ? "selected" : ""}>❓ Questions & Help</option>
                                <option value="discussion" ${discussion.category === "discussion" ? "selected" : ""}>💬 General Discussion</option>
                                <option value="collaboration" ${discussion.category === "collaboration" ? "selected" : ""}>🤝 Collaboration Requests</option>
                                <option value="feedback" ${discussion.category === "feedback" ? "selected" : ""}>🔍 Feedback & Reviews</option>
                                <option value="announcement" ${discussion.category === "announcement" ? "selected" : ""}>📢 Announcements</option>
                                <option value="resource" ${discussion.category === "resource" ? "selected" : ""}>📚 Resources & Tips</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-discussion-content">Content</label>
                            <textarea id="edit-discussion-content" rows="8" required>${escapeHtml(discussion.content)}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="edit-discussion-tags">Tags (comma-separated)</label>
                            <input type="text" id="edit-discussion-tags" value="${discussion.tags ? discussion.tags.join(", ") : ""}">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="cancel-btn" onclick="closeEditDiscussionModal()">Cancel</button>
                            <button type="submit" class="save-btn">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML("beforeend", modalHtml);
        
        // Handle form submission
        document.getElementById("edit-discussion-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            await updateDiscussion(discussionId);
        });
        
    } catch (error) {
        console.error("Error loading discussion details:", error);
        alert("Error loading discussion details: " + error.message);
    }
}

async function updateDiscussion(discussionId) {
    try {
        const title = document.getElementById("edit-discussion-title").value;
        const category = document.getElementById("edit-discussion-category").value;
        const content = document.getElementById("edit-discussion-content").value;
        const tags = document.getElementById("edit-discussion-tags").value;
        
        const response = await fetch(`/api/discussions/${discussionId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                category: category,
                content: content,
                tags: tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert("Discussion updated successfully!");
            closeEditDiscussionModal();
            loadDiscussions(); // Refresh the discussions list
        } else {
            alert(data.error || "Failed to update discussion");
        }
        
    } catch (error) {
        console.error("Network error:", error);
        alert("Network error: " + error.message);
    }
}

async function deleteDiscussion(discussionId, discussionTitle) {
    if (!confirm(`Are you sure you want to delete "${discussionTitle}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/discussions/${discussionId}`, {
            method: "DELETE"
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert("Discussion deleted successfully!");
            loadDiscussions(); // Refresh the discussions list
        } else {
            alert(data.error || "Failed to delete discussion");
        }
        
    } catch (error) {
        console.error("Network error:", error);
        alert("Network error: " + error.message);
    }
}

function closeEditDiscussionModal() {
    const modal = document.getElementById("edit-discussion-modal");
    if (modal) {
        modal.remove();
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
