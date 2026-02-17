const navLinks = document.getElementById('nav-links');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');

mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.add('active');
});

closeMenuBtn.addEventListener('click', () => {
    navLinks.classList.remove('active');
});

document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        navLinks.classList.remove('active');
    }
});

// ===============navbar end=================



// ===============toast start==================
function toggleWishlist(btn) {
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        showToast('Added to Wishlist', 'heart');
    } else {
        showToast('Removed from Wishlist', 'trash');
    }
}

function addToCart(productName) {
    showToast(`Added <strong>${productName}</strong> to cart!`, 'cart');
}

function showToast(message, iconType) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';

    let iconSvg = '';
    if (iconType === 'cart') {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #333;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;
    } else if (iconType === 'heart') {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e63946" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    } else {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}




// ================= CART FUNCTIONALITY =================

let cart = JSON.parse(localStorage.getItem('SHOPPING_CART')) || [];

const cartIcon = document.querySelector('.cart-icon-wrapper');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const cartBadge = document.querySelector('.cart-badge');

function toggleCart() {
    cartSidebar.classList.toggle('active');
    cartOverlay.classList.toggle('active');
}

cartIcon.addEventListener('click', toggleCart);
closeCartBtn.addEventListener('click', toggleCart);
cartOverlay.addEventListener('click', toggleCart);

function addToCart(btnElement) {

    const productCard = btnElement.closest('.product-card');
    
    const title = productCard.querySelector('.product-title').innerText;
    const priceText = productCard.querySelector('.current-price').innerText;
    const imageSrc = productCard.querySelector('.card-image').src;
    
const codeElement = productCard.querySelector('.product-category');
    const productCode = codeElement ? codeElement.innerText : 'N/A';

    const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

    const existingItem = cart.find(item => item.title === title);

    if (existingItem) {
        existingItem.quantity += 1;
        showToast(`Increased quantity of <strong>${title}</strong>`, 'cart');
    } else {
        const newItem = {
            title,
            price,
            image: imageSrc,
            code: productCode,
            quantity: 1
        };
        cart.push(newItem);
        showToast(`Added <strong>${title}</strong> to cart!`, 'cart');
    }

    updateCart();
    // Optional: Open cart immediately when added
    // if(!cartSidebar.classList.contains('active')) toggleCart();
}

function removeFromCart(title) {
    cart = cart.filter(item => item.title !== title);
    updateCart();
    showToast('Item removed', 'trash');
}

function changeQuantity(title, change) {
    const item = cart.find(i => i.title === title);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(title);
            return;
        }
    }
    updateCart();
}

function updateCart() {
    localStorage.setItem('SHOPPING_CART', JSON.stringify(cart));

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartBadge.innerText = totalItems;

    cartItemsContainer.innerHTML = '';
    let totalPrice = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your cart is currently empty.</div>';
    } else {
        cart.forEach(item => {
            totalPrice += item.price * item.quantity;

            const cartItemEl = document.createElement('div');
            cartItemEl.classList.add('cart-item');
            cartItemEl.innerHTML = `
                <img src="${item.image}" alt="${item.title}">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">৳${item.price}</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="changeQuantity('${item.title}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQuantity('${item.title}', 1)">+</button>
                    </div>
                </div>
                <div class="remove-btn" onclick="removeFromCart('${item.title}')">
                    <i class="fa-solid fa-trash"></i>
                </div>
            `;
            cartItemsContainer.appendChild(cartItemEl);
        });
    }

    cartTotalAmount.innerText = '৳' + totalPrice.toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
    updateCart();
});

document.querySelector('.checkout-btn').addEventListener('click', () => {
    if (cart.length === 0) {
        showToast("Your cart is empty!", "cart");
        return;
    }
    window.location.href = '/checkout'; 
});

// ===================product details popup=====================

// const productModal = document.getElementById('productModal');
// const modalImage = document.getElementById('modalImage');
// const modalCategory = document.getElementById('modalCategory');
// const modalTitle = document.getElementById('modalTitle');
// const modalDesc = document.getElementById('modalDescription');
// const modalPrice = document.getElementById('modalPrice');
// const modalRating = document.getElementById('modalRating');
// const modalQtySpan = document.getElementById('modalQty');


// let currentModalProduct = {};
// let currentModalQty = 1;

// function openProductModal(imageWrapperElement) {
//     const card = imageWrapperElement.closest('.product-card');
//     const imageSrc = card.querySelector('.card-image').src;
//     const category = card.querySelector('.product-category').innerText;
//     const title = card.querySelector('.product-title').innerText;
//     const price = card.querySelector('.current-price').innerText;
//     const ratingHTML = card.querySelector('.rating').innerHTML;

//     const customDesc = card.getAttribute('data-description');
//     const description = customDesc ? customDesc : 
//         `Experience the premium quality of our ${title}. Meticulously crafted for style and durability, this is the perfect addition to your collection.`;

//     modalImage.src = imageSrc;
//     modalCategory.innerText = category;
//     modalTitle.innerText = title;
//     modalPrice.innerText = price;
//     modalRating.innerHTML = ratingHTML;
//     modalDesc.innerHTML = description;
    
//     currentModalQty = 1;
//     modalQtySpan.innerText = currentModalQty;

//     currentModalProduct = {
//         title: title,
//         price: parseFloat(price.replace(/[^0-9.]/g, '')),
//         image: imageSrc
//     };

//     productModal.classList.add('active');
// }

// function closeModal() {
//     productModal.classList.remove('active');
// }

// productModal.addEventListener('click', (e) => {
//     if (e.target === productModal) closeModal();
// });

// function adjustModalQty(change) {
//     currentModalQty += change;
//     if (currentModalQty < 1) currentModalQty = 1;
//     modalQtySpan.innerText = currentModalQty;
// }

// function addModalProductToCart() {
//     if (typeof cart === 'undefined') {
//         console.error("Cart system is not initialized");
//         return;
//     }

//     const existingItem = cart.find(item => item.title === currentModalProduct.title);

//     if (existingItem) {
//         existingItem.quantity += currentModalQty;
//         showToast(`Added ${currentModalQty} more of <strong>${currentModalProduct.title}</strong>`, 'cart');
//     } else {
//         const newItem = {
//             ...currentModalProduct,
//             quantity: currentModalQty
//         };
//         cart.push(newItem);
//         showToast(`Added <strong>${currentModalProduct.title}</strong> to cart!`, 'cart');
//     }

//     if (typeof updateCart === 'function') {
//         updateCart();
//     }
    
//     closeModal();
// }

