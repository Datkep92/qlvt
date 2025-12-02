// xuatdulieu.js - PHIÊN BẢN HOÀN CHỈNH
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
        // Kiểm tra database
        if (!window.medicalDB) {
            console.warn('⚠️ medicalDB chưa được khởi tạo');
        }
    }
    
    // ==================== EXPORT EXCEL ====================
    async exportToExcel() {
        try {
            this.showLoading('Đang xuất Excel...');
            
            // Lấy dữ liệu từ database
            const devices = await this.getAllDevices();
            
            if (!devices || devices.length === 0) {
                this.hideLoading();
                AppEvents.emit('notification:show', {
                    message: 'Không có dữ liệu để xuất',
                    type: 'warning'
                });
                return;
            }
            
            // Tạo workbook
            const wb = XLSX.utils.book_new();
            const wsData = [
                // Header
                ['STT', 'Mã TB', 'Tên thiết bị', 'Model', 'NSX', 'Năm SX', 
                 'Số lượng', 'Đơn vị', 'Nguyên giá', 'Thành tiền', 
                 'Tình trạng', 'Phòng ban', 'NV QL', 'Phân loại', 'Serial', 'Ghi chú'],
                // Data
                ...devices.map((device, index) => [
                    index + 1,
                    device.id || '',
                    device.ten_thiet_bi || '',
                    device.model || '',
                    device.nha_san_xuat || '',
                    device.nam_san_xuat || '',
                    device.so_luong || 0,
                    device.don_vi_tinh || 'cái',
                    device.nguyen_gia || 0,
                    (device.nguyen_gia || 0) * (device.so_luong || 1),
                    device.tinh_trang || '',
                    device.phong_ban || '',
                    device.nhan_vien_ql || '',
                    device.phan_loai || '',
                    device.serial_number || '',
                    device.ghi_chu || ''
                ])
            ];
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Định dạng cột
            const wscols = [
                {wch: 5},   // STT
                {wch: 10},  // Mã TB
                {wch: 30},  // Tên
                {wch: 15},  // Model
                {wch: 20},  // NSX
                {wch: 8},   // Năm
                {wch: 8},   // SL
                {wch: 8},   // ĐVT
                {wch: 15},  // Giá
                {wch: 15},  // Thành tiền
                {wch: 12},  // Tình trạng
                {wch: 20},  // Phòng ban
                {wch: 15},  // NV QL
                {wch: 15},  // Phân loại
                {wch: 15},  // Serial
                {wch: 30}   // Ghi chú
            ];
            ws['!cols'] = wscols;
            
            XLSX.utils.book_append_sheet(wb, ws, "ThietBiYTe");
            
            // Xuất file
            const fileName = `ThietBiYTe_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            // Log activity
            await this.logActivity(`Xuất Excel ${devices.length} thiết bị`);
            
            this.hideLoading();
            AppEvents.emit('notification:show', {
                message: `✅ Đã xuất ${devices.length} thiết bị ra Excel`,
                type: 'success'
            });
            
        } catch (error) {
            console.error('Export Excel error:', error);
            this.hideLoading();
            AppEvents.emit('notification:show', {
                message: '❌ Lỗi xuất Excel: ' + error.message,
                type: 'error'
            });
        }
    }
    
    // ==================== EXPORT BẢO TRÌ ====================
    async exportMaintenance() {
        try {
            this.showLoading('Đang lọc thiết bị cần bảo trì...');
            
            const devices = await this.getAllDevices();
            const maintenanceDevices = devices.filter(device => 
                device.tinh_trang?.includes('Bảo trì') || 
                device.tinh_trang?.includes('Sửa chữa') ||
                device.ghi_chu?.toLowerCase().includes('bảo trì')
            );
            
            if (maintenanceDevices.length === 0) {
                this.hideLoading();
                AppEvents.emit('notification:show', {
                    message: 'Không có thiết bị cần bảo trì',
                    type: 'info'
                });
                return;
            }
            
            // Tạo file Excel
            const wb = XLSX.utils.book_new();
            const wsData = [
                ['DANH SÁCH THIẾT BỊ CẦN BẢO TRÌ'],
                ['Ngày xuất:', new Date().toLocaleDateString('vi-VN')],
                ['Tổng số:', maintenanceDevices.length],
                [], // Dòng trống
                ['STT', 'Mã TB', 'Tên thiết bị', 'Model', 'Phòng ban', 
                 'Tình trạng', 'Nguyên nhân', 'Ưu tiên', 'Ngày báo', 'Người báo']
            ];
            
            // Thêm dữ liệu
            maintenanceDevices.forEach((device, index) => {
                wsData.push([
                    index + 1,
                    device.id,
                    device.ten_thiet_bi,
                    device.model || '',
                    device.phong_ban || '',
                    device.tinh_trang || '',
                    this.extractMaintenanceReason(device.ghi_chu),
                    this.getPriority(device.tinh_trang),
                    new Date().toLocaleDateString('vi-VN'),
                    device.nhan_vien_ql || 'Hệ thống'
                ]);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Merge title rows
            ws['!merges'] = [
                XLSX.utils.decode_range("A1:J1"),
                XLSX.utils.decode_range("A2:J2"),
                XLSX.utils.decode_range("A3:J3")
            ];
            
            XLSX.utils.book_append_sheet(wb, ws, "BaoTri");
            XLSX.writeFile(wb, `BaoTri_ThietBi_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            await this.logActivity(`Xuất báo cáo bảo trì ${maintenanceDevices.length} thiết bị`);
            
            this.hideLoading();
            AppEvents.emit('notification:show', {
                message: `✅ Đã xuất ${maintenanceDevices.length} thiết bị cần bảo trì`,
                type: 'success'
            });
            
        } catch (error) {
            console.error('Export maintenance error:', error);
            this.hideLoading();
            AppEvents.emit('notification:show', {
                message: '❌ Lỗi xuất báo cáo',
                type: 'error'
            });
        }
    }
    
    extractMaintenanceReason(ghiChu) {
        if (!ghiChu) return 'Không có thông tin';
        const lower = ghiChu.toLowerCase();
        if (lower.includes('hỏng')) return 'Hỏng hóc';
        if (lower.includes('lỗi')) return 'Lỗi kỹ thuật';
        if (lower.includes('mòn')) return 'Hao mòn tự nhiên';
        if (lower.includes('định kỳ')) return 'Bảo trì định kỳ';
        return 'Khác';
    }
    
    getPriority(status) {
        if (!status) return 'Trung bình';
        if (status.includes('Khẩn')) return 'Cao';
        if (status.includes('Nguy hiểm')) return 'Rất cao';
        return 'Trung bình';
    }
    
    // ==================== QR CODE SYSTEM ====================
    createDeviceURL(device) {
        const qrData = {
            id: device.id,
            n: this.escapeForURL(device.ten_thiet_bi || ''),
            m: this.escapeForURL(device.model || ''),
            sx: this.escapeForURL(device.nha_san_xuat || ''),
            y: device.nam_san_xuat || '',
            q: device.so_luong || 1,
            p: device.nguyen_gia || 0,
            s: this.escapeForURL(device.tinh_trang || 'Đang sử dụng'),
            pb: this.escapeForURL(device.phong_ban || ''),
            pl: this.escapeForURL(device.phan_loai || ''),
            dv: this.escapeForURL(device.don_vi_tinh || 'cái'),
            nv: this.escapeForURL(device.nhan_vien_ql || ''),
            sn: device.serial_number || '',
            gc: this.escapeForURL((device.ghi_chu || '').substring(0, 200)),
            t: Date.now()
        };
        
        const queryString = Object.entries(qrData)
            .filter(([_, value]) => value !== '')
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        // Dùng relative URL để hoạt động mọi nơi
        return `qr-display.html?${queryString}`;
    }
    
    escapeForURL(text) {
        if (!text) return '';
        return encodeURIComponent(String(text))
            .replace(/'/g, "%27")
            .replace(/"/g, "%22")
            .replace(/\s/g, '+');
    }
    
    async generateQRWithSelected() {
        const checkboxes = document.querySelectorAll('.qr-selection-modal .device-checkbox-input:checked');
        
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
                console.error('Error parsing device:', e);
            }
        });
        
        // Đóng modal
        const modal = document.querySelector('.qr-selection-modal');
        if (modal) modal.remove();
        
        // Tạo QR
        this.generateDetailedQR(selectedDevices);
    }
    
    async generateDetailedQR(devices) {
        if (devices.length === 0) return;
        
        this.showLoading(`Đang tạo ${devices.length} QR Code...`);
        
        const qrResults = [];
        for (const device of devices) {
            try {
                const qrData = await this.createSingleQR(device);
                qrResults.push({
                    id: device.id,
                    data: qrData,
                    device: device
                });
            } catch (error) {
                console.log('QR error for', device.id);
            }
        }
        
        this.generateQRPrintPage(qrResults);
        this.hideLoading();
        
        AppEvents.emit('notification:show', {
            message: `✅ Đã tạo ${qrResults.length} QR Code`,
            type: 'success'
        });
    }
    
    createSingleQR(device) {
        return new Promise((resolve) => {
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
            document.body.appendChild(tempDiv);
            
            const qrText = this.createDeviceURL(device);
            
            new QRCode(tempDiv, {
                text: qrText,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.Q
            });
            
            setTimeout(() => {
                const canvas = tempDiv.querySelector('canvas');
                if (canvas) {
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    resolve(this.createPlaceholderQR(device));
                }
                document.body.removeChild(tempDiv);
            }, 150);
        });
    }
    
    createPlaceholderQR(device) {
        const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="#f5f5f5"/>
            <rect x="10" y="10" width="180" height="180" fill="white" stroke="#ccc" stroke-width="1"/>
            <text x="100" y="80" text-anchor="middle" font-family="Arial" font-size="12" fill="#333">
                ${(device.ten_thiet_bi || 'TB').substring(0, 15)}
            </text>
            <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">
                ID: ${device.id}
            </text>
            <text x="100" y="130" text-anchor="middle" font-family="Arial" font-size="9" fill="#999">
                Quét để xem chi tiết
            </text>
        </svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    
    generateQRPrintPage(qrResults) {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>QR Code Thiết Bị</title>
            <style>
                @page { margin: 0.5cm; }
                body { font-family: Arial; margin: 0; padding: 10px; }
                .page { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    page-break-after: always;
                }
                @media print {
                    .page { grid-template-columns: repeat(4, 1fr); }
                }
                .qr-item { 
                    text-align: center; 
                    padding: 10px; 
                    border: 1px solid #ddd;
                    page-break-inside: avoid;
                }
                .qr-img { width: 120px; height: 120px; }
                .qr-info { font-size: 11px; margin-top: 5px; }
                .device-name { font-weight: bold; }
                .device-id { color: #666; font-size: 10px; }
                .header { 
                    text-align: center; 
                    margin-bottom: 20px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                }
                .no-print { display: none; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>QR CODE THIẾT BỊ Y TẾ</h2>
                <p>Bệnh viện Ninh Thuận | ${qrResults.length} thiết bị | ${new Date().toLocaleDateString('vi-VN')}</p>
            </div>
            
            <div class="page">
                ${qrResults.map(item => `
                    <div class="qr-item">
                        <img src="${item.data}" class="qr-img">
                        <div class="qr-info">
                            <div class="device-name">${this.escapeHtml(item.device.ten_thiet_bi.substring(0, 25))}</div>
                            <div class="device-id">ID: ${item.device.id}</div>
                            <div>${item.device.phong_ban || ''}</div>
                            <div style="font-size: 9px; color: #777;">${new Date().toLocaleDateString('vi-VN')}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()">🖨️ In trang</button>
                <button onclick="window.close()">✖️ Đóng</button>
            </div>
        </body>
        </html>`;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
    }
    
    // ==================== HELPER FUNCTIONS ====================
    async getAllDevices() {
        // Kiểm tra nhiều nguồn database
        if (window.medicalDB && typeof medicalDB.getAllDevices === 'function') {
            return await medicalDB.getAllDevices();
        }
        
        if (window.deviceManager && typeof deviceManager.getAllDevices === 'function') {
            return deviceManager.getAllDevices();
        }
        
        // Fallback: lấy từ localStorage
        try {
            const stored = localStorage.getItem('medical_devices');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }
    
    async logActivity(description) {
        const activity = {
            type: 'export',
            description: description,
            timestamp: new Date().toISOString(),
            user: 'Hệ thống'
        };
        
        // Lưu vào database nếu có
        if (window.medicalDB && medicalDB.addActivity) {
            await medicalDB.addActivity(activity);
        }
        
        // Lưu vào localStorage
        try {
            const activities = JSON.parse(localStorage.getItem('activities') || '[]');
            activities.push(activity);
            localStorage.setItem('activities', JSON.stringify(activities.slice(-100)));
        } catch (e) {
            console.log('Log activity error:', e);
        }
    }
    
    showExportOptions() {
        const modal = this.createModal('export-modal');
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
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
                                <p>Xuất thiết bị cần bảo trì/sửa chữa</p>
                            </div>
                        </div>
                        
                        <div class="export-option" onclick="window.xuatDuLieuManager.showQRSelectionModal()">
                            <div class="export-icon">📱</div>
                            <div class="export-info">
                                <h4>QR Code</h4>
                                <p>Tạo QR Code cho thiết bị đã chọn</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    async showQRSelectionModal() {
        try {
            this.showLoading('Đang tải danh sách...');
            const devices = await this.getAllDevices();
            
            if (devices.length === 0) {
                this.hideLoading();
                AppEvents.emit('notification:show', {
                    message: 'Không có thiết bị',
                    type: 'warning'
                });
                return;
            }
            
            const modal = this.createModal('qr-selection-modal');
            modal.innerHTML = this.getQRSelectionHTML(devices);
            document.body.appendChild(modal);
            
            this.hideLoading();
            
            // Bind events
            setTimeout(() => {
                modal.querySelector('#select-all-devices')?.addEventListener('change', (e) => {
                    this.toggleSelectAll(e.target.checked);
                });
                
                modal.querySelectorAll('.device-checkbox-input').forEach(cb => {
                    cb.addEventListener('change', () => this.updateSelectionCount());
                });
                
                modal.querySelector('#generate-qr-btn')?.addEventListener('click', () => {
                    this.generateQRWithSelected();
                });
            }, 100);
            
        } catch (error) {
            console.error('Error:', error);
            this.hideLoading();
            AppEvents.emit('notification:show', {
                message: 'Lỗi tải dữ liệu',
                type: 'error'
            });
        }
    }
    
    getQRSelectionHTML(devices) {
        const groups = this.groupByDepartment(devices);
        
        return `
            <div class="modal-content" style="max-width: 700px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>📱 CHỌN THIẾT BỊ TẠO QR</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 15px;">
                        <input type="checkbox" id="select-all-devices">
                        <label for="select-all-devices" style="margin-left: 5px;">
                            Chọn tất cả (${devices.length})
                        </label>
                        <div id="selected-count" style="float: right; background: #e3f2fd; padding: 5px 10px; border-radius: 4px;">
                            Đã chọn: 0
                        </div>
                    </div>
                    
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${Object.entries(groups).map(([dept, deptDevices]) => `
                            <div class="department-section">
                                <div style="background: #f5f5f5; padding: 8px; font-weight: bold; margin: 10px 0;">
                                    ${this.escapeHtml(dept)} (${deptDevices.length})
                                </div>
                                ${deptDevices.map(device => `
                                    <div style="padding: 5px 0 5px 20px;">
                                        <input type="checkbox" 
                                               class="device-checkbox-input"
                                               id="dev-${device.id}"
                                               data-device='${JSON.stringify(device)}'>
                                        <label for="dev-${device.id}" style="margin-left: 5px; cursor: pointer;">
                                            <strong>${this.escapeHtml(device.ten_thiet_bi)}</strong>
                                            <span style="color: #666; font-size: 12px; margin-left: 10px;">
                                                ${device.model || ''} | SL: ${device.so_luong}
                                            </span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Hủy</button>
                    <button class="btn-primary" id="generate-qr-btn" disabled>
                        📱 Tạo QR Code
                    </button>
                </div>
            </div>
        `;
    }
    
    toggleSelectAll(checked) {
        document.querySelectorAll('.qr-selection-modal .device-checkbox-input')
            .forEach(cb => cb.checked = checked);
        this.updateSelectionCount();
    }
    
    updateSelectionCount() {
        const checkboxes = document.querySelectorAll('.qr-selection-modal .device-checkbox-input:checked');
        const count = checkboxes.length;
        const countEl = document.getElementById('selected-count');
        const btn = document.getElementById('generate-qr-btn');
        
        if (countEl) countEl.textContent = `Đã chọn: ${count}`;
        if (btn) btn.disabled = count === 0;
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
    
    showLoading(message) {
        let loading = document.getElementById('global-loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'global-loading';
            loading.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
            `;
            document.body.appendChild(loading);
        }
        loading.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <div style="font-size: 30px;">⏳</div>
                <div style="font-weight: bold; margin-top: 10px;">${message}</div>
            </div>
        `;
    }
    
    hideLoading() {
        const loading = document.getElementById('global-loading');
        if (loading) loading.remove();
    }
    
    createModal(className) {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
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
