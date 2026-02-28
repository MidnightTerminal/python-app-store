let currentPage = 1;
let itemsPerPage = 12;
let allProducts = [];


const categoryUrlMap = {
    "kids-item": "kids-toys",
    "bag" : "ladies-handbag",
    "sneaker" : "sneakers",
    "ladies-item": "ladies-clothes"
};

window.initializeShopPagination = function() {
    const productElements = document.querySelectorAll('.product-card');
    
    if (productElements.length === 0) return;

    allProducts = Array.from(productElements).map((el, index) => ({
        id: index + 1,
        element: el,
        category: el.getAttribute('data-category') 
    }));

    setupFilters(); 
    const params = new URLSearchParams(window.location.search);
    const urlValue = params.get('category');
    
    let filterToApply = 'all';

    if (urlValue) {
        const internalKey = Object.keys(categoryUrlMap).find(key => categoryUrlMap[key] === urlValue);
        filterToApply = internalKey || urlValue;
    }

    applyFilter(filterToApply, false); 
};

window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || 'all';
    applyFilter(category, false); 
});

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            const filterValue = newBtn.getAttribute('data-filter');
            applyFilter(filterValue, true);
        });
    });
}


function applyFilter(filterValue, shouldUpdateUrl = true) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filterValue);
    });

    if (shouldUpdateUrl) {
        const url = new URL(window.location);
        if (filterValue === 'all') {
            url.searchParams.delete('category');
        } else {
            const urlFriendlyName = categoryUrlMap[filterValue] || filterValue;
            url.searchParams.set('category', urlFriendlyName);
        }
        window.history.pushState({}, '', url);
    }

    allProducts.forEach(prod => {
        const isMatch = (filterValue === 'all' || filterValue === prod.category);
        prod.isHidden = !isMatch;
        prod.element.style.display = 'none'; 
    });

    currentPage = 1; 
    displayProducts();
}


function displayProducts() {
    const visibleItems = allProducts.filter(p => !p.isHidden);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    allProducts.forEach(p => p.element.style.display = 'none');
    
    for (let i = startIndex; i < endIndex && i < visibleItems.length; i++) {
        visibleItems[i].element.style.display = 'block';
        visibleItems[i].element.style.opacity = '0';
        setTimeout(() => visibleItems[i].element.style.opacity = '1', 50);
    }
    
    updatePaginationButtons(visibleItems.length);
    renderPageNumbers(visibleItems.length);
}

function renderPageNumbers(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageNumbersContainer = document.getElementById('pageNumbers');
    pageNumbersContainer.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-btn';
        pageBtn.textContent = i;
        
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }

        pageBtn.addEventListener('click', function() {
            currentPage = i;
            displayProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        pageNumbersContainer.appendChild(pageBtn);
    }
}

function updatePaginationButtons(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

window.previousPage = function() {
    if (currentPage > 1) {
        currentPage--;
        displayProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.nextPage = function() {
    const visibleItems = allProducts.filter(p => !p.isHidden);
    const totalPages = Math.ceil(visibleItems.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.changeItemsPerPage = function() {
    const select = document.getElementById('itemsPerPage');
    itemsPerPage = parseInt(select.value);
    currentPage = 1; 
    displayProducts();
};