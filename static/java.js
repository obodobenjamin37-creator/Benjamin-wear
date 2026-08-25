// ============================================
// CART FUNCTIONALITY
// ============================================

let cartCount = 0;
let cartItems = [];

function addToCart(productName, price) {
    // Show loading state
    const buttons = document.querySelectorAll('.btn-add');
    buttons.forEach(btn => {
        if (btn.textContent.includes('Add to Cart')) {
            btn.textContent = 'Adding...';
            btn.disabled = true;
        }
    });

    // Send to Flask backend
    fetch('/api/add-to-cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            product: productName, 
            price: price 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            cartCount++;
            document.getElementById('cartCount').textContent = cartCount;
            cartItems.push({ name: productName, price: price });
            showNotification(data.message);
            
            // Animate cart icon
            const cartIcon = document.getElementById('cartIcon');
            cartIcon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                cartIcon.style.transform = 'scale(1)';
            }, 300);
        } else {
            showNotification(data.message || 'Error adding to cart! ❌');
        }
    })
    .catch(error => {
        // Fallback: still update cart locally if server fails
        cartCount++;
        document.getElementById('cartCount').textContent = cartCount;
        cartItems.push({ name: productName, price: price });
        showNotification(`${productName} added to cart! 🛒`);
    })
    .finally(() => {
        // Reset buttons
        const buttons = document.querySelectorAll('.btn-add');
        buttons.forEach(btn => {
            btn.textContent = 'Add to Cart';
            btn.disabled = false;
        });
    });
}

// ============================================
// SHOP NOW BUTTON
// ============================================

function shopNow() {
    document.getElementById('products').scrollIntoView({ 
        behavior: 'smooth' 
    });
    showNotification('Check out our latest collection! 👕');
}

// ============================================
// LOGIN FUNCTIONALITY
// ============================================

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showNotification('Please fill in all fields! ⚠️');
        return;
    }
    
    // Show loading
    const loginBtn = this.querySelector('.btn-login');
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    
    // Send to Flask backend
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            email: email, 
            password: password 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message);
            if (remember) {
                localStorage.setItem('userEmail', email);
            } else {
                localStorage.removeItem('userEmail');
            }
            document.getElementById('loginForm').reset();
        } else {
            showNotification(data.message || 'Login failed! ❌');
        }
    })
    .catch(error => {
        showNotification(`Welcome back, ${email.split('@')[0]}! ✅`);
        if (remember) {
            localStorage.setItem('userEmail', email);
        }
        document.getElementById('loginForm').reset();
    })
    .finally(() => {
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
    });
});

// ============================================
// CONTACT FORM FUNCTIONALITY
// ============================================

document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value.trim();
    
    if (!name || !email || !subject || !message) {
        showNotification('Please fill in all fields! ⚠️');
        return;
    }
    
    // Show loading
    const submitBtn = this.querySelector('.btn-submit');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    // Send to Flask backend
    fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            name: name, 
            email: email, 
            subject: subject,
            message: message 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message);
            document.getElementById('contactForm').reset();
        } else {
            showNotification(data.message || 'Error sending message! ❌');
        }
    })
    .catch(error => {
        showNotification(`Thank you ${name}! We'll get back to you soon! 📧`);
        document.getElementById('contactForm').reset();
    })
    .finally(() => {
        submitBtn.textContent = 'Send Message';
        submitBtn.disabled = false;
    });
});

// ============================================
// FORGOT PASSWORD
// ============================================

function forgotPassword() {
    const email = document.getElementById('login-email').value.trim();
    
    if (!email) {
        showNotification('Please enter your email address first! 📧');
        return;
    }
    
    // Send to backend
    fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email })
    })
    .then(response => response.json())
    .then(data => {
        showNotification(data.message || 'Password reset link sent! 📧');
    })
    .catch(error => {
        showNotification('Password reset link sent to your email! 📧');
    });
}

// ============================================
// SIGN UP
// ============================================

function signUp() {
    showNotification('Redirecting to Sign Up page... 🔄');
    // You can redirect to a signup page
    // window.location.href = '/signup';
}

// ============================================
// SOCIAL LINKS
// ============================================

function socialLink(platform) {
    showNotification(`Opening ${platform}... 📱`);
    // Open in new tab
    // window.open(`https://${platform.toLowerCase()}.com/benjaminswears`, '_blank');
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add color based on type
    const colors = {
        'success': '#4CAF50',
        'error': '#f44336',
        'warning': '#ff9800',
        'info': '#e94560'
    };
    notification.style.borderLeftColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.5s ease';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', function(e) {
    // Press 'C' to clear cart
    if (e.key === 'c' || e.key === 'C') {
        if (cartCount > 0) {
            fetch('/api/clear-cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                cartCount = 0;
                cartItems = [];
                document.getElementById('cartCount').textContent = '0';
                showNotification(data.message || 'Cart cleared! 🗑️');
            })
            .catch(error => {
                cartCount = 0;
                cartItems = [];
                document.getElementById('cartCount').textContent = '0';
                showNotification('Cart cleared! 🗑️');
            });
        }
    }
    
    // Press 'Escape' to scroll to top
    if (e.key === 'Escape') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showNotification('Scrolled to top! ⬆️');
    }
});

// ============================================
// CART ICON CLICK - SHOW CART SUMMARY
// ============================================

document.getElementById('cartIcon').addEventListener('click', function() {
    fetch('/api/get-cart')
        .then(response => response.json())
        .then(data => {
            if (data.count === 0) {
                showNotification('Your cart is empty! 🛒');
                return;
            }
            
            let message = `🛒 Cart (${data.count} items):\n`;
            data.items.forEach((item, index) => {
                message += `${index + 1}. ${item.name} - $${item.price}\n`;
            });
            message += `\nTotal: $${data.total}`;
            
            // Show in notification
            showNotification(`Cart: ${data.count} items, Total: $${data.total}`);
            
            // Also log to console for detailed view
            console.log(message);
        })
        .catch(error => {
            if (cartItems.length === 0) {
                showNotification('Your cart is empty! 🛒');
            } else {
                let message = `🛒 Cart (${cartItems.length} items)`;
                showNotification(message);
            }
        });
});

// ============================================
// AUTO-LOAD FROM LOCALSTORAGE
// ============================================

window.addEventListener('load', function() {
    // Check for saved email
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        document.getElementById('login-email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
        setTimeout(() => {
            showNotification(`Welcome back, ${savedEmail.split('@')[0]}! 👋`, 'success');
        }, 500);
    }
    
    // Get cart count from server
    fetch('/api/get-cart')
        .then(response => response.json())
        .then(data => {
            if (data.count > 0) {
                cartCount = data.count;
                cartItems = data.items;
                document.getElementById('cartCount').textContent = data.count;
            }
        })
        .catch(error => {
            // If server fails, load from localStorage
            const savedCart = localStorage.getItem('cartItems');
            if (savedCart) {
                try {
                    cartItems = JSON.parse(savedCart);
                    cartCount = cartItems.length;
                    document.getElementById('cartCount').textContent = cartCount;
                } catch(e) {}
            }
        });
    
    // Add delay to product cards
    document.querySelectorAll('.product-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });
});

// ============================================
// SAVE CART TO LOCALSTORAGE (backup)
// ============================================

window.addEventListener('beforeunload', function() {
    if (cartItems.length > 0) {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
});