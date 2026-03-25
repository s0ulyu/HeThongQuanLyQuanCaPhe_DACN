/**
 * Xử lý responsive cho sidebar trên màn hình nhỏ
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Render Sidebar trước khi gắn sự kiện
    renderSidebar();

    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const mainContent = document.querySelector('.main-content');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Tự động đóng sidebar khi click vào nội dung chính
        mainContent?.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
    
    // Xử lý hiển thị menu cho Admin (nếu trang hiện tại chưa xử lý)
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
});

/**
 * Hàm tạo Sidebar động theo cấu trúc yêu cầu
 */
function renderSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Cấu hình thanh cuộn dọc
    sidebar.style.overflowY = 'auto';
    sidebar.style.height = '100vh';
    sidebar.style.paddingBottom = '50px'; // Tránh bị che mất phần cuối

    // Cấu trúc Menu
    const menuItems = [
        { name: 'Trang chủ', link: 'dashboard.html', icon: 'bi-house-door' },
        { name: 'Trang bán hàng', link: 'index.html', icon: 'bi-cart' },
        { name: 'Quản lý danh mục', link: 'manage_categories.html', icon: 'bi-tags', admin: true },
        { name: 'Quản lý món', link: 'manage_products.html', icon: 'bi-cup-straw', admin: true },
        { name: 'Quản lý bàn', link: 'manage_tables.html', icon: 'bi-grid-3x3', admin: true },
        {
            name: 'Quản lý tài khoản',
            icon: 'bi-person-badge',
            id: 'accountSubmenu',
            admin: true,
            children: [
                { name: 'Danh sách tài khoản', link: 'manage_accounts.html' },
                { name: 'Vai trò', link: 'manage_roles.html' }
            ]
        },
        {
            name: 'Quản lý kho',
            icon: 'bi-box-seam',
            id: 'inventorySubmenu',
            admin: true,
            children: [
                { name: 'Nguyên vật liệu', link: 'manage_materials.html' },
                { name: 'Nhà cung cấp', link: 'manage_suppliers.html' },
                { name: 'Phiếu nhập', link: 'manage_imports.html' },
                { name: 'Lịch sử nhập hàng', link: 'manage_imports_history.html' }
            ]
        },
        {
            name: 'Chấm công',
            icon: 'bi-clock-history',
            id: 'timekeepingSubmenu',
            children: [
                { name: 'Quét mã chấm công', link: 'timekeeping_scan.html' },
                { name: 'Mã QR chấm công', link: 'timekeeping_qr.html', admin: true },
                { name: 'Quản lý ca', link: 'manage_shifts.html', admin: true },
                { name: 'Lịch làm việc', link: 'manage_schedules.html', admin: true }
            ]
        },
        {
            name: 'Báo cáo',
            icon: 'bi-bar-chart',
            id: 'reportSubmenu',
            admin: true,
            children: [
                { name: 'Báo cáo doanh thu', link: 'report_revenue.html' },
                { name: 'Báo cáo chấm công', link: 'report_timekeeping.html' }
            ]
        }
    ];

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const user = JSON.parse(localStorage.getItem('user')) || { username: 'User' };

    let html = `
        <div class="d-flex flex-column flex-shrink-0 p-3" style="min-height: 100%;">
            <a href="index.html" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none">
                <span class="fs-4 fw-bold">Coffee POS</span>
            </a>
            <hr>
            <ul class="nav nav-pills flex-column mb-auto">
    `;

    menuItems.forEach(item => {
        const adminClass = item.admin ? 'admin-only' : '';
        
        if (item.children) {
            const isChildActive = item.children.some(child => child.link === currentPage);
            const showClass = isChildActive ? 'show' : '';
            const collapsedClass = isChildActive ? '' : 'collapsed';
            
            html += `
                <li class="nav-item ${adminClass}">
                    <a href="#${item.id}" class="nav-link ${collapsedClass} d-flex justify-content-between align-items-center" data-bs-toggle="collapse">
                        <span><i class="bi ${item.icon} me-2"></i>${item.name}</span>
                        <i class="bi bi-chevron-down small"></i>
                    </a>
                    <div class="collapse ${showClass}" id="${item.id}">
                        <ul class="btn-toggle-nav list-unstyled fw-normal pb-1 small ms-4">
                            ${item.children.map(child => {
                                const childAdminClass = child.admin ? 'admin-only' : '';
                                const activeClass = child.link === currentPage ? 'active' : '';
                                return `<li class="${childAdminClass}"><a href="${child.link}" class="nav-link ${activeClass} rounded">${child.name}</a></li>`;
                            }).join('')}
                        </ul>
                    </div>
                </li>
            `;
        } else {
            const activeClass = item.link === currentPage ? 'active' : '';
            html += `
                <li class="nav-item ${adminClass}">
                    <a href="${item.link}" class="nav-link ${activeClass}" aria-current="page">
                        <i class="bi ${item.icon} me-2"></i>
                        ${item.name}
                    </a>
                </li>
            `;
        }
    });

    html += `
            </ul>
            <hr>
            <div class="dropdown">
                <a href="#" class="d-flex align-items-center link-dark text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
                    <img src="https://ui-avatars.com/api/?name=${user.username}&background=random" alt="" width="32" height="32" class="rounded-circle me-2">
                    <strong>${user.username}</strong>
                </a>
                <ul class="dropdown-menu text-small shadow" aria-labelledby="dropdownUser1">
                    <li><a class="dropdown-item" href="#" id="logout-btn">Đăng xuất</a></li>
                </ul>
            </div>
        </div>
    `;

    sidebar.innerHTML = html;
}

/**
 * File này chứa các hàm xác thực và helper dùng chung cho toàn bộ ứng dụng.
 */

/**
 * Kiểm tra xem người dùng đã đăng nhập và có phải là admin không.
 * Nếu không, sẽ hiển thị cảnh báo và chuyển hướng về trang đăng nhập.
 * Hàm này nên được gọi ở đầu mỗi trang quản trị.
 */
function requireAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!token || !user || user.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang này hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại với tài khoản admin.');
        // Xóa thông tin đăng nhập cũ để tránh lỗi
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Chuyển hướng về trang đăng nhập
        window.location.href = 'login.html';
        return false; // Trả về false để ngăn mã tiếp theo thực thi nếu cần
    }
    return true; // Trả về true nếu xác thực thành công
}

/**
 * Gửi yêu cầu fetch với token xác thực trong header.
 * Tự động xử lý lỗi 401/403 (Unauthorized/Forbidden).
 * @param {string} url - URL của API
 * @param {object} options - Tùy chọn của hàm fetch (method, body, etc.)
 * @returns {Promise<Response|null>}
 */
async function fetchWithToken(url, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        // Lỗi xác thực từ phía server, xử lý tương tự như requireAdmin
        alert('Phiên làm việc đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại.');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return null; // Trả về null để hàm gọi biết và dừng lại
    }

    return response;
}