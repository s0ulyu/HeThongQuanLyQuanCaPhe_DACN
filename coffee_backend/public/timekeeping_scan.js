document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Thêm kiểm tra HTTPS
    if (window.isSecureContext === false) {
        document.getElementById('reader').style.display = 'none';
        document.getElementById('scan-result').style.display = 'none';
        document.querySelector('.lead').style.display = 'none';
        document.getElementById('secure-context-error').style.display = 'block';
        console.error('Camera access is only available in a secure context (HTTPS).');
        return;
    }

    const logoutBtn = document.getElementById('logout-btn');
    const resultModalEl = document.getElementById('resultModal');
    const resultModal = new bootstrap.Modal(resultModalEl);
    const resultModalContent = document.getElementById('result-modal-content');
    const resultIcon = document.getElementById('result-icon');
    const resultMessage = document.getElementById('result-message');

    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });

    let isProcessing = false;

    function showResultPopup(message, type, autoClose = true) {
        resultMessage.textContent = message;
        if (type === 'success') {
            resultModalContent.className = 'modal-content text-center border-0 shadow-lg success';
            resultIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>`;
        } else if (type === 'error') {
            resultModalContent.className = 'modal-content text-center border-0 shadow-lg error';
            resultIcon.innerHTML = `
                <svg xmlns="http://www.w0.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                </svg>`;
        } else {
            // Trạng thái loading
            resultModalContent.className = 'modal-content text-center border-0 shadow-lg';
            resultIcon.innerHTML = `<div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;"></div>`;
        }
        resultModal.show();
        
        if (autoClose) {
            // Tự động đóng pop-up sau 3 giây và reload trang để sẵn sàng cho lần quét mới
            setTimeout(() => {
                resultModal.hide();
                window.location.reload();
            }, 3000);
        }
    }

    let html5QrcodeScanner = null; // Khai báo biến toàn cục trong scope này

    function onScanSuccess(decodedText, decodedResult) {
        if (isProcessing) return;
        isProcessing = true;

        // 1. Rung điện thoại (nếu thiết bị hỗ trợ)
        if (navigator.vibrate) navigator.vibrate(200);

        // 2. Hiển thị thông báo đang xử lý NGAY LẬP TỨC (trước khi tắt camera để tránh lag)
        showResultPopup('Đang lấy vị trí và chấm công...', 'loading', false);

        // 3. Tắt camera (Sử dụng html5QrcodeScanner)
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().then(() => {
                const reader = document.getElementById('reader');
                if (reader) reader.innerHTML = '<div class="alert alert-success mt-3">Đã quét xong! Vui lòng chờ...</div>';
            }).catch(err => console.error("Lỗi tắt camera:", err));
        }

        // 4. Lấy vị trí và gửi dữ liệu
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000, // Giới hạn 10 giây, tránh bị treo
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWithToken('/api/timekeeping/scan', {
                    method: 'POST',
                    body: JSON.stringify({ qrToken: decodedText, latitude, longitude })
                })
                .then(async response => {
                    if (!response) return; // Đã redirect nếu lỗi auth

                    let data;
                    try {
                        data = await response.json();
                    } catch (e) {
                        throw new Error("Lỗi kết nối: Phản hồi từ máy chủ không hợp lệ.");
                    }

                    if (!response.ok) {
                        throw new Error(data.error || data.message || "Lỗi chấm công không xác định.");
                    }
                    
                    // 5a. Thành công: Hiển thị kết quả và tự đóng sau 3s
                    showResultPopup(data.message || "Chấm công thành công!", 'success', true);
                })
                .catch(error => {
                    // 5b. Thất bại: Hiển thị lỗi và tự đóng sau 3s
                    showResultPopup(error.message, 'error', true);
                });
            },
            (error) => {
                // Xử lý lỗi không lấy được vị trí
                console.error("Lỗi định vị:", error);
                let msg = "Không thể lấy vị trí.";
                if (error.code === 1) msg = "Bạn chưa cấp quyền vị trí.";
                else if (error.code === 2) msg = "Vị trí không khả dụng (hãy bật GPS).";
                else if (error.code === 3) msg = "Hết thời gian lấy vị trí.";
                
                showResultPopup(msg + " Vui lòng thử lại.", 'error', true);
            },
            geoOptions
        );
    }

    // --- CẤU HÌNH CAMERA (Sử dụng Html5QrcodeScanner như cũ) ---
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", 
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 } 
        },
        /* verbose= */ false
    );
    
    html5QrcodeScanner.render(onScanSuccess, (errorMessage) => {
        // Bỏ qua lỗi quét liên tục để tránh spam console
    });
});