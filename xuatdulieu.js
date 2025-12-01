// xuatdulieu.js - Phiên bản HIỂN THỊ CHI TIẾT KHI QUÉT
class XuatDuLieuManager {
    constructor() {
        this.moduleName = "XuatDuLieuManager";
        this.qrCodeReady = typeof QRCode !== 'undefined';
        this.init();
    }
    
    init() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('ui:showExport', () => this.showExportOptions());
        AppEvents.on('export:excel', () => this.exportToExcel());
        AppEvents.on('export:maintenance', () => this.exportMaintenance());
        AppEvents.on('export:qr', () => this.generateQRCode());
    }
    
    setup() {
        console.log('✅ XuatDuLieuManager ready');
    }
    
    showExportOptions() {
        const modal = this.createModal('export-modal');
        modal.innerHTML = this.getExportOptionsHTML();
        document.body.appendChild(modal);
    }
    
    getExportOptionsHTML() {
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📤 XUẤT DỮ LIỆU</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <div class="export-option" onclick="window.xuatDuLieuManager.exportToExcel()">
                            <div class="export-icon">📊</div>
                            <div class="export-info">
                                <h4>Excel toàn bộ</h4>
                                <p>Xuất tất cả thiết bị ra file Excel</p>
                            </div>
                        </div>
                        
                        <div class="export-option" onclick="window.xuatDuLieuManager.exportMaintenance()">
                            <div class="export-icon">🛠️</div>
                            <div class="export-info">
                                <h4>Báo cáo bảo trì</h4>
                                <p>Xuất danh sách thiết bị cần bảo trì</p>
                            </div>
                        </div>
                        
                        <div class="export-option" onclick="window.xuatDuLieuManager.showQRSelectionModal()">
                            <div class="export-icon">📱</div>
                            <div class="export-info">
                                <h4>QR Code Chi Tiết</h4>
                                <p>QR chứa đầy đủ thông tin thiết bị</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Đóng</button>
                </div>
            </div>
        `;
    }
    
    
    
    groupByDepartment(devices) {
        const groups = {};
        devices.forEach(device => {
            const dept = device.phong_ban || 'Chưa phân loại';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(device);
        });
        return groups;
    }
    


checkSelection() {
    const checkboxes = document.querySelectorAll('#qr-selection-modal .device-checkbox input[type="checkbox"]:checked');
    const selectedCount = checkboxes.length;
    
    const generateBtn = document.getElementById('generate-qr-btn');
    if (generateBtn) {
        generateBtn.disabled = selectedCount === 0;
        
        // Có thể thêm số lượng vào button nếu muốn
        generateBtn.textContent = selectedCount > 0 
            ? `📱 Tạo QR Code (${selectedCount})` 
            : '📱 Tạo QR Code';
    }
    
    // Cập nhật select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-devices');
    if (selectAllCheckbox) {
        const totalCheckboxes = document.querySelectorAll('#qr-selection-modal .device-checkbox input[type="checkbox"]').length;
        
        if (selectedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount === totalCheckboxes) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

// PHIÊN BẢN FIX LỖI CHECKBOX HOÀN TOÀN
async showQRSelectionModal() {
    try {
        this.showLoading('Đang tải danh sách thiết bị...');
        
        const devices = await medicalDB.getAllDevices();
        
        if (devices.length === 0) {
            AppEvents.emit('notification:show', {
                message: 'Không có thiết bị để tạo QR Code',
                type: 'error'
            });
            this.hideLoading();
            return;
        }
        
        const modal = this.createModal('qr-selection-modal');
        modal.innerHTML = this.getQRSelectionHTML(devices);
        document.body.appendChild(modal);
        
        this.hideLoading();
        this.closeExportModal();
        
        // GÁN LẠI SỰ KIỆN SAU KHI MODAL ĐƯỢC RENDER
        setTimeout(() => {
            this.bindQRModalEvents();
        }, 100);
        
    } catch (error) {
        console.error('Error loading devices for QR:', error);
        this.hideLoading();
        AppEvents.emit('notification:show', {
            message: '❌ Lỗi khi tải danh sách thiết bị',
            type: 'error'
        });
    }
}

getQRSelectionHTML(devices) {
    const groupedDevices = this.groupByDepartment(devices);
    
    return `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>📱 CHỌN THIẾT BỊ TẠO QR CODE</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="qr-selection">
                    <div class="selection-controls" style="margin-bottom: 15px;">
                        <div class="select-all-group">
                            <input type="checkbox" id="select-all-devices">
                            <label for="select-all-devices" style="cursor: pointer; font-weight: bold;">
                                Chọn tất cả (${devices.length} thiết bị)
                            </label>
                        </div>
                    </div>
                    
                    <div id="selected-count-display" style="margin: 10px 0; padding: 8px; background: #e8f4ff; border-radius: 4px; display: none;">
                        <strong>Đã chọn: <span id="selected-count">0</span> thiết bị</strong>
                    </div>
                    
                    <div class="devices-list">
                        ${Object.entries(groupedDevices).map(([dept, deptDevices]) => `
                            <div class="department-group">
                                <div class="dept-header" style="cursor: pointer; padding: 10px; background: #f5f5f5; margin: 5px 0; border-radius: 4px;">
                                    <span class="dept-name">${this.escapeHtml(dept)}</span>
                                    <span class="dept-count">(${deptDevices.length})</span>
                                    <span class="toggle-icon">▼</span>
                                </div>
                                <div class="dept-devices" style="padding-left: 20px; margin-bottom: 15px;">
                                    ${deptDevices.map(device => `
                                        <div class="device-checkbox" style="margin: 5px 0;">
                                            <input type="checkbox" 
                                                   id="device-${device.id}" 
                                                   value="${device.id}"
                                                   class="device-checkbox-input"
                                                   data-device='${JSON.stringify(device)}'>
                                            <label for="device-${device.id}" 
                                                   style="cursor: pointer; display: block; padding: 8px; border: 1px solid #eee; border-radius: 4px;"
                                                   title="${this.escapeHtml(device.ten_thiet_bi)}">
                                                <strong>${this.shortenText(device.ten_thiet_bi, 40)}</strong>
                                                <div style="font-size: 12px; color: #666; margin-top: 3px;">
                                                    ${device.model ? `• Model: ${device.model}` : ''}
                                                    • SL: ${device.so_luong}
                                                    • ${device.tinh_trang}
                                                </div>
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">Hủy</button>
                <button class="btn-primary" id="generate-qr-btn" style="min-width: 150px;" disabled>
                    📱 Tạo QR Code
                </button>
            </div>
        </div>
    `;
}

// GÁN SỰ KIỆN SAU KHI MODAL ĐƯỢC TẠO
bindQRModalEvents() {
    const modal = document.querySelector('.qr-selection-modal');
    if (!modal) return;
    
    // 1. Sự kiện cho checkbox thiết bị
    modal.querySelectorAll('.device-checkbox-input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            this.updateSelectedCount();
        });
    });
    
    // 2. Sự kiện cho chọn tất cả
    const selectAllCheckbox = modal.querySelector('#select-all-devices');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            this.toggleSelectAllDevices(e.target.checked);
        });
    }
    
    // 3. Sự kiện cho nút tạo QR
    const generateBtn = modal.querySelector('#generate-qr-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            this.generateQRWithSelected();
        });
    }
    
    // 4. Sự kiện cho toggle department
    modal.querySelectorAll('.dept-header').forEach(header => {
        header.addEventListener('click', () => {
            const devicesDiv = header.nextElementSibling;
            if (devicesDiv) {
                devicesDiv.style.display = devicesDiv.style.display === 'none' ? 'block' : 'none';
                header.querySelector('.toggle-icon').textContent = 
                    devicesDiv.style.display === 'none' ? '▶' : '▼';
            }
        });
    });
}

toggleSelectAllDevices(checked) {
    const checkboxes = document.querySelectorAll('.qr-selection-modal .device-checkbox-input');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    
    this.updateSelectedCount();
}

updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.qr-selection-modal .device-checkbox-input:checked');
    const selectedCount = checkboxes.length;
    
    console.log('Selected count:', selectedCount, checkboxes); // Debug
    
    // Hiển thị số lượng đã chọn
    const countDisplay = document.getElementById('selected-count-display');
    const countSpan = document.getElementById('selected-count');
    const generateBtn = document.getElementById('generate-qr-btn');
    
    if (countSpan) {
        countSpan.textContent = selectedCount;
    }
    
    if (countDisplay) {
        countDisplay.style.display = selectedCount > 0 ? 'block' : 'none';
    }
    
    if (generateBtn) {
        generateBtn.disabled = selectedCount === 0;
        generateBtn.textContent = selectedCount > 0 
            ? `📱 Tạo QR Code (${selectedCount})` 
            : '📱 Tạo QR Code';
    }
    
    // Cập nhật select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-devices');
    if (selectAllCheckbox) {
        const totalCheckboxes = document.querySelectorAll('.qr-selection-modal .device-checkbox-input').length;
        
        if (selectedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount === totalCheckboxes) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

async generateQRWithSelected() {
    const checkboxes = document.querySelectorAll('.qr-selection-modal .device-checkbox-input:checked');
    
    console.log('Generating QR for:', checkboxes.length, 'devices'); // Debug
    
    if (checkboxes.length === 0) {
        AppEvents.emit('notification:show', {
            message: 'Vui lòng chọn ít nhất 1 thiết bị',
            type: 'warning'
        });
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
    
    console.log('Selected devices:', selectedDevices); // Debug
    
    if (selectedDevices.length === 0) {
        AppEvents.emit('notification:show', {
            message: 'Không có dữ liệu thiết bị hợp lệ',
            type: 'error'
        });
        return;
    }
    
    // Đóng modal chọn thiết bị
    const modal = document.querySelector('.qr-selection-modal');
    if (modal) modal.remove();
    
    // Tạo QR Code với thiết bị đã chọn
    this.generateDetailedQR(selectedDevices);
}

    
    async generateDetailedQR(devices) {
        try {
            if (!this.qrCodeReady) {
                AppEvents.emit('notification:show', {
                    message: 'Thư viện QR Code chưa sẵn sàng',
                    type: 'warning'
                });
                return;
            }
            
            if (devices.length === 0) {
                AppEvents.emit('notification:show', {
                    message: 'Không có thiết bị để tạo QR Code',
                    type: 'error'
                });
                return;
            }
            
            this.showLoading(`Đang tạo QR Code cho ${devices.length} thiết bị...`);
            
            // Tạo QR Code với đầy đủ thông tin
            const qrResults = [];
            
            for (const device of devices) {
                try {
                    // Tạo data URL cho từng thiết bị
                    const qrData = await this.createDeviceQRCode(device);
                    
                    qrResults.push({
                        id: device.id,
                        data: qrData,
                        device: device // Lưu cả object device để hiển thị
                    });
                    
                } catch (error) {
                    console.log('QR error for device', device.id);
                    qrResults.push({
                        id: device.id,
                        data: this.createPlaceholder(device.id, device.ten_thiet_bi),
                        device: device,
                        error: true
                    });
                }
            }
            
            // Tạo trang HTML để xem thông tin
            this.generateQRInfoPage(qrResults);
            
            await medicalDB.addActivity({
                type: 'export',
                description: `Tạo QR Code chi tiết cho ${qrResults.length} thiết bị`,
                user: 'Quản trị viên'
            });
            
            AppEvents.emit('notification:show', {
                message: `✅ Đã tạo QR Code cho ${qrResults.length} thiết bị`,
                type: 'success'
            });
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error generating QR:', error);
            AppEvents.emit('notification:show', {
                message: '❌ Lỗi khi tạo QR Code',
                type: 'error'
            });
            this.hideLoading();
        }
    }
    
    // TẠO QR CODE VỚI THÔNG TIN CHI TIẾT
    createDeviceQRCode(device) {
        return new Promise((resolve, reject) => {
            // Tạo div ẩn
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
            document.body.appendChild(tempDiv);
            
            try {
                // Tạo URL chứa thông tin chi tiết
                const qrText = this.createDeviceURL(device);
                
                const qr = new QRCode(tempDiv, {
                    text: qrText,
                    width: 150, // Kích thước lớn hơn để dễ quét
                    height: 150,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
                
                // Đợi tạo QR
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
                        
                        // Dọn dẹp
                        if (tempDiv.parentNode) {
                            document.body.removeChild(tempDiv);
                        }
                        
                        if (dataUrl) {
                            resolve(dataUrl);
                        } else {
                            reject(new Error('No QR generated'));
                        }
                        
                    } catch (err) {
                        if (tempDiv.parentNode) {
                            document.body.removeChild(tempDiv);
                        }
                        reject(err);
                    }
                }, 100);
                
            } catch (error) {
                if (tempDiv.parentNode) {
                    document.body.removeChild(tempDiv);
                }
                reject(error);
            }
        });
    }
    
    // TẠO URL HIỂN THỊ THÔNG TIN THIẾT BỊ
    createDeviceURL(device) {
        // Tạo một URL với hash chứa thông tin thiết bị
        const deviceInfo = {
            id: device.id,
            name: device.ten_thiet_bi,
            model: device.model || '',
            manufacturer: device.nha_san_xuat || '',
            year: device.nam_san_xuat || '',
            quantity: device.so_luong,
            price: device.nguyen_gia || 0,
            status: device.tinh_trang,
            department: device.phong_ban || '',
            category: device.phan_loai || '',
            note: device.ghi_chu || ''
        };
        
        // Mã hóa thông tin thành JSON và base64
        const jsonString = JSON.stringify(deviceInfo);
        const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
        
        // Tạo URL sẽ mở trang hiển thị thông tin
        return `${window.location.origin}${window.location.pathname}#device=${base64Data}`;
    }
    
    // TẠO TRANG HIỂN THỊ THÔNG TIN KHI QUÉT QR
    generateQRInfoPage(qrResults) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>QR Code Thiết Bị - Thông Tin Chi Tiết</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        margin: 0; 
                        padding: 15px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                    }
                    .container { 
                        max-width: 1000px; 
                        margin: 0 auto; 
                        background: white; 
                        border-radius: 12px; 
                        padding: 20px; 
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    }
                    h1 { 
                        text-align: center; 
                        color: #2c3e50; 
                        margin: 0 0 10px; 
                        font-size: 24px;
                    }
                    .subtitle { 
                        text-align: center; 
                        color: #666; 
                        margin-bottom: 20px;
                        font-size: 14px;
                    }
                    .qr-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
                        gap: 15px; 
                        margin-bottom: 25px;
                    }
                    .qr-item { 
                        text-align: center; 
                        padding: 15px; 
                        border: 1px solid #e0e0e0; 
                        border-radius: 8px; 
                        background: #fafafa;
                        transition: transform 0.2s, box-shadow 0.2s;
                        cursor: pointer;
                    }
                    .qr-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    }
                    .qr-img { 
                        width: 140px; 
                        height: 140px; 
                        margin: 0 auto 10px; 
                        display: block;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    }
                    .qr-text { 
                        font-size: 12px; 
                        line-height: 1.4; 
                        color: #333;
                    }
                    .device-name { 
                        font-weight: bold; 
                        color: #2c3e50; 
                        margin-bottom: 5px;
                        font-size: 13px;
                    }
                    .device-info {
                        font-size: 11px;
                        color: #666;
                        margin: 3px 0;
                    }
                    .controls { 
                        text-align: center; 
                        margin: 20px 0; 
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    }
                    .btn { 
                        padding: 10px 20px; 
                        background: #28a745; 
                        color: white; 
                        border: none; 
                        border-radius: 6px; 
                        cursor: pointer; 
                        font-size: 14px;
                        margin: 5px;
                        transition: background 0.2s;
                    }
                    .btn:hover { background: #218838; }
                    .btn-print { background: #007bff; }
                    .btn-print:hover { background: #0056b3; }
                    .btn-save { background: #6c757d; }
                    .btn-save:hover { background: #545b62; }
                    .info-panel {
                        background: #e3f2fd;
                        border-left: 4px solid #2196f3;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 20px 0;
                        font-size: 13px;
                    }
                    .device-detail-modal {
                        display: none;
                        position: fixed;
                        top: 0; left: 0;
                        width: 100%; height: 100%;
                        background: rgba(0,0,0,0.8);
                        z-index: 10000;
                        align-items: center;
                        justify-content: center;
                    }
                    .detail-content {
                        background: white;
                        padding: 25px;
                        border-radius: 10px;
                        max-width: 600px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    .detail-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 10px;
                    }
                    .detail-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                    }
                    .detail-item {
                        margin-bottom: 10px;
                    }
                    .detail-label {
                        font-weight: bold;
                        color: #555;
                        font-size: 13px;
                        margin-bottom: 3px;
                    }
                    .detail-value {
                        color: #333;
                        font-size: 14px;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    .status-success { background: #d4edda; color: #155724; }
                    .status-warning { background: #fff3cd; color: #856404; }
                    .status-danger { background: #f8d7da; color: #721c24; }
                    .status-secondary { background: #e2e3e5; color: #383d41; }
                    
                    @media print {
                        .controls { display: none; }
                        body { background: white; }
                        .container { box-shadow: none; }
                    }
                    @media (max-width: 768px) {
                        .qr-grid { grid-template-columns: repeat(2, 1fr); }
                        .detail-grid { grid-template-columns: 1fr; }
                    }
                    @media (max-width: 480px) {
                        .qr-grid { grid-template-columns: 1fr; }
                        .container { padding: 10px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📱 QR CODE THIẾT BỊ Y TẾ</h1>
                    <div class="subtitle">
                        Bệnh viện Ninh Thuận | ${qrResults.length} thiết bị | ${new Date().toLocaleDateString('vi-VN')}
                    </div>
                    
                    <div class="info-panel">
                        <strong>📌 Hướng dẫn sử dụng:</strong>
                        <ul style="margin: 5px 0 0 20px;">
                            <li>QR Code chứa thông tin chi tiết thiết bị</li>
                            <li>Quét bằng camera để xem thông tin đầy đủ</li>
                            <li>Nhấn vào QR Code để xem trước thông tin</li>
                            <li>In dán QR lên thiết bị để quản lý</li>
                        </ul>
                    </div>
                    
                    <div class="controls">
                        <button class="btn btn-print" onclick="window.print()">🖨️ In Trang</button>
                        <button class="btn btn-save" onclick="saveAllQR()">💾 Tải QR Code</button>
                        <button class="btn" onclick="selectAllDevices()">📋 Chọn Tất Cả</button>
                    </div>
                    
                    <div class="qr-grid">
                        ${qrResults.map(item => {
                            const device = item.device;
                            const totalValue = (device.nguyen_gia || 0) * (device.so_luong || 1);
                            const shortName = this.shortenText(device.ten_thiet_bi, 25);
                            
                            return `
                                <div class="qr-item" onclick="showDeviceDetail(${device.id})">
                                    <input type="checkbox" class="qr-select" data-id="${device.id}" style="margin-bottom: 10px;">
                                    <img src="${item.data}" alt="QR ${device.id}" class="qr-img">
                                    <div class="qr-text">
                                        <div class="device-name">${this.escapeHtml(shortName)}</div>
                                        <div class="device-info">ID: ${device.id}</div>
                                        <div class="device-info">Model: ${this.escapeHtml(device.model || 'N/A')}</div>
                                        <div class="device-info">SL: ${device.so_luong} ${device.don_vi_tinh || 'cái'}</div>
                                        <div class="device-info">${device.phong_ban ? this.escapeHtml(device.phong_ban) : ''}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #777;">
                        <p>© ${new Date().getFullYear()} - Hệ thống Quản lý Thiết bị Y tế | Quét QR để truy xuất thông tin</p>
                    </div>
                </div>
                
                <!-- Modal hiển thị chi tiết thiết bị -->
                <div class="device-detail-modal" id="deviceDetailModal">
                    <div class="detail-content" id="detailContent">
                        <!-- Nội dung sẽ được điền bằng JavaScript -->
                    </div>
                </div>
                
                <script>
                    // Dữ liệu thiết bị từ server
                    const deviceData = ${JSON.stringify(qrResults.map(r => r.device))};
                    
                    // Hiển thị chi tiết thiết bị
                    function showDeviceDetail(deviceId) {
                        const device = deviceData.find(d => d.id === deviceId);
                        if (!device) return;
                        
                        const totalValue = (device.nguyen_gia || 0) * (device.so_luong || 1);
                        
                        // Tạo nội dung chi tiết
                        const detailHTML = \`
                            <div class="detail-header">
                                <h2>👁️ THÔNG TIN CHI TIẾT THIẾT BỊ</h2>
                                <button onclick="closeDeviceDetail()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                            </div>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <div class="detail-label">Tên thiết bị:</div>
                                    <div class="detail-value"><strong>\${escapeHtml(device.ten_thiet_bi)}</strong></div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Model:</div>
                                    <div class="detail-value">\${escapeHtml(device.model || 'N/A')}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Nhà sản xuất:</div>
                                    <div class="detail-value">\${escapeHtml(device.nha_san_xuat || 'N/A')}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Năm sản xuất:</div>
                                    <div class="detail-value">\${device.nam_san_xuat || 'N/A'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Số lượng:</div>
                                    <div class="detail-value">\${device.so_luong} \${device.don_vi_tinh || 'cái'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Nguyên giá:</div>
                                    <div class="detail-value">\${formatCurrency(device.nguyen_gia || 0)}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Thành tiền:</div>
                                    <div class="detail-value" style="color: #e74c3c; font-weight: bold;">\${formatCurrency(totalValue)}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Tình trạng:</div>
                                    <div class="detail-value">
                                        <span class="status-badge status-\${getStatusClass(device.tinh_trang)}">
                                            \${device.tinh_trang}
                                        </span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Phòng ban:</div>
                                    <div class="detail-value">\${escapeHtml(device.phong_ban || 'N/A')}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Nhân viên QL:</div>
                                    <div class="detail-value">\${escapeHtml(device.nhan_vien_ql || 'N/A')}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Phân loại:</div>
                                    <div class="detail-value">\${device.phan_loai || 'N/A'}</div>
                                </div>
                                <div class="detail-item" style="grid-column: 1 / -1;">
                                    <div class="detail-label">Ghi chú:</div>
                                    <div class="detail-value">\${escapeHtml(device.ghi_chu || 'Không có ghi chú')}</div>
                                </div>
                            </div>
                            <div style="text-align: center; margin-top: 20px;">
                                <button class="btn" onclick="closeDeviceDetail()">Đóng</button>
                                <button class="btn btn-print" onclick="printDeviceDetail(\${device.id})">🖨️ In Thông Tin</button>
                            </div>
                        \`;
                        
                        document.getElementById('detailContent').innerHTML = detailHTML;
                        document.getElementById('deviceDetailModal').style.display = 'flex';
                    }
                    
                    function closeDeviceDetail() {
                        document.getElementById('deviceDetailModal').style.display = 'none';
                    }
                    
                    function printDeviceDetail(deviceId) {
                        const device = deviceData.find(d => d.id === deviceId);
                        if (!device) return;
                        
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(\`
                            <html>
                            <head><title>Thông tin thiết bị \${device.id}</title></head>
                            <body style="font-family: Arial; padding: 20px;">
                                <h1>Thông tin thiết bị</h1>
                                <pre>\${JSON.stringify(device, null, 2)}</pre>
                            </body>
                            </html>
                        \`);
                        printWindow.document.close();
                        printWindow.print();
                    }
                    
                    // Lưu tất cả QR Code
                    function saveAllQR() {
                        const qrData = ${JSON.stringify(qrResults.map(r => ({ id: r.id, data: r.data, name: r.device.ten_thiet_bi })))};
                        
                        // Hỏi chọn thiết bị
                        const selected = Array.from(document.querySelectorAll('.qr-select:checked'));
                        
                        if (selected.length === 0) {
                            if (!confirm('Lưu tất cả QR Code (${qrResults.length} file)?')) return;
                        } else {
                            if (!confirm('Lưu ' + selected.length + ' QR Code đã chọn?')) return;
                        }
                        
                        const itemsToSave = selected.length > 0 
                            ? qrData.filter(qr => selected.some(s => s.dataset.id == qr.id))
                            : qrData;
                        
                        itemsToSave.forEach((item, index) => {
                            setTimeout(() => {
                                try {
                                    const link = document.createElement('a');
                                    const safeName = (item.name || 'device').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                                    link.download = 'QR_' + item.id + '_' + safeName + '.png';
                                    link.href = item.data;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                } catch (error) {
                                    console.log('Error saving QR', error);
                                }
                            }, index * 300);
                        });
                        
                        setTimeout(() => alert('Đang lưu QR Code...'), 500);
                    }
                    
                    // Chọn tất cả thiết bị
                    function selectAllDevices() {
                        const checkboxes = document.querySelectorAll('.qr-select');
                        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                        
                        checkboxes.forEach(cb => {
                            cb.checked = !allChecked;
                        });
                    }
                    
                    // Utility functions
                    function escapeHtml(text) {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    }
                    
                    function formatCurrency(amount) {
                        if (!amount) return '0 ₫';
                        return new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND'
                        }).format(amount);
                    }
                    
                    function getStatusClass(status) {
                        const map = {
                            'Đang sử dụng': 'success',
                            'Bảo trì': 'warning', 
                            'Hỏng': 'danger',
                            'Ngừng sử dụng': 'secondary'
                        };
                        return map[status] || 'secondary';
                    }
                    
                    // Tự động hỏi in nếu ít thiết bị
                    if (${qrResults.length} <= 12) {
                        setTimeout(() => {
                            if (confirm('Bạn có muốn in QR Code ngay?')) {
                                window.print();
                            }
                        }, 1000);
                    }
                    
                    // Xử lý khi quét QR từ URL
                    window.addEventListener('load', () => {
                        const hash = window.location.hash;
                        if (hash.startsWith('#device=')) {
                            const base64Data = hash.substring(8);
                            try {
                                const jsonString = decodeURIComponent(atob(base64Data));
                                const deviceInfo = JSON.parse(jsonString);
                                
                                // Hiển thị thông tin thiết bị
                                alert('Thông tin thiết bị đã quét:\\n\\n' +
                                      'Tên: ' + deviceInfo.name + '\\n' +
                                      'Model: ' + deviceInfo.model + '\\n' +
                                      'SL: ' + deviceInfo.quantity + '\\n' +
                                      'Trạng thái: ' + deviceInfo.status + '\\n' +
                                      'Phòng: ' + deviceInfo.department);
                                
                                // Xóa hash để không hiển thị lại
                                window.location.hash = '';
                            } catch (e) {
                                console.error('Error parsing QR data:', e);
                            }
                        }
                    });
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
    
    // Các hàm helper giữ nguyên
    shortenText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    createPlaceholder(id, name) {
        const shortName = this.shortenText(name || '', 8);
        const svg = `<svg width="100" height="100">
            <rect width="100" height="100" fill="#f8f8f8"/>
            <rect x="5" y="5" width="90" height="90" fill="white" stroke="#ccc"/>
            <text x="50" y="40" text-anchor="middle" font-family="Arial" font-size="9">${shortName}</text>
            <text x="50" y="60" text-anchor="middle" font-family="Arial" font-size="8">ID:${id}</text>
        </svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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
    
    closeExportModal() {
        const modal = document.querySelector('.export-modal');
        if (modal) modal.remove();
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
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Khởi tạo
window.xuatDuLieuManager = new XuatDuLieuManager();