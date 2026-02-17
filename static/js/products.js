let allProducts = [];

async function loadProducts() {
    try {
        // 1. Fetch from the actual database API
        const response = await fetch('/api/products');
        const data = await response.json();

        allProducts = data.map(item => {
            let finalBadge = null;
            if (item.badge_text) {
                finalBadge = { text: item.badge_text, class: item.badge_class || 'badge-new' };
            } 
            else if (item.old_price && item.price < item.old_price) {
                const discount = Math.round(((item.old_price - item.price) / item.old_price) * 100);
                finalBadge = { text: `-${discount}% OFF`, class: 'badge-sale' }; 
            }

            return {
                id: item.id,
                code: item.code,
                type: item.category, 
                title: item.title,
                price: `৳${item.price}`,
                oldPrice: item.old_price ? `৳${item.old_price}` : null,
                image: item.image_url,
                rating: item.rating,
                review: item.reviews_count,
                badge: finalBadge,
                isFeatured: item.is_featured 
            };
        });

        // 2. Render categories (Filtering for Homepage logic happens here)
        renderCategory('bag', 'bags-container');
        renderCategory('sneaker', 'sneakers-container');
        renderCategory('ladies-item', 'ladies-item-container');
        renderCategory('kids-item', 'kids-item-container');
        renderCategory('gadgets-accessories', 'gadgets-accessories-container');

    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// 3. UPDATED RENDER FUNCTION WITH IS_FEATURED CHECK
const renderCategory = (targetType, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return; 

    // FILTER LOGIC: Must match the category AND must be featured (isFeatured === 1)
    const filteredProducts = allProducts.filter(product => 
        product.type === targetType && product.isFeatured === 1
    );

    let htmlContent = "";
    filteredProducts.forEach(product => {
        const stars = "★".repeat(product.rating) + "☆".repeat(5 - product.rating);
        const badgeHtml = product.badge ? `<span class="badge ${product.badge.class}">${product.badge.text}</span>` : '';
        const oldPriceHtml = product.oldPrice ? `<span class="old-price">${product.oldPrice}</span>` : '';

        htmlContent += `
          <article class="product-card">
              <div class="card-image-wrapper">
                  ${badgeHtml}
                  <img src="${product.image}" alt="${product.title}" class="card-image">
              </div>
              <div class="card-content">
                  <span class="product-category">${product.code.toUpperCase()}</span>
                  <h3 class="product-title">${product.title}</h3>
                  <div class="rating">${stars} <span>(${product.review})</span></div>
                  <div class="card-footer">
                        <div class="price-group">
                          <span class="current-price">${product.price}</span>
                          ${oldPriceHtml}
                      </div>
                      <button class="add-cart-btn" onclick="addToCart(this)">Add to Cart</button>
                  </div>
              </div>
          </article>`;
    });

    container.innerHTML = htmlContent;
};

loadProducts();