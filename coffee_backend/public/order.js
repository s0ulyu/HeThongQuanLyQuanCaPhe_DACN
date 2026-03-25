// CODE HOÀN CHỈNH CHO TRANG INDEX.HTML (BÁN HÀNG)
document.addEventListener('DOMContentLoaded', () => {

    // Lấy thông tin user hiện tại
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Nếu user không tồn tại hoặc bị lỗi, chuyển về trang login
    if (!user) {
        window.location.href = 'login.html'; 
        return;
    }

    // --- Biến toàn cục ---
    let currentTable = null;
    let currentOrderItems = []; 
    let currentOrderId = null;
    let selectedProduct = null;
    let allProducts = [];
    let allCategories = [];
    let isLoadingOrder = false; // [FIX] Biến cờ để chặn thao tác khi đang tải
    
    // --- Lấy phần tử Giao diện ---
    const tableListUL = document.getElementById('table-list');
    const orderPanel = document.getElementById('order-panel');
    const selectedTableName = document.getElementById('selected-table-name');
    const currentOrderListUL = document.getElementById('current-order-list');
    const totalAmountSpan = document.getElementById('total-amount');
    const submitOrderBtn = document.getElementById('submit-order-btn');
    const payOrderBtn = document.getElementById('pay-order-btn');
    const searchInput = document.getElementById('search-input');
    const categoryTabs = document.getElementById('category-tabs');
    const productPanes = document.getElementById('product-panes');
    const logoutBtn = document.getElementById('logout-btn');


    // --- 1. CHỨC NĂNG PHÂN QUYỀN (HIỆN MENU CHO ADMIN) ---
    if (user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'block'; // HIỆN TẤT CẢ menu cho admin
        });
    }


    // --- KHỞI CHẠY (GỘP CẢ TABLE VÀO ĐÂY) ---
    // loadTables(); // [FIX] Đã chuyển vào trong Promise.all để đảm bảo có dữ liệu sản phẩm trước

    Promise.all([
        fetchWithToken('/api/categories').then(res => res ? res.json() : null), 
        fetchWithToken('/api/products').then(res => res ? res.json() : null)
    ])
    .then(([categories, products]) => {
        if (!categories || !products) return; 

        allCategories = categories;
        allProducts = products;
        
        renderMenu(allProducts); 
        loadTables(); // [FIX] Load bàn sau khi đã có menu để mapping dữ liệu chính xác
        searchInput.addEventListener('input', handleSearch);
    })
    .catch(error => {
        console.error('Lỗi nghiêm trọng khi tải menu:', error);
        productPanes.innerHTML = '<p class="text-danger">Không thể tải thực đơn.</p>';
    });

    orderPanel.style.display = 'none';

    // --- HÀM TẢI DỮ LIỆU ---

    function renderMenu(productsToRender) {
        categoryTabs.innerHTML = '';
        productPanes.innerHTML = '';

        const allTab = document.createElement('li');
        allTab.className = 'nav-item';
        allTab.innerHTML = `<button class="nav-link active" id="tab-all" data-bs-toggle="tab" data-bs-target="#pane-all" type="button">Tất cả</button>`;
        categoryTabs.appendChild(allTab);

        const allPane = document.createElement('div');
        allPane.className = 'tab-pane fade show active';
        allPane.id = 'pane-all';
        allPane.innerHTML = '<div class="row g-3"></div>'; 
        productPanes.appendChild(allPane);

        allCategories.forEach(category => {
            const productsInCategory = productsToRender.filter(p => p.category_id === category.id);
            if (productsInCategory.length === 0) return; 

            const catTab = document.createElement('li');
            catTab.className = 'nav-item';
            catTab.innerHTML = `<button class="nav-link" id="tab-${category.id}" data-bs-toggle="tab" data-bs-target="#pane-${category.id}" type="button">${category.name}</button>`;
            categoryTabs.appendChild(catTab);

            const catPane = document.createElement('div');
            catPane.className = 'tab-pane fade';
            catPane.id = `pane-${category.id}`;
            catPane.innerHTML = '<div class="row g-3"></div>';
            productPanes.appendChild(catPane);
        });

        const allPaneRow = allPane.querySelector('.row');
        
        productsToRender.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'col-lg-3 col-md-4 col-6';
            
            productCard.innerHTML = `
                <div class="card h-100 product-card shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.category_name || 'Chưa phân loại'}</p>
                    </div>
                </div>
            `;
            
            productCard.querySelector('.product-card').addEventListener('click', () => {
                openSizeModal(product);
            });

            allPaneRow.appendChild(productCard);

            const categoryPaneRow = document.querySelector(`#pane-${product.category_id} .row`);
            if (categoryPaneRow) {
                const clonedCard = productCard.cloneNode(true); 
                clonedCard.querySelector('.product-card').addEventListener('click', () => {
                    openSizeModal(product);
                });
                categoryPaneRow.appendChild(clonedCard);
            }
        });
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
        renderMenu(filteredProducts);
    }
            
    // HÀM TẢI BÀN (ĐÃ SỬA LỖI)
    function loadTables() {
        return fetchWithToken(`/api/tables?_t=${Date.now()}`) // [FIX] Thêm timestamp để tránh cache, luôn lấy trạng thái bàn mới nhất
            .then(response => response ? response.json() : null)
            .then(tables => {
                if (!tables) return;
                tableListUL.innerHTML = ''; 
                tables.forEach(table => {
                    const li = document.createElement('li');
                    li.textContent = `${table.name}`;
                    li.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                    const statusBadge = document.createElement('span');
                    statusBadge.className = table.status === 'trống' ? 'badge bg-success' : 'badge bg-danger';
                    statusBadge.textContent = table.status;
                    li.appendChild(statusBadge);
                    li.addEventListener('click', () => {
                        selectTable(table);
                    });
                    tableListUL.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Lỗi khi tải danh sách bàn:', error);
                tableListUL.innerHTML = '<li class="list-group-item text-danger">Không thể tải danh sách bàn.</li>';
            });
    }
    
    // --- CÁC HÀM XỬ LÝ MODAL & ORDER ---

    // Lấy các phần tử trong Modal
    const sizeModal = new bootstrap.Modal(document.getElementById('size-modal'));
    const modalProductName = document.getElementById('modal-product-name');
    const modalSizeOptions = document.getElementById('modal-size-options');
    const modalNoteInput = document.getElementById('modal-note');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');

    // Mở modal chọn size
    function openSizeModal(product) {
        if (!currentTable) {
            alert("Vui lòng chọn bàn trước khi thêm món!");
            return;
        }
        if (isLoadingOrder) { // [FIX] Chặn mở modal khi đang tải đơn cũ
            alert("Đang tải dữ liệu bàn, vui lòng đợi...");
            return;
        }
        selectedProduct = product;
        modalProductName.textContent = product.name;
        modalSizeOptions.innerHTML = '';
        modalNoteInput.value = '';
        modalAddToCartBtn.style.display = 'none'; // Ẩn nút thừa, vì chọn size là tự thêm

        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                const button = document.createElement('button');
                button.className = 'btn btn-outline-primary';
                button.textContent = `${variant.size} - ${variant.price.toLocaleString('vi-VN')}đ`;
                button.onclick = () => handleModalAddToCart(variant);
                modalSizeOptions.appendChild(button);
            });
        } else {
            modalSizeOptions.innerHTML = '<p>Sản phẩm này chưa có giá. Vui lòng liên hệ quản lý.</p>';
        }
        sizeModal.show();
    }

    // Thêm món từ modal vào giỏ hàng tạm
    function handleModalAddToCart(variant) {
        // [FIX] Validate dữ liệu đầu vào để tránh lỗi undefined
        if (!variant || !variant.price) {
            console.warn('Dữ liệu biến thể không hợp lệ');
            return;
        }
        const newItem = {
            cartId: Date.now(),
            id: selectedProduct.id,
            name: selectedProduct.name,
            quantity: 1,
            price: variant.price,
            size: variant.size,
            note: modalNoteInput.value
        };
        currentOrderItems.push(newItem);
        updateOrderList();
        sizeModal.hide();
    }

    // Chọn bàn
    function selectTable(table) {
        currentTable = table;
        orderPanel.style.display = 'block';
        selectedTableName.textContent = table.name;

        // Reset trạng thái
        currentOrderItems = [];
        currentOrderId = null;

        if (table.status === 'có khách') {
            // SỬA: Hiển thị nút cập nhật để lưu món mới thêm vào
            submitOrderBtn.style.display = 'block';
            submitOrderBtn.textContent = 'Cập nhật đơn';
            submitOrderBtn.classList.replace('btn-primary', 'btn-warning'); // Đổi màu nút sang vàng để dễ phân biệt
            
            payOrderBtn.style.display = 'block';
            currentOrderListUL.innerHTML = '<li class="list-group-item text-center">Đang tải đơn hàng...</li>'; // [FIX] UI Feedback
            loadActiveOrder(table.id);
        } else { // Bàn trống
            submitOrderBtn.style.display = 'block';
            submitOrderBtn.textContent = 'Tạo đơn hàng';
            submitOrderBtn.classList.replace('btn-warning', 'btn-primary'); // Trả lại màu xanh
            
            payOrderBtn.style.display = 'none';
            updateOrderList();
        }
    }

    // Giảm số lượng
    function decreaseItemQuantity(cartId) {
        const item = currentOrderItems.find(i => i.cartId === cartId);
        if (item) {
            item.quantity--;
            if (item.quantity === 0) {
                currentOrderItems = currentOrderItems.filter(i => i.cartId !== cartId);
            }
            updateOrderList();
        }
    }

    // Tăng số lượng
    function increaseItemQuantity(cartId) {
        const item = currentOrderItems.find(i => i.cartId === cartId);
        if (item) {
            item.quantity++;
            updateOrderList();
        }
    }

    // Cập nhật lại danh sách món trong đơn hàng
    function updateOrderList() {
        currentOrderListUL.innerHTML = '';
        let total = 0;
        currentOrderItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong> (${item.size})
                    ${item.note ? `<br><small class="text-muted">Ghi chú: ${item.note}</small>` : ''}
                </div>
                <div>
                    <button class="btn btn-sm btn-secondary decrease-btn">-</button>
                    <span class="mx-2">${item.quantity}</span>
                    <button class="btn btn-sm btn-secondary increase-btn">+</button>
                    <span class="ms-3">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
            `;
            li.querySelector('.decrease-btn').onclick = () => decreaseItemQuantity(item.cartId);
            li.querySelector('.increase-btn').onclick = () => increaseItemQuantity(item.cartId);
            currentOrderListUL.appendChild(li);
            total += item.price * item.quantity;
        });
        totalAmountSpan.textContent = total.toLocaleString('vi-VN');
    }

    // Tải đơn hàng đang hoạt động của bàn
    function loadActiveOrder(tableId) {
        isLoadingOrder = true; // [FIX] Bắt đầu trạng thái loading
        // [FIX] Thêm timestamp (?_t=...) để ép trình duyệt không dùng Cache cũ -> Luôn lấy đơn hàng mới nhất từ DB
        fetchWithToken(`/api/orders/table/${tableId}?_t=${Date.now()}`)
            .then(res => res ? res.json() : null)
            .then(data => {
                if (!data || data.error) {
                    // Nếu không có đơn hoặc lỗi, reset về rỗng ngay lập tức
                    currentOrderItems = [];
                    currentOrderId = null;
                    updateOrderList();
                    return;
                }

                console.log("DEBUG - Dữ liệu đơn hàng từ Server:", data); // [DEBUG] Xem log này (F12) để biết Server trả về món gì

                // [FIX] Nếu server trả về orderId nhưng không có items, coi như đơn rỗng
                currentOrderId = data.orderId;
                
                if (!data.items || !Array.isArray(data.items)) return;

                // [FIX] Mapping lại dữ liệu từ allProducts để đảm bảo tên và ID món chính xác
                currentOrderItems = data.items.map(item => {
                    // 1. Lấy Product ID (ưu tiên product_id từ DB, fallback sang productId nếu camelCase)
                    const rawProductId = item.product_id || item.productId;

                    // 2. Tìm sản phẩm trong menu (allProducts)
                    let originalProduct = null;
                    if (allProducts.length > 0 && rawProductId) {
                        originalProduct = allProducts.find(p => p.id == rawProductId); // [FIX] Dùng so sánh lỏng (==) để xử lý trường hợp ID là string/number
                    }
                    // Fallback: Tìm theo tên nếu không tìm thấy theo ID (phòng trường hợp ID bị lệch)
                    if (!originalProduct && item.name && allProducts.length > 0) {
                        originalProduct = allProducts.find(p => p.name === item.name);
                    }

                    // 3. Xác định ID cuối cùng. QUAN TRỌNG: Chỉ dùng Product ID. KHÔNG dùng item.id (OrderDetail ID)
                    const finalProductId = originalProduct ? originalProduct.id : rawProductId;

                    return { 
                        ...item, 
                        id: finalProductId, 
                        name: originalProduct ? originalProduct.name : (item.name || 'Món không xác định'),
                        cartId: Date.now() + Math.random() 
                    };
                }).filter(item => item.id); // Lọc bỏ item lỗi không có Product ID

                // [FIX] Thông báo nhỏ để biết đang tải đơn cũ (Tránh nhầm lẫn)
                if (currentOrderItems.length > 0) {
                    console.info(`Đã tải ${currentOrderItems.length} món từ đơn hàng cũ #${currentOrderId}`);
                }

                updateOrderList();
            })
            .catch(err => console.error('Lỗi tải đơn hàng cũ:', err))
            .finally(() => { isLoadingOrder = false; }); // [FIX] Kết thúc loading dù thành công hay thất bại
    }
    
    // [FIX] Đã xóa dòng modalAddToCartBtn.addEventListener sai logic ở đây.
    // Việc thêm món chỉ được thực hiện qua các nút dynamic trong openSizeModal.
    
    // API TẠO ĐƠN HÀNG (SỬ DỤNG fetchWithToken)
    submitOrderBtn.addEventListener('click', () => {
        if (currentOrderItems.length === 0) return alert("Vui lòng thêm món vào đơn");
        const total = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderData = {
            table_id: currentTable.id,
            items: currentOrderItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price,
                size: item.size,
                note: item.note
            })),
            total_amount: total
        };

        // Nếu đang cập nhật đơn cũ, gửi kèm orderId
        if (currentOrderId) {
            orderData.orderId = currentOrderId;
        }
        
        fetchWithToken('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        })
        .then(response => response ? response.json() : null)
        .then(data => {
            if (!data) return;
            if (data.error) throw new Error(data.error);
            alert(data.message); 
            loadTables(); 
            orderPanel.style.display = 'none'; 
        })
        .catch(error => alert(`Tạo đơn hàng thất bại: ${error.message}`));
    });

    // API THANH TOÁN (SỬ DỤNG fetchWithToken)
    payOrderBtn.addEventListener('click', () => {
        if (currentOrderItems.length === 0) return alert("Đơn hàng trống, không thể thanh toán!");

        // Lưu lại thông tin để in hóa đơn trước khi reset
        const itemsToPrint = [...currentOrderItems];
        const totalToPrint = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tableNameToPrint = currentTable.name;

        // BƯỚC 1: TỰ ĐỘNG LƯU ĐƠN HÀNG TRƯỚC KHI THANH TOÁN (Để đảm bảo Server có dữ liệu mới nhất)
        const orderData = {
            table_id: currentTable.id,
            items: currentOrderItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price,
                size: item.size,
                note: item.note
            })),
            total_amount: totalToPrint
        };
        if (currentOrderId) {
            orderData.orderId = currentOrderId;
        }

        // Gọi API Lưu trước -> Sau đó mới gọi API Thanh toán
        fetchWithToken('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        })
        .then(response => response ? response.json() : null)
        .then(savedData => {
            if (!savedData || savedData.error) throw new Error(savedData?.error || "Lỗi khi lưu đơn hàng");
            
            // BƯỚC 2: THANH TOÁN
            const paymentData = {
                orderId: savedData.orderId || currentOrderId, // Dùng ID từ server trả về để chắc chắn
                tableId: currentTable.id
            };
            return fetchWithToken('/api/orders/pay', {
                method: 'PUT',
                body: JSON.stringify(paymentData),
            });
        })
        .then(response => response ? response.json() : null)
        .then(payData => {
            if (!payData) return;
            if (payData.error) throw new Error(payData.error);

            // Hiển thị hóa đơn (Dùng dữ liệu snapshot lúc bấm nút để in cho chính xác với UI)
            showReceipt(itemsToPrint, totalToPrint, tableNameToPrint);

            loadTables(); 
            orderPanel.style.display = 'none'; 
        })
        .catch(error => alert(`Thanh toán thất bại: ${error.message}`));
    });
    
    // --- HÀM HIỂN THỊ HÓA ĐƠN ---
    function showReceipt(items, total, tableName) {
        const receiptBody = document.getElementById('receipt-body');
        const date = new Date().toLocaleString('vi-VN');

        let html = `
            <div class="text-center mb-3">
                <h3 class="fw-bold">Coffee Track</h3>
                <p class="mb-0">Đ/c: 123 Đường ABC, Quận XYZ</p>
                <p>Hotline: 0909.123.456</p>
                <p>--------------------------------</p>
            </div>
            <div class="mb-3">
                <p class="mb-1"><strong>Bàn:</strong> ${tableName}</p>
                <p class="mb-1"><strong>Thời gian:</strong> ${date}</p>
                <p class="mb-1"><strong>Thu ngân:</strong> ${user.username}</p>
            </div>
            <table class="table table-borderless table-sm">
                <thead class="border-bottom border-dark">
                    <tr><th class="text-start">Món</th><th class="text-center">SL</th><th class="text-end">Tiền</th></tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td class="text-start">${item.name} <br><small class="text-muted">(${item.size})</small></td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-end">${(item.price * item.quantity).toLocaleString('vi-VN')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="border-top border-dark pt-2 mt-2">
                <h4 class="text-end fw-bold">Tổng: ${total.toLocaleString('vi-VN')} đ</h4>
            </div>
            <div class="text-center mt-4">
                <p class="fst-italic">Cảm ơn và hẹn gặp lại quý khách!</p>
            </div>
        `;

        receiptBody.innerHTML = html;
        
        // Hiển thị Modal
        const receiptModal = new bootstrap.Modal(document.getElementById('receipt-modal'));
        receiptModal.show();
    }

    // --- LOGIC ĐĂNG XUẤT ---
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });
});