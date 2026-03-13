from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import mysql.connector
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import time
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        database=os.getenv('DB_NAME')
    )


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


def send_telegram_notification(message):
    try:
        bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        chat_id = os.getenv('TELEGRAM_ADMIN_ID')
        
        if not bot_token or not chat_id:
            print("Telegram credentials missing in .env")
            return

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            print("Telegram notification sent successfully")
        else:
            print(f"Failed to send Telegram notification: {response.text}")
            
    except Exception as e:
        print(f"Error sending Telegram message: {e}")




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
        cursor = connection.cursor(dictionary=True)

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


@app.route('/api/checkout', methods=['POST'])
def checkout_api():
    connection = None
    try:
        data = request.get_json()
        customer = data.get('customer')
        cart = data.get('cart')

        if not customer or not cart:
            return jsonify({'success': False, 'message': 'Missing order data'}), 400
        
        try:
            cart_product_ids = [int(item.get('id')) for item in cart if item.get('id') is not None]
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid Product ID format (must be numeric)'}), 400

        if not cart_product_ids:
             return jsonify({'success': False, 'message': 'Cart is empty or missing Product IDs'}), 400


        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        format_strings = ','.join(['%s'] * len(cart_product_ids))
        cursor.execute(f"SELECT * FROM products WHERE id IN ({format_strings})", tuple(cart_product_ids))
        db_products = cursor.fetchall()

        product_map = {p['id']: p for p in db_products}

        calculated_total = 0
        validated_cart_items = []
        

        # try:
        #     SHIPPING_COST = int(os.getenv('SHIPPING_COST', '120'))
        # except ValueError:
        #     SHIPPING_COST = 120
        region = customer.get('region', 'outside') 
        SHIPPING_COST = 80 if region == 'dhaka' else 150

        for item in cart:
            try:
                p_id = int(item.get('id'))
            except (ValueError, TypeError):
                return jsonify({'success': False, 'message': f'Invalid ID format: {item.get("id")}'}), 400
            qty = int(item.get('quantity', 0))

            if qty < 1:
                continue 

            if p_id in product_map:
                real_price = product_map[p_id]['price']
                real_title = product_map[p_id]['title'] 
                real_code = product_map[p_id]['code']
                
                line_total = real_price * qty
                calculated_total += line_total

                validated_cart_items.append({
                    'title': real_title,
                    'quantity': qty,
                    'price': real_price,
                    'code': real_code
                })
            else:
                return jsonify({'success': False, 'message': f'Invalid product ID: {p_id}'}), 400

        final_total = calculated_total + SHIPPING_COST
        order_ref = f"ORD-{int(time.time() * 1000)}"

        trx_id = customer.get('transactionId')
        trx_display = ""
        if trx_id and trx_id.strip():
            trx_display = f"(TrxID: {trx_id})"
        else:
            trx_id = None 

        sql_order = """
            INSERT INTO orders 
            (order_ref, customer_name, customer_email, customer_phone, customer_address, payment_method, transaction_id, total_amount) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        val_order = (
            order_ref, customer['name'], customer['email'], customer['phone'], 
            customer['address'], customer['paymentMethod'], trx_id, final_total
        )
        cursor.execute(sql_order, val_order)

        sql_item = """
            INSERT INTO order_items (order_ref, product_title, product_code, quantity, price) 
            VALUES (%s, %s, %s, %s, %s)
        """
        for item in validated_cart_items:
            cursor.execute(sql_item, (
                order_ref, item['title'], 
                item['code'], 
                item['quantity'], 
                item['price']
            ))

        connection.commit()

        customer_rows = ""
        for item in validated_cart_items:
            customer_rows += f"""
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        <strong>{item['title']}</strong>
                    </td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">{item['quantity']}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">৳{item['price']}</td>
                </tr>
            """

        admin_rows = ""
        for item in validated_cart_items:
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
                    <p style="font-size: 18px; margin: 5px 0;"><strong>Total Amount:</strong> <span style="color: #4CAF50;">৳{final_total}</span></p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                    If you have any questions, contact us at {os.getenv('EMAIL_USER')} or call us.
                </p>
            </div>
        </div>
        """

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
                    <h3>Total: ৳{final_total}</h3>
                </div>
            </div>
        </div>
        """

        items_list_text = ""
        for item in validated_cart_items:
            p_code = item.get('code') or item.get('product_code') or 'N/A'
            items_list_text += f"▫️ <b>{item['title']}</b> (Code: {p_code})\n   Qty: {item['quantity']} | Price: ৳{item['price']}\n"

        telegram_msg = f"""
        🛎️ <b>NEW ORDER RECEIVED!</b>

        <b>Ref:</b> {order_ref}
        <b>Total:</b> ৳{final_total}

        👤 <b>Customer Details:</b>
        Name: {customer['name']}
        Phone: {customer['phone']}
        Address: {customer['address']}
        Payment: {customer['paymentMethod']} {trx_display}

        🛒 <b>Order Items:</b>
        {items_list_text}"""

        send_email(customer['email'], f"Order Confirmation - {order_ref}", customer_email_html)
        send_email(os.getenv('EMAIL_USER'), f"🔔 New Order: {order_ref} - ৳{final_total}", admin_email_html)
        send_telegram_notification(telegram_msg)

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


if __name__ == '__main__':
    app.run(debug=False)