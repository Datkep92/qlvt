class DevicesMaintenanceManager {
    constructor(manager) {
        this.manager = manager;
    }

    async loadMaintenanceData(modal) {
        try {
            // Load devices needing maintenance
            const devicesNeedingMaintenance = this.manager.allDevices.filter(device => 
                device.tinh_trang === 'Bảo trì' || device.tinh_trang === 'Hỏng'
            );

            // SỬA LỖI: Sử dụng dbExtended thay vì medicalDB trực tiếp
            const maintenanceRecords = dbExtended ? await dbExtended.getMaintenanceRecords() : [];

            // Render schedule tab
            this.renderMaintenanceSchedule(modal, devicesNeedingMaintenance);
            
            // Render needed tab
            this.renderMaintenanceNeeded(modal, devicesNeedingMaintenance);
            
            // Render history tab
            this.renderMaintenanceHistory(modal, maintenanceRecords);

        } catch (error) {
            console.error('Error loading maintenance data:', error);
            document.getElementById('maintenance-schedule-tab').innerHTML = 
                '<div class="error">❌ Lỗi khi tải dữ liệu bảo trì</div>';
        }
    }

    async markAsFixed(deviceId) {
        try {
            await medicalDB.updateDevice(deviceId, {
                tinh_trang: 'Đang sử dụng',
                ghi_chu: 'Đã sửa chữa - ' + new Date().toLocaleDateString('vi-VN')
            });

            // Add maintenance record - SỬA LỖI: Sử dụng dbExtended
            if (dbExtended) {
                await dbExtended.addMaintenanceRecord({
                    device_id: deviceId,
                    ten_thiet_bi: this.manager.allDevices.find(d => d.id === deviceId)?.ten_thiet_bi,
                    loai_bao_tri: 'Sửa chữa',
                    ngay_bao_tri: new Date().toISOString().split('T')[0],
                    trang_thai: 'Hoàn thành',
                    ghi_chu: 'Đã sửa chữa và đưa vào sử dụng lại'
                });
            }

            await medicalDB.addActivity({
                type: 'maintenance',
                description: `Sửa chữa thiết bị: ${this.manager.allDevices.find(d => d.id === deviceId)?.ten_thiet_bi}`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess('Đã cập nhật trạng thái thiết bị');
            await this.manager.loadDevices();
            this.manager.renderStats();
            
            // Refresh maintenance modal if open
            const modal = document.querySelector('.maintenance-modal');
            if (modal) {
                await this.loadMaintenanceData(modal);
            }

        } catch (error) {
            console.error('Error marking device as fixed:', error);
            this.manager.showError('Lỗi khi cập nhật thiết bị: ' + error.message);
        }
    }

    async scheduleMaintenance(deviceId) {
        const device = this.manager.allDevices.find(d => d.id === deviceId);
        if (!device) return;

        const maintenanceDate = prompt(`Nhập ngày bảo trì cho thiết bị "${device.ten_thiet_bi}" (định dạng YYYY-MM-DD):`, 
            new Date().toISOString().split('T')[0]);

        if (!maintenanceDate) return;

        try {
            // SỬA LỖI: Sử dụng dbExtended
            if (dbExtended) {
                await dbExtended.addMaintenanceRecord({
                    device_id: deviceId,
                    ten_thiet_bi: device.ten_thiet_bi,
                    loai_bao_tri: 'Bảo trì định kỳ',
                    ngay_bao_tri: maintenanceDate,
                    trang_thai: 'Đã lên lịch',
                    ghi_chu: `Lịch bảo trì định kỳ - ${maintenanceDate}`
                });
            }

            await medicalDB.addActivity({
                type: 'maintenance',
                description: `Lên lịch bảo trì cho: ${device.ten_thiet_bi}`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess(`Đã lên lịch bảo trì cho ${device.ten_thiet_bi}`);

        } catch (error) {
            console.error('Error scheduling maintenance:', error);
            this.manager.showError('Lỗi khi lên lịch bảo trì: ' + error.message);
        }
    }

    // ... các method khác giữ nguyên ...


    async showMaintenanceSchedule() {
        const modal = this.createMaintenanceModal();
        document.body.appendChild(modal);
        
        // Load maintenance data
        await this.loadMaintenanceData(modal);
        
        modal.style.display = 'block';
    }

    createMaintenanceModal() {
        const modal = document.createElement('div');
        modal.className = 'modal maintenance-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: none;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; max-height: 90%; margin: 2% auto; background: white; border-radius: 8px; overflow: hidden;">
                <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🛠️ LỊCH BẢO TRÌ THIẾT BỊ</h3>
                    <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    <div class="maintenance-tabs" style="margin-bottom: 20px;">
                        <button class="tab-btn active" onclick="enhancedDevices.maintenanceManager.switchMaintenanceTab('schedule', this)">📅 Lịch Bảo Trì</button>
                        <button class="tab-btn" onclick="enhancedDevices.maintenanceManager.switchMaintenanceTab('needed', this)">🔧 Cần Bảo Trì</button>
                        <button class="tab-btn" onclick="enhancedDevices.maintenanceManager.switchMaintenanceTab('history', this)">📋 Lịch Sử</button>
                    </div>
                    
                    <div id="maintenance-schedule-tab" class="tab-content active">
                        <div class="loading">🔄 Đang tải lịch bảo trì...</div>
                    </div>
                    
                    <div id="maintenance-needed-tab" class="tab-content" style="display: none;">
                        <!-- Thiết bị cần bảo trì sẽ được load here -->
                    </div>
                    
                    <div id="maintenance-history-tab" class="tab-content" style="display: none;">
                        <!-- Lịch sử bảo trì sẽ được load here -->
                    </div>
                </div>
                <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #eee; text-align: right;">
                    <button class="btn-secondary" onclick="enhancedDevices.exportManager.exportMaintenanceSchedule()">📤 Export</button>
                    <button class="btn-primary" onclick="enhancedDevices.maintenanceManager.addMaintenanceRecord()">➕ Thêm Bảo Trì</button>
                    <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()">Đóng</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    renderMaintenanceSchedule(modal, devices) {
        const scheduleTab = modal.querySelector('#maintenance-schedule-tab');
        
        if (devices.length === 0) {
            scheduleTab.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <h3>Không có thiết bị cần bảo trì</h3>
                    <p>Tất cả thiết bị đang trong tình trạng tốt</p>
                </div>
            `;
            return;
        }

        const urgentDevices = devices.filter(device => device.tinh_trang === 'Hỏng');
        const maintenanceDevices = devices.filter(device => device.tinh_trang === 'Bảo trì');

        scheduleTab.innerHTML = `
            <div class="maintenance-overview">
                <div class="maintenance-stats">
                    <div class="stat-card urgent">
                        <div class="stat-icon">🔴</div>
                        <div class="stat-info">
                            <div class="stat-number">${urgentDevices.length}</div>
                            <div class="stat-label">Khẩn cấp (Hỏng)</div>
                        </div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-icon">🟡</div>
                        <div class="stat-info">
                            <div class="stat-number">${maintenanceDevices.length}</div>
                            <div class="stat-label">Cần bảo trì</div>
                        </div>
                    </div>
                </div>

                <div class="maintenance-priority">
                    <h4>🔴 THIẾT BỊ KHẨN CẤP (Cần sửa ngay)</h4>
                    ${urgentDevices.length > 0 ? `
                        <div class="device-list urgent-list">
                            ${urgentDevices.map(device => this.getMaintenanceDeviceHTML(device, true)).join('')}
                        </div>
                    ` : '<p class="no-data">Không có thiết bị khẩn cấp</p>'}

                    <h4>🟡 THIẾT BỊ CẦN BẢO TRÌ</h4>
                    ${maintenanceDevices.length > 0 ? `
                        <div class="device-list maintenance-list">
                            ${maintenanceDevices.map(device => this.getMaintenanceDeviceHTML(device, false)).join('')}
                        </div>
                    ` : '<p class="no-data">Không có thiết bị cần bảo trì</p>'}
                </div>
            </div>
        `;
    }

    getMaintenanceDeviceHTML(device, isUrgent) {
        return `
            <div class="maintenance-device-item ${isUrgent ? 'urgent' : ''}">
                <div class="device-info">
                    <div class="device-name">${this.manager.escapeHtml(device.ten_thiet_bi)}</div>
                    <div class="device-details">
                        <span class="detail">🏥 ${device.phong_ban || 'Chưa gán'}</span>
                        <span class="detail">👤 ${device.nhan_vien_ql || 'Chưa gán'}</span>
                        <span class="detail">💰 ${this.manager.formatCurrency(device.nguyen_gia)}</span>
                    </div>
                    ${device.ghi_chu ? `<div class="device-notes">📝 ${this.manager.escapeHtml(device.ghi_chu)}</div>` : ''}
                </div>
                <div class="maintenance-actions">
                    <button class="btn-action btn-fix" onclick="enhancedDevices.maintenanceManager.markAsFixed(${device.id})" title="Đã sửa xong">
                        ✅
                    </button>
                    <button class="btn-action btn-schedule" onclick="enhancedDevices.maintenanceManager.scheduleMaintenance(${device.id})" title="Lên lịch bảo trì">
                        📅
                    </button>
                    <button class="btn-action btn-details" onclick="enhancedDevices.showDeviceDetails(${device.id})" title="Xem chi tiết">
                        👁️
                    </button>
                </div>
            </div>
        `;
    }

    renderMaintenanceNeeded(modal, devices) {
        const neededTab = modal.querySelector('#maintenance-needed-tab');
        
        neededTab.innerHTML = `
            <div class="maintenance-needed">
                <div class="section-header">
                    <h4>📋 DANH SÁCH THIẾT BỊ CẦN BẢO TRÌ</h4>
                    <button class="btn-primary" onclick="enhancedDevices.maintenanceManager.generateMaintenanceReport()">
                        📊 Báo Cáo
                    </button>
                </div>
                ${devices.length > 0 ? `
                    <div class="maintenance-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tên Thiết Bị</th>
                                    <th>Phòng Ban</th>
                                    <th>Tình Trạng</th>
                                    <th>Nhân Viên QL</th>
                                    <th>Giá Trị</th>
                                    <th>Hành Động</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${devices.map(device => `
                                    <tr>
                                        <td>${this.manager.escapeHtml(device.ten_thiet_bi)}</td>
                                        <td>${device.phong_ban || 'Chưa gán'}</td>
                                        <td><span class="status-badge status-${device.tinh_trang === 'Hỏng' ? 'danger' : 'warning'}">${device.tinh_trang}</span></td>
                                        <td>${device.nhan_vien_ql || 'Chưa gán'}</td>
                                        <td>${this.manager.formatCurrency(device.nguyen_gia)}</td>
                                        <td>
                                            <button class="btn-action" onclick="enhancedDevices.maintenanceManager.markAsFixed(${device.id})">✅ Sửa</button>
                                            <button class="btn-action" onclick="enhancedDevices.showDeviceDetails(${device.id})">👁️ Xem</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">✅</div>
                        <h3>Không có thiết bị cần bảo trì</h3>
                        <p>Tất cả thiết bị đang hoạt động tốt</p>
                    </div>
                `}
            </div>
        `;
    }

    renderMaintenanceHistory(modal, records) {
        const historyTab = modal.querySelector('#maintenance-history-tab');
        
        historyTab.innerHTML = `
            <div class="maintenance-history">
                <div class="section-header">
                    <h4>📋 LỊCH SỬ BẢO TRÌ</h4>
                    <button class="btn-secondary" onclick="enhancedDevices.maintenanceManager.addMaintenanceRecord()">
                        ➕ Thêm Bảo Trì
                    </button>
                </div>
                ${records.length > 0 ? `
                    <div class="history-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ngày</th>
                                    <th>Tên Thiết Bị</th>
                                    <th>Loại Bảo Trì</th>
                                    <th>Chi Phí</th>
                                    <th>Kỹ Thuật Viên</th>
                                    <th>Ghi Chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${records.map(record => `
                                    <tr>
                                        <td>${record.ngay_bao_tri || 'N/A'}</td>
                                        <td>${record.ten_thiet_bi || 'N/A'}</td>
                                        <td>${record.loai_bao_tri || 'Bảo trì định kỳ'}</td>
                                        <td>${record.chi_phi ? this.manager.formatCurrency(record.chi_phi) : '0 ₫'}</td>
                                        <td>${record.ky_thuat_vien || 'N/A'}</td>
                                        <td>${record.ghi_chu || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <h3>Chưa có lịch sử bảo trì</h3>
                        <p>Hãy thêm bản ghi bảo trì đầu tiên</p>
                    </div>
                `}
            </div>
        `;
    }

    switchMaintenanceTab(tabName, button) {
        // Update active tab button
        document.querySelectorAll('.maintenance-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Show selected tab content
        document.querySelectorAll('#maintenance-schedule-tab, #maintenance-needed-tab, #maintenance-history-tab').forEach(tab => {
            tab.style.display = 'none';
        });
        document.getElementById(`maintenance-${tabName}-tab`).style.display = 'block';
    }

    async addMaintenanceRecord() {
        const deviceList = this.manager.allDevices.map(device => 
            `<option value="${device.id}">${device.ten_thiet_bi} - ${device.phong_ban}</option>`
        ).join('');

        const formHTML = `
            <div class="maintenance-form">
                <h4>➕ THÊM BẢN GHI BẢO TRÌ</h4>
                <form id="maintenance-form">
                    <div class="form-group">
                        <label>Thiết bị:</label>
                        <select name="device_id" required>
                            <option value="">Chọn thiết bị</option>
                            ${deviceList}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Ngày bảo trì:</label>
                        <input type="date" name="ngay_bao_tri" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Loại bảo trì:</label>
                        <select name="loai_bao_tri" required>
                            <option value="Bảo trì định kỳ">Bảo trì định kỳ</option>
                            <option value="Sửa chữa">Sửa chữa</option>
                            <option value="Bảo dưỡng">Bảo dưỡng</option>
                            <option value="Kiểm tra">Kiểm tra</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Chi phí (VND):</label>
                        <input type="number" name="chi_phi" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>Kỹ thuật viên:</label>
                        <input type="text" name="ky_thuat_vien" placeholder="Tên kỹ thuật viên">
                    </div>
                    <div class="form-group">
                        <label>Ghi chú:</label>
                        <textarea name="ghi_chu" placeholder="Mô tả công việc bảo trì..."></textarea>
                    </div>
                </form>
            </div>
        `;

        if (confirm(`Thêm bản ghi bảo trì mới?\n\n${formHTML.replace(/<[^>]*>/g, '')}`)) {
            // Trong thực tế, bạn sẽ tạo form modal chi tiết hơn
            this.manager.showNotification('Tính năng thêm bảo trì chi tiết sẽ được phát triển trong phiên bản tới', 'info');
        }
    }

    async generateMaintenanceReport() {
        const devicesNeedingMaintenance = this.manager.allDevices.filter(device => 
            device.tinh_trang === 'Bảo trì' || device.tinh_trang === 'Hỏng'
        );

        if (devicesNeedingMaintenance.length === 0) {
            this.manager.showError('Không có thiết bị cần bảo trì để tạo báo cáo');
            return;
        }

        const reportWindow = window.open('', '_blank');
        const reportDate = new Date().toLocaleDateString('vi-VN');
        
        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Báo Cáo Bảo Trì - ${reportDate}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
                    .device-table { width: 100%; border-collapse: collapse; }
                    .device-table th, .device-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .device-table th { background: #f0f0f0; }
                    .urgent { background: #ffebee; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>BÁO CÁO THIẾT BỊ CẦN BẢO TRÌ</h1>
                    <p>Bệnh viện Tỉnh Ninh Thuận - Khoa Gây mê hồi sức</p>
                    <p>Ngày báo cáo: ${reportDate}</p>
                </div>
                
                <div class="summary">
                    <h3>TỔNG QUAN</h3>
                    <p><strong>Tổng số thiết bị cần bảo trì:</strong> ${devicesNeedingMaintenance.length}</p>
                    <p><strong>Thiết bị khẩn cấp (Hỏng):</strong> ${devicesNeedingMaintenance.filter(d => d.tinh_trang === 'Hỏng').length}</p>
                    <p><strong>Thiết bị cần bảo trì:</strong> ${devicesNeedingMaintenance.filter(d => d.tinh_trang === 'Bảo trì').length}</p>
                </div>

                <h3>DANH SÁCH CHI TIẾT</h3>
                <table class="device-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên Thiết Bị</th>
                            <th>Model</th>
                            <th>Phòng Ban</th>
                            <th>Tình Trạng</th>
                            <th>Nhân Viên QL</th>
                            <th>Giá Trị</th>
                            <th>Ghi Chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devicesNeedingMaintenance.map((device, index) => `
                            <tr class="${device.tinh_trang === 'Hỏng' ? 'urgent' : ''}">
                                <td>${index + 1}</td>
                                <td>${this.manager.escapeHtml(device.ten_thiet_bi)}</td>
                                <td>${device.model || 'N/A'}</td>
                                <td>${device.phong_ban || 'Chưa gán'}</td>
                                <td>${device.tinh_trang}</td>
                                <td>${device.nhan_vien_ql || 'Chưa gán'}</td>
                                <td>${this.manager.formatCurrency(device.nguyen_gia)}</td>
                                <td>${device.ghi_chu || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 30px; font-style: italic;">
                    <p><strong>Khuyến nghị:</strong></p>
                    <ul>
                        <li>Ưu tiên sửa chữa các thiết bị khẩn cấp (đánh dấu màu đỏ)</li>
                        <li>Lên lịch bảo trì định kỳ cho các thiết bị còn lại</li>
                        <li>Theo dõi tiến độ sửa chữa hàng tuần</li>
                    </ul>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);

        await medicalDB.addActivity({
            type: 'report',
            description: `Tạo báo cáo bảo trì ${devicesNeedingMaintenance.length} thiết bị`,
            user: 'Quản trị viên'
        });

        this.manager.showSuccess(`Đã tạo báo cáo bảo trì ${devicesNeedingMaintenance.length} thiết bị`);
    }
}