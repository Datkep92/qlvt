// baotri.js - Quản lý bảo trì
class BaoTriManager {
    constructor() {
        this.moduleName = "BaoTriManager";
        this.init();
    }
    
    init() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('ui:showMaintenance', () => this.showMaintenance());
        AppEvents.on('maintenance:markFixed', (deviceId) => this.markAsFixed(deviceId));
        AppEvents.on('maintenance:schedule', (deviceId) => this.scheduleMaintenance(deviceId));
    }
    
    setup() {
        console.log('✅ BaoTriManager ready');
    }
    
    async showMaintenance() {
        try {
            const devices = await medicalDB.getAllDevices();
            const maintenanceDevices = devices.filter(device => 
                device.tinh_trang === 'Bảo trì' || device.tinh_trang === 'Hỏng'
            );
            
            this.renderMaintenanceModal(maintenanceDevices);
            
        } catch (error) {
            console.error('Error loading maintenance data:', error);
            AppEvents.emit('notification:show', {
                message: 'Lỗi khi tải dữ liệu bảo trì',
                type: 'error'
            });
        }
    }
    
    renderMaintenanceModal(devices) {
        const modal = this.createModal('maintenance-modal');
        modal.innerHTML = this.getMaintenanceHTML(devices);
        document.body.appendChild(modal);
    }
    
    getMaintenanceHTML(devices) {
        const urgentDevices = devices.filter(d => d.tinh_trang === 'Hỏng');
        const maintenanceDevices = devices.filter(d => d.tinh_trang === 'Bảo trì');
        
        return `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>🛠️ QUẢN LÝ BẢO TRÌ</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="maintenance-stats">
                        <div class="stat-card urgent">
                            <div class="stat-number">${urgentDevices.length}</div>
                            <div class="stat-label">Thiết bị hỏng</div>
                        </div>
                        <div class="stat-card warning">
                            <div class="stat-number">${maintenanceDevices.length}</div>
                            <div class="stat-label">Cần bảo trì</div>
                        </div>
                    </div>
                    
                    ${urgentDevices.length > 0 ? `
                        <div class="maintenance-section">
                            <h4>🔴 THIẾT BỊ HỎNG (Khẩn cấp)</h4>
                            <div class="device-list">
                                ${urgentDevices.map(device => this.getMaintenanceDeviceHTML(device, true)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${maintenanceDevices.length > 0 ? `
                        <div class="maintenance-section">
                            <h4>🟡 THIẾT BỊ CẦN BẢO TRÌ</h4>
                            <div class="device-list">
                                ${maintenanceDevices.map(device => this.getMaintenanceDeviceHTML(device, false)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${devices.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">✅</div>
                            <h3>Không có thiết bị cần bảo trì</h3>
                            <p>Tất cả thiết bị đang hoạt động tốt</p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Đóng</button>
                    <button class="btn-primary" onclick="AppEvents.emit('export:maintenance')">📤 Export Báo cáo</button>
                </div>
            </div>
        `;
    }
    
    getMaintenanceDeviceHTML(device, isUrgent) {
        return `
            <div class="maintenance-device ${isUrgent ? 'urgent' : ''}">
                <div class="device-info">
                    <div class="device-name">${this.escapeHtml(device.ten_thiet_bi)}</div>
                    <div class="device-details">
                        <span class="detail">🏥 ${device.phong_ban || 'Chưa gán'}</span>
                        <span class="detail">👤 ${device.nhan_vien_ql || 'Chưa gán'}</span>
                        <span class="detail">💰 ${this.formatCurrency(device.nguyen_gia)}</span>
                    </div>
                    ${device.ghi_chu ? `<div class="device-notes">📝 ${this.escapeHtml(device.ghi_chu)}</div>` : ''}
                </div>
                <div class="maintenance-actions">
                    <button class="btn-action" onclick="AppEvents.emit('maintenance:markFixed', ${device.id})" title="Đã sửa xong">
                        ✅
                    </button>
                    <button class="btn-action" onclick="AppEvents.emit('maintenance:schedule', ${device.id})" title="Lên lịch bảo trì">
                        📅
                    </button>
                    <button class="btn-action" onclick="AppEvents.emit('ui:showDeviceDetails', ${device.id})" title="Xem chi tiết">
                        👁️
                    </button>
                </div>
            </div>
        `;
    }
    
    async markAsFixed(deviceId) {
        try {
            await medicalDB.updateDevice(deviceId, {
                tinh_trang: 'Đang sử dụng',
                ghi_chu: 'Đã sửa chữa - ' + new Date().toLocaleDateString('vi-VN')
            });
            
            await medicalDB.addActivity({
                type: 'maintenance',
                description: `Sửa chữa thiết bị ID: ${deviceId}`,
                user: 'Quản trị viên'
            });
            
            AppEvents.emit('notification:show', {
                message: 'Đã cập nhật trạng thái thiết bị',
                type: 'success'
            });
            
            AppEvents.emit('data:refresh');
            this.closeMaintenanceModal();
            
        } catch (error) {
            console.error('Error marking device as fixed:', error);
            AppEvents.emit('notification:show', {
                message: 'Lỗi khi cập nhật thiết bị',
                type: 'error'
            });
        }
    }
    
    async scheduleMaintenance(deviceId) {
        const maintenanceDate = prompt('Nhập ngày bảo trì (YYYY-MM-DD):', 
            new Date().toISOString().split('T')[0]);
            
        if (!maintenanceDate) return;
        
        AppEvents.emit('notification:show', {
            message: `Đã lên lịch bảo trì cho ngày ${maintenanceDate}`,
            type: 'success'
        });
    }
    
    closeMaintenanceModal() {
        const modal = document.querySelector('.maintenance-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    createModal(className) {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            align-items: center; justify-content: center;
        `;
        return modal;
    }
    
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    formatCurrency(amount) {
        if (!amount) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }
}

new BaoTriManager();