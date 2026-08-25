from flask import Flask, render_template, request, jsonify, session
import json
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key-here-change-in-production'  # Required for sessions

# ============================================
# ROUTES
# ============================================

@app.route('/')
def home():
    """Render the main page"""
    return render_template('index.html')

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
        
        # Initialize cart in session if it doesn't exist
        if 'cart' not in session:
            session['cart'] = []
        
        # Add item to cart
        session['cart'].append({
            'name': product_name,
            'price': price
        })
        session.modified = True
        
        return jsonify({
            'success': True,
            'message': f'{product_name} added to cart! 🛒',
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
    total = sum(item['price'] for item in cart)
    return jsonify({
        'items': cart,
        'count': len(cart),
        'total': round(total, 2)
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

@app.route('/api/login', methods=['POST'])
def login():
    """Handle login"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        # Basic validation
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Please fill in all fields! ⚠️'
            }), 400
        
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 6 characters! ❌'
            }), 400
        
        # Here you would check against a database
        # For demo, we'll just accept any valid email/password
        
        # Store user in session
        session['user'] = email  
        return jsonify({
            'success': True,
            'message': f'Welcome back, {email.split("@")[0]}! ✅',
            'user': email
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Login failed'
        }), 400

@app.route('/api/logout', methods=['POST'])
def logout():
    """Handle logout"""
    session.pop('user', None)
    return jsonify({
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

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================
# RUN THE APP
# ============================================

if __name__ == '__main__':
    # For production, use: app.run(host='0.0.0.0', port=5000, debug=False)
    app.run(debug=True, port=5000)