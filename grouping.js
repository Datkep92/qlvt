// grouping.js - Quản lý chế độ nhóm sản phẩm
class GroupingManager {
    constructor() {
        this.moduleName = "GroupingManager";
        this.init();
    }
    
    init() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('action:splitGroup', (groupName) => this.splitGroup(groupName));
    }
    
    setup() {
        console.log('✅ GroupingManager ready');
    }
    
    async splitGroup(groupName) {
        // Lấy tất cả thiết bị trong nhóm
        const devices = window.quanLyManager.allDevices.filter(d => d.ten_thiet_bi === groupName);
        
        if (devices.length === 0) {
            AppEvents.emit('notification:show', {
                message: `Không tìm thấy thiết bị trong nhóm "${groupName}"`,
                type: 'warning'
            });
            return;
        }
        
        // Hiển thị modal chọn điều kiện chia
        this.showSplitGroupModal(groupName, devices);
    }
    
    showSplitGroupModal(groupName, devices) {
        const modal = document.createElement('div');
        modal.className = 'modal split-group-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; background: white; border-radius: 8px; padding: 20px;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">🔄 Chia nhóm "${groupName}"</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body">
                    <form id="split-group-form">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Chọn tiêu chí chia:</label>
                            <select id="split-criteria" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="room">Theo phòng ban</option>
                                <option value="year">Theo năm sản xuất</option>
                                <option value="status">Theo trạng thái</option>
                                <option value="manager">Theo nhân viên quản lý</option>
                                <option value="price">Theo nguyên giá</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Số lượng mỗi nhóm:</label>
                            <input type="number" id="items-per-group" value="1" min="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        
                        <div class="split-preview" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6;">
                            <h4 style="margin: 0 0 10px 0; color: #495057;">Preview:</h4>
                            <div id="split-preview-content">
                                <!-- Preview sẽ được cập nhật -->
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Hủy</button>
                    <button class="btn-primary" onclick="groupingManager.confirmSplitGroup('${groupName}')" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Xác nhận chia</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.updateSplitPreview(groupName, devices);
        
        // Thêm event listeners
        document.getElementById('split-criteria')?.addEventListener('change', () => {
            this.updateSplitPreview(groupName, devices);
        });
        
        document.getElementById('items-per-group')?.addEventListener('input', () => {
            this.updateSplitPreview(groupName, devices);
        });
    }
    
    updateSplitPreview(groupName, devices) {
        const criteria = document.getElementById('split-criteria')?.value || 'room';
        const itemsPerGroup = parseInt(document.getElementById('items-per-group')?.value || 1);
        
        const preview = document.getElementById('split-preview-content');
        if (!preview) return;
        
        const groups = this.previewSplit(devices, criteria, itemsPerGroup);
        
        preview.innerHTML = `
            <p>Tổng: ${devices.length} thiết bị trong nhóm "${groupName}"</p>
            <p>Sẽ được chia thành ${Object.keys(groups).length} nhóm con:</p>
            
            ${Object.entries(groups).map(([key, groupDevices]) => `
                <div class="preview-group" style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #4dabf7;">
                    <strong>${key}:</strong> ${groupDevices.length} thiết bị
                    <div class="preview-items" style="font-size: 13px; color: #6c757d; margin-top: 5px;">
                        ${groupDevices.slice(0, 3).map(d => d.ten_thiet_bi).join(', ')}
                        ${groupDevices.length > 3 ? '...' : ''}
                    </div>
                </div>
            `).join('')}
        `;
    }
    
    previewSplit(devices, criteria, itemsPerGroup) {
        const groups = {};
        
        devices.forEach(device => {
            let key = '';
            
            switch(criteria) {
                case 'room':
                    key = device.phong_ban || 'Không xác định';
                    break;
                case 'year':
                    key = device.nam_san_xuat ? `Năm ${device.nam_san_xuat}` : 'Không xác định';
                    break;
                case 'status':
                    key = device.tinh_trang || 'Không xác định';
                    break;
                case 'manager':
                    key = device.nhan_vien_ql || 'Không xác định';
                    break;
                case 'price':
                    const price = device.nguyen_gia || 0;
                    if (price < 1000000) key = 'Dưới 1 triệu';
                    else if (price < 10000000) key = '1-10 triệu';
                    else key = 'Trên 10 triệu';
                    break;
            }
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(device);
        });
        
        return groups;
    }
    
    async confirmSplitGroup(groupName) {
        console.log('Chia nhóm:', groupName);
        
        AppEvents.emit('notification:show', {
            message: `Đã chia nhóm "${groupName}" thành công`,
            type: 'success'
        });
        
        // Đóng modal
        document.querySelector('.split-group-modal')?.remove();
        
        // Refresh data
        setTimeout(() => {
            window.quanLyManager.loadDevices();
        }, 500);
    }
}

// Khởi tạo
window.groupingManager = new GroupingManager();