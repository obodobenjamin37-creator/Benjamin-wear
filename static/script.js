// ============================================
// CART FUNCTIONALITY
// ============================================

let cartCount = 0;
let cartItems = [];

// ============================================
// PRODUCT DETAIL MODAL
// ============================================
let currentProduct = { id: null, name: '', price: 0, image: '' };

function openProductModal(id, name, image, price, priceNgn) {
    // Convert values to proper types (data attributes return strings)
    id = parseInt(id);
    price = parseFloat(price);
    priceNgn = priceNgn ? parseFloat(priceNgn) : null;

    // Error handling: missing data
    if (!id || !name || !price) {
        if (typeof showNotification === 'function') {
            showNotification('Product information is missing! ⚠️');
        } else {
            alert('Product information is missing!');
        }
        return;
    }

    if (!image) {
        image = 'https://via.placeholder.com/400x400?text=No+Image';
    }

    const modal = document.getElementById('productModal');
    const modalImg = document.getElementById('modalProductImage');

    if (!modal || !modalImg) {
        console.error('Product modal HTML is missing from the page.');
        return;
    }

    // Prevent rapid repeated opening
    if (modal.style.display === 'flex') return;

    modalImg.src = image;
    document.getElementById('modalProductName').textContent = name;
    document.getElementById('modalProductPrice').textContent =
        '$' + price + (priceNgn ? ' / ₦' + priceNgn : '');

    currentProduct = { id: id, name: name, price: price, image: image };

    // Error handling for broken images
    modalImg.onerror = function () {
        this.src = 'https://via.placeholder.com/400x400?text=No+Image';
    };

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));

    setTimeout(() => {
        const btn = document.getElementById('modalAddToCart');
        if (btn) btn.focus();
    }, 100);
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
    currentProduct = { id: null, name: '', price: 0, image: '' };
}

// Close on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('productModal');
        if (modal && modal.style.display === 'flex') closeProductModal();
    }
});

// Close on click outside the modal content
document.addEventListener('click', function (e) {
    const modal = document.getElementById('productModal');
    if (modal && e.target === modal) closeProductModal();
});

// ============================================
// SEARCH
// ============================================
function searchProducts() {
    const query = document.getElementById('searchBar').value;
    if (query.trim() !== "") {
        window.location.href = '/search?q=' + encodeURIComponent(query);
    }
}

// ============================================
// ADD TO CART
// ============================================
let quantityModalData = { name: '', price: 0 };

function askQuantity(productName, price) {
    if (!productName || !price || price <= 0) {
        showNotification('Product information is missing! ⚠️');
        return;
    }

    quantityModalData = { name: productName, price: parseFloat(price) };

    document.getElementById('quantityProductName').textContent = productName;
    document.getElementById('quantityProductPrice').textContent =
        '$' + parseFloat(price).toFixed(2);
    document.getElementById('quantityInput').value = 1;
    updateQuantityTotal();

    const modal = document.getElementById('quantityModal');
    if (!modal) {
        let qty = prompt(`How many ${productName}?`, "1");
        if (qty === null) return;
        qty = parseInt(qty);
        if (isNaN(qty) || qty < 1) qty = 1;
        addToCartWithQuantity(productName, price, qty);
        return;
    }

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));

    setTimeout(() => {
        const confirmBtn = modal.querySelector('.qty-confirm');
        if (confirmBtn) confirmBtn.focus();
    }, 100);
}

function adjustQuantity(delta) {
    const input = document.getElementById('quantityInput');
    if (!input) return;
    let current = parseInt(input.value) || 1;
    let newValue = current + delta;
    if (newValue < 1) newValue = 1;
    if (newValue > 999) newValue = 999;
    input.value = newValue;
    updateQuantityTotal();
}

function updateQuantityTotal() {
    const input = document.getElementById('quantityInput');
    if (!input) return;
    let qty = parseInt(input.value);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    const total = (quantityModalData.price * qty).toFixed(2);
    const totalEl = document.getElementById('quantityTotal');
    if (totalEl) totalEl.textContent = '$' + total;
}

function confirmQuantity() {
    const input = document.getElementById('quantityInput');
    let qty = parseInt(input.value);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    const { name, price } = quantityModalData;
    if (!name || !price) {
        closeQuantityModal();
        return;
    }
    closeQuantityModal();
    setTimeout(() => {
        addToCartWithQuantity(name, price, qty);
    }, 180);
}

function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => {
        modal.style.display = 'none';
        quantityModalData = { name: '', price: 0 };
    }, 180);
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('quantityModal');
        if (modal && modal.style.display === 'flex') closeQuantityModal();
    }
});

document.addEventListener('click', function (e) {
    const modal = document.getElementById('quantityModal');
    if (modal && e.target === modal) closeQuantityModal();
});

// Allow typing in the quantity input — only correct on blur/confirm
document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'quantityInput') {
        let raw = e.target.value.replace(/[^0-9]/g, '');
        if (raw.length > 3) raw = raw.slice(0, 3);
        if (raw !== e.target.value) {
            e.target.value = raw;
        }
        let qty = parseInt(raw);
        if (isNaN(qty)) qty = 0;
        const total = (quantityModalData.price * qty).toFixed(2);
        const totalEl = document.getElementById('quantityTotal');
        if (totalEl) totalEl.textContent = '$' + total;
    }
});

// When the user leaves the input, snap to a valid value
document.addEventListener('blur', function (e) {
    if (e.target && e.target.id === 'quantityInput') {
        let qty = parseInt(e.target.value);
        if (isNaN(qty) || qty < 1) qty = 1;
        if (qty > 999) qty = 999;
        e.target.value = qty;
        updateQuantityTotal();
    }
}, true);

function addToCartWithQuantity(productName, price, quantity) {
    const buttons = document.querySelectorAll('.btn-add');
    buttons.forEach(btn => {
        if (btn.textContent.includes('Add to Cart')) {
            btn.textContent = 'Adding...';
            btn.disabled = true;
        }
    });

    fetch('/api/add-to-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            product: productName,
            price: price,
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            cartCount += quantity;
            document.getElementById('cartCount').textContent = cartCount;
            cartItems.push({ name: productName, price: price, quantity: quantity });
            showNotification(data.message);

            const cartIcon = document.getElementById('cartIcon');
            if (cartIcon) {
                cartIcon.classList.remove('bounce');
                void cartIcon.offsetWidth;
                cartIcon.classList.add('bounce');
                setTimeout(() => cartIcon.classList.remove('bounce'), 700);
            }
        } else {
            showNotification(data.message || 'Error adding to cart! ❌');
        }
    })
    .catch(error => {
        cartCount += quantity;
        document.getElementById('cartCount').textContent = cartCount;
        cartItems.push({ name: productName, price: price, quantity: quantity });
        showNotification(`${quantity} x ${productName} added to cart! 🛒`);
    })
    .finally(() => {
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
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    showNotification('Check out our latest collection! 👕');
}

// ============================================
// LOGIN
// ============================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
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
// CONTACT FORM
// ============================================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
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
            headers: { 'Content-Type': 'application/json' },
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
// NOTIFICATION SYSTEM (Top Center)
// ============================================
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

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
        notification.style.animation = 'slideOutUp 0.4s ease';
        setTimeout(() => { notification.remove(); }, 500);
    }, 3000);
}

// ============================================
// DRAGGABLE CART ICON
// ============================================
(function makeCartDraggable() {
    const cartIcon = document.getElementById('cartIcon');
    if (!cartIcon) return;

    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let mouseDownPos = null;
    let touchStartPos = null;

    // Restore saved position
    const savedPos = localStorage.getItem('cartIconPosition');
    if (savedPos) {
        try {
            const pos = JSON.parse(savedPos);
            if (pos.left) cartIcon.style.left = pos.left;
            if (pos.top) cartIcon.style.top = pos.top;
            cartIcon.style.right = 'auto';
            cartIcon.style.bottom = 'auto';
        } catch (e) { /* ignore */ }
    }

    function startDrag(clientX, clientY) {
        isDragging = true;
        hasMoved = false;
        const rect = cartIcon.getBoundingClientRect();
        startX = clientX;
        startY = clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        cartIcon.style.left = rect.left + 'px';
        cartIcon.style.top = rect.top + 'px';
        cartIcon.style.right = 'auto';
        cartIcon.style.bottom = 'auto';
        cartIcon.classList.add('dragging');
    }

    function moveDrag(clientX, clientY) {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
        }

        const margin = 8;
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;

        const iconWidth = cartIcon.offsetWidth;
        const iconHeight = cartIcon.offsetHeight;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        newLeft = Math.max(margin, Math.min(viewportWidth - iconWidth - margin, newLeft));
        newTop = Math.max(margin, Math.min(viewportHeight - iconHeight - margin, newTop));

        cartIcon.style.left = newLeft + 'px';
        cartIcon.style.top = newTop + 'px';
        cartIcon.style.right = 'auto';
        cartIcon.style.bottom = 'auto';
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

    // ---- MOUSE ----
    cartIcon.addEventListener('mousedown', (e) => {
        mouseDownPos = { x: e.clientX, y: e.clientY };
        e.preventDefault();
    });

    document.addEventListener('mouseleave', () => {
        mouseDownPos = null;
        endDrag();
    });

    document.addEventListener('mousemove', (e) => {
        if (mouseDownPos && !isDragging) {
            const dx = Math.abs(e.clientX - mouseDownPos.x);
            const dy = Math.abs(e.clientY - mouseDownPos.y);
            if (dx > 5 || dy > 5) {
                startDrag(mouseDownPos.x, mouseDownPos.y);
            }
        }
        if (isDragging) {
            moveDrag(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        mouseDownPos = null;
        endDrag();
    });

    // ---- TOUCH ----
    cartIcon.addEventListener('touchstart', (e) => {
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (touchStartPos && !isDragging) {
            const dx = Math.abs(e.touches[0].clientX - touchStartPos.x);
            const dy = Math.abs(e.touches[0].clientY - touchStartPos.y);
            if (dx > 5 || dy > 5) {
                startDrag(touchStartPos.x, touchStartPos.y);
            }
        }
        if (isDragging) {
            e.preventDefault();
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        touchStartPos = null;
        endDrag();
    });

    document.addEventListener('touchcancel', () => {
        touchStartPos = null;
        endDrag();
    });

    // ---- CLICK (opens cart page) ----
    cartIcon.addEventListener('click', function (e) {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return false;
        }
        window.location.href = '/cart';
    }, false);

})();

// ============================================
// AUTO-LOAD FROM LOCALSTORAGE
// ============================================
window.addEventListener('load', function () {
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
                const countEl = document.getElementById('cartCount');
                if (countEl) countEl.textContent = data.count;
            }
        })
        .catch(error => {
            const savedCart = localStorage.getItem('cartItems');
            if (savedCart) {
                try {
                    cartItems = JSON.parse(savedCart);
                    cartCount = cartItems.length;
                    const countEl = document.getElementById('cartCount');
                    if (countEl) countEl.textContent = cartCount;
                } catch (e) {}
            }
        });

    document.querySelectorAll('.product-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });
});

// ============================================
// SIGN UP FORM (Safe Version)
// ============================================
const signupBtn = document.getElementById('signupLink');
if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Account created successfully! Please login. ✅', 'success');
        } else {
            showNotification(data.error || 'Registration failed. Please try again.', 'error');
        }
    });
}

function submitRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!email || !password) {
        showNotification('Please fill in both email and password! ⚠️', 'warning');
        return;
    }

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Account created successfully! Please login. ✅', 'success');
        } else {
            showNotification(data.error || 'Registration failed. Please try again.', 'error');
        }
    })
    .catch(error => {
        showNotification('There was a problem connecting to the server.', 'error');
    });
}

function submitLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showNotification('Please fill in both email and password! ⚠️', 'warning');
        return;
    }

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Welcome back, ' + data.user + '! ✅', 'success');
            setTimeout(() => { window.location.href = '/'; }, 1200);
        } else {
            showNotification(data.error || 'Login failed. Please try again.', 'error');
        }
    })
    .catch(error => {
        showNotification('There was a problem connecting to the server.', 'error');
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

// ============================================
// ADMIN PANEL - ADD PRODUCT
// ============================================
function addProduct() {
    const name = document.getElementById('name').value;
    const price = document.getElementById('price').value;
    const image = document.getElementById('image').value;
    const category = document.getElementById('category').value;
    const badge = document.getElementById('badge') ? document.getElementById('badge').value : '';

    if (!name || !price || !image) {
        showNotification('Please fill in all fields! ⚠️', 'warning');
        return;
    }

    fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            price: price,
            image: image,
            category: category,
            badge: badge
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message || 'Product added! ✅', 'success');
            document.getElementById('adminForm').reset();
            if (typeof loadProductsForDelete === 'function') {
                loadProductsForDelete();
            }
        } else {
            showNotification('Error adding product.', 'error');
        }
    })
    .catch(error => {
        showNotification('Could not connect to the server.', 'error');
    });
}

// ============================================
// CART MANAGEMENT
// ============================================
function closeCart() {
    const modal = document.getElementById('cartModal');
    if (modal) modal.style.display = 'none';
}

function removeFromCart(index) {
    fetch('/api/remove-from-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: index })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert('Could not remove item.');
        }
    });
}

function clearCart() {
    fetch('/api/clear-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        cartCount = 0;
        cartItems = [];
        const countEl = document.getElementById('cartCount');
        if (countEl) countEl.textContent = '0';
        const modal = document.getElementById('cartModal');
        if (modal) modal.style.display = 'none';
        showNotification(data.message || 'Cart cleared! 🗑️');
        if (window.location.pathname === '/cart') {
            window.location.reload();
        }
    });
}

// ============================================
// ADMIN - LOAD PRODUCTS FOR DELETE
// ============================================
function loadProductsForDelete() {
    fetch('/api/get-products')
        .then(response => response.json())
        .then(data => {
            const productList = document.getElementById('productList');
            if (!productList) return;
            productList.innerHTML = '';

            data.products.forEach(product => {
                const badgeLabel = product.badge
                    ? `<span style="background:${product.badge === 'SALE' ? '#e94560' : '#0056b3'};color:white;padding:2px 8px;border-radius:10px;font-size:0.7rem;margin-left:6px;">${product.badge}</span>`
                    : '';
                productList.innerHTML += `
                    <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${product.name} - $${product.price} ${badgeLabel}</span>
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
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadProductsForDelete();
        });
    }
}

// Load products when admin page loads
window.addEventListener('load', function () {
    if (document.getElementById('productList')) {
        loadProductsForDelete();
    }
});

// ============================================
// SMOOTH SCROLL FOR NAV LINKS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
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
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            cartCount = 0;
            cartItems = [];
            const countEl = document.getElementById('cartCount');
            if (countEl) countEl.textContent = '0';
            const modal = document.getElementById('cartModal');
            if (modal) modal.style.display = 'none';
            window.location.href = '/';
        } else {
            alert(data.error || 'Could not place order.');
        }
    });
}

// ============================================
// ADD TO CART FROM PRODUCT MODAL
// ============================================
window.addEventListener('load', function () {
    const modalAddBtn = document.getElementById('modalAddToCart');
    if (modalAddBtn) {
        modalAddBtn.addEventListener('click', function () {
            if (!currentProduct.name || currentProduct.price <= 0) {
                showNotification('Product data missing! ⚠️');
                return;
            }
            closeProductModal();
            askQuantity(currentProduct.name, currentProduct.price);
        });
    }
});

// ============================================
// FOOTER ACCORDION TOGGLE (Mobile Only)
// ============================================
function toggleFooterSection(header) {
    // Only run on mobile screens
    if (window.innerWidth > 768) return;

    const column = header.parentElement;

    // Prevent toggling the first column (Benjamin's Store tagline)
    if (column === document.querySelector('.footer-column:first-child')) return;

    const isOpen = column.classList.contains('open');

    // Close all other columns (accordion behavior)
    document.querySelectorAll('.footer-column').forEach(col => {
        col.classList.remove('open');
    });

    // Toggle current column
    if (!isOpen) {
        column.classList.add('open');
    }
}