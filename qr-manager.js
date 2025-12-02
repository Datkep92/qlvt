// qr-manager.js - Chỉ xử lý QR Code
class QRManager {
    constructor() {
        this.moduleName = "QRManager";
        this.qrCodeReady = typeof QRCode !== 'undefined';
        this.init();
    }
    
    init() {
        console.log('✅ QRManager initialized');
        window.qrManager = this;
        
        // Đăng ký sự kiện nếu AppEvents tồn tại
        if (typeof AppEvents !== 'undefined') {
            AppEvents.on('qr:showSelection', () => this.showQRSelectionModal());
        }
    }
    
    // Hiển thị modal chọn thiết bị
    async showQRSelectionModal() {
        try {
            console.log('🔄 [QR] Loading devices for selection...');
            
            // Kiểm tra database
            if (!window.medicalDB) {
                this.showError('Database chưa được khởi tạo');
                return;
            }
            
            // Load devices từ database
            const devices = await window.medicalDB.getAllDevices();
            console.log('📊 Loaded devices from DB:', devices.length);
            
            if (!devices || devices.length === 0) {
                this.showError('Không có thiết bị nào trong database');
                return;
            }
            
            // Hiển thị modal chọn thiết bị
            this.showDeviceSelectionModal(devices);
            
        } catch (error) {
            console.error('❌ Error loading devices:', error);
            this.showError('Lỗi tải danh sách thiết bị: ' + error.message);
        }
    }
    
    // Hiển thị modal chọn thiết bị
    showDeviceSelectionModal(devices) {
        // Đóng modal cũ nếu có
        this.closeAllModals();
        
        // Tạo modal mới
        const modal = this.createModal('qr-selection-modal');
        modal.innerHTML = this.getDeviceSelectionHTML(devices);
        document.body.appendChild(modal);
        
        // Gắn sự kiện
        setTimeout(() => this.bindDeviceSelectionEvents(), 100);
    }
    
    // HTML cho modal chọn thiết bị
    getDeviceSelectionHTML(devices) {
        // Nhóm theo phòng ban
        const groups = this.groupByDepartment(devices);
        
        return `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>📱 CHỌN THIẾT BỊ TẠO QR CODE</h3>
                    <button class="btn-close" onclick="window.qrManager.closeModal()">✕</button>
                </div>
                
                <div class="modal-body">
                    <div class="selection-info">
                        <p>Chọn thiết bị từ danh sách bên dưới:</p>
                        <div class="selection-stats">
                            <strong>Tổng: ${devices.length} thiết bị</strong>
                            <span id="selected-count-display" style="display:none; margin-left:20px;">
                                Đã chọn: <span id="selected-count">0</span>
                            </span>
                        </div>
                    </div>
                    
                    <div class="selection-controls" style="margin: 15px 0;">
                        <label style="cursor:pointer;">
                            <input type="checkbox" id="select-all-devices">
                            Chọn tất cả (${devices.length} thiết bị)
                        </label>
                    </div>
                    
                    <div class="devices-list">
                        ${Object.entries(groups).map(([dept, deptDevices]) => `
                            <div class="department-group">
                                <div class="dept-header" style="cursor:pointer; padding:10px; background:#f5f5f5; margin:10px 0; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                                    <strong>${this.escapeHtml(dept)}</strong>
                                    <span>(${deptDevices.length})</span>
                                </div>
                                <div class="dept-devices" style="padding-left:15px;">
                                    ${deptDevices.map(device => `
                                        <div class="device-checkbox" style="margin:8px 0;">
                                            <label style="cursor:pointer; display:flex; align-items:center; padding:8px; border:1px solid #eee; border-radius:4px;"
                                                   onclick="event.stopPropagation();">
                                                <input type="checkbox" 
                                                       value="${device.id}"
                                                       data-device='${JSON.stringify(device)}'
                                                       style="margin-right:10px;"
                                                       onchange="window.qrManager.updateSelectedCount()">
                                                <div style="flex:1;">
                                                    <strong>${this.shortenText(device.ten_thiet_bi, 50)}</strong>
                                                    <div style="font-size:12px; color:#666; margin-top:3px;">
                                                        ${device.model ? `• Model: ${device.model} ` : ''}
                                                        • SL: ${device.so_luong || 1}
                                                        • ${device.tinh_trang || 'N/A'}
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="modal-footer" style="padding:15px; border-top:1px solid #eee;">
                    <button onclick="window.qrManager.closeModal()" 
                            style="padding:8px 16px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:10px;">
                        Hủy
                    </button>
                    <button id="generate-qr-btn" 
                            onclick="window.qrManager.generateSelectedQR()"
                            style="padding:8px 20px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer; min-width:150px;"
                            disabled>
                        📱 Tạo QR Code
                    </button>
                </div>
            </div>
        `;
    }
    
    // Gắn sự kiện cho modal
    bindDeviceSelectionEvents() {
        // Select All
        const selectAll = document.getElementById('select-all-devices');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.device-checkbox input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
                this.updateSelectedCount();
            });
        }
        
        // Cập nhật số lượng đã chọn
        this.updateSelectedCount();
    }
    
    // Cập nhật số lượng đã chọn
    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.device-checkbox input[type="checkbox"]:checked');
        const selectedCount = checkboxes.length;
        const generateBtn = document.getElementById('generate-qr-btn');
        const countDisplay = document.getElementById('selected-count-display');
        const countSpan = document.getElementById('selected-count');
        
        if (countSpan) countSpan.textContent = selectedCount;
        if (countDisplay) countDisplay.style.display = selectedCount > 0 ? 'inline' : 'none';
        if (generateBtn) generateBtn.disabled = selectedCount === 0;
        
        // Cập nhật select all checkbox
        const selectAll = document.getElementById('select-all-devices');
        if (selectAll) {
            const totalCheckboxes = document.querySelectorAll('.device-checkbox input[type="checkbox"]').length;
            if (selectedCount === 0) {
                selectAll.checked = false;
                selectAll.indeterminate = false;
            } else if (selectedCount === totalCheckboxes) {
                selectAll.checked = true;
                selectAll.indeterminate = false;
            } else {
                selectAll.checked = false;
                selectAll.indeterminate = true;
            }
        }
    }
    
    // Tạo QR code với thiết bị đã chọn
    async generateSelectedQR() {
        const checkboxes = document.querySelectorAll('.device-checkbox input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            this.showError('Vui lòng chọn ít nhất 1 thiết bị');
            return;
        }
        
        const selectedDevices = [];
        checkboxes.forEach(cb => {
            try {
                const deviceData = JSON.parse(cb.getAttribute('data-device'));
                selectedDevices.push(deviceData);
            } catch (e) {
                console.error('Error parsing device data:', e);
            }
        });
        
        if (selectedDevices.length === 0) {
            this.showError('Không có dữ liệu thiết bị hợp lệ');
            return;
        }
        
        console.log('📱 Generating QR for', selectedDevices.length, 'devices');
        
        // Đóng modal
        this.closeModal();
        
        // Tạo QR code
        this.generateDetailedQR(selectedDevices);
    }
    
    // Tạo QR code chi tiết
    async generateDetailedQR(devices) {
        try {
            if (!this.qrCodeReady) {
                this.showError('Thư viện QR Code chưa sẵn sàng');
                return;
            }
            
            if (devices.length === 0) {
                this.showError('Không có thiết bị để tạo QR Code');
                return;
            }
            
            this.showLoading(`Đang tạo QR Code cho ${devices.length} thiết bị...`);
            
            // Tạo QR Code cho từng thiết bị
            const qrResults = [];
            
            for (const device of devices) {
                try {
                    const qrData = await this.createDeviceQRCode(device);
                    qrResults.push({
                        id: device.id,
                        data: qrData,
                        device: device
                    });
                } catch (error) {
                    console.log('QR error for device', device.id, error);
                    qrResults.push({
                        id: device.id,
                        data: this.createPlaceholderQR(device.id, device.ten_thiet_bi),
                        device: device,
                        error: true
                    });
                }
            }
            
            // Tạo trang hiển thị QR
            this.generateQRDisplayPage(qrResults);
            
            // Log activity
            try {
                if (window.medicalDB) {
                    await window.medicalDB.addActivity({
                        type: 'export',
                        description: `Tạo QR Code cho ${qrResults.length} thiết bị`,
                        user: 'Hệ thống QR'
                    });
                }
            } catch (e) {
                console.log('Error logging activity:', e);
            }
            
            this.hideLoading();
            this.showSuccess(`✅ Đã tạo QR Code cho ${qrResults.length} thiết bị`);
            
        } catch (error) {
            console.error('❌ Error generating QR:', error);
            this.hideLoading();
            this.showError('Lỗi khi tạo QR Code: ' + error.message);
        }
    }
    
    // Tạo QR code cho một thiết bị
    createDeviceQRCode(device) {
        return new Promise((resolve, reject) => {
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
            document.body.appendChild(tempDiv);
            
            try {
                const qrText = this.createDeviceURL(device);
                
                const qr = new QRCode(tempDiv, {
                    text: qrText,
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                setTimeout(() => {
                    try {
                        const canvas = tempDiv.querySelector('canvas');
                        const img = tempDiv.querySelector('img');
                        
                        let dataUrl;
                        if (canvas) {
                            dataUrl = canvas.toDataURL('image/png');
                        } else if (img && img.src) {
                            dataUrl = img.src;
                        }
                        
                        document.body.removeChild(tempDiv);
                        
                        if (dataUrl) {
                            resolve(dataUrl);
                        } else {
                            reject(new Error('No QR generated'));
                        }
                    } catch (err) {
                        document.body.removeChild(tempDiv);
                        reject(err);
                    }
                }, 150);
                
            } catch (error) {
                document.body.removeChild(tempDiv);
                reject(error);
            }
        });
    }
    
    // Tạo URL cho QR code
    createDeviceURL(device) {
        const deviceInfo = {
            id: device.id,
            name: device.ten_thiet_bi,
            model: device.model || '',
            manufacturer: device.nha_san_xuat || '',
            year: device.nam_san_xuat || '',
            quantity: device.so_luong || 1,
            price: device.nguyen_gia || 0,
            status: device.tinh_trang || 'Không rõ',
            department: device.phong_ban || '',
            category: device.phan_loai || '',
            note: device.ghi_chu || '',
            serial: device.serial_number || '',
            unit: device.don_vi_tinh || 'cái',
            manager: device.nhan_vien_ql || '',
            timestamp: new Date().toISOString()
        };
        
        // Encode thành base64
        const jsonString = JSON.stringify(deviceInfo);
        const base64Data = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, 
            function(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            }
        ));
        
        // Tạo URL
        const baseURL = window.location.origin.includes('github.io') 
            ? 'https://datkep92.github.io/qlvt/qr-display.html'
            : window.location.origin + '/qr-display.html';
        
        return `${baseURL}#${base64Data}`;
    }
    
    // Tạo trang hiển thị QR
    generateQRDisplayPage(qrResults) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>QR Code Thiết Bị</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    .container { max-width: 1000px; margin: auto; }
                    h1 { text-align: center; color: #2c3e50; }
                    .qr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
                    .qr-item { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                    .qr-img { width: 180px; height: 180px; }
                    .device-name { font-weight: bold; margin: 10px 0; font-size: 14px; }
                    .controls { text-align: center; margin: 20px 0; }
                    .btn { padding: 10px 20px; margin: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📱 QR CODE THIẾT BỊ Y TẾ</h1>
                    <p style="text-align:center;">Bệnh viện Ninh Thuận | ${qrResults.length} thiết bị</p>
                    
                    <div class="controls">
                        <button class="btn" onclick="window.print()" style="background:#007bff; color:white; border:none; border-radius:5px;">
                            🖨️ In trang
                        </button>
                        <button class="btn" onclick="saveAllQR()" style="background:#28a745; color:white; border:none; border-radius:5px;">
                            💾 Lưu QR
                        </button>
                    </div>
                    
                    <div class="qr-grid">
                        ${qrResults.map(item => `
                            <div class="qr-item">
                                <img src="${item.data}" alt="QR ${item.device.id}" class="qr-img">
                                <div class="device-name">${this.shortenText(item.device.ten_thiet_bi, 30)}</div>
                                <div style="font-size:12px; color:#666;">
                                    ID: ${item.device.id} | SL: ${item.device.so_luong}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <script>
                    function saveAllQR() {
                        const qrData = ${JSON.stringify(qrResults.map(r => ({ id: r.id, data: r.data, name: r.device.ten_thiet_bi })))};
                        
                        if (!confirm('Lưu tất cả QR Code (' + qrData.length + ' file)?')) return;
                        
                        qrData.forEach((item, index) => {
                            setTimeout(() => {
                                const link = document.createElement('a');
                                const safeName = (item.name || 'device').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
                                link.download = 'QR_' + item.id + '_' + safeName + '.png';
                                link.href = item.data;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }, index * 300);
                        });
                    }
                </script>
            </body>
            </html>
        `;
        
        const qrWindow = window.open('', '_blank');
        if (qrWindow) {
            qrWindow.document.write(html);
            qrWindow.document.close();
        }
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    groupByDepartment(devices) {
        const groups = {};
        devices.forEach(device => {
            const dept = device.phong_ban || 'Chưa phân loại';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(device);
        });
        return groups;
    }
    
    shortenText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    createPlaceholderQR(id, name) {
        const shortName = this.shortenText(name || '', 10);
        const svg = `<svg width="200" height="200">
            <rect width="200" height="200" fill="#f8f8f8"/>
            <rect x="10" y="10" width="180" height="180" fill="white" stroke="#ccc"/>
            <text x="100" y="80" text-anchor="middle" font-family="Arial" font-size="12">${shortName}</text>
            <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="10">ID: ${id}</text>
        </svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    
    createModal(className) {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        
        return modal;
    }
    
    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
    }
    
    showLoading(message) {
        let loading = document.getElementById('global-loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'global-loading';
            loading.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            document.body.appendChild(loading);
        }
        
        loading.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 30px; margin-bottom: 10px;">⏳</div>
                <div style="font-weight: bold;">${message}</div>
            </div>
        `;
    }
    
    hideLoading() {
        const loading = document.getElementById('global-loading');
        if (loading) loading.remove();
    }
    
    showError(message) {
        if (typeof AppEvents !== 'undefined') {
            AppEvents.emit('notification:show', {
                message: message,
                type: 'error'
            });
        } else {
            alert('❌ ' + message);
        }
    }
    
    showSuccess(message) {
        if (typeof AppEvents !== 'undefined') {
            AppEvents.emit('notification:show', {
                message: message,
                type: 'success'
            });
        } else {
            alert('✅ ' + message);
        }
    }
}

// Khởi tạo
let qrManager;
document.addEventListener('DOMContentLoaded', () => {
    qrManager = new QRManager();
    console.log('✅ QR Manager ready');
    
    // Test button để mở modal chọn thiết bị
    const testBtn = document.createElement('button');
    testBtn.textContent = '📱 Test QR Selection';
    testBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:10px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;';
    testBtn.onclick = () => qrManager.showQRSelectionModal();
    document.body.appendChild(testBtn);
});
