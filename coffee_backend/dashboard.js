document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra quyền admin
    if (!requireAdmin()) return;

    // Hiển thị thông tin user
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('welcome-user-name').textContent = user.username;
        document.getElementById('user-fullname').textContent = user.username;
        const initials = user.username.substring(0, 2).toUpperCase();
        document.getElementById('user-avatar').textContent = initials;
    }

    // Tải dữ liệu
    loadQuickStats();
    loadRevenueCharts();
    loadCategoryChart();
});

// 1. Tải thống kê nhanh (4 thẻ trên cùng)
function loadQuickStats() {
    fetchWithToken('/api/dashboard/quick-stats')
        .then(res => res ? res.json() : null)
        .then(data => {
            if (!data) return;
            document.getElementById('stat-total-orders').textContent = data.totalOrders;
            document.getElementById('stat-total-products').textContent = data.totalProducts;
            document.getElementById('stat-total-customers').textContent = data.totalCustomers;
            document.getElementById('stat-total-employees').textContent = data.totalEmployees;
        })
        .catch(err => console.error('Lỗi tải thống kê nhanh:', err));
}

// 2. Tải biểu đồ doanh thu theo tháng
function loadRevenueCharts() {
    const currentYear = new Date().getFullYear();
    document.getElementById('revenue-chart-year').textContent = currentYear;

    fetchWithToken(`/api/dashboard/monthly-revenue/${currentYear}`)
        .then(res => res ? res.json() : null)
        .then(data => {
            if (!data) return;

            // Chuẩn bị dữ liệu cho 12 tháng (mặc định là 0)
            const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
            const revenueData = new Array(12).fill(0);

            data.forEach(item => {
                // item.month là 1-12, mảng bắt đầu từ 0 nên trừ 1
                if (item.month >= 1 && item.month <= 12) {
                    revenueData[item.month - 1] = item.revenue;
                }
            });

            // Vẽ biểu đồ cột
            const ctx = document.getElementById('monthly-revenue-chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Doanh thu (VNĐ)',
                        data: revenueData,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('vi-VN') + ' đ';
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y.toLocaleString('vi-VN') + ' đ';
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(err => console.error('Lỗi tải biểu đồ doanh thu:', err));
}

// 3. Tải biểu đồ tỷ trọng danh mục
function loadCategoryChart() {
    fetchWithToken('/api/dashboard/category-stats')
        .then(res => res ? res.json() : null)
        .then(data => {
            if (!data || data.length === 0) return;

            const labels = data.map(item => item.name);
            const values = data.map(item => item.revenue);
            
            // Màu sắc ngẫu nhiên đẹp mắt
            const backgroundColors = [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'
            ];

            const ctx = document.getElementById('category-sales-chart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: backgroundColors.slice(0, labels.length),
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        })
        .catch(err => console.error('Lỗi tải biểu đồ danh mục:', err));
}