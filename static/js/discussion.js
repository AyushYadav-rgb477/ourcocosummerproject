// Discussion Page JavaScript functionality

let currentUser = null;
let currentFilter = 'all';
let currentPage = 1;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthAndLoadDiscussion();
    
    // Setup event listeners
    setupUserDropdown();
    setupLogout();
    setupFilterTabs();
    setupCreatePostModal();
    setupLoadMore();
    
    // Setup user interactions
    setupUserSuggestions();
});

async function checkAuthAndLoadDiscussion() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserInfo();
            loadDiscussionData();
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

function updateUserInfo() {
    if (!currentUser) return;
    
    // Update user greeting
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        greetingEl.textContent = currentUser.username;
    }
    
    // Update sidebar user info
    document.getElementById('sidebar-user-name').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('sidebar-user-college').textContent = currentUser.college || 'Student';
}

async function loadDiscussionData() {
    await Promise.all([
        loadPosts(),
        loadUserStats(),
        loadUserSuggestions(),
        loadActiveUsers(),
        loadUpcomingEvents()
    ]);
}

async function loadUserStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('user-posts-count').textContent = data.total_projects || 0;
            document.getElementById('user-connections-count').textContent = '0'; // Placeholder
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadPosts(filter = 'all', page = 1, append = false) {
    if (isLoading) return;
    isLoading = true;
    
    const feedContainer = document.getElementById('posts-feed');
    
    if (!append) {
        feedContainer.innerHTML = `
            <div class="loading-posts">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading discussions...</p>
            </div>
        `;
    }
    
    try {
        // Simulate API call with mock data for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const posts = generateMockPosts(page, filter);
        displayPosts(posts, append);
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showEmptyState('Error loading posts. Please try again.');
    } finally {
        isLoading = false;
    }
}

function generateMockPosts(page, filter) {
    const postTypes = ['discussion', 'help', 'poll', 'event'];
    const titles = [
        'Looking for a co-founder for my tech startup',
        'Need help with React hooks implementation',
        'What\'s the best way to validate a startup idea?',
        'Organizing a hackathon at our university',
        'How to approach investors for seed funding?',
        'Seeking feedback on my mobile app prototype',
        'Anyone interested in a blockchain project?',
        'Best practices for remote team collaboration',
        'Machine learning resources for beginners',
        'Startup pitch deck review session'
    ];
    
    const contents = [
        'I have a great idea for a SaaS platform and I\'m looking for a technical co-founder. The idea involves creating a platform that helps students manage their projects and find collaborators.',
        'I\'m struggling with useEffect dependencies in React. Can someone help me understand when and how to use the dependency array properly?',
        'I\'ve been working on this idea for months but I\'m not sure if there\'s real market demand. What are the best ways to validate a startup idea before investing too much time?',
        'We\'re planning a 48-hour hackathon focused on social impact projects. Looking for sponsors and participants. Who\'s interested?',
        'I\'ve built an MVP and have some traction, but I\'m not sure how to approach investors. Any advice from those who\'ve been through this process?',
        'I\'ve been working on a mobile app for student networking. Would love to get some feedback from the community before launching.',
        'I\'m exploring blockchain applications in education. Anyone with experience in smart contracts interested in collaborating?',
        'Our team is fully remote and we\'re looking for better ways to collaborate. What tools and practices work best for you?',
        'I\'m new to machine learning and looking for good resources to get started. Any recommendations for courses or books?',
        'Hosting a session where we review pitch decks and provide feedback. Bring your decks and let\'s help each other improve!'
    ];
    
    const tags = [
        ['startup', 'co-founder', 'tech'],
        ['react', 'javascript', 'help'],
        ['startup', 'validation', 'advice'],
        ['hackathon', 'event', 'networking'],
        ['funding', 'investors', 'startup'],
        ['mobile', 'app', 'feedback'],
        ['blockchain', 'collaboration', 'tech'],
        ['remote', 'collaboration', 'tools'],
        ['ml', 'learning', 'resources'],
        ['pitch', 'feedback', 'networking']
    ];
    
    const posts = [];
    const startIndex = (page - 1) * 5;
    const endIndex = Math.min(startIndex + 5, titles.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const postType = postTypes[Math.floor(Math.random() * postTypes.length)];
        
        // Filter posts based on selected filter
        if (filter !== 'all' && postType !== filter && filter !== 'discussion') continue;
        
        posts.push({
            id: i + 1,
            type: postType,
            title: titles[i],
            content: contents[i],
            author: {
                name: `User ${i + 1}`,
                college: 'Sample University',
                avatar: 'fas fa-user-circle'
            },
            tags: tags[i],
            timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            likes: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 20),
            shares: Math.floor(Math.random() * 10),
            isLiked: Math.random() > 0.7,
            isSaved: Math.random() > 0.8
        });
    }
    
    return posts;
}

function displayPosts(posts, append = false) {
    const feedContainer = document.getElementById('posts-feed');
    
    if (!append) {
        feedContainer.innerHTML = '';
    }
    
    if (posts.length === 0) {
        if (!append) {
            showEmptyState('No posts found for the selected filter.');
        }
        return;
    }
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        feedContainer.appendChild(postElement);
    });
}

function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.innerHTML = `
        <div class="post-header">
            <div class="post-author-avatar">
                <i class="${post.author.avatar}"></i>
            </div>
            <div class="post-author-info">
                <h4>${escapeHtml(post.author.name)}</h4>
                <p>${escapeHtml(post.author.college)} • ${formatTimeAgo(post.timestamp)}</p>
            </div>
            <div class="post-type-badge ${post.type}">
                ${post.type}
            </div>
        </div>
        
        <div class="post-content">
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.content)}</p>
            
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
        </div>
        
        <div class="post-actions">
            <div class="post-actions-left">
                <button class="post-action ${post.isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes}</span>
                </button>
                <button class="post-action" onclick="toggleComments(${post.id})">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments}</span>
                </button>
                <button class="post-action" onclick="sharePost(${post.id})">
                    <i class="fas fa-share"></i>
                    <span>${post.shares}</span>
                </button>
            </div>
            <div class="post-actions-right">
                <button class="post-action ${post.isSaved ? 'saved' : ''}" onclick="toggleSave(${post.id})">
                    <i class="fas fa-bookmark"></i>
                </button>
            </div>
        </div>
        
        <div class="comments-section" id="comments-${post.id}" style="display: none;">
            <div class="comment-form">
                <textarea class="comment-input" placeholder="Write a comment..." rows="2"></textarea>
                <button class="comment-submit" onclick="submitComment(${post.id})">
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

function showEmptyState(message) {
    const feedContainer = document.getElementById('posts-feed');
    feedContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <h3>No Posts Found</h3>
            <p>${message}</p>
        </div>
    `;
}

async function loadUserSuggestions() {
    const container = document.getElementById('user-suggestions');
    
    // Mock user suggestions
    const suggestions = [
        { name: 'Alice Johnson', college: 'MIT', mutual: '5 mutual connections' },
        { name: 'Bob Smith', college: 'Stanford', mutual: '3 mutual connections' },
        { name: 'Carol Davis', college: 'Harvard', mutual: '2 mutual connections' }
    ];
    
    container.innerHTML = suggestions.map(user => `
        <div class="suggestion-item">
            <div class="suggestion-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="suggestion-info">
                <h4>${escapeHtml(user.name)}</h4>
                <p>${escapeHtml(user.college)}</p>
                <p style="font-size: 0.7rem; color: #94a3b8;">${user.mutual}</p>
            </div>
            <button class="connect-btn" onclick="connectUser('${user.name}')">
                Connect
            </button>
        </div>
    `).join('');
}

async function loadActiveUsers() {
    const container = document.getElementById('active-users-list');
    
    // Mock active users
    const activeUsers = [
        { name: 'David Wilson', college: 'Berkeley' },
        { name: 'Emma Brown', college: 'Caltech' },
        { name: 'Frank Miller', college: 'CMU' }
    ];
    
    container.innerHTML = activeUsers.map(user => `
        <div class="active-user-item">
            <div class="user-avatar-small">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="user-info-small">
                <h4>${escapeHtml(user.name)}</h4>
                <p>${escapeHtml(user.college)}</p>
            </div>
            <div class="active-indicator"></div>
        </div>
    `).join('');
}

async function loadUpcomingEvents() {
    const container = document.getElementById('upcoming-events-list');
    
    // Mock events
    const events = [
        { 
            title: 'Startup Pitch Night', 
            date: '15', 
            month: 'Dec', 
            location: 'Online' 
        },
        { 
            title: 'Tech Networking Mixer', 
            date: '20', 
            month: 'Dec', 
            location: 'San Francisco' 
        }
    ];
    
    container.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="event-date">
                <div>${event.month}</div>
                <div style="font-size: 1.1rem;">${event.date}</div>
            </div>
            <div class="event-info">
                <h4>${escapeHtml(event.title)}</h4>
                <p>${escapeHtml(event.location)}</p>
            </div>
        </div>
    `).join('');
}

// Event Handlers
function setupFilterTabs() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Load posts with new filter
            currentFilter = this.getAttribute('data-filter');
            currentPage = 1;
            loadPosts(currentFilter, currentPage);
        });
    });
}

function setupCreatePostModal() {
    const modal = document.getElementById('create-post-modal');
    const closeBtn = modal.querySelector('.close');
    const form = document.getElementById('create-post-form');
    
    closeBtn.addEventListener('click', closeModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    form.addEventListener('submit', handleCreatePost);
}

function setupLoadMore() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.addEventListener('click', function() {
        currentPage++;
        loadPosts(currentFilter, currentPage, true);
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
        
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('active');
            profileBtn.classList.remove('active');
        });
        
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    showMessage('Logged out successfully', 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    showMessage('Error logging out', 'error');
                }
            } catch (error) {
                console.error('Logout error:', error);
                showMessage('Error logging out', 'error');
            }
        });
    }
}

function setupUserSuggestions() {
    // User suggestion interactions are handled inline
}

// Modal Functions
function showCreatePost() {
    const modal = document.getElementById('create-post-modal');
    const titleEl = document.getElementById('modal-title');
    const typeEl = document.getElementById('post-type');
    
    titleEl.textContent = 'Create Post';
    typeEl.value = 'discussion';
    showPostFormSections('discussion');
    modal.style.display = 'block';
}

function showAskHelp() {
    const modal = document.getElementById('create-post-modal');
    const titleEl = document.getElementById('modal-title');
    const typeEl = document.getElementById('post-type');
    
    titleEl.textContent = 'Ask for Help';
    typeEl.value = 'help';
    showPostFormSections('help');
    modal.style.display = 'block';
}

function showPollModal() {
    const modal = document.getElementById('create-post-modal');
    const titleEl = document.getElementById('modal-title');
    const typeEl = document.getElementById('post-type');
    
    titleEl.textContent = 'Create Poll';
    typeEl.value = 'poll';
    showPostFormSections('poll');
    modal.style.display = 'block';
}

function showEventModal() {
    const modal = document.getElementById('create-post-modal');
    const titleEl = document.getElementById('modal-title');
    const typeEl = document.getElementById('post-type');
    
    titleEl.textContent = 'Create Event';
    typeEl.value = 'event';
    showPostFormSections('event');
    modal.style.display = 'block';
}

function showPostFormSections(type) {
    const pollOptions = document.getElementById('poll-options');
    const eventDetails = document.getElementById('event-details');
    
    // Hide all conditional sections
    pollOptions.style.display = 'none';
    eventDetails.style.display = 'none';
    
    // Show relevant sections
    if (type === 'poll') {
        pollOptions.style.display = 'block';
    } else if (type === 'event') {
        eventDetails.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('create-post-modal');
    modal.style.display = 'none';
    
    // Reset form
    document.getElementById('create-post-form').reset();
}

async function handleCreatePost(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.btn-primary');
    
    const postData = {
        type: document.getElementById('post-type').value,
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        tags: document.getElementById('post-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
        allowComments: document.getElementById('allow-comments').checked,
        anonymous: document.getElementById('anonymous-post').checked
    };
    
    // Add type-specific data
    if (postData.type === 'poll') {
        const pollOptions = Array.from(document.querySelectorAll('.poll-option'))
            .map(input => input.value.trim())
            .filter(option => option);
        postData.pollOptions = pollOptions;
    } else if (postData.type === 'event') {
        postData.eventDate = document.getElementById('event-date').value;
        postData.eventLocation = document.getElementById('event-location').value;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    
    try {
        // Here you would normally send to server
        // For now, simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showMessage('Post created successfully!', 'success');
        closeModal();
        
        // Refresh posts
        currentPage = 1;
        loadPosts(currentFilter, currentPage);
        
    } catch (error) {
        console.error('Error creating post:', error);
        showMessage('Error creating post', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';
    }
}

// Post Interaction Functions
function toggleLike(postId) {
    const likeBtn = document.querySelector(`[onclick="toggleLike(${postId})"]`);
    const isLiked = likeBtn.classList.contains('liked');
    const countSpan = likeBtn.querySelector('span');
    let count = parseInt(countSpan.textContent);
    
    if (isLiked) {
        likeBtn.classList.remove('liked');
        countSpan.textContent = count - 1;
        showMessage('Like removed', 'info');
    } else {
        likeBtn.classList.add('liked');
        countSpan.textContent = count + 1;
        showMessage('Post liked!', 'success');
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    const isVisible = commentsSection.style.display !== 'none';
    
    if (isVisible) {
        commentsSection.style.display = 'none';
    } else {
        commentsSection.style.display = 'block';
        loadComments(postId);
    }
}

function loadComments(postId) {
    const commentsList = document.getElementById(`comments-list-${postId}`);
    
    // Mock comments
    const comments = [
        {
            author: 'John Doe',
            content: 'Great post! I\'m interested in collaborating.',
            timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
            author: 'Jane Smith',
            content: 'This is exactly what I was looking for. Let\'s connect!',
            timestamp: new Date(Date.now() - 7200000).toISOString()
        }
    ];
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment">
            <div class="comment-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="comment-content">
                <div class="comment-author">${escapeHtml(comment.author)}</div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
                <div class="comment-time">${formatTimeAgo(comment.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function submitComment(postId) {
    const commentInput = document.querySelector(`#comments-${postId} .comment-input`);
    const content = commentInput.value.trim();
    
    if (!content) {
        showMessage('Please enter a comment', 'warning');
        return;
    }
    
    // Here you would normally send to server
    showMessage('Comment posted!', 'success');
    commentInput.value = '';
    
    // Refresh comments
    loadComments(postId);
}

function sharePost(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on CollabFund',
            text: 'Interesting discussion happening here',
            url: window.location.href
        }).then(() => {
            showMessage('Post shared successfully!', 'success');
        }).catch(() => {
            copyToClipboard(window.location.href);
        });
    } else {
        copyToClipboard(window.location.href);
    }
}

function toggleSave(postId) {
    const saveBtn = document.querySelector(`[onclick="toggleSave(${postId})"]`);
    const isSaved = saveBtn.classList.contains('saved');
    
    if (isSaved) {
        saveBtn.classList.remove('saved');
        showMessage('Post removed from saved', 'info');
    } else {
        saveBtn.classList.add('saved');
        showMessage('Post saved!', 'success');
    }
}

function connectUser(userName) {
    showMessage(`Connection request sent to ${userName}!`, 'success');
}

// Utility Functions
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMs = now - time;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) {
        return 'Just now';
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    } else {
        return time.toLocaleDateString();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Link copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showMessage('Link copied to clipboard!', 'success');
    } catch (err) {
        showMessage('Failed to copy link', 'error');
    }
    
    document.body.removeChild(textArea);
}

function showMessage(text, type = 'info') {
    const container = document.getElementById('message-container') || createMessageContainer();
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    container.appendChild(message);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 4000);
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
    `;
    document.body.appendChild(container);
    return container;
}