let allProducts = [];

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        allProducts = data.map(item => {
            let finalBadge = null;
            // if (item.badge_text) {
            //     finalBadge = { text: item.badge_text, class: item.badge_class || 'badge-new' };
            // } 
            if (item.old_price && item.price < item.old_price) {
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

        renderCategory('bag', 'bags-container');
        renderCategory('sneaker', 'sneakers-container');
        renderCategory('ladies-item', 'ladies-item-container');
        renderCategory('kids-item', 'kids-item-container');
        renderCategory('gadgets-accessories', 'gadgets-accessories-container');

    } catch (error) {
        console.error('Error loading products:', error);
    }
}

const renderCategory = (targetType, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return; 

    const filteredProducts = allProducts.filter(product => 
        product.type === targetType && product.isFeatured === 1
    );

    let htmlContent = "";
    filteredProducts.forEach(product => {
        const badgeHtml = product.badge ? `<span class="badge ${product.badge.class}">${product.badge.text}</span>` : '';
        const oldPriceHtml = product.oldPrice ? `<span class="old-price">${product.oldPrice}</span>` : '';
        const stars = "★".repeat(product.rating) + "☆".repeat(5 - product.rating);

        htmlContent += `
          <article class="product-card" data-category="${product.category}" data-id="${product.id}">
              <div class="card-image-wrapper" onclick="openProductModal(this)">
                  ${badgeHtml}
                  <button class="wishlist-btn" onclick="toggleWishlist(this)" aria-label="Add to Wishlist">
                        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  </button>
                  <img src="${product.image}" alt="${product.title}" class="card-image" loading="lazy">
              </div>
              <div class="card-content">
                  <span class="product-category">${product.code}</span>
                  <h3 class="product-title">${product.title}</h3>
                  <div class="rating">
                      ${stars} <span>(${product.reviews})</span>
                  </div>
                  <div class="card-footer">
                      <div class="price-group">
                          <span class="current-price">${product.price}</span>
                          ${oldPriceHtml}
                      </div>
                      <button class="add-cart-btn" onclick="addToCart(this)" aria-label="Add to Cart">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                          <span>Add to Cart</span>
                      </button>
                  </div>
              </div>
          </article>`;
    });

    container.innerHTML = htmlContent;
};

loadProducts();