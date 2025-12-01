// history.js - Phiên bản lấy lịch sử từ IndexedDB
class HistoryManager {
    constructor() {
        this.moduleName = "HistoryManager";
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Đợi medicalDB khởi tạo
            await this.waitForMedicalDB();
            this.db = medicalDB; // Gán reference
            console.log('✅ HistoryManager ready');
            
            // Lắng nghe sự kiện
            this.setupEventListeners();
        } catch (error) {
            console.error('HistoryManager initialization failed:', error);
            // Vẫn khởi tạo để retry sau
            this.retryInit();
        }
    }

    async waitForMedicalDB() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 50 lần * 100ms = 5 giây
            const interval = 100;

            const check = () => {
                attempts++;
                
                // Kiểm tra cả window.medicalDB và medicalDB toàn cục
                const dbInstance = window.medicalDB || medicalDB;
                
                if (dbInstance && dbInstance.initialized) {
                    console.log(`✅ MedicalDB available after ${attempts} attempts`);
                    clearInterval(intervalId);
                    resolve(dbInstance);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    reject(new Error('MedicalDB not available after timeout'));
                    return;
                }
            };

            const intervalId = setInterval(check, interval);
            check(); // Kiểm tra ngay lần đầu
        });
    }

    retryInit() {
        setTimeout(() => {
            console.log('🔄 Retrying HistoryManager initialization...');
            this.init();
        }, 2000);
    }

    setupEventListeners() {
        AppEvents.on('ui:showDeviceHistory', (deviceId) => this.showDeviceHistory(deviceId));
        AppEvents.on('ui:showSystemHistory', () => this.showSystemHistory());
        AppEvents.on('action:recordHistory', (data) => this.recordHistory(data));
    }

    // ========== LẤY LỊCH SỬ THIẾT BỊ ==========
    async showDeviceHistory(deviceId) {
        try {
            // 1. Lấy thông tin thiết bị
            const device = await this.db.getDevice(deviceId);
            if (!device) {
                this.showNotification('Không tìm thấy thiết bị', 'error');
                return;
            }

            // 2. Lấy lịch sử từ bảng activities
            const allActivities = await this.db.getAllRecords('activities');
            
            // Lọc lịch sử liên quan đến thiết bị này
            const deviceHistory = allActivities.filter(activity => {
                // Kiểm tra description có chứa ID hoặc tên thiết bị
                const description = activity.description || '';
                return description.includes(device.ten_thiet_bi) || 
                       description.includes(`ID:${deviceId}`) ||
                       description.includes(`device ${deviceId}`) ||
                       (activity.metadata && activity.metadata.deviceId === deviceId);
            });

            // 3. Hiển thị modal
            this.renderDeviceHistoryModal(device, deviceHistory);

        } catch (error) {
            console.error('Error showing device history:', error);
            this.showNotification('Lỗi khi tải lịch sử thiết bị', 'error');
        }
    }

    // ========== LẤY LỊCH SỬ HỆ THỐNG ==========
    async showSystemHistory() {
        try {
            // Lấy tất cả activities
            const allActivities = await this.db.getAllRecords('activities');
            
            // Sắp xếp theo thời gian mới nhất
            const sortedHistory = allActivities.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            // Giới hạn 100 bản ghi
            const recentHistory = sortedHistory.slice(0, 100);

            // Hiển thị modal
            this.renderSystemHistoryModal(recentHistory);

        } catch (error) {
            console.error('Error showing system history:', error);
            this.showNotification('Lỗi khi tải lịch sử hệ thống', 'error');
        }
    }

    // ========== GHI LỊCH SỬ ==========
    async recordHistory(data) {
        try {
            const { 
                type,           // Loại hành động: 'create', 'update', 'delete', 'split', 'move', 'maintenance'
                deviceId,       // ID thiết bị
                deviceName,     // Tên thiết bị
                description,    // Mô tả chi tiết
                changes,        // Thay đổi cụ thể (object)
                user,           // Người thực hiện
                metadata = {}   // Dữ liệu bổ sung
            } = data;

            const activity = {
                type,
                deviceId,
                deviceName,
                description: description || this.generateDescription(type, deviceName, changes),
                changes: changes || {},
                user: user || 'Hệ thống',
                timestamp: new Date().toISOString(),
                metadata: {
                    ...metadata,
                    ipAddress: await this.getClientIP(),
                    userAgent: navigator.userAgent
                }
            };

            await this.db.addActivity(activity);
            console.log(`📝 History recorded: ${type} - ${deviceName}`);

        } catch (error) {
            console.error('Error recording history:', error);
        }
    }

    generateDescription(type, deviceName, changes) {
        const descriptions = {
            'create': `Thêm mới thiết bị: ${deviceName}`,
            'update': `Cập nhật thiết bị: ${deviceName}`,
            'delete': `Xóa thiết bị: ${deviceName}`,
            'split': `Chia/tách thiết bị: ${deviceName}`,
            'move': `Điều chuyển thiết bị: ${deviceName}`,
            'maintenance': `Bảo trì thiết bị: ${deviceName}`,
            'import': `Import dữ liệu thiết bị`,
            'export': `Export dữ liệu thiết bị`
        };

        let desc = descriptions[type] || `Hành động: ${type} trên ${deviceName}`;
        
        // Thêm thông tin thay đổi nếu có
        if (changes && Object.keys(changes).length > 0) {
            const changeList = Object.entries(changes)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            desc += ` (Thay đổi: ${changeList})`;
        }

        return desc;
    }

    async getClientIP() {
        try {
            // Thử lấy IP từ external service
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'localhost';
        }
    }

    // ========== RENDER MODALS ==========
    renderDeviceHistoryModal(device, history) {
        const modal = this.createModal('device-history-modal');
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>🕒 LỊCH SỬ THIẾT BỊ</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="device-summary">
                        <h4>${this.escapeHtml(device.ten_thiet_bi)}</h4>
                        <div class="device-info">
                            <span>ID: ${device.id}</span>
                            <span>• Model: ${device.model || 'N/A'}</span>
                            <span>• Phòng: ${device.phong_ban || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="history-section">
                        <h4>Nhật ký hoạt động (${history.length} bản ghi)</h4>
                        
                        ${history.length === 0 ? 
                            `<div class="empty-history">Không có lịch sử cho thiết bị này</div>` :
                            `<div class="history-list">
                                ${history.map(item => this.renderHistoryItem(item)).join('')}
                            </div>`
                        }
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Đóng</button>
                    <button class="btn-primary" onclick="window.historyManager.exportDeviceHistory(${device.id})">
                        📥 Export Lịch Sử
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    renderSystemHistoryModal(history) {
        const modal = this.createModal('system-history-modal');
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="modal-header">
                    <h3>📊 LỊCH SỬ HỆ THỐNG</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="history-controls">
                        <div class="filter-controls">
                            <select id="history-filter-type" onchange="window.historyManager.filterHistory()">
                                <option value="all">Tất cả loại</option>
                                <option value="create">Thêm mới</option>
                                <option value="update">Cập nhật</option>
                                <option value="delete">Xóa</option>
                                <option value="split">Chia tách</option>
                                <option value="import">Import</option>
                                <option value="export">Export</option>
                            </select>
                            <input type="date" id="history-filter-date" onchange="window.historyManager.filterHistory()">
                            <button class="btn-small" onclick="window.historyManager.clearFilters()">Xóa lọc</button>
                        </div>
                        <div class="stats">
                            <span>Tổng: ${history.length} bản ghi</span>
                            <button class="btn-small" onclick="window.historyManager.exportSystemHistory()">📥 Export</button>
                        </div>
                    </div>
                    
                    <div class="history-list" id="system-history-list">
                        ${history.map(item => this.renderHistoryItem(item)).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Đóng</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    renderHistoryItem(item) {
        const iconMap = {
            'create': '🟢',
            'update': '🔵', 
            'delete': '🔴',
            'split': '🟡',
            'move': '🟣',
            'maintenance': '🛠️',
            'import': '📥',
            'export': '📤'
        };
        
        const icon = iconMap[item.type] || '⚪';
        const time = new Date(item.timestamp).toLocaleString('vi-VN');
        
        return `
            <div class="history-item" data-type="${item.type}" data-date="${item.timestamp.split('T')[0]}">
                <div class="history-icon">${icon}</div>
                <div class="history-content">
                    <div class="history-description">${this.escapeHtml(item.description)}</div>
                    <div class="history-meta">
                        <span class="history-user">👤 ${item.user}</span>
                        <span class="history-time">🕒 ${time}</span>
                        ${item.deviceName ? `<span class="history-device">📱 ${this.escapeHtml(item.deviceName)}</span>` : ''}
                    </div>
                    ${item.changes && Object.keys(item.changes).length > 0 ? `
                        <div class="history-changes">
                            <details>
                                <summary>Chi tiết thay đổi</summary>
                                <pre>${JSON.stringify(item.changes, null, 2)}</pre>
                            </details>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    filterHistory() {
        const typeFilter = document.getElementById('history-filter-type').value;
        const dateFilter = document.getElementById('history-filter-date').value;
        
        const items = document.querySelectorAll('.history-item');
        
        items.forEach(item => {
            const itemType = item.getAttribute('data-type');
            const itemDate = item.getAttribute('data-date');
            
            let show = true;
            
            if (typeFilter !== 'all' && itemType !== typeFilter) {
                show = false;
            }
            
            if (dateFilter && itemDate !== dateFilter) {
                show = false;
            }
            
            item.style.display = show ? 'flex' : 'none';
        });
    }

    clearFilters() {
        document.getElementById('history-filter-type').value = 'all';
        document.getElementById('history-filter-date').value = '';
        this.filterHistory();
    }

    // ========== EXPORT FUNCTIONS ==========
    async exportDeviceHistory(deviceId) {
        try {
            const device = await this.db.getDevice(deviceId);
            const allActivities = await this.db.getAllRecords('activities');
            
            const deviceHistory = allActivities.filter(activity => {
                const desc = activity.description || '';
                return desc.includes(device.ten_thiet_bi) || 
                       desc.includes(`ID:${deviceId}`) ||
                       (activity.metadata && activity.metadata.deviceId === deviceId);
            });

            this.exportToExcel(deviceHistory, `LichSu_${device.ten_thiet_bi}_${deviceId}`);
            
        } catch (error) {
            console.error('Error exporting device history:', error);
            this.showNotification('Lỗi khi export lịch sử', 'error');
        }
    }

    async exportSystemHistory() {
        try {
            const allActivities = await this.db.getAllRecords('activities');
            const sortedHistory = allActivities.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            this.exportToExcel(sortedHistory, 'LichSu_HeThong');
            
        } catch (error) {
            console.error('Error exporting system history:', error);
            this.showNotification('Lỗi khi export lịch sử hệ thống', 'error');
        }
    }

    exportToExcel(data, fileName) {
        if (!data || data.length === 0) {
            this.showNotification('Không có dữ liệu để export', 'warning');
            return;
        }

        try {
            const worksheetData = [
                ['STT', 'Thời gian', 'Loại', 'Mô tả', 'Người thực hiện', 'Thiết bị', 'Thay đổi']
            ];

            data.forEach((item, index) => {
                const row = [
                    index + 1,
                    new Date(item.timestamp).toLocaleString('vi-VN'),
                    item.type,
                    item.description || '',
                    item.user || '',
                    item.deviceName || '',
                    JSON.stringify(item.changes || {})
                ];
                worksheetData.push(row);
            });

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch sử');

            const finalFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, finalFileName);

            this.showNotification(`✅ Đã export ${data.length} bản ghi lịch sử`, 'success');
            
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.showNotification('❌ Lỗi khi export Excel', 'error');
        }
    }

    // ========== UTILITY FUNCTIONS ==========
    createModal(className) {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.5); 
            z-index: 10000; 
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

    showNotification(message, type = 'info') {
        AppEvents.emit('notification:show', {
            message: message,
            type: type
        });
    }
}

// Khởi tạo global instance
window.historyManager = new HistoryManager();