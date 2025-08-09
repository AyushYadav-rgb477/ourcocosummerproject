// Donate page JavaScript functionality

let currentUser = null;
let currentProject = null;
let selectedAmount = 0;
let selectedPaymentMethod = 'upi';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    
    // Get project ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    if (projectId) {
        loadProject(projectId);
    } else {
        window.location.href = 'browse.html';
    }
    
    // Setup event listeners
    setupEventListeners();
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateNavbarForLoggedInUser();
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

async function loadProject(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
            const data = await response.json();
            currentProject = data.project;
            displayProjectInfo(currentProject);
        } else {
            showMessage('Project not found', 'error');
            setTimeout(() => {
                window.location.href = 'browse.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error loading project:', error);
        showMessage('Error loading project', 'error');
    }
}

function displayProjectInfo(project) {
    document.getElementById('project-title').textContent = project.title;
    document.getElementById('project-owner').innerHTML = `
        <i class="fas fa-user"></i> ${project.owner ? project.owner.full_name : 'Unknown'}
    `;
    document.getElementById('project-category').innerHTML = `
        <i class="fas fa-tag"></i> ${project.category}
    `;
    
    const currentFunding = project.current_funding || 0;
    const fundingGoal = project.funding_goal || 0;
    const percentage = fundingGoal > 0 ? Math.round((currentFunding / fundingGoal) * 100) : 0;
    
    document.getElementById('current-funding').textContent = `$${currentFunding.toFixed(2)}`;
    document.getElementById('funding-goal').textContent = `$${fundingGoal.toFixed(2)}`;
    document.getElementById('funding-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-fill').style.width = `${Math.min(percentage, 100)}%`;
}

function setupEventListeners() {
    // Amount buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectAmount(parseFloat(this.dataset.amount));
            updateAmountButtons(this);
        });
    });
    
    // Custom amount input
    const customAmountInput = document.getElementById('custom-amount-input');
    customAmountInput.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        if (amount > 0) {
            selectAmount(amount);
            updateAmountButtons(null);
        }
    });
    
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            selectPaymentMethod(this.dataset.method);
            updatePaymentMethods(this);
        });
    });
    
    // Process donation button
    document.getElementById('process-donation').addEventListener('click', processDonation);
    
    // Card input formatting
    setupCardInputFormatting();
}

function selectAmount(amount) {
    selectedAmount = amount;
    updateDonationSummary();
    
    // Clear custom input if amount button was clicked
    if (event && event.target.classList.contains('amount-btn')) {
        document.getElementById('custom-amount-input').value = '';
    }
}

function updateAmountButtons(activeBtn) {
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    updatePaymentDetails();
}

function updatePaymentMethods(activeOption) {
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('active');
    });
    
    activeOption.classList.add('active');
}

function updatePaymentDetails() {
    // Hide all payment details
    document.querySelectorAll('.payment-detail').forEach(detail => {
        detail.style.display = 'none';
    });
    
    // Show selected payment method details
    const selectedDetail = document.getElementById(`${selectedPaymentMethod}-details`);
    if (selectedDetail) {
        selectedDetail.style.display = 'block';
    }
}

function updateDonationSummary() {
    const processingFee = selectedAmount * 0.029; // 2.9% processing fee
    const total = selectedAmount + processingFee;
    
    document.getElementById('summary-amount').textContent = `$${selectedAmount.toFixed(2)}`;
    document.getElementById('summary-fee').textContent = `$${processingFee.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `$${total.toFixed(2)}`;
    
    // Enable/disable donation button
    const donateBtn = document.getElementById('process-donation');
    donateBtn.disabled = selectedAmount <= 0;
}

function setupCardInputFormatting() {
    const cardNumber = document.getElementById('card-number');
    const expiry = document.getElementById('expiry');
    const cvv = document.getElementById('cvv');
    
    if (cardNumber) {
        cardNumber.addEventListener('input', function() {
            let value = this.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            this.value = formattedValue;
        });
    }
    
    if (expiry) {
        expiry.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            this.value = value;
        });
    }
    
    if (cvv) {
        cvv.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showMessage('Copied to clipboard!', 'success');
    }).catch(function(error) {
        console.error('Error copying to clipboard:', error);
        showMessage('Failed to copy to clipboard', 'error');
    });
}

async function processDonation() {
    if (!currentUser) {
        showMessage('Please login to make a donation', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    if (selectedAmount <= 0) {
        showMessage('Please select a valid donation amount', 'error');
        return;
    }
    
    if (!currentProject) {
        showMessage('Project information not available', 'error');
        return;
    }
    
    const message = document.getElementById('message-input').value;
    
    try {
        // Show loading state
        const donateBtn = document.getElementById('process-donation');
        const originalText = donateBtn.innerHTML;
        donateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        donateBtn.disabled = true;
        
        const response = await fetch(`/api/projects/${currentProject.id}/donate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: selectedAmount,
                message: message,
                payment_method: selectedPaymentMethod
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Thank you for your donation! The project owner has been notified.', 'success');
            setTimeout(() => {
                window.location.href = `browse.html`;
            }, 2000);
        } else {
            showMessage(data.error || 'Error processing donation', 'error');
        }
    } catch (error) {
        console.error('Error processing donation:', error);
        showMessage('Error processing donation. Please try again.', 'error');
    } finally {
        // Reset button state
        const donateBtn = document.getElementById('process-donation');
        donateBtn.innerHTML = '<i class="fas fa-heart"></i> Complete Donation';
        donateBtn.disabled = selectedAmount <= 0;
    }
}

function showMessage(message, type) {
    const container = document.getElementById('message-container');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

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

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    updateDonationSummary();
    updatePaymentDetails();
});