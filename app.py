from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
import requests
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'your-secret-key-here-change-in-production'
from datetime import timedelta
app.permanent_session_lifetime = timedelta(days=30) # Remember the user for 30 days

# Database Setup
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User Model
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image = db.Column(db.String(500), nullable=False)
    category = db.Column(db.String(50), nullable=False, default='General')

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_email = db.Column(db.String(120))
    items = db.Column(db.Text)
    total = db.Column(db.Float)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
# ============================================
# ROUTES
# ============================================
@app.route('/')
def home():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    
    # Get all products from database
    products = Product.query.all()
    
    # Fetch the current exchange rate (USD to NGN)
    try:
        response = requests.get('https://open.er-api.com/v6/latest/USD')
        data = response.json()
        exchange_rate = data['rates']['NGN']
    except Exception as e:
        # If API fails, fallback to a default rate (e.g., 1600)
        exchange_rate = 1600
    
    # Convert prices to Naira for display
    converted_products = []
    for product in products:
        product.price_ngn = round(product.price * exchange_rate, 2)
        converted_products.append(product)
    
    return render_template('index.html', products=converted_products, exchange_rate=exchange_rate)


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
def admin():
    return render_template('admin.html')

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json()
    new_product = Product(
        name=data['name'],
        price=data['price'],
        image=data['image'],
        category=data['category']
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Product added successfully!'})

@app.route('/api/get-products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify({'products': [{'id': p.id, 'name': p.name, 'price': p.price, 'category': p.category} for p in products]})

@app.route('/api/products/delete/<int:id>', methods=['DELETE'])
def delete_product(id):
    product = Product.query.get(id)
    if product:
        db.session.delete(product)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Product deleted!'})
    return jsonify({'success': False, 'message': 'Product not found'}), 404


# ============================================
# API ENDPOINTS
# ============================================
@app.route('/api/add-to-cart', methods=['POST'])
def add_to_cart():
    """Add item to cart"""
    try:
        data = request.json
        product_name = data.get('product')
        price = data.get('price')
        quantity = data.get('quantity', 1)
         
        # Initialize cart in session if it doesn't exist
        if 'cart' not in session:
            session['cart'] = []
        
        # Add item to cart
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
        return jsonify({
            'success': False,
            'message': 'Error adding to cart'
        }), 400

@app.route('/api/get-cart', methods=['GET'])
def get_cart():
    """Get current cart contents"""
    cart = session.get('cart', [])
    total = sum(item['price'] * item.get('quantity', 1) for item in cart)
    
    # Fetch the current exchange rate (USD to NGN)
    try:
        response = requests.get('https://open.er-api.com/v6/latest/USD')
        data = response.json()
        exchange_rate = data['rates']['NGN']
    except Exception as e:
        # If API fails, fallback to a default rate (e.g., 1600)
        exchange_rate = 1600
    
    total_ngn = round(total * exchange_rate, 2)
    
    return jsonify({
        'items': cart,
        'count': len(cart),
        'total': round(total, 2),
        'total_ngn': total_ngn
    })

@app.route('/api/clear-cart', methods=['POST'])
def clear_cart():
    """Clear the cart"""
    session['cart'] = []
    session.modified = True
    return jsonify({
        'success': True,
        'message': 'Cart cleared! 🗑️'
    })

@app.route('/api/place-order', methods=['POST'])
def place_order():
    cart = session.get('cart', [])
    if not cart:
        return jsonify({'success': False, 'message': 'Your cart is empty!'}), 400
        
    total = sum(item['price'] for item in cart)
    
    new_order = Order(
        customer_email=session.get('user', 'Guest'),
        items=str(cart),
        total=total
    )
    
    db.session.add(new_order)
    db.session.commit()
    
    # Clear the cart after placing the order
    session['cart'] = []
    session.modified = True
    
    return jsonify({'success': True, 'message': 'Order placed successfully! We will contact you soon!'})

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
        
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'User already exists'}), 400
        
    # Create new user with hashed password
    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Account created securely!'}), 201

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """Handle logout"""
    session.pop('user', None)
    return jsonify({--
        'success': True,
        'message': 'Logged out successfully! 👋'
    })

@app.route('/api/contact', methods=['POST'])
def contact():
    """Handle contact form submission"""
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        subject = data.get('subject')
        message = data.get('message')
        
        # Validate all fields
        if not all([name, email, subject, message]):
            return jsonify({
                'success': False,
                'message': 'Please fill in all fields! ⚠️'
            }), 400
        
        # Here you would save to database or send email
        # For demo, we'll just log it
        print(f"""
        ========================================
        New Contact Form Submission:
        Name: {name}
        Email: {email}
        Subject: {subject}
        Message: {message}
        ========================================
        """)
        
        return jsonify({
            'success': True,
            'message': f'Thank you {name}! We\'ll get back to you soon! 📧'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error sending message'
        }), 400

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """Handle forgot password"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Please enter your email! ⚠️'
            }), 400
        
        # Here you would send a reset email
        return jsonify({
            'success': True,
            'message': 'Password reset link sent to your email! 📧'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error processing request'
        }), 400

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
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))