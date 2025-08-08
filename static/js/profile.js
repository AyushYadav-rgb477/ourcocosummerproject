// Profile page JavaScript functionality

let currentUser = null;
let viewingUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if viewing another user's profile
    const urlParams = new URLSearchParams(window.location.search);
    viewingUserId = urlParams.get('user_id');
    
    if (viewingUserId) {
        // Load other user's profile
        loadOtherUserProfile(viewingUserId);
    } else {
        // Check authentication for own profile
        checkAuthStatus();
        // Load own profile data
        loadProfileData();
    }
    
    // Setup tabs
    setupTabs();
    
    // Setup modals
    setupModals();
    
    // Setup profile image functionality
    setupProfileImage();
    
    // Start real-time updates
    startRealTimeUpdates();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateProfileInfo();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login.html';
    }
}

async function loadOtherUserProfile(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/profile`);
        if (response.ok) {
            const data = await response.json();
            currentUser = data.profile;
            updateProfileInfo();
            updateProfileStats(data.profile);
            displayUserProjects(data.profile.projects || []);
            
            // Hide edit button for other users' profiles
            const editBtn = document.getElementById('edit-profile-btn');
            if (editBtn) editBtn.style.display = 'none';
            
            // Hide profile image overlay for other users
            const overlay = document.getElementById('profile-image-overlay');
            if (overlay) overlay.style.display = 'none';
            
        } else {
            window.location.href = '/profile.html';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        window.location.href = '/profile.html';
    }
}

function updateProfileInfo(profileData = null) {
    const user = profileData || currentUser;
    if (!user) return;
    
    // Update sidebar profile info
    document.getElementById('profile-name').textContent = user.full_name;
    
    // Update title/role
    const titleElement = document.getElementById('profile-title');
    if (user.title) {
        titleElement.textContent = user.title;
    } else {
        titleElement.textContent = 'Student';
    }
    
    // Update contact information
    document.getElementById('profile-email').textContent = user.email;
    
    const phoneElement = document.getElementById('profile-phone');
    if (user.phone) {
        phoneElement.textContent = user.phone;
    } else {
        phoneElement.textContent = 'Not provided';
    }
    
    const locationElement = document.getElementById('profile-location');
    if (user.location) {
        locationElement.textContent = user.location;
    } else {
        locationElement.textContent = 'Not provided';
    }
    
    document.getElementById('profile-college').textContent = user.college;
    
    // Update bio in about section
    const bioElement = document.getElementById('profile-bio');
    if (user.bio) {
        bioElement.textContent = user.bio;
    } else {
        bioElement.textContent = 'No bio available yet.';
    }
    
    // Update social links
    updateSocialLinks(user);
    
    // Update profile image
    const profileImage = document.getElementById('profile-image');
    const defaultAvatar = document.getElementById('default-avatar');
    if (user.profile_image) {
        profileImage.src = user.profile_image;
        profileImage.style.display = 'block';
        defaultAvatar.style.display = 'none';
    } else {
        profileImage.style.display = 'none';
        defaultAvatar.style.display = 'flex';
    }
}

function updateSocialLinks(user) {
    // Update Twitter link
    const twitterLink = document.getElementById('twitter-link');
    if (user.twitter) {
        twitterLink.href = user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter.replace('@', '')}`;
        twitterLink.style.display = 'flex';
    } else {
        twitterLink.style.display = 'none';
    }
    
    // Update LinkedIn link
    const linkedinLink = document.getElementById('linkedin-link');
    if (user.linkedin) {
        linkedinLink.href = user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`;
        linkedinLink.style.display = 'flex';
    } else {
        linkedinLink.style.display = 'none';
    }
    
    // Update GitHub link
    const githubLink = document.getElementById('github-link');
    if (user.github) {
        githubLink.href = user.github.startsWith('http') ? user.github : `https://github.com/${user.github}`;
        githubLink.style.display = 'flex';
    } else {
        githubLink.style.display = 'none';
    }
}

function updateProfileStats(stats) {
    document.getElementById('user-projects-count').textContent = stats.total_projects || 0;
    document.getElementById('user-collaborations').textContent = stats.total_collaborations || 0;
    document.getElementById('user-funding').textContent = `$${(stats.total_funding || 0).toFixed(2)}`;
    document.getElementById('user-votes').textContent = stats.total_votes || 0;
}

async function loadProfileData() {
    try {
        // Load user statistics
        await loadUserStats();
        
        // Load user projects
        await loadUserProjects();
        
        // Load collaborations
        await loadUserCollaborations();
        
        // Load donations
        await loadUserDonations();
        
        // Load activity
        await loadUserActivity();
        
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

async function loadUserStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('user-projects').textContent = data.total_projects || 0;
            document.getElementById('user-collaborations').textContent = data.total_collaborations || 0;
            document.getElementById('user-funding').textContent = `$${(data.total_funding || 0).toFixed(2)}`;
            document.getElementById('user-votes').textContent = data.total_votes || 0;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadUserProjects() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            displayUserProjects(data.projects || []);
        }
    } catch (error) {
        console.error('Error loading user projects:', error);
        displayUserProjects([]);
    }
}

function displayUserProjects(projects) {
    const projectsGrid = document.getElementById('user-projects-grid');
    if (!projectsGrid) return;
    
    if (projects.length === 0) {
        projectsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-rocket"></i>
                <h3>No Projects Yet</h3>
                <p>Create your first project to get started!</p>
                <button class="btn-primary" onclick="window.location.href='dashboard.html'">
                    <i class="fas fa-plus"></i> Create Project
                </button>
            </div>
        `;
        return;
    }
    
    projectsGrid.innerHTML = projects.map(project => `
        <div class="project-card">
            <div class="project-header">
                <span class="project-category">${project.category}</span>
                <span class="project-status ${project.status}">${project.status}</span>
            </div>
            <h3 class="project-title">${escapeHtml(project.title)}</h3>
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
}

async function loadUserCollaborations() {
    try {
        const response = await fetch('/api/dashboard/user-collaborations');
        if (response.ok) {
            const data = await response.json();
            displayUserCollaborations(data.collaborations || []);
        }
    } catch (error) {
        console.error('Error loading collaborations:', error);
        displayUserCollaborations([]);
    }
}

function displayUserCollaborations(collaborations) {
    const collaborationsList = document.getElementById('user-collaborations-list');
    if (!collaborationsList) return;
    
    if (collaborations.length === 0) {
        collaborationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-handshake"></i>
                <h3>No Collaborations Yet</h3>
                <p>Start collaborating with other students on their projects!</p>
                <button class="btn-primary" onclick="window.location.href='browse.html'">
                    <i class="fas fa-search"></i> Browse Projects
                </button>
            </div>
        `;
        return;
    }
    
    collaborationsList.innerHTML = collaborations.map(collab => `
        <div class="list-item">
            <div class="list-item-header">
                <span class="list-item-title">${escapeHtml(collab.project_title)}</span>
                <span class="collaboration-status ${collab.status}">${collab.status}</span>
            </div>
            <div class="list-item-content">
                <p><strong>Project Owner:</strong> ${escapeHtml(collab.owner_name)}</p>
                ${collab.message ? `<p><strong>Message:</strong> ${escapeHtml(collab.message)}</p>` : ''}
                <span class="list-item-date" data-timestamp="${collab.created_at}">${formatDate(collab.created_at)}</span>
            </div>
        </div>
    `).join('');
}

async function loadUserDonations() {
    try {
        const response = await fetch('/api/dashboard/user-donations');
        if (response.ok) {
            const data = await response.json();
            displayUserDonations(data.donations || []);
        }
    } catch (error) {
        console.error('Error loading donations:', error);
        displayUserDonations([]);
    }
}

function displayUserDonations(donations) {
    const donationsList = document.getElementById('user-donations-list');
    if (!donationsList) return;
    
    if (donations.length === 0) {
        donationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-donate"></i>
                <h3>No Donations Yet</h3>
                <p>Support amazing student projects by making your first donation!</p>
                <button class="btn-primary" onclick="window.location.href='browse.html'">
                    <i class="fas fa-search"></i> Browse Projects
                </button>
            </div>
        `;
        return;
    }
    
    donationsList.innerHTML = donations.map(donation => `
        <div class="list-item">
            <div class="list-item-header">
                <span class="list-item-title">${escapeHtml(donation.project_title)}</span>
                <span class="donation-amount">$${donation.amount.toFixed(2)}</span>
            </div>
            <div class="list-item-content">
                <p><strong>Project Owner:</strong> ${escapeHtml(donation.owner_name)}</p>
                ${donation.message ? `<p><strong>Message:</strong> ${escapeHtml(donation.message)}</p>` : ''}
                <span class="list-item-date" data-timestamp="${donation.created_at}">${formatDate(donation.created_at)}</span>
            </div>
        </div>
    `).join('');
}

async function loadUserActivity() {
    try {
        const response = await fetch('/api/dashboard/user-activity');
        if (response.ok) {
            const data = await response.json();
            displayUserActivity(data.activities || []);
        } else {
            displayUserActivity([]);
        }
    } catch (error) {
        console.error('Error loading activity:', error);
        displayUserActivity([]);
    }
}

function displayUserActivity(activities) {
    const activityFeed = document.getElementById('user-activity-feed');
    if (!activityFeed) return;
    
    if (activities.length === 0) {
        activityFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No Activity Yet</h3>
                <p>Start creating projects, collaborating, and engaging with the community!</p>
            </div>
        `;
        return;
    }
    
    activityFeed.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time" data-timestamp="${activity.time}">${formatDate(activity.time)}</div>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        'project_created': 'fa-rocket',
        'collaboration': 'fa-handshake',
        'donation': 'fa-donate',
        'vote': 'fa-thumbs-up',
        'comment': 'fa-comment'
    };
    return icons[type] || 'fa-circle';
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });
}

function setupModals() {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', openEditProfileModal);
    }
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleSaveProfile);
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

function setupProfileImage() {
    const profileAvatar = document.getElementById('profile-avatar-container');
    const imageInput = document.getElementById('profile-image-input');
    const removeImageBtn = document.getElementById('remove-image-btn');
    
    if (profileAvatar && !viewingUserId) {
        profileAvatar.addEventListener('click', () => {
            if (imageInput) imageInput.click();
        });
    }
    
    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelect);
    }
    
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', handleImageRemove);
    }
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        // Update preview in modal
        const previewImg = document.getElementById('edit-preview-img');
        const defaultPreview = document.getElementById('edit-default-preview');
        const removeBtn = document.getElementById('remove-image-btn');
        
        if (previewImg && defaultPreview && removeBtn) {
            previewImg.src = base64Image;
            previewImg.style.display = 'block';
            defaultPreview.style.display = 'none';
            removeBtn.style.display = 'inline-flex';
        }
        
        // Store the base64 image for saving
        document.getElementById('edit-image-preview').dataset.imageData = base64Image;
    };
    reader.readAsDataURL(file);
}

function handleImageRemove() {
    const previewImg = document.getElementById('edit-preview-img');
    const defaultPreview = document.getElementById('edit-default-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    const imageInput = document.getElementById('profile-image-input');
    
    if (previewImg && defaultPreview && removeBtn && imageInput) {
        previewImg.style.display = 'none';
        previewImg.src = '';
        defaultPreview.style.display = 'flex';
        removeBtn.style.display = 'none';
        imageInput.value = '';
        
        // Mark for removal
        document.getElementById('edit-image-preview').dataset.imageData = 'REMOVE';
    }
}

function openEditProfileModal() {
    if (!currentUser) return;
    
    // Pre-fill form with current user data
    document.getElementById('edit-full-name').value = currentUser.full_name || '';
    document.getElementById('edit-email').value = currentUser.email || '';
    document.getElementById('edit-college').value = currentUser.college || '';
    document.getElementById('edit-bio').value = currentUser.bio || '';
    document.getElementById('edit-skills').value = currentUser.skills || '';
    document.getElementById('edit-phone').value = currentUser.phone || '';
    document.getElementById('edit-location').value = currentUser.location || '';
    document.getElementById('edit-title').value = currentUser.title || '';
    document.getElementById('edit-twitter').value = currentUser.twitter || '';
    document.getElementById('edit-linkedin').value = currentUser.linkedin || '';
    document.getElementById('edit-github').value = currentUser.github || '';
    
    // Set up image preview
    const previewImg = document.getElementById('edit-preview-img');
    const defaultPreview = document.getElementById('edit-default-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    
    if (currentUser.profile_image) {
        previewImg.src = currentUser.profile_image;
        previewImg.style.display = 'block';
        defaultPreview.style.display = 'none';
        removeBtn.style.display = 'inline-flex';
    } else {
        previewImg.style.display = 'none';
        defaultPreview.style.display = 'flex';
        removeBtn.style.display = 'none';
    }
    
    const modal = document.getElementById('edit-profile-modal');
    modal.classList.add('show');
}

async function handleSaveProfile() {
    const fullName = document.getElementById('edit-full-name').value;
    const email = document.getElementById('edit-email').value;
    const college = document.getElementById('edit-college').value;
    const bio = document.getElementById('edit-bio').value;
    const skills = document.getElementById('edit-skills').value;
    const phone = document.getElementById('edit-phone').value;
    const location = document.getElementById('edit-location').value;
    const title = document.getElementById('edit-title').value;
    const twitter = document.getElementById('edit-twitter').value;
    const linkedin = document.getElementById('edit-linkedin').value;
    const github = document.getElementById('edit-github').value;
    
    if (!fullName.trim() || !email.trim() || !college.trim()) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Get image data if any
        const imagePreview = document.getElementById('edit-image-preview');
        const imageData = imagePreview ? imagePreview.dataset.imageData : null;
        
        const requestBody = {
            full_name: fullName,
            email: email,
            college: college,
            bio: bio,
            skills: skills,
            phone: phone,
            location: location,
            title: title,
            twitter: twitter,
            linkedin: linkedin,
            github: github
        };
        
        // Include image data if available
        if (imageData) {
            if (imageData === 'REMOVE') {
                requestBody.profile_image = null;
            } else {
                requestBody.profile_image = imageData;
            }
        }
        
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateProfileInfo();
            showMessage('Profile updated successfully!', 'success');
            closeModals();
        } else {
            const errorData = await response.json();
            showMessage(errorData.error || 'Error updating profile', 'error');
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('show'));
}

// Function to handle clicking on user names in comments and collaborations
function handleUserNameClick(userId, username) {
    if (userId && userId !== currentUser?.id) {
        window.location.href = `/profile.html?user_id=${userId}`;
    }
}

// Make user names clickable in generated content
function makeUserNamesClickable(container) {
    const userElements = container.querySelectorAll('[data-user-id]');
    userElements.forEach(element => {
        const userId = element.dataset.userId;
        const username = element.textContent;
        if (userId && userId !== currentUser?.id) {
            element.style.cursor = 'pointer';
            element.style.color = '#28a745';
            element.style.textDecoration = 'underline';
            element.addEventListener('click', () => handleUserNameClick(userId, username));
        }
    });
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
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
    // Remove popup messages - just log to console instead
    console.log(`${type}: ${message}`);
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

// Real-time updates for timestamps
function startRealTimeUpdates() {
    // Update all timestamps every minute
    setInterval(updateAllTimestamps, 60000);
}

function updateAllTimestamps() {
    // Update project timestamps
    document.querySelectorAll('[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            element.textContent = formatDate(timestamp);
        }
    });
    
    // Update activity timestamps
    document.querySelectorAll('.activity-time[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            element.textContent = formatDate(timestamp);
        }
    });
    
    // Update list item timestamps
    document.querySelectorAll('.list-item-date[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            element.textContent = formatDate(timestamp);
        }
    });
}