from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import mysql.connector
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import time
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# --- Database Connection ---
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        database=os.getenv('DB_NAME')
    )

# --- Email Function ---
def send_email(to_email, subject, html_content):
    try:
        smtp_host = os.getenv('SMTP_HOST')
        email_user = os.getenv('EMAIL_USER')
        email_pass = os.getenv('EMAIL_PASS')

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = email_user
        msg['To'] = to_email

        part = MIMEText(html_content, 'html')
        msg.attach(part)

        with smtplib.SMTP_SSL(smtp_host, 465) as server:
            server.login(email_user, email_pass)
            server.sendmail(email_user, to_email, msg.as_string())
            print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

# --- Routes ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/shop')
def shop():
    return render_template('shop.html')

@app.route('/checkout')
def checkout():
    return render_template('checkout.html')


@app.route('/api/products', methods=['GET'])
def get_all_products():
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True) # Returns rows as dictionaries
        
        # Query to fetch all products
        cursor.execute("SELECT * FROM products")
        products = cursor.fetchall()
        
        return jsonify(products)
    except Exception as e:
        print(f"Error fetching products: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

# --- CHECKOUT API ---
@app.route('/api/checkout', methods=['POST'])
def checkout_api():
    connection = None
    try:
        data = request.get_json()
        customer = data.get('customer')
        cart = data.get('cart')
        total = data.get('total')

        if not customer or not cart:
            return jsonify({'success': False, 'message': 'Missing order data'}), 400

        order_ref = f"ORD-{int(time.time() * 1000)}"
        
        # Determine Transaction ID text for emails
        trx_id = customer.get('transactionId')
        trx_display = ""
        if trx_id and trx_id.strip():
            trx_display = f"(TrxID: {trx_id})"
        else:
            trx_id = None # Set to None for DB insertion

        # --- DATABASE OPERATIONS ---
        connection = get_db_connection()
        cursor = connection.cursor()
        connection.start_transaction()

        # 1. Insert Order
        sql_order = """
            INSERT INTO orders 
            (order_ref, customer_name, customer_email, customer_phone, customer_address, payment_method, transaction_id, total_amount) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        val_order = (
            order_ref, customer['name'], customer['email'], customer['phone'], 
            customer['address'], customer['paymentMethod'], trx_id, total
        )
        cursor.execute(sql_order, val_order)

        # 2. Insert Items
        sql_item = """
            INSERT INTO order_items (order_ref, product_title, quantity, price) 
            VALUES (%s, %s, %s, %s)
        """
        for item in cart:
            cursor.execute(sql_item, (order_ref, item['title'], item['quantity'], item['price']))

        connection.commit()

        # --- GENERATE EMAIL HTML (Exact Replica) ---

        # 1. Build Customer Table Rows
        customer_rows = ""
        for item in cart:
            customer_rows += f"""
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        <strong>{item['title']}</strong>
                    </td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">{item['quantity']}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">৳{item['price']}</td>
                </tr>
            """

        # 2. Build Admin Table Rows (With Code Logic)
        admin_rows = ""
        for item in cart:
            # Logic: pCode = item.code || item.product_code || 'N/A'
            p_code = item.get('code') or item.get('product_code') or 'N/A'
            admin_rows += f"""
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #555;">
                        {p_code}
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{item['title']}</td>
                    <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">{item['quantity']}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">৳{item['price']}</td>
                </tr>
            """

        # 3. Customer Email Template
        customer_email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">Order Confirmed!</h1>
                <p style="margin: 5px 0 0;">Thank you for shopping with Horizontal Shop</p>
            </div>
            
            <div style="padding: 20px;">
                <h3 style="color: #333;">Hi {customer['name']},</h3>
                <p style="color: #666;">We have received your order and are getting it ready!</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Order ID:</strong> {order_ref}</p>
                    <p style="margin: 5px 0;"><strong>Payment Method:</strong> {customer['paymentMethod'].upper()}</p>
                    <p style="margin: 5px 0;"><strong>Shipping Address:</strong> {customer['address']}</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> {customer['phone']}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #eeeeee;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customer_rows}
                    </tbody>
                </table>

                <div style="text-align: right; margin-top: 20px;">
                    <p style="font-size: 18px; margin: 5px 0;"><strong>Total Amount:</strong> <span style="color: #4CAF50;">৳{total}</span></p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                    If you have any questions, contact us at {os.getenv('EMAIL_USER')} or call us.
                </p>
            </div>
        </div>
        """

        # 4. Admin Email Template
        admin_email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #333;">
            <div style="background-color: #333; padding: 15px; text-align: center; color: white;">
                <h2 style="margin: 0;">🔔 New Order Received!</h2>
            </div>
            
            <div style="padding: 20px;">
                <h3 style="color: #333;">Customer Details:</h3>
                <p><strong>Name:</strong> {customer['name']}</p>
                <p><strong>Phone:</strong> <a href="tel:{customer['phone']}">{customer['phone']}</a></p>
                <p><strong>Email:</strong> {customer['email']}</p>
                <p><strong>Address:</strong> {customer['address']}</p>
                <p><strong>Payment:</strong> {customer['paymentMethod']} {trx_display}</p>

                <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Order Items:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Code</th>
                            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Product</th>
                            <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Qty</th>
                            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admin_rows}
                    </tbody>
                </table>

                <div style="text-align: right; margin-top: 15px;">
                    <h3>Total: ৳{total}</h3>
                </div>
            </div>
        </div>
        """

        # --- SEND EMAILS ---
        send_email(customer['email'], f"Order Confirmation - {order_ref}", customer_email_html)
        send_email(os.getenv('EMAIL_USER'), f"🔔 New Order: {order_ref} - ৳{total}", admin_email_html)

        return jsonify({'success': True, 'orderId': order_ref})

    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()



# Set a secret key for security (Required for sessions)
app.secret_key = 'your_very_secret_admin_key' 

# Mapping category to folder path
CATEGORY_FOLDERS = {
    'bag': 'ladies bag',
    'sneaker': 'sneaker',
    'kids-item': 'kids item',
    'ladies-item': 'ladies item',
    'gadgets-accessories': 'gadgets'
}

# --- ADMIN SECURITY ---
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD =  os.getenv('ADMIN_PASSWORD')

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        if request.form['username'] == ADMIN_USERNAME and request.form['password'] == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('add_product_ui'))
        return "Invalid credentials"
    return '''
        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <form method="post" style="background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center;">
        <h2 style="margin-top: 0; color: #1c1e21; font-size: 24px; margin-bottom: 25px; font-weight: 600;">Admin Login</h2>
        
        <div style="margin-bottom: 20px;">
            <input type="text" name="username" placeholder="Username" required 
                style="width: 100%; padding: 12px 15px; border: 1px solid #dddfe2; border-radius: 6px; font-size: 16px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
        </div>
        
        <div style="margin-bottom: 25px;">
            <input type="password" name="password" placeholder="Password" required 
                style="width: 100%; padding: 12px 15px; border: 1px solid #dddfe2; border-radius: 6px; font-size: 16px; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
        </div>
        
        <button type="submit" 
            style="width: 100%; padding: 12px; background-color: #1877f2; color: white; border: none; border-radius: 6px; font-size: 18px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;">
            Log In
        </button>
        
        <p style="margin-top: 20px; font-size: 14px; color: #606770;">
            Secure Access Required
        </p>
    </form>
</div>
    '''

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin_login'))

# --- ADD PRODUCT UI ---
@app.route('/admin/add-product', methods=['GET', 'POST'])
def add_product_ui():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))

    if request.method == 'POST':
        connection = None
        try:
            # Removed p_id = request.form['id']
            code = request.form['code']
            category = request.form['category']
            title = request.form['title']
            price = request.form['price']
            old_price = request.form['old_price'] or None
            file_name = request.form['file_name']
            rating = request.form['rating']
            reviews = request.form['reviews']
            badge_text = request.form['badge_text'] or None
            badge_class = request.form['badge_class'] or 'badge-new'
            is_featured = 1 if 'is_featured' in request.form else 0

            folder = CATEGORY_FOLDERS.get(category, 'general')
            image_url = f"/static/assets/{folder}/{file_name}"

            connection = get_db_connection()
            cursor = connection.cursor()
            
            # Removed id from the INSERT columns and the %s values
            sql = """
                INSERT INTO products (code, category, title, price, old_price, image_url, rating, reviews_count, badge_text, badge_class, is_featured)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (code, category, title, price, old_price, image_url, rating, reviews, badge_text, badge_class, is_featured))
            connection.commit()
            
            return "Product Added Successfully! <a href='/admin/add-product'>Add Another</a>"
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            if connection: connection.close()

    return render_template('add_product.html')




# --- UPDATE PRODUCT UI ---
@app.route('/admin/edit-product/<int:product_id>', methods=['GET', 'POST'])
def edit_product_ui(product_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    if request.method == 'POST':
        try:
            # Gather updated data
            code = request.form['code']
            category = request.form['category']
            title = request.form['title']
            price = request.form['price']
            old_price = request.form['old_price'] or None
            file_name = request.form['file_name']
            rating = request.form['rating']
            reviews = request.form['reviews']
            badge_text = request.form['badge_text'] or None
            badge_class = request.form['badge_class']
            is_featured = 1 if 'is_featured' in request.form else 0

            folder = CATEGORY_FOLDERS.get(category, 'general')
            image_url = f"/static/assets/{folder}/{file_name}"

            # SQL Update Query
            sql = """
                UPDATE products 
                SET code=%s, category=%s, title=%s, price=%s, old_price=%s, 
                    image_url=%s, rating=%s, reviews_count=%s, badge_text=%s, 
                    badge_class=%s, is_featured=%s
                WHERE id=%s
            """
            cursor.execute(sql, (code, category, title, price, old_price, image_url, 
                               rating, reviews, badge_text, badge_class, is_featured, product_id))
            connection.commit()
            return "Product Updated Successfully! <a href='/admin/manage-products'>Back to List</a>"
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            connection.close()

    # GET request: Fetch current data to fill the form
    cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
    product = cursor.fetchone()
    connection.close()

    if not product:
        return "Product not found", 404

    return render_template('edit_product.html', product=product)

# --- PRODUCT LIST UI (To select which one to edit) ---
@app.route('/admin/manage-products')
def manage_products():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
        
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id, title, code FROM products")
    products = cursor.fetchall()
    connection.close()
    
    return render_template('manage_products.html', products=products)





if __name__ == '__main__':
    app.run(debug=True)