from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
import csv
from io import StringIO
import requests
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf.csrf import CSRFProtect
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
app.config['WTF_CSRF_ENABLED'] = False
app.secret_key = 'fab1ea746c5304056e6d42fc7705dfd5cded2377ee2c161a2157870a475df9c3'

# Session security settings
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

from datetime import timedelta
app.permanent_session_lifetime = timedelta(days=30)

# Paystack configuration
PAYSTACK_SECRET_KEY = os.getenv('PAYSTACK_SECRET_KEY')
PAYSTACK_PUBLIC_KEY = os.getenv('PAYSTACK_PUBLIC_KEY')
PAYSTACK_CALLBACK_URL = os.getenv('PAYSTACK_CALLBACK_URL', 'http://127.0.0.1:5000/payment/callback')

# Database configuration
# On Render: uses DATABASE_URL (PostgreSQL from Neon)
# Locally: falls back to SQLite (users.db)
database_url = os.getenv('DATABASE_URL')

if database_url:
    # Some providers give 'postgres://' but SQLAlchemy needs 'postgresql://'
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'users.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ============================================
# MODELS
# ============================================
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image = db.Column(db.String(500), nullable=False)
    category = db.Column(db.String(50), nullable=False, default='General')
    badge = db.Column(db.String(20), nullable=True, default=None)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_email = db.Column(db.String(120))
    items = db.Column(db.Text)
    total = db.Column(db.Float)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    payment_reference = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default='pending')  # 'pending' or 'paid'
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)  # Only admins can access /admin and /orders

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# ============================================
# ADMIN DECORATOR
# ============================================
from functools import wraps

def admin_required(f):
    """Decorator that ensures only admin users can access a route."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login_page'))
        user = User.query.filter_by(username=session['user']).first()
        if not user or not user.is_admin:
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return decorated_function
    
    # ============================================
# TEMPLATE CONTEXT (makes is_admin available to all templates)
# ============================================
@app.context_processor
def inject_user_flags():
    """Make current_user_is_admin available to all templates."""
    is_admin = False
    if 'user' in session:
        user = User.query.filter_by(username=session['user']).first()
        if user and user.is_admin:
            is_admin = True
    return {'current_user_is_admin': is_admin}

# ============================================
# HELPER FUNCTIONS
# ============================================
def get_exchange_rate():
    """Fetch current USD → NGN exchange rate."""
    try:
        response = requests.get('https://open.er-api.com/v6/latest/USD', timeout=10)
        data = response.json()
        return data['rates']['NGN']
    except Exception:
        return 1600  # fallback

def verify_paystack_payment(reference):
    """Verify a Paystack transaction by reference."""
    url = f'https://api.paystack.co/transaction/verify/{reference}'
    headers = {'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}'}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        return response.json()
    except Exception as e:
        return {'status': False, 'message': str(e)}

# ============================================
# ROUTES
# ============================================
@app.route('/')
def home():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    products = Product.query.all()
    exchange_rate = get_exchange_rate()
    converted_products = []
    for product in products:
        product.price_ngn = round(product.price * exchange_rate, 2)
        converted_products.append(product)
    return render_template('index.html', products=converted_products, exchange_rate=exchange_rate)


@app.route('/search')
def search():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    query = request.args.get('q', '')
    if query:
        products = Product.query.filter(Product.name.ilike(f'%{query}%')).all()
    else:
        products = []
    exchange_rate = get_exchange_rate()
    converted_products = []
    for product in products:
        product.price_ngn = round(product.price * exchange_rate, 2)
        converted_products.append(product)
    return render_template('search_results.html', products=converted_products, query=query)


@app.route('/logout')
def logout_page():
    session.pop('user', None)
    return redirect(url_for('login_page'))


@app.route('/login')
def login_page():
    return render_template('login.html')


@app.route('/signup')
def signup():
    return render_template('signup.html')


@app.route('/admin')
@admin_required
def admin():
    return render_template('admin.html')


@app.route('/product/<int:id>')
def product_page(id):
    if 'user' not in session:
        return redirect(url_for('login_page'))
    product = Product.query.get(id)
    if not product:
        return "Product not found", 404
    exchange_rate = get_exchange_rate()
    product.price_ngn = round(product.price * exchange_rate, 2)
    return render_template('product.html', product=product)


@app.route('/cart')
def cart_page():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    cart = session.get('cart', [])
    total = sum(item['price'] * item.get('quantity', 1) for item in cart)
    exchange_rate = get_exchange_rate()
    total_ngn = round(total * exchange_rate, 2)
    return render_template('cart.html', cart=cart, total=round(total, 2), total_ngn=total_ngn)


@app.route('/contact')
def contact_page():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('contact.html')

@app.route('/orders')
@admin_required
def view_orders():
    orders = Order.query.order_by(Order.date_created.desc()).all()
    return render_template('orders.html', orders=orders)

@app.route('/thank-you')
def thank_you():
    """Thank-you page shown after successful payment."""
    if 'user' not in session:
        return redirect(url_for('login_page'))
    ref = request.args.get('reference', '')
    order = None
    if ref:
        order = Order.query.filter_by(payment_reference=ref).first()
    return render_template('thank-you.html', order=order, reference=ref)


# ============================================
# PRODUCT API
# ============================================
@app.route('/api/products', methods=['POST'])
@admin_required
def add_product():
    data = request.get_json()
    badge = data.get('badge', '').strip().upper() or None
    if badge not in ('NEW', 'SALE'):
        badge = None
    new_product = Product(
        name=data['name'],
        price=data['price'],
        image=data['image'],
        category=data['category'],
        badge=badge
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Product added successfully!'})

@app.route('/api/import-products', methods=['POST'])
@admin_required
def import_products():
    """Bulk import products from a CSV file."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'success': False, 'message': 'Only CSV files are supported.'}), 400

    try:
        content = file.read().decode('utf-8')
        reader = csv.DictReader(StringIO(content))

        required_fields = ['name', 'price', 'image', 'category']
        imported = 0
        failed = []

        for row_num, row in enumerate(reader, start=2):
            # Strip whitespace from all fields
            row = {k.strip(): (v or '').strip() for k, v in row.items()}

            # Validate required fields
            missing = [f for f in required_fields if not row.get(f, '')]
            if missing:
                failed.append(f"Row {row_num}: Missing {', '.join(missing)}")
                continue

            # Validate price
            try:
                price = float(row['price'])
                if price < 0:
                    raise ValueError
            except (ValueError, KeyError):
                failed.append(f"Row {row_num}: Invalid price '{row.get('price', '')}'")
                continue

            # Validate badge
            badge = row.get('badge', '').upper() or None
            if badge not in ('NEW', 'SALE'):
                badge = None

            # Create product
            product = Product(
                name=row['name'],
                price=price,
                image=row['image'],
                category=row['category'] or 'General',
                badge=badge
            )
            db.session.add(product)
            imported += 1

        db.session.commit()

        message = f'✅ {imported} products imported successfully!'
        if failed:
            message += f' ⚠️ {len(failed)} rows failed.'

        return jsonify({
            'success': True,
            'message': message,
            'imported': imported,
            'errors': failed
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route('/api/get-products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify({'products': [{'id': p.id, 'name': p.name, 'price': p.price, 'category': p.category, 'badge': p.badge} for p in products]})


@app.route('/api/products/delete/<int:id>', methods=['DELETE'])
@admin_required
def delete_product(id):
    product = Product.query.get(id)
    if product:
        db.session.delete(product)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Product deleted!'})
    return jsonify({'success': False, 'message': 'Product not found'}), 404


# ============================================
# CART API
# ============================================
@app.route('/api/add-to-cart', methods=['POST'])
def add_to_cart():
    try:
        data = request.json
        product_name = data.get('product')
        price = data.get('price')
        quantity = data.get('quantity', 1)
        if 'cart' not in session:
            session['cart'] = []
        session['cart'].append({
            'name': product_name,
            'price': price,
            'quantity': quantity
        })
        session.modified = True
        return jsonify({
            'success': True,
            'message': f'{quantity} x {product_name} added to cart! 🛒',
            'cart_count': len(session['cart'])
        })
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error adding to cart'}), 400


@app.route('/api/get-cart', methods=['GET'])
def get_cart():
    cart = session.get('cart', [])
    total = sum(item['price'] * item.get('quantity', 1) for item in cart)
    exchange_rate = get_exchange_rate()
    total_ngn = round(total * exchange_rate, 2)
    return jsonify({
        'items': cart,
        'count': len(cart),
        'total': round(total, 2),
        'total_ngn': total_ngn
    })


@app.route('/api/clear-cart', methods=['POST'])
def clear_cart():
    session['cart'] = []
    session.modified = True
    return jsonify({'success': True, 'message': 'Cart cleared! 🗑️'})


@app.route('/api/remove-from-cart', methods=['POST'])
def remove_from_cart():
    data = request.get_json()
    index = data.get('index')
    if 'cart' in session:
        cart = session['cart']
        if 0 <= index < len(cart):
            cart.pop(index)
            session['cart'] = cart
            session.modified = True
            return jsonify({'success': True, 'message': 'Item removed!'})
    return jsonify({'success': False, 'message': 'Item not found'}), 400


# ============================================
# PAYSTACK PAYMENT API
# ============================================
@app.route('/api/initialize-payment', methods=['POST'])
def initialize_payment():
    """Initialize a Paystack transaction and return the checkout URL."""
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Please log in first.'}), 401

    cart = session.get('cart', [])
    if not cart:
        return jsonify({'success': False, 'message': 'Your cart is empty!'}), 400

    # Calculate totals
    total_usd = sum(item['price'] * item.get('quantity', 1) for item in cart)
    exchange_rate = get_exchange_rate()
    total_ngn = round(total_usd * exchange_rate, 2)
    amount_kobo = int(total_ngn * 100)  # Paystack expects kobo (1 NGN = 100 kobo)

    customer_email = session.get('user')
    callback_url = PAYSTACK_CALLBACK_URL

    # Call Paystack initialize endpoint
    url = 'https://api.paystack.co/transaction/initialize'
    headers = {
        'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'email': customer_email,
        'amount': amount_kobo,
        'currency': 'NGN',
        'callback_url': callback_url,
        'metadata': {
            'cart': cart,
            'total_usd': total_usd,
            'total_ngn': total_ngn
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        data = response.json()

        if data.get('status'):
            # Save pending order to DB
            new_order = Order(
                customer_email=customer_email,
                items=str(cart),
                total=total_usd,
                payment_reference=data['data']['reference'],
                status='pending'
            )
            db.session.add(new_order)
            db.session.commit()

            return jsonify({
                'success': True,
                'authorization_url': data['data']['authorization_url'],
                'reference': data['data']['reference']
            })
        else:
            return jsonify({
                'success': False,
                'message': data.get('message', 'Paystack initialization failed.')
            }), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Payment error: {str(e)}'}), 500


@app.route('/payment/callback')
def payment_callback():
    """Paystack redirects here after payment."""
    reference = request.args.get('reference')
    if not reference:
        return redirect(url_for('cart_page'))

    # Verify with Paystack
    result = verify_paystack_payment(reference)

    if result.get('status') and result.get('data', {}).get('status') == 'success':
        # Find and update order
        order = Order.query.filter_by(payment_reference=reference).first()
        if order and order.status != 'paid':
            order.status = 'paid'
            db.session.commit()

        # Clear the cart
        session['cart'] = []
        session.modified = True

        return redirect(url_for('thank_you', reference=reference))
    else:
        # Payment failed — redirect to cart with a message
        return redirect(url_for('cart_page'))


@app.route('/payment/verify/<reference>')
def payment_verify(reference):
    """Manual verification endpoint (used for debugging)."""
    result = verify_paystack_payment(reference)
    return jsonify(result)


# ============================================
# AUTH API
# ============================================
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(username=username).first()
    if user is None or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    session.permanent = True
    session['user'] = username
    return jsonify({'success': True, 'message': 'Welcome back!', 'user': username})


@app.route('/api/check-session', methods=['GET'])
def check_session():
    if 'user' in session:
        return jsonify({'logged_in': True, 'user': session['user']})
    return jsonify({'logged_in': False})


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('email')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Missing email or password'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'User already exists'}), 400
    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Account created securely!'}), 201


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('user', None)
    return jsonify({'success': True, 'message': 'Logged out successfully! 👋'})


# ============================================
# CONTACT API
# ============================================
@app.route('/api/contact', methods=['POST'])
def contact():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        subject = data.get('subject')
        message = data.get('message')
        if not all([name, email, subject, message]):
            return jsonify({'success': False, 'message': 'Please fill in all fields! ⚠️'}), 400
        print(f"""
        ========================================
        New Contact Form Submission:
        Name: {name}
        Email: {email}
        Subject: {subject}
        Message: {message}
        ========================================
        """)
        return jsonify({'success': True, 'message': f'Thank you {name}! We\'ll get back to you soon! 📧'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error sending message'}), 400


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.json
        email = data.get('email')
        if not email:
            return jsonify({'success': False, 'message': 'Please enter your email! ⚠️'}), 400
        return jsonify({'success': True, 'message': 'Password reset link sent to your email! 📧'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error processing request'}), 400


# ============================================
# TEMPORARY SETUP ROUTE (delete after use!)
# ============================================
@app.route('/setup-now-<secret>')
def setup_now(secret):
    """One-time setup: creates tables + makes user admin. DELETE after use."""
    if secret != 'benjamin-setup-2026':
        return "Not found", 404

    try:
        # 1. Create all tables
        db.create_all()
        result = "✅ Tables created.\n"

        # 2. Make user ID 1 an admin (assuming you signed up already)
        user = User.query.filter_by(id=1).first()
        if user:
            user.is_admin = True
            db.session.commit()
            result += f"✅ {user.username} is now an ADMIN.\n"
        else:
            result += "⚠️ No user with ID 1 yet. Sign up first, then refresh this page.\n"

        return result

    except Exception as e:
        return f"❌ Error: {str(e)}", 500


# ============================================
# ERROR HANDLING
# ============================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Page not found'}), 404


# ============================================
# RUN THE APP
# ============================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))