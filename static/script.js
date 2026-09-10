// ============================================
// CART FUNCTIONALITY
// ============================================

let cartCount = 0;
let cartItems = [];

function searchProducts() {
    const query = document.getElementById('searchBar').value;
    if(query.trim() !== "") {
        window.location.href = '/search?q=' + encodeURIComponent(query);
    }
}

function askQuantity(productName, price) {
    let quantity = prompt(`How many ${productName} do you want to add?`, "1");
    
    // If user presses Cancel (null), stop immediately!
    if (quantity === null) {
        return;
    }
    
    quantity = parseInt(quantity);
    // If empty or less than 1, set to 1
    if (isNaN(quantity) || quantity < 1) {
        quantity = 1;
    }
    
    addToCartWithQuantity(productName, price, quantity);
}

function addToCartWithQuantity(productName, price, quantity) {
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
            price: price,
            quantity: quantity 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            cartCount += quantity; // Increase cart count by the quantity!
            document.getElementById('cartCount').textContent = cartCount;
            cartItems.push({ name: productName, price: price, quantity: quantity }); // Add quantity to cart
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
        cartCount += quantity; // Fallback
        document.getElementById('cartCount').textContent = cartCount;
        cartItems.push({ name: productName, price: price, quantity: quantity });
        showNotification(`${quantity} x ${productName} added to cart! 🛒`);
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
// LOGIN FUNCTIONALITY (Only exists on login.html)
// ============================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
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
}

// ============================================
// CONTACT FORM FUNCTIONALITY
// ============================================

const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
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
}

// ============================================
// SOCIAL LINKS
// ============================================

function socialLink(platform) {
    showNotification(`Opening ${platform}... 📱`);
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

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

// ============================================
// CART ICON CLICK - SHOW CART SUMMARY
// ============================================

const cartIcon = document.getElementById('cartIcon');
if (cartIcon) {
    cartIcon.addEventListener('click', function() {
        fetch('/api/get-cart')
            .then(response => response.json())
            .then(data => {
                if (data.count === 0) {
                    alert('Your cart is empty! 🛒');
                    return;
                }
                
                let itemsHtml = '';
                data.items.forEach((item, index) => {
                    itemsHtml += `
                        <div class="cart-item">
                            <span>${index + 1}. ${item.name} (x${item.quantity || 1}) - $${item.price} / ₦${Math.round(item.price * (data.total_ngn / data.total))}</span>
                            <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
                        </div>
                    `;
                });
                
                document.getElementById('cartItemsList').innerHTML = itemsHtml;
                document.querySelector('.cart-total').textContent = `Total: $${data.total} / ₦${data.total_ngn}`;
                document.getElementById('cartModal').style.display = 'flex';
            })
            .catch(error => {
                if (cartItems.length === 0) {
                    showNotification('Your cart is empty! 🛒');
                } else {
                    showNotification(`🛒 Cart (${cartItems.length} items)`);
                }
            });
    });
}

// ============================================
// DRAGGABLE CART ICON
// ============================================
(function makeCartDraggable() {
    const cartIcon = document.getElementById('cartIcon');
    if (!cartIcon) return;

    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialLeft, initialTop;

    // Reset position if it's been saved before
    const savedPos = localStorage.getItem('cartIconPosition');
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        cartIcon.style.left = pos.left;
        cartIcon.style.top = pos.top;
        cartIcon.style.right = 'auto';
    }

    function startDrag(clientX, clientY) {
        isDragging = true;
        hasMoved = false;
        const rect = cartIcon.getBoundingClientRect();
        startX = clientX;
        startY = clientY;
        initialLeft = rect.left;
        initialTop = rect.top;
        cartIcon.classList.add('dragging');
    }

    function moveDrag(clientX, clientY) {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;

        // Only consider it a drag if the mouse moved more than 5 pixels
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
        }

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Keep within window boundaries
        newLeft = Math.max(0, Math.min(window.innerWidth - cartIcon.offsetWidth, newLeft));
        newTop = Math.max(0, Math.min(window.innerHeight - cartIcon.offsetHeight, newTop));

        cartIcon.style.left = newLeft + 'px';
        cartIcon.style.top = newTop + 'px';
        cartIcon.style.right = 'auto';
    }

    function endDrag() {
        if (isDragging) {
            isDragging = false;
            cartIcon.classList.remove('dragging');
            if (hasMoved) {
                localStorage.setItem('cartIconPosition', JSON.stringify({
                    left: cartIcon.style.left,
                    top: cartIcon.style.top
                }));
            }
        }
    }

    // Mouse events
    cartIcon.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
        moveDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', endDrag);

    // Touch events (for mobile)
    cartIcon.addEventListener('touchstart', (e) => {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault();
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    document.addEventListener('touchend', endDrag);

    // Prevent the cart modal from opening if you were just dragging
    cartIcon.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return false;
        }
    }, true);
})();

// ============================================
// AUTO-LOAD FROM LOCALSTORAGE
// ============================================

window.addEventListener('load', function() {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        const emailInput = document.getElementById('login-email');
        if (emailInput) {
            emailInput.value = savedEmail;
            document.getElementById('rememberMe').checked = true;
        }
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
// SIGN UP / LOGIN SECTION TOGGLING (Safe Version)
// ============================================

const signupBtn = document.getElementById('signupLink');
if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        // (Add your signup logic here if needed)
    });
}

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

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }
}

function addProduct() {
    const name = document.getElementById('name').value;
    const price = document.getElementById('price').value;
    const image = document.getElementById('image').value;
    const category = document.getElementById('category').value;

    if (!name || !price || !image) {
        alert('Please fill in all fields!');
        return;
    }

    fetch('/api/products', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            name: name, 
            price: price, 
            image: image,
            category: category 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            document.getElementById('adminForm').reset();
        } else {
            alert('Error adding product. Please try again.');
        }
    })
    .catch(error => {
        alert('There was a problem connecting to the server. Please try again.');
    });
}
// ============================================
// CART MANAGEMENT FUNCTIONS
// ============================================

function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

function removeFromCart(index) {
    fetch('/api/remove-from-cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ index: index })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            cartCount--;
            document.getElementById('cartCount').textContent = cartCount;
            document.getElementById('cartIcon').click();
        } else {
            alert('Could not remove item.');
        }
    });
}

function clearCart() {
    fetch('/api/clear-cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        cartCount = 0;
        cartItems = [];
        document.getElementById('cartCount').textContent = '0';
        document.getElementById('cartModal').style.display = 'none';
        showNotification(data.message || 'Cart cleared! 🗑️');
    });
}

// ============================================
// ADMIN PANEL - DELETE PRODUCTS
// ============================================

function loadProductsForDelete() {
    fetch('/api/get-products')
        .then(response => response.json())
        .then(data => {
            const productList = document.getElementById('productList');
            productList.innerHTML = '';
            
            data.products.forEach(product => {
                productList.innerHTML += `
                    <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${product.name} - $${product.price}</span>
                        <button onclick="deleteProduct(${product.id})" style="background: red; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Delete</button>
                    </div>
                `;
            });
        });
}
function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        fetch(`/api/products/delete/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadProductsForDelete();
        });
    }
}

// ============================================
// SMOOTH SCROLL FOR NAVIGATION
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============================================
// PLACE ORDER
// ============================================

function placeOrder() {
    fetch('/api/place-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            cartCount = 0;
            cartItems = [];
            document.getElementById('cartCount').textContent = '0';
            document.getElementById('cartModal').style.display = 'none';
        } else {
            alert(data.error || 'Could not place order.');
        }
    });
}