document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutCart();
});

const form = document.getElementById('checkoutForm');
const successModal = document.getElementById('successModal');
let cart = JSON.parse(localStorage.getItem('SHOPPING_CART')) || [];
const SHIPPING_COST = 120;

function loadCheckoutCart() {
    const container = document.getElementById('summaryItems');
    const subtotalEl = document.getElementById('summarySubtotal');
    const totalEl = document.getElementById('summaryTotal');

    if (cart.length === 0) {
        window.location.href = '/';
        return;
    }

    container.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const itemRow = document.createElement('div');
        itemRow.className = 'summary-item';
        itemRow.innerHTML = `
            <div class="item-info">
                <img src="${item.image}" alt="${item.title}">
                <div>
                    <h4>${item.title}</h4>
                    <p>Qty: ${item.quantity}</p>
                </div>
            </div>
            <div class="item-price">৳${itemTotal}</div>
        `;
        container.appendChild(itemRow);
    });

    subtotalEl.innerText = '৳' + subtotal.toFixed(2);
    totalEl.innerText = '৳' + (subtotal + SHIPPING_COST).toFixed(2);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.querySelector('.place-order-btn-large');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Processing...';
    submitBtn.disabled = true;

    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const trxId = document.getElementById('bkashTrxId').value;

    const customerData = {
        name: document.getElementById('custName').value,
        email: document.getElementById('custEmail').value,
        phone: document.getElementById('custPhone').value,
        address: document.getElementById('custAddress').value,
        paymentMethod: paymentMethod,
        transactionId: paymentMethod === 'bkash' ? trxId : null
    };
    // 1. Gather Data
    // const customerData = {
    //     name: document.getElementById('custName').value,
    //     email: document.getElementById('custEmail').value,
    //     phone: document.getElementById('custPhone').value,
    //     address: document.getElementById('custAddress').value
    // };

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal + SHIPPING_COST;

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer: customerData,
                cart: cart,
                total: total
            })
        });


        // Check if response is okay, if not, throw an error with the status text
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error ${response.status}: ${errorText}`);
        }


        const result = await response.json();

        if (result.success) {
            document.getElementById('successOrderId').innerText = result.orderId;
            document.getElementById('successEmailDisplay').innerText = customerData.email;
            successModal.classList.add('active');

            localStorage.removeItem('SHOPPING_CART');
        } else {
            alert('Order failed: ' + result.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }

    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
});

function clearCartAndRedirect() {
}


function selectPayment(method) {
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));

    const selectedInput = document.querySelector(`input[value="${method}"]`);
    if (selectedInput) {
        selectedInput.closest('.payment-option').classList.add('selected');
        selectedInput.checked = true;
    }

    const bkashDetails = document.getElementById('bkashDetails');
    const trxInput = document.getElementById('bkashTrxId');
    const confirm = document.getElementById('confirm-order')

    if (method === 'bkash') {
        bkashDetails.classList.remove('hidden');
        trxInput.setAttribute('required', 'true');
        confirm.style.display = 'none';
    } else {
        bkashDetails.classList.add('hidden');
        trxInput.removeAttribute('required');
        trxInput.value = '';
        confirm.style.display = 'block';
    }
}