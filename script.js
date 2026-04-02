// ===== QUANTITY CONTROL =====
function changeQty(btn, delta) {
    const qtyDisplay = btn.parentElement.querySelector('.qty-value');
    let currentQty = parseInt(qtyDisplay.textContent);
    let newQty = currentQty + delta;
    if (newQty < 0) newQty = 0;
    qtyDisplay.textContent = newQty;
    updateOrderSummary();
}

// ===== UPDATE ORDER SUMMARY BAR =====
function updateOrderSummary() {
    const items = document.querySelectorAll('.menu-item');
    let totalItems = 0;
    let totalPrice = 0;
    const orderData = [];

    items.forEach(item => {
        const qtyEl = item.querySelector('.qty-value');
        if (!qtyEl) return;
        const qty = parseInt(qtyEl.textContent);
        if (qty > 0) {
            const price = parseInt(item.dataset.price);
            const name = item.dataset.name;
            totalItems += qty;
            totalPrice += qty * price;
            orderData.push({ name, qty, price, subtotal: qty * price });
        }
    });

    // Update sticky bar
    const bar = document.getElementById('order-summary-bar');
    const totalItemsEl = document.getElementById('total-items');
    const totalPriceEl = document.getElementById('total-price');

    if (bar) {
        if (totalItems > 0) {
            bar.classList.remove('hidden');
        } else {
            bar.classList.add('hidden');
        }
        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        if (totalPriceEl) totalPriceEl.textContent = formatPrice(totalPrice);
    }

    // Save to localStorage for reservation page
    localStorage.setItem('hikari_order', JSON.stringify(orderData));
    localStorage.setItem('hikari_total', totalPrice.toString());
}

// ===== FORMAT PRICE =====
function formatPrice(price) {
    return price.toLocaleString('vi-VN') + 'đ';
}

// ===== GO TO RESERVATION PAGE =====
function goToReservation() {
    // Save order first
    updateOrderSummary();
    window.location.href = 'Dat_ban.html';
}

// ===== LOAD ORDER SUMMARY ON RESERVATION PAGE =====
function loadOrderSummary() {
    const orderJson = localStorage.getItem('hikari_order');
    const totalPrice = localStorage.getItem('hikari_total');

    if (!orderJson || !totalPrice) return;

    const orderData = JSON.parse(orderJson);
    if (orderData.length === 0) return;

    const summaryDiv = document.getElementById('reservation-order-summary');
    const itemsList = document.getElementById('order-items-list');
    const totalEl = document.getElementById('reservation-total');

    if (!summaryDiv || !itemsList || !totalEl) return;

    summaryDiv.style.display = 'block';

    // Build items list
    let html = '';
    orderData.forEach(item => {
        html += `
            <div class="order-summary-item">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">x${item.qty}</span>
                <span class="item-price">${formatPrice(item.subtotal)}</span>
            </div>
        `;
    });
    itemsList.innerHTML = html;
    totalEl.textContent = formatPrice(parseInt(totalPrice));
}

// ===== SUBMIT RESERVATION =====
async function submitReservation(event) {
    event.preventDefault();
    
    const form = event.target;
    // Prepare data
    const orderJson = localStorage.getItem('hikari_order');
    const orderData = orderJson ? JSON.parse(orderJson) : [];
    const totalPrice = localStorage.getItem('hikari_total') || '0';
    
    const bookingData = {
        fullname: document.getElementById('fullname').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        date: document.getElementById('datetime').value, // Used 'date' logic but getting from datetime
        guests: parseInt(document.getElementById('guests').value),
        notes: document.getElementById('notes').value,
        order: orderData,
        total: parseInt(totalPrice)
    };
    
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Đang xử lý...';
    btn.disabled = true;

    try {
        const response = await fetch('https://restaurant-backend-2-f0a0.onrender.com/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            // Clear order data
            localStorage.removeItem('hikari_order');
            localStorage.removeItem('hikari_total');
            // Redirect to success
            window.location.href = 'Thanh_cong.html';
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Lưu đặt bàn thất bại. Vui lòng thử lại sau.');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối máy chủ');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// ===== MENU TABS FILTERING & DYNAMIC LOAD =====
document.addEventListener('DOMContentLoaded', async function () {
    // 1. Fetch menu from backend wrapper
    if (!document.querySelector('.menu-tabs')) return; // Exit if not on menu page
    
    const API_URL = 'https://restaurant-backend-2-f0a0.onrender.com/api/menu';
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Define target containers
        const containers = {
            'khai-vi': document.getElementById('menu-khai-vi'),
            'mon-chinh': document.getElementById('menu-mon-chinh'),
            'sashimi': document.getElementById('menu-sashimi'),
            'trang-mieng': document.getElementById('menu-trang-mieng'),
            'thuc-uong': document.getElementById('menu-thuc-uong')
        };
        
        // Check mode: view only (Thuc_don.html) or booking (Dat_ban_menu.html)
        const isViewOnly = document.querySelector('.menu-view') !== null;

        data.forEach(item => {
            const cat = item.category;
            if (!containers[cat]) {
                // Tự động tạo category nếu chưa có trong HTML (tráng miệng, thức uống)
                createCategory(cat);
                containers[cat] = document.getElementById(`menu-${cat}`);
            }

            if (containers[cat]) {
                let bottomHtml = '';
                if (isViewOnly) {
                    bottomHtml = `<span class="menu-item-price">${Number(item.price).toLocaleString('vi-VN')}đ</span>`;
                } else {
                    bottomHtml = `
                        <span class="menu-item-price">${Number(item.price).toLocaleString('vi-VN')}đ</span>
                        <div class="menu-item-quantity">
                            <button class="qty-btn" onclick="changeQty(this, -1)">−</button>
                            <span class="qty-value">0</span>
                            <button class="qty-btn" onclick="changeQty(this, 1)">+</button>
                        </div>
                    `;
                }

                const itemHtml = `
                    <div class="menu-item" data-price="${item.price}" data-name="${item.name}">
                        <div class="menu-item-image">
                            <img src="${item.image}" alt="${item.name}">
                        </div>
                        <div class="menu-item-info">
                            <h3 class="menu-item-name">${item.name}</h3>
                            <p class="menu-item-desc">${item.desc}</p>
                            <div class="menu-item-bottom">
                                ${bottomHtml}
                            </div>
                        </div>
                    </div>
                `;
                containers[cat].insertAdjacentHTML('beforeend', itemHtml);
            }
        });
        
    } catch (error) {
        console.error("Lỗi khi tải thực đơn:", error);
    }

    // 2. Tabs logic
    const tabs = document.querySelectorAll('.menu-tab');
    if (tabs.length === 0) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;
            const categories = document.querySelectorAll('.menu-category');
            const itemSections = document.querySelectorAll('.menu-items');

            if (category === 'all') {
                categories.forEach(c => c.style.display = '');
                itemSections.forEach(s => s.style.display = '');
            } else {
                categories.forEach(c => {
                    c.style.display = c.dataset.cat === category ? '' : 'none';
                });
                itemSections.forEach(s => {
                    s.style.display = s.dataset.cat === category ? '' : 'none';
                });
            }
        });
    });

    // 3. Smooth scroll animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.menu-item').forEach(item => {
        observer.observe(item);
    });
});

function createCategory(catId) {
    const titleMap = {
        'khai-vi': 'Món khai vị',
        'mon-chinh': 'Món chính',
        'sashimi': 'Sashimi',
        'trang-mieng': 'Tráng miệng',
        'thuc-uong': 'Thức uống'
    };
    const title = titleMap[catId] || catId;
    
    // Find where to insert
    const mainContent = document.querySelector('.main-content') || document.querySelector('.menu-tabs').parentElement;
    
    // Insert just before ORDER BUTTON or STICKY summary
    const orderBtn = document.querySelector('.menu-order-btn');
    const footer = document.querySelector('.footer');
    const insertBeforeElement = orderBtn || footer;

    if (insertBeforeElement) {
        insertBeforeElement.insertAdjacentHTML('beforebegin', `
            <div class="menu-category" data-cat="${catId}">
                <h2 class="menu-category-title">${title}</h2>
            </div>
            <div class="menu-items" data-cat="${catId}" id="menu-${catId}"></div>
        `);
    }
}
// ===== LANGUAGE TOGGLE =====
const i18n = {
    'Trang chủ': 'Home',
    'Đặt bàn': 'Reservation',
    'Thực đơn': 'Menu',
    'Tra cứu đơn': 'Lookup',
    'Đặt bàn ngay': 'Book Now',
    'Kiểm tra thông tin': 'Check Info'
};

const i18n_rev = Object.fromEntries(Object.entries(i18n).map(([k, v]) => [v, k]));

document.addEventListener('DOMContentLoaded', () => {
    const langBtns = document.querySelectorAll('.lang-btn');
    if (langBtns.length === 0) return;

    // Set initial from localStorage
    const savedLang = localStorage.getItem('hikari_lang') || 'vi';
    applyLanguage(savedLang);

    langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetLang = e.target.getAttribute('data-lang');
            applyLanguage(targetLang);
        });
    });
});

function applyLanguage(lang) {
    localStorage.setItem('hikari_lang', lang);
    
    // Update active class on buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
            btn.style.color = 'var(--gold-primary)';
            btn.style.fontWeight = 'bold';
        } else {
            btn.classList.remove('active');
            btn.style.color = '#888';
            btn.style.fontWeight = 'normal';
        }
    });

    // Translate Navbar
    const navLinks = document.querySelectorAll('.sidebar-nav ul li a');
    navLinks.forEach(a => {
        const text = a.textContent.trim();
        if (lang === 'en' && i18n[text]) {
            a.textContent = i18n[text];
        } else if (lang === 'vi' && i18n_rev[text]) {
            a.textContent = i18n_rev[text];
        }
    });
}

