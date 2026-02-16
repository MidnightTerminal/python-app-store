// 1. RAW DATA (Converted from your SQL)
const productsSource = [
    {
        id: 1,
        code: 'HSB001',
        category: 'bag',
        title: 'Luxury Leather Tote',
        price: 2499.00,
        old_price: 3000.00,
        image_url: '/static/assets/ladies bag/1.jpg',
        rating: 4,
        reviews_count: 45,
        badge_text: null,
        badge_class: 'badge-new'
    },
    {
        id: 2,
        code: 'HSS001',
        category: 'sneaker',
        title: 'Air Jordan Retro',
        price: 8500.00,
        old_price: null,
        image_url: '/static/assets/sneaker/1.jpeg',
        rating: 5,
        reviews_count: 12,
        badge_text: null,
        badge_class: null
    },
    {
        id: 3,
        code: 'HSK001',
        category: 'kids-item',
        title: 'Kids Toys',
        price: 3200.00,
        old_price: null,
        image_url: '/static/assets/kids item/2.jpeg',
        rating: 4,
        reviews_count: 8,
        badge_text: 'HOT',
        badge_class: 'badge-new'
    },
    {
        id: 4,
        code: 'HSCLO001',
        category: 'ladies-item',
        title: 'Premium Ladies Clothes',
        price: 4400.00,
        old_price: null,
        image_url: '/static/assets/ladies item/1.jpeg',
        rating: 3,
        reviews_count: 33,
        badge_text: null,
        badge_class: null
    },
    {
        id: 5,
        code: 'HSB005',
        category: 'bag',
        title: 'Ladies Premium Bag',
        price: 3499.00,
        old_price: null,
        image_url: '/static/assets/ladies bag/2.jpg',
        rating: 0,
        reviews_count: 0,
        badge_text: 'NEW',
        badge_class: 'badge-new'
    },
    {
        id: 6,
        code: 'HSG002',
        category: 'gadgets-accessories',
        title: 'Noise Cancelling Headphone',
        price: 999.00,
        old_price: 1299.00,
        image_url: '/static/assets/gadgets/1.webp',
        rating: 0,
        reviews_count: 0,
        badge_text: 'NEW',
        badge_class: 'badge-new'
    },
    {
        id: 7,
        code: 'HSB005',
        category: 'kids-item',
        title: 'Kids Car',
        price: 1599.00,
        old_price: null,
        image_url: '/static/assets/kids item/4.jpeg',
        rating: 0,
        reviews_count: 0,
        badge_text: 'HOTTIE',
        badge_class: 'badge-new'
    },
    {
        id: 8,
        code: 'HSS001',
        category: 'sneaker',
        title: 'Air Force 3',
        price: 4899.00,
        old_price: 5600.00,
        image_url: '/static/assets/sneaker/3.jpeg',
        rating: 5,
        reviews_count: 67,
        badge_text: 'HOT',
        badge_class: 'badge-new'
    }
];

let allProducts = [];

// 2. MODIFIED LOAD FUNCTION (No async/fetch needed)
function loadProducts() {
    try {
        // Instead of fetching, we just use the array defined above
        const data = productsSource;

        allProducts = data.map(item => {

            let finalBadge = null;

            // Logic 1: Explicit Badge from DB
            if (item.badge_text) {
                finalBadge = { 
                    text: item.badge_text, 
                    class: item.badge_class || 'badge-new' 
                };
            } 
            // Logic 2: Calculated Discount Badge
            else if (item.old_price && item.price < item.old_price) {
                const discount = Math.round(((item.old_price - item.price) / item.old_price) * 100);
                finalBadge = { 
                    text: `-${discount}% OFF`, 
                    class: 'badge-sale' 
                }; 
            }

            return {
                id: item.id,
                code: item.code,
                type: item.category, // Mapped 'category' to 'type' to match your filter logic
                title: item.title,
                price: `৳${item.price}`,
                oldPrice: item.old_price ? `৳${item.old_price}` : null,
                image: item.image_url,
                rating: item.rating,
                review: item.reviews_count,
                badge: finalBadge 
            };
        });

        // Initialize Renders
        renderCategory('bag', 'bags-container');
        renderCategory('sneaker', 'sneakers-container');
        renderCategory('ladies-item', 'ladies-item-container');
        renderCategory('kids-item', 'kids-item-container');
        renderCategory('gadgets-accessories', 'gadgets-accessories-container');

    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// 3. RENDER FUNCTION (Unchanged)
const renderCategory = (targetType, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return; 

    const filteredProducts = allProducts.filter(product => product.type === targetType);
    let htmlContent = "";

    filteredProducts.forEach(product => {
        const stars = "★".repeat(product.rating) + "☆".repeat(5 - product.rating);

        const badgeHtml = product.badge
            ? `<span class="badge ${product.badge.class}">${product.badge.text}</span>`
            : '';

        const oldPriceHtml = product.oldPrice
            ? `<span class="old-price">${product.oldPrice}</span>`
            : '';

        htmlContent += `
      <article class="product-card">
          <div class="card-image-wrapper" onclick="openProductModal(this)">
              ${badgeHtml}
              <img src="${product.image}" alt="${product.title}" class="card-image">
          </div>
          <div class="card-content">
              <span class="product-category">${product.code.toUpperCase()}</span>
              <h3 class="product-title">${product.title}</h3>
             <div class="rating">
                    ${stars} <span>(${product.review})</span>
            </div>
              <div class="card-footer">
                    <div class="price-group">
                      <span class="current-price">${product.price}</span>
                      ${oldPriceHtml}
                  </div>
                  <button class="add-cart-btn" onclick="addToCart(this)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                      <span>Add to Cart</span>
                  </button>
              </div>
          </div>
      </article>
    `;
    });

    container.innerHTML = htmlContent;
};

// Start the process
loadProducts();