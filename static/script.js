

// ============================================
// CART FUNCTIONALITY
// ============================================

let cartCount = 0;
let cartItems = [];

function addToCart(productName, price) {
    const buttons = document.querySelectorAll('.btn-add');
    buttons.forEach(btn => {
        if (btn.textContent.includes('Add to Cart')) {
            btn.textContent = 'Adding...';
            btn.disabled = true;
        }
    });

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
        cartCount++;
        document.getElementById('cartCount').textContent = cartCount;
        cartItems.push({ name: productName, price: price });
        showNotification(`${productName} added to cart! 🛒`);
    })
    .finally(() => {
        const buttons = document.querySelectorAll('.btn-add');
        buttons.forEach(btn => {
            btn.textContent = 'Add to Cart';
            btn.disabled = false;
        });
    });
}

function shopNow() {
    document.getElementById('products').scrollIntoView({ 
        behavior: 'smooth' 
    });
    showNotification('Check out our latest collection! 👕');
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showNotification('Please fill in all fields! ⚠️');
        return;
    }
    
    const loginBtn = this.querySelector('.btn-login');
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    
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
            showNotification(data.error || 'Login failed! ❌');
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
    
    const submitBtn = this.querySelector('.btn-submit');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
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
            showNotification(data.error || 'Error sending message! ❌');
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

function socialLink(platform) {
    showNotification(`Opening ${platform}... 📱`);
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    const colors = {
        'success': '#4CAF50',
        'error': '#f44336',
        'warning': '#ff9800',
        'info': '#e94560'
    };
    notification.style.borderLeftColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.5s ease';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

document.addEventListener('keydown', function(e) {
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
    
    if (e.key === 'Escape') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showNotification('Scrolled to top! ⬆️');
    }
});

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
            
            showNotification(`Cart: ${data.count} items, Total: $${data.total}`);
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

window.addEventListener('load', function() {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        document.getElementById('login-email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
        setTimeout(() => {
            showNotification(`Welcome back, ${savedEmail.split('@')[0]}! 👋`, 'success');
        }, 500);
    }
    
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
            const savedCart = localStorage.getItem('cartItems');
            if (savedCart) {
                try {
                    cartItems = JSON.parse(savedCart);
                    cartCount = cartItems.length;
                    document.getElementById('cartCount').textContent = cartCount;
                } catch(e) {}
            }
        });
    
    document.querySelectorAll('.product-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });
});

// ============================================
// SIGN UP / LOGIN SECTION TOGGLING
// ============================================
// Handle Sign Up Link
const signupBtn = document.getElementById('signupLink');
if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
       
    });
}


// Handle Register Form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, password: password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Account created successfully! Please login.');

        } else {
            alert(data.error || 'Registration failed. Please try again.');
        }
    });
}

function submitRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!email || !password) {
        alert('Please fill in both email and password!');
        return;
    }

    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Account created successfully! Please login.');
           
        } else {
            alert(data.error || 'Registration failed. Please try again.');
        }
    })
    .catch(error => {
        alert('There was a problem connecting to the server. Please try again.');
    });
}

function submitLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('Please fill in both email and password!');
        return;
    }

    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Welcome back, ' + data.user + '!');
            window.location.href = '/';
        } else {
            alert(data.error || 'Login failed. Please try again.');
        }
    })
    .catch(error => {
        alert('There was a problem connecting to the server. Please try again.');
    });
}