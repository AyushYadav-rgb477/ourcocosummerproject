// Profile Page JavaScript functionality

let currentUser = null;
let bankDetails = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthAndLoadProfile();
    
    // Setup forms
    setupBankDetailsForm();
    setupProfileForm();
    
    // Setup user dropdown
    setupUserDropdown();
    
    // Setup logout
    setupLogout();
    
    // Setup donate now functionality
    setupDonateNowButton();
});

async function checkAuthAndLoadProfile() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserGreeting();
            loadProfileData();
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

function updateUserGreeting() {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl && currentUser) {
        greetingEl.textContent = currentUser.username;
    }
}

async function loadProfileData() {
    if (!currentUser) return;

    // Update profile information
    document.getElementById('profile-name').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('profile-email').textContent = currentUser.email;
    
    // Load user statistics
    try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('user-projects-count').textContent = data.total_projects;
            document.getElementById('user-funding-total').textContent = `$${data.total_funding.toFixed(2)}`;
            document.getElementById('user-votes-total').textContent = data.total_votes;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }

    // Pre-fill profile form
    document.getElementById('full-name').value = currentUser.full_name || '';
    document.getElementById('college').value = currentUser.college || '';
    document.getElementById('email').value = currentUser.email || '';
}

function setupBankDetailsForm() {
    const form = document.getElementById('bank-details-form');
    if (form) {
        form.addEventListener('submit', handleBankDetailsSubmission);
        
        // Add real-time validation
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', validateInput);
            input.addEventListener('input', clearValidationErrors);
        });
    }
}

function setupProfileForm() {
    const form = document.getElementById('profile-form');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }
}

function validateInput(event) {
    const input = event.target;
    const value = input.value.trim();
    
    switch (input.id) {
        case 'account-number':
            if (!/^[0-9]{9,18}$/.test(value)) {
                showInputError(input, 'Account number must be 9-18 digits');
                return false;
            }
            break;
        case 'ifsc-code':
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) {
                showInputError(input, 'Invalid IFSC code format');
                return false;
            }
            break;
        case 'upi-id':
            if (!/^[\w.-]+@[\w.-]+$/.test(value)) {
                showInputError(input, 'Invalid UPI ID format');
                return false;
            }
            break;
        case 'phone-number':
            if (!/^[0-9]{10}$/.test(value)) {
                showInputError(input, 'Phone number must be 10 digits');
                return false;
            }
            break;
    }
    
    clearInputError(input);
    return true;
}

function showInputError(input, message) {
    clearInputError(input);
    input.style.borderColor = '#dc3545';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'input-error';
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
}

function clearInputError(input) {
    const errorDiv = input.parentNode.querySelector('.input-error');
    if (errorDiv) {
        errorDiv.remove();
    }
    input.style.borderColor = '#6a11cb';
}

function clearValidationErrors(event) {
    clearInputError(event.target);
}

async function handleBankDetailsSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    
    // Validate all inputs
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateInput({ target: input })) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        showMessage('Please fix the validation errors', 'error');
        return;
    }
    
    // Collect form data
    const formData = new FormData(form);
    bankDetails = {
        accountHolderName: document.getElementById('account-holder-name').value,
        bankName: document.getElementById('bank-name').value,
        accountNumber: document.getElementById('account-number').value,
        ifscCode: document.getElementById('ifsc-code').value.toUpperCase(),
        upiId: document.getElementById('upi-id').value,
        phoneNumber: document.getElementById('phone-number').value
    };
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Here you would normally save to the server
        // For now, we'll simulate a save and generate QR
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        
        showMessage('Bank details saved successfully!', 'success');
        generateQRCode();
        
    } catch (error) {
        console.error('Error saving bank details:', error);
        showMessage('Error saving bank details', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Bank Details';
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    
    const profileData = {
        fullName: document.getElementById('full-name').value,
        college: document.getElementById('college').value
    };
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showMessage('Profile updated successfully!', 'success');
            document.getElementById('profile-name').textContent = currentUser.full_name || currentUser.username;
        } else {
            const error = await response.json();
            showMessage(error.error || 'Error updating profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Profile';
    }
}

function generateQRCode() {
    if (!bankDetails) return;
    
    // Show QR section
    const qrSection = document.getElementById('qr-section');
    qrSection.style.display = 'block';
    
    // Update QR info
    document.getElementById('qr-upi-info').textContent = `UPI ID: ${bankDetails.upiId}`;
    document.getElementById('qr-name-info').textContent = `Name: ${bankDetails.accountHolderName}`;
    
    // Generate UPI payment URL
    const upiUrl = `upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(bankDetails.accountHolderName)}&cu=INR`;
    
    // Generate QR code
    const qrContainer = document.getElementById('qr-code');
    qrContainer.innerHTML = ''; // Clear previous QR code
    
    QRCode.toCanvas(qrContainer, upiUrl, {
        width: 180,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error) {
        if (error) {
            console.error('QR Code generation error:', error);
            qrContainer.innerHTML = '<p style="color: #dc3545;">Error generating QR code</p>';
        }
    });
    
    // Setup QR actions
    setupQRActions(upiUrl);
}

function setupQRActions(upiUrl) {
    const downloadBtn = document.getElementById('download-qr');
    const shareBtn = document.getElementById('share-qr');
    
    downloadBtn.addEventListener('click', function() {
        const canvas = document.querySelector('#qr-code canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'donation-qr-code.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    });
    
    shareBtn.addEventListener('click', function() {
        if (navigator.share) {
            navigator.share({
                title: 'Donate via UPI',
                text: `Donate to ${bankDetails.accountHolderName} via UPI`,
                url: upiUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(upiUrl).then(() => {
                showMessage('UPI link copied to clipboard!', 'success');
            });
        }
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

function setupDonateNowButton() {
    const donateBtn = document.getElementById('donate-now-btn');
    const qrContainer = document.getElementById('donation-qr-container');
    const modal = document.getElementById('qr-modal');
    const closeBtn = document.querySelector('.close');
    
    donateBtn.addEventListener('click', function() {
        const upiId = document.getElementById('upi-id').value.trim();
        const accountHolderName = document.getElementById('account-holder-name').value.trim();
        
        if (!upiId) {
            showMessage('Please provide your UPI ID to generate a QR code.', 'warning');
            document.getElementById('upi-id').focus();
            return;
        }
        
        if (!accountHolderName) {
            showMessage('Please provide account holder name to generate a QR code.', 'warning');
            document.getElementById('account-holder-name').focus();
            return;
        }
        
        generateDonationQR(upiId, accountHolderName);
    });
    
    // Modal close functionality
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Setup modal action buttons
    setupModalActions();
}

function generateDonationQR(upiId, name) {
    const qrContainer = document.getElementById('donation-qr-container');
    const modalQrContainer = document.getElementById('modal-qr-code');
    const modal = document.getElementById('qr-modal');
    
    // Create UPI payment URL
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&cu=INR`;
    
    // Show the QR container
    qrContainer.style.display = 'block';
    
    // Generate QR in both locations
    generateQRInContainer(document.getElementById('donation-qr-code'), upiUrl);
    generateQRInContainer(modalQrContainer, upiUrl);
    
    // Update modal text
    document.getElementById('modal-qr-text').textContent = `Scan this QR code to donate to ${name} via UPI`;
    
    // Show modal
    modal.style.display = 'block';
    
    // Setup download and share functionality
    setupQRDownloadShare(upiUrl, name);
    
    showMessage('Donation QR code generated successfully!', 'success');
}

function generateQRInContainer(container, url) {
    container.innerHTML = ''; // Clear previous content
    
    QRCode.toCanvas(container, url, {
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error) {
        if (error) {
            console.error('QR Code generation error:', error);
            container.innerHTML = '<p style="color: #dc3545;">Error generating QR code</p>';
        }
    });
}

function setupQRDownloadShare(upiUrl, name) {
    // Regular QR actions
    const downloadBtn = document.getElementById('download-donation-qr-btn');
    const shareBtn = document.getElementById('share-donation-qr-btn');
    
    // Modal QR actions
    const modalDownloadBtn = document.getElementById('modal-download-btn');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    
    const downloadFunction = function() {
        const canvas = document.querySelector('#donation-qr-code canvas') || document.querySelector('#modal-qr-code canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-donation-qr.png`;
            link.href = canvas.toDataURL();
            link.click();
            showMessage('QR code downloaded successfully!', 'success');
        }
    };
    
    const shareFunction = function() {
        if (navigator.share) {
            navigator.share({
                title: 'Donate via UPI',
                text: `Donate to ${name} via UPI`,
                url: upiUrl
            }).then(() => {
                showMessage('QR code shared successfully!', 'success');
            }).catch(() => {
                copyToClipboard(upiUrl);
            });
        } else {
            copyToClipboard(upiUrl);
        }
    };
    
    const copyFunction = function() {
        const upiId = document.getElementById('upi-id').value.trim();
        copyToClipboard(upiId);
    };
    
    // Attach event listeners
    if (downloadBtn) downloadBtn.addEventListener('click', downloadFunction);
    if (shareBtn) shareBtn.addEventListener('click', shareFunction);
    if (modalDownloadBtn) modalDownloadBtn.addEventListener('click', downloadFunction);
    if (modalCopyBtn) modalCopyBtn.addEventListener('click', copyFunction);
}

function setupModalActions() {
    // This will be called during initialization, but the actual functionality
    // is set up in setupQRDownloadShare when QR is generated
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Copied to clipboard!', 'success');
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
        showMessage('Copied to clipboard!', 'success');
    } catch (err) {
        showMessage('Failed to copy to clipboard', 'error');
    }
    
    document.body.removeChild(textArea);
}

function showMessage(text, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) return;
    
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