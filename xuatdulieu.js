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
    
createDeviceURL(device) {
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
        note: device.ghi_chu || '',
        serial: device.serial_number || '',
        unit: device.don_vi_tinh || 'cái',
        manager: device.nhan_vien_ql || '',
        timestamp: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(deviceInfo);
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    
    // URL GitHub Pages của bạn
    return `https://datkep92.github.io/qlvt/qr-display.html#${base64Data}`;
}

// TẠO TRANG HIỂN THỊ THÔNG TIN KHI QUÉT QR (trang riêng)
generateQRInfoPage(qrResults) {
    // Đầu tiên, tạo file qr-display.html
    this.createQRDisplayHTML();
    
    // Sau đó tạo trang in QR
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>QR Code Thiết Bị - Bệnh viện Ninh Thuận</title>
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
                .qr-url {
                    font-size: 10px;
                    color: #888;
                    word-break: break-all;
                    margin-top: 5px;
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
                
                @media print {
                    .controls { display: none; }
                    body { background: white; }
                    .container { box-shadow: none; }
                }
                @media (max-width: 768px) {
                    .qr-grid { grid-template-columns: repeat(2, 1fr); }
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
                        <li>Quét QR Code bằng camera điện thoại</li>
                        <li>QR Code sẽ mở trang thông tin chi tiết thiết bị</li>
                        <li>In và dán QR lên thiết bị để quản lý</li>
                        <li>URL trong QR: ${window.location.origin}/qr-display.html</li>
                    </ul>
                </div>
                
                <div class="controls">
                    <button class="btn btn-print" onclick="window.print()">🖨️ In Trang</button>
                    <button class="btn btn-save" onclick="saveAllQR()">💾 Tải QR Code</button>
                </div>
                
                <div class="qr-grid">
                    ${qrResults.map(item => {
                        const device = item.device;
                        const shortName = this.shortenText(device.ten_thiet_bi, 25);
                        const qrUrl = this.createDeviceURL(device);
                        
                        return `
                            <div class="qr-item">
                                <img src="${item.data}" alt="QR ${device.id}" class="qr-img">
                                <div class="qr-text">
                                    <div class="device-name">${this.escapeHtml(shortName)}</div>
                                    <div class="device-info">ID: ${device.id}</div>
                                    <div class="device-info">Model: ${this.escapeHtml(device.model || 'N/A')}</div>
                                    <div class="device-info">SL: ${device.so_luong} ${device.don_vi_tinh || 'cái'}</div>
                                    <div class="device-info">${device.phong_ban ? this.escapeHtml(device.phong_ban) : ''}</div>
                                    <div class="qr-url" title="${qrUrl}">📱 Quét để xem chi tiết</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #777;">
                    <p>© ${new Date().getFullYear()} - Hệ thống Quản lý Thiết bị Y tế | Quét QR để truy xuất thông tin</p>
                </div>
            </div>
            
            <script>
                // Lưu tất cả QR Code
                function saveAllQR() {
                    const qrData = ${JSON.stringify(qrResults.map(r => ({ id: r.id, data: r.data, name: r.device.ten_thiet_bi })))};
                    
                    if (!confirm('Lưu tất cả QR Code (${qrResults.length} file)?')) return;
                    
                    let savedCount = 0;
                    qrData.forEach((item, index) => {
                        setTimeout(() => {
                            try {
                                const link = document.createElement('a');
                                const safeName = (item.name || 'device').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                                link.download = 'QR_' + item.id + '_' + safeName + '.png';
                                link.href = item.data;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                savedCount++;
                                
                                if (savedCount === qrData.length) {
                                    alert('✅ Đã lưu ' + savedCount + ' QR Code');
                                }
                            } catch (error) {
                                console.log('Error saving QR', error);
                            }
                        }, index * 300);
                    });
                }
                
                // Tự động hỏi in nếu ít thiết bị
                if (${qrResults.length} <= 12) {
                    setTimeout(() => {
                        if (confirm('Bạn có muốn in QR Code ngay?')) {
                            window.print();
                        }
                    }, 1000);
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

// TẠO FILE qr-display.html RIÊNG
createQRDisplayHTML() {
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông Tin Thiết Bị Y Tế - Bệnh viện Ninh Thuận</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            text-align: center;
            position: relative;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .hospital-logo {
            position: absolute;
            top: 20px;
            left: 25px;
            font-size: 30px;
        }
        
        .content {
            padding: 30px;
        }
        
        .device-info-section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #eaeaea;
            display: flex;
            align-items: center;
        }
        
        .section-title i {
            margin-right: 10px;
            font-size: 20px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            margin-bottom: 12px;
        }
        
        .info-label {
            font-weight: 600;
            color: #555;
            font-size: 14px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
        }
        
        .info-label i {
            margin-right: 8px;
            width: 20px;
            text-align: center;
        }
        
        .info-value {
            font-size: 15px;
            color: #333;
            padding-left: 28px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-using {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-maintenance {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-broken {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-inactive {
            background-color: #e2e3e5;
            color: #383d41;
        }
        
        .price-value {
            color: #e74c3c;
            font-weight: bold;
            font-size: 16px;
        }
        
        .note-box {
            background-color: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            border-top: 1px solid #eaeaea;
            color: #666;
            font-size: 13px;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            font-size: 16px;
            color: #666;
        }
        
        .error {
            text-align: center;
            padding: 50px;
            color: #e74c3c;
        }
        
        .error i {
            font-size: 40px;
            margin-bottom: 15px;
        }
        
        .btn-back {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background-color 0.3s;
        }
        
        .btn-back:hover {
            background-color: #2980b9;
        }
        
        .qr-reminder {
            text-align: center;
            padding: 15px;
            background-color: #e8f4ff;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 10px;
            }
            
            .content {
                padding: 20px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 20px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .header {
                padding: 20px 15px;
            }
            
            .content {
                padding: 15px;
            }
            
            .hospital-logo {
                position: relative;
                top: 0;
                left: 0;
                margin-bottom: 10px;
            }
        }
        
        /* Animation for loading */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="hospital-logo">🏥</div>
            <h1>BỆNH VIỆN NINH THUẬN</h1>
            <div class="subtitle">Hệ thống Quản lý Thiết bị Y tế</div>
        </div>
        
        <div class="content">
            <div id="loading" class="loading">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Đang tải thông tin thiết bị...</p>
            </div>
            
            <div id="error" class="error" style="display: none;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không tìm thấy thông tin thiết bị</h3>
                <p>QR Code không hợp lệ hoặc đã hết hạn</p>
                <a href="javascript:history.back()" class="btn-back">
                    <i class="fas fa-arrow-left"></i> Quay lại
                </a>
            </div>
            
            <div id="device-info" style="display: none;">
                <!-- Device information will be inserted here by JavaScript -->
            </div>
            
            <div class="qr-reminder">
                <i class="fas fa-qrcode"></i>
                <strong>Thông tin được truy xuất từ QR Code</strong>
                <p>Quét QR Code trên thiết bị để xem thông tin cập nhật mới nhất</p>
            </div>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} - Bệnh viện Ninh Thuận</p>
            <p>Liên hệ: Phòng Công nghệ thông tin - ĐT: 0259.3xxxxxx</p>
            <p>Thông tin chỉ dùng cho mục đích quản lý nội bộ</p>
        </div>
    </div>

    <script>
        // Function to get URL parameter
        function getUrlParameter(name) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        }
        
        // Function to decode base64
        function decodeBase64(str) {
            try {
                return decodeURIComponent(escape(atob(str)));
            } catch (e) {
                console.error('Decode error:', e);
                return null;
            }
        }
        
        // Function to format currency
        function formatCurrency(amount) {
            if (!amount) return '0 ₫';
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        }
        
        // Function to get status class
        function getStatusClass(status) {
            const statusMap = {
                'Đang sử dụng': 'status-using',
                'Bảo trì': 'status-maintenance',
                'Hỏng': 'status-broken',
                'Ngừng sử dụng': 'status-inactive',
                'Mới': 'status-using',
                'Cũ': 'status-maintenance'
            };
            return statusMap[status] || 'status-inactive';
        }
        
        // Function to escape HTML
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Main function to load device info
        async function loadDeviceInfo() {
            const loadingEl = document.getElementById('loading');
            const errorEl = document.getElementById('error');
            const deviceInfoEl = document.getElementById('device-info');
            
            // Get device data from URL
            const encodedData = getUrlParameter('device');
            
            if (!encodedData) {
                loadingEl.style.display = 'none';
                errorEl.style.display = 'block';
                return;
            }
            
            try {
                // Decode the data
                const jsonStr = decodeBase64(encodedData);
                if (!jsonStr) throw new Error('Invalid data');
                
                const device = JSON.parse(jsonStr);
                
                // Calculate total value
                const totalValue = (device.price || 0) * (device.quantity || 1);
                
                // Create HTML for device info
                const html = \`
                    <div class="device-info-section fade-in">
                        <h2 class="section-title">
                            <i class="fas fa-microscope"></i> THÔNG TIN THIẾT BỊ
                        </h2>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-tag"></i> Tên thiết bị:
                                </div>
                                <div class="info-value" style="font-size: 18px; font-weight: bold; color: #2c3e50;">
                                    \${escapeHtml(device.name)}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-barcode"></i> Mã thiết bị:
                                </div>
                                <div class="info-value">
                                    #\${device.id}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-cube"></i> Model:
                                </div>
                                <div class="info-value">
                                    \${escapeHtml(device.model) || 'Không có thông tin'}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-industry"></i> Nhà sản xuất:
                                </div>
                                <div class="info-value">
                                    \${escapeHtml(device.manufacturer) || 'Không có thông tin'}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-calendar-alt"></i> Năm sản xuất:
                                </div>
                                <div class="info-value">
                                    \${device.year || 'Không có thông tin'}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-boxes"></i> Số lượng:
                                </div>
                                <div class="info-value">
                                    \${device.quantity} \${device.unit || 'cái'}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-money-bill-wave"></i> Đơn giá:
                                </div>
                                <div class="info-value price-value">
                                    \${formatCurrency(device.price)}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-calculator"></i> Thành tiền:
                                </div>
                                <div class="info-value price-value">
                                    \${formatCurrency(totalValue)}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-check-circle"></i> Tình trạng:
                                </div>
                                <div class="info-value">
                                    <span class="status-badge \${getStatusClass(device.status)}">
                                        \${device.status}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-building"></i> Phòng ban:
                                </div>
                                <div class="info-value">
                                    \${escapeHtml(device.department) || 'Chưa phân bổ'}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-user-tie"></i> Nhân viên QL:
                                </div>
                                <div class="info-value">
                                    \${escapeHtml(device.manager) || 'Chưa phân công'}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-layer-group"></i> Phân loại:
                                </div>
                                <div class="info-value">
                                    \${escapeHtml(device.category) || 'Chưa phân loại'}
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">
                                    <i class="fas fa-hashtag"></i> Serial Number:
                                </div>
                                <div class="info-value">
                                    \${escapeHtml(device.serial) || 'Không có'}
                                </div>
                            </div>
                        </div>
                        
                        \${device.note ? \`
                            <div class="note-box">
                                <div class="info-label">
                                    <i class="fas fa-sticky-note"></i> Ghi chú:
                                </div>
                                <div class="info-value">
                                    \${escapeHtml(device.note)}
                                </div>
                            </div>
                        \` : ''}
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="javascript:window.print()" class="btn-back" style="margin-right: 10px;">
                            <i class="fas fa-print"></i> In thông tin
                        </a>
                        <a href="javascript:history.back()" class="btn-back">
                            <i class="fas fa-arrow-left"></i> Quay lại
                        </a>
                    </div>
                \`;
                
                // Hide loading, show device info
                loadingEl.style.display = 'none';
                deviceInfoEl.innerHTML = html;
                deviceInfoEl.style.display = 'block';
                
                // Update page title
                document.title = \`Thiết bị: \${escapeHtml(device.name)} - Bệnh viện Ninh Thuận\`;
                
            } catch (error) {
                console.error('Error loading device:', error);
                loadingEl.style.display = 'none';
                errorEl.style.display = 'block';
            }
        }
        
        // Load device info when page loads
        document.addEventListener('DOMContentLoaded', loadDeviceInfo);
        
        // Add service worker for offline capability (optional)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./qr-display-sw.js')
                    .catch(err => console.log('ServiceWorker registration failed: ', err));
            });
        }
    </script>
</body>
</html>`;
    
    // Tạo một Blob và download file qr-display.html
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Tạo link download (cho phép lưu file)
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr-display.html';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Cũng có thể tạo file ngay trong hệ thống
    console.log('✅ Đã tạo file qr-display.html');
    console.log('Lưu ý: Đặt file qr-display.html cùng thư mục với ứng dụng');
    
    return url;
}

// ... (phần còn lại của class giữ nguyên) ...
    
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
