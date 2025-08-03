// Browse projects JavaScript functionality

let currentUser = null;
let currentPage = 1;
let currentFilters = {
    search: '',
    category: '',
    sort: 'recent'
};
let currentProject = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Setup filters and search
    setupFilters();
    
    // Setup modals
    setupModals();
    
    // Load initial projects
    loadProjects();
    
    // Check if specific project ID in URL
    checkForProjectInURL();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateNavbarForLoggedInUser();
            showCommentSection();
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
            <button class="logout-btn" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
        `;
    }
    
    if (dashboardLink) {
        dashboardLink.style.display = 'inline-flex';
    }
}

function showCommentSection() {
    const commentSection = document.getElementById('add-comment-section');
    if (commentSection) {
        commentSection.style.display = 'block';
    }
}

function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
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
    resetAndLoadProjects();
}

function handleCategoryFilter(e) {
    currentFilters.category = e.target.value;
    resetAndLoadProjects();
}

function handleSortFilter(e) {
    currentFilters.sort = e.target.value;
    resetAndLoadProjects();
}

function resetAndLoadProjects() {
    currentPage = 1;
    document.getElementById('projects-grid').innerHTML = '';
    loadProjects();
}

async function loadProjects() {
    if (isLoading) return;
    
    isLoading = true;
    const loadingEl = document.getElementById('loading');
    const noResultsEl = document.getElementById('no-results');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (noResultsEl) noResultsEl.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            per_page: 9,
            sort: currentFilters.sort
        });
        
        if (currentFilters.category) {
            params.append('category', currentFilters.category);
        }
        
        if (currentFilters.search) {
            params.append('search', currentFilters.search);
        }
        
        const response = await fetch(`/api/projects?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            displayProjects(data.projects, currentPage === 1);
            
            // Show/hide load more button
            if (loadMoreContainer) {
                if (currentPage < data.pages) {
                    loadMoreContainer.style.display = 'block';
                } else {
                    loadMoreContainer.style.display = 'none';
                }
            }
            
            // Show no results if no projects
            if (data.projects.length === 0 && currentPage === 1) {
                if (noResultsEl) noResultsEl.style.display = 'block';
            }
        } else {
            console.error('Failed to load projects');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showMessage('Error loading projects', 'error');
    } finally {
        isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function displayProjects(projects, clearExisting = false) {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return;
    
    if (clearExisting) {
        projectsGrid.innerHTML = '';
    }
    
    const projectsHTML = projects.map(project => `
        <div class="project-card" onclick="openProjectModal(${project.id})">
            <div class="project-header">
                <span class="project-category">${project.category}</span>
                <span class="project-date">${formatDate(project.created_at)}</span>
            </div>
            <h3 class="project-title">${escapeHtml(project.title)}</h3>
            <div class="project-owner">
                <i class="fas fa-user"></i>
                <span>${escapeHtml(project.owner?.full_name || 'Unknown')}</span>
            </div>
            <p class="project-description">${escapeHtml(project.description)}</p>
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
            </div>
        </div>
    `).join('');
    
    projectsGrid.insertAdjacentHTML('beforeend', projectsHTML);
}

// Setup load more functionality
document.addEventListener('DOMContentLoaded', function() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            currentPage++;
            loadProjects();
        });
    }
});

function setupModals() {
    // Project modal
    const projectModal = document.getElementById('project-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
    // Setup action buttons
    setupActionButtons();
}

function setupActionButtons() {
    const voteBtn = document.getElementById('vote-btn');
    const collabBtn = document.getElementById('collab-btn');
    const donateBtn = document.getElementById('donate-btn');
    const submitCommentBtn = document.getElementById('submit-comment');
    
    if (voteBtn) {
        voteBtn.addEventListener('click', handleVote);
    }
    
    if (collabBtn) {
        collabBtn.addEventListener('click', openCollabModal);
    }
    
    if (donateBtn) {
        donateBtn.addEventListener('click', openDonateModal);
    }
    
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', handleAddComment);
    }
    
    // Collaboration modal
    const sendCollabBtn = document.getElementById('send-collab-request');
    if (sendCollabBtn) {
        sendCollabBtn.addEventListener('click', handleCollabRequest);
    }
    
    // Donation modal
    const sendDonationBtn = document.getElementById('send-donation');
    if (sendDonationBtn) {
        sendDonationBtn.addEventListener('click', handleDonation);
    }
}

async function openProjectModal(projectId) {
    if (!currentUser) {
        showMessage('Please login to view project details', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
            const data = await response.json();
            currentProject = data.project;
            displayProjectModal(currentProject);
            loadProjectComments(projectId);
            
            const modal = document.getElementById('project-modal');
            modal.classList.add('show');
        } else {
            showMessage('Error loading project details', 'error');
        }
    } catch (error) {
        console.error('Error loading project:', error);
        showMessage('Error loading project details', 'error');
    }
}

function displayProjectModal(project) {
    document.getElementById('modal-title').textContent = project.title;
    document.getElementById('modal-category').textContent = project.category;
    document.getElementById('modal-date').textContent = formatDate(project.created_at);
    document.getElementById('modal-owner').innerHTML = `
        <i class="fas fa-user"></i> 
        <span>${escapeHtml(project.owner?.full_name || 'Unknown')}</span>
    `;
    document.getElementById('modal-votes').textContent = project.vote_count;
    document.getElementById('modal-funding').textContent = `$${project.current_funding.toFixed(2)}`;
    document.getElementById('modal-collabs').textContent = project.collaboration_count;
    document.getElementById('modal-description').textContent = project.description;
    
    // Update action buttons based on ownership
    const isOwner = currentUser && currentUser.id === project.owner?.id;
    const voteBtn = document.getElementById('vote-btn');
    const collabBtn = document.getElementById('collab-btn');
    const donateBtn = document.getElementById('donate-btn');
    
    if (isOwner) {
        if (collabBtn) collabBtn.disabled = true;
        if (collabBtn) collabBtn.textContent = 'Your Project';
    } else {
        if (collabBtn) collabBtn.disabled = false;
        if (collabBtn) collabBtn.innerHTML = '<i class="fas fa-handshake"></i> Collaborate';
    }
}

async function loadProjectComments(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/comments`);
        if (response.ok) {
            const data = await response.json();
            displayComments(data.comments);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color: #999; text-align: center;">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-author">${escapeHtml(comment.author?.full_name || 'Unknown')}</div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-date">${formatDate(comment.created_at)}</div>
        </div>
    `).join('');
}

async function handleVote() {
    if (!currentUser) {
        showMessage('Please login to vote', 'error');
        return;
    }
    
    if (!currentProject) return;
    
    const voteBtn = document.getElementById('vote-btn');
    voteBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/vote`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Vote updated successfully!', 'success');
            
            // Update vote count in modal
            document.getElementById('modal-votes').textContent = data.vote_count;
            currentProject.vote_count = data.vote_count;
            
            // Update vote button appearance
            voteBtn.classList.add('voted');
        } else {
            showMessage(data.error || 'Error voting', 'error');
        }
    } catch (error) {
        console.error('Vote error:', error);
        showMessage('Error voting', 'error');
    } finally {
        voteBtn.disabled = false;
    }
}

function openCollabModal() {
    if (!currentUser) {
        showMessage('Please login to collaborate', 'error');
        return;
    }
    
    const collabModal = document.getElementById('collab-modal');
    collabModal.classList.add('show');
}

async function handleCollabRequest() {
    const message = document.getElementById('collab-message').value;
    const sendBtn = document.getElementById('send-collab-request');
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/collaborate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Collaboration request sent successfully!', 'success');
            closeModals();
            document.getElementById('collab-message').value = '';
        } else {
            showMessage(data.error || 'Error sending collaboration request', 'error');
        }
    } catch (error) {
        console.error('Collaboration request error:', error);
        showMessage('Error sending collaboration request', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-handshake"></i> Send Request';
    }
}

function openDonateModal() {
    if (!currentUser) {
        showMessage('Please login to donate', 'error');
        return;
    }
    
    const donateModal = document.getElementById('donate-modal');
    donateModal.classList.add('show');
}

async function handleDonation() {
    const amount = parseFloat(document.getElementById('donation-amount').value);
    const message = document.getElementById('donation-message').value;
    const sendBtn = document.getElementById('send-donation');
    
    if (!amount || amount <= 0) {
        showMessage('Please enter a valid donation amount', 'error');
        return;
    }
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/donate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Donation successful! Thank you for your support!', 'success');
            
            // Update funding amount in modal
            document.getElementById('modal-funding').textContent = `$${data.new_funding.toFixed(2)}`;
            currentProject.current_funding = data.new_funding;
            
            closeModals();
            document.getElementById('donation-amount').value = '';
            document.getElementById('donation-message').value = '';
        } else {
            showMessage(data.error || 'Error processing donation', 'error');
        }
    } catch (error) {
        console.error('Donation error:', error);
        showMessage('Error processing donation', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-heart"></i> Donate Now';
    }
}

async function handleAddComment() {
    if (!currentUser) {
        showMessage('Please login to comment', 'error');
        return;
    }
    
    const content = document.getElementById('comment-input').value.trim();
    if (!content) {
        showMessage('Please enter a comment', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-comment');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/comments`, {
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
            showMessage('Comment added successfully!', 'success');
            document.getElementById('comment-input').value = '';
            
            // Reload comments
            loadProjectComments(currentProject.id);
        } else {
            showMessage(data.error || 'Error adding comment', 'error');
        }
    } catch (error) {
        console.error('Comment error:', error);
        showMessage('Error adding comment', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Comment';
    }
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

function checkForProjectInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    if (projectId) {
        setTimeout(() => {
            openProjectModal(parseInt(projectId));
        }, 500);
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
