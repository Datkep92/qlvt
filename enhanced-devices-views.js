class DevicesViewsManager {
    constructor(manager) {
        this.manager = manager;
    }

    renderDevices() {
        this.renderTableView();
        this.renderCardsView();
        this.renderTreeView();
        this.manager.updatePagination();
        this.manager.updateDisplayCount();
    }

       renderTableView() {
        const container = document.getElementById('devices-table-view');
        if (!container) return;

        const paginatedDevices = this.manager.getCurrentPageDevices();

        if (paginatedDevices.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <div class="table-header-actions" style="padding: 10px; background: #f8f9fa; border-bottom: 1px solid #ddd;">
                    <button class="btn-secondary" onclick="enhancedDevices.selectAllDevices()" style="margin-right: 10px;">
                        ✅ Chọn tất cả
                    </button>
                    <button class="btn-secondary" onclick="enhancedDevices.clearAllSelection()">
                        ❌ Bỏ chọn tất cả
                    </button>
                    <span style="margin-left: 15px; color: #666;">
                        Đã chọn: ${this.manager.selectedDevices.size} thiết bị
                    </span>
                </div>
                <table class="devices-table">
                    <thead>
                        <tr>
                            <th width="30px">
                                <input type="checkbox" id="select-all" onchange="enhancedDevices.bulkManager.toggleSelectAll(this.checked)">
                            </th>
                            <th width="50px">#</th>
                            <th onclick="enhancedDevices.sortTable('ten_thiet_bi')">
                                TÊN THIẾT BỊ ${this.manager.getSortIcon('ten_thiet_bi')}
                            </th>
                            <th width="80px" onclick="enhancedDevices.sortTable('nam_san_xuat')">
                                NĂM SX ${this.manager.getSortIcon('nam_san_xuat')}
                            </th>
                            <th width="80px" onclick="enhancedDevices.sortTable('so_luong')">
                                SL ${this.manager.getSortIcon('so_luong')}
                            </th>
                            <th width="120px" onclick="enhancedDevices.sortTable('nguyen_gia')">
                                GIÁ ${this.manager.getSortIcon('nguyen_gia')}
                            </th>
                            <th width="100px">TRẠNG THÁI</th>
                            <th width="120px">PHÒNG BAN</th>
                            <th width="100px">ĐƠN VỊ</th>
                            <th width="100px">NHÂN VIÊN</th>
                            <th width="120px">HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedDevices.map((device, index) => this.getTableRowHTML(device, index)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // TRONG enhanced-devices-views.js - SỬA getTableRowHTML
    // TRONG getTableRowHTML - SỬA HIỂN THỊ GIÁ
// THÊM PHƯƠNG THỨC GET STATUS ICON
getStatusIcon(status) {
    const iconMap = {
        'Đang sử dụng': '🟢',
        'Bảo trì': '🟡',
        'Hỏng': '🔴', 
        'Ngừng sử dụng': '⚫'
    };
    return iconMap[status] || '⚪';
}

// THÊM PHƯƠNG THỨC GET STATUS TOOLTIP
getStatusTooltip(status) {
    const tooltipMap = {
        'Đang sử dụng': 'Đang sử dụng',
        'Bảo trì': 'Cần bảo trì',
        'Hỏng': 'Đang hỏng',
        'Ngừng sử dụng': 'Ngừng sử dụng'
    };
    return tooltipMap[status] || status;
}

// SỬA getTableRowHTML - THAY TEXT BẰNG ICON
getTableRowHTML(device, index) {
    const startIndex = (this.manager.currentPage - 1) * this.manager.itemsPerPage;
    const nguyenGia = device.nguyen_gia || 0;
    const thanhTien = device.thanh_tien || (nguyenGia * device.so_luong);
    
    return `
        <tr class="device-row ${this.manager.selectedDevices.has(device.id) ? 'selected' : ''}">
            <td>
                <input type="checkbox" ${this.manager.selectedDevices.has(device.id) ? 'checked' : ''} 
                       onchange="enhancedDevices.bulkManager.toggleDeviceSelection(${device.id}, this.checked)">
            </td>
            <td>${startIndex + index + 1}</td>
            <td>
                <div class="device-name-cell">
                    <div class="device-name-main">${this.manager.escapeHtml(device.ten_thiet_bi)}</div>
                    ${device.model ? `<div class="device-model">Model: ${this.manager.escapeHtml(device.model)}</div>` : ''}
                    ${device.nha_san_xuat ? `<div class="device-manufacturer">NSX: ${this.manager.escapeHtml(device.nha_san_xuat)}</div>` : ''}
                </div>
            </td>
            <td>${device.nam_san_xuat || '-'}</td>
            <td>
                <span class="quantity-badge">${device.so_luong}</span>
            </td>
            <td class="price-cell">
                <div class="price-info">
                    <div class="price-total" style="color: #e74c3c; font-weight: bold;">${this.manager.formatCurrency(thanhTien)}</div>
                </div>
            </td>
            <td>
                <div class="status-icon" title="${this.getStatusTooltip(device.tinh_trang)}">
                    ${this.getStatusIcon(device.tinh_trang)}
                </div>
            </td>
            <td>${device.phong_ban || 'Chưa gán'}</td>
            <td>${device.don_vi || 'Chưa gán'}</td>
            <td>${device.nhan_vien || 'Chưa gán'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="enhancedDevices.showDeviceDetails(${device.id})" title="Xem chi tiết">
                        👁️
                    </button>
                    <button class="btn-action btn-split" onclick="enhancedDevices.splitDevice(${device.id})" title="Chia thiết bị">
                        🔄
                    </button>
                    <button class="btn-action btn-edit" onclick="enhancedDevices.editDevice(${device.id})" title="Sửa">
                        ✏️
                    </button>
                    <button class="btn-action btn-delete" onclick="enhancedDevices.deleteDevice(${device.id})" title="Xóa">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// SỬA getDeviceCardHTML - THAY TEXT BẰNG ICON
getDeviceCardHTML(device) {
    const nguyenGia = device.nguyen_gia || 0;
    const thanhTien = device.thanh_tien || (nguyenGia * device.so_luong);
    
    return `
        <div class="device-card ${this.manager.selectedDevices.has(device.id) ? 'selected' : ''}">
            <div class="card-header">
                <div class="card-checkbox">
                    <input type="checkbox" ${this.manager.selectedDevices.has(device.id) ? 'checked' : ''}
                           onchange="enhancedDevices.bulkManager.toggleDeviceSelection(${device.id}, this.checked)">
                </div>
                <div class="card-title">${this.manager.escapeHtml(device.ten_thiet_bi)}</div>
                <div class="card-status-icon" title="${this.getStatusTooltip(device.tinh_trang)}">
                    ${this.getStatusIcon(device.tinh_trang)}
                </div>
            </div>
            
            <div class="card-content">
                <div class="card-info">
                    <div class="info-item">
                        <span class="info-label">Model:</span>
                        <span class="info-value">${device.model || 'Chưa có'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">NSX:</span>
                        <span class="info-value">${device.nha_san_xuat || 'Chưa có'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Năm SX:</span>
                        <span class="info-value">${device.nam_san_xuat || 'Chưa có'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Số lượng:</span>
                        <span class="info-value quantity">${device.so_luong} cái</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Giá:</span>
                        <span class="info-value price">
                            <div class="price-info">
                                <span class="price-unit">${this.manager.formatCurrency(nguyenGia)}/cái</span>
                                <div class="price-total" style="color: #e74c3c; font-weight: bold;">Tổng: ${this.manager.formatCurrency(thanhTien)}</div>
                            </div>
                        </span>
                    </div>
                </div>
                
                <div class="card-location">
                    <div class="location-item">
                        <span class="location-icon">🏥</span>
                        <span>${device.phong_ban || 'Chưa gán'}</span>
                    </div>
                    <div class="location-item">
                        <span class="location-icon">👤</span>
                        <span>${device.nhan_vien || 'Chưa gán'}</span>
                    </div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn-card-action" onclick="enhancedDevices.showDeviceDetails(${device.id})">
                    👁️ Chi tiết
                </button>
                <button class="btn-card-action" onclick="enhancedDevices.splitDevice(${device.id})">
                    🔄 Chia
                </button>
                <button class="btn-card-action" onclick="enhancedDevices.editDevice(${device.id})">
                    ✏️ Sửa
                </button>
            </div>
        </div>
    `;
}

// SỬA getDeviceTreeItemHTML - THAY TEXT BẰNG ICON
getDeviceTreeItemHTML(device) {
    return `
        <div class="tree-device">
            <div class="device-tree-info">
                <span class="tree-icon">📄</span>
                <span class="device-tree-name">${this.manager.escapeHtml(device.ten_thiet_bi)}</span>
                <span class="device-tree-details">
                    ${device.model ? `• ${device.model}` : ''}
                    • ${device.so_luong} cái
                    • <span title="${this.getStatusTooltip(device.tinh_trang)}">${this.getStatusIcon(device.tinh_trang)}</span>
                </span>
            </div>
            <div class="device-tree-actions">
                <button class="btn-tree-action" onclick="enhancedDevices.showDeviceDetails(${device.id})">
                    👁️
                </button>
                <button class="btn-tree-action" onclick="enhancedDevices.editDevice(${device.id})">
                    ✏️
                </button>
            </div>
        </div>
    `;
}



// TRONG getDeviceCardHTML - SỬA HIỂN THỊ GIÁ
getDeviceCardHTML(device) {
    const nguyenGia = device.nguyen_gia || 0;
    const thanhTien = device.thanh_tien || (nguyenGia * device.so_luong);
    
    return `
        <div class="device-card ${this.manager.selectedDevices.has(device.id) ? 'selected' : ''}">
            <div class="card-header">
                <div class="card-checkbox">
                    <input type="checkbox" ${this.manager.selectedDevices.has(device.id) ? 'checked' : ''}
                           onchange="enhancedDevices.bulkManager.toggleDeviceSelection(${device.id}, this.checked)">
                </div>
                <div class="card-title">${this.manager.escapeHtml(device.ten_thiet_bi)}</div>
                <div class="card-status status-${this.getStatusClass(device.tinh_trang)}">
                    ${device.tinh_trang}
                </div>
            </div>
            
            <div class="card-content">
                <div class="card-info">
                    <div class="info-item">
                        <span class="info-label">Model:</span>
                        <span class="info-value">${device.model || 'Chưa có'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">NSX:</span>
                        <span class="info-value">${device.nha_san_xuat || 'Chưa có'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Năm SX:</span>
                        <span class="info-value">${device.nam_san_xuat || 'Chưa có'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Số lượng:</span>
                        <span class="info-value quantity">${device.so_luong} cái</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Giá:</span>
                        <span class="info-value price">
                            <div class="price-info">
                                <div class="price-total" style="color: #e74c3c; font-weight: bold;">Tổng: ${this.manager.formatCurrency(thanhTien)}</div>
                            </div>
                        </span>
                    </div>
                </div>
                
                <div class="card-location">
                    <div class="location-item">
                        <span class="location-icon">🏥</span>
                        <span>${device.phong_ban || 'Chưa gán'}</span>
                    </div>
                    <div class="location-item">
                        <span class="location-icon">👤</span>
                        <span>${device.nhan_vien || 'Chưa gán'}</span>
                    </div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn-card-action" onclick="enhancedDevices.showDeviceDetails(${device.id})">
                    👁️ Chi tiết
                </button>
                <button class="btn-card-action" onclick="enhancedDevices.splitDevice(${device.id})">
                    🔄 Chia
                </button>
                <button class="btn-card-action" onclick="enhancedDevices.editDevice(${device.id})">
                    ✏️ Sửa
                </button>
            </div>
        </div>
    `;
}

    renderCardsView() {
        const container = document.getElementById('devices-cards-view');
        if (!container) return;

        const paginatedDevices = this.manager.getCurrentPageDevices();

        if (paginatedDevices.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = `
            <div class="cards-header-actions" style="padding: 10px; background: #f8f9fa; border-radius: 8px 8px 0 0; margin-bottom: 15px;">
                <button class="btn-secondary" onclick="enhancedDevices.selectAllDevices()" style="margin-right: 10px;">
                    ✅ Chọn tất cả
                </button>
                <button class="btn-secondary" onclick="enhancedDevices.clearAllSelection()">
                    ❌ Bỏ chọn tất cả
                </button>
                <span style="margin-left: 15px; color: #666;">
                    Đã chọn: ${this.manager.selectedDevices.size} thiết bị
                </span>
            </div>
            <div class="cards-grid">
                ${paginatedDevices.map(device => this.getDeviceCardHTML(device)).join('')}
            </div>
        `;
    }


    

    renderTreeView() {
        const container = document.getElementById('devices-tree-view');
        if (!container) return;

        const groupedDevices = this.groupDevicesByDepartment();

        container.innerHTML = `
            <div class="tree-view-container">
                <div class="tree-header">
                    <h3>🌲 CÂY THIẾT BỊ THEO PHÒNG BAN</h3>
                    <div class="tree-actions">
                        <button class="btn-secondary" onclick="enhancedDevices.expandAllTree()">
                            📖 Mở rộng tất cả
                        </button>
                        <button class="btn-secondary" onclick="enhancedDevices.collapseAllTree()">
                            📕 Thu gọn tất cả
                        </button>
                    </div>
                </div>
                <div class="tree-content">
                    ${Object.entries(groupedDevices).map(([department, devices]) => 
                        this.getDepartmentTreeHTML(department, devices)
                    ).join('')}
                </div>
            </div>
        `;
    }

    groupDevicesByDepartment() {
        const groups = {};
        this.manager.filteredDevices.forEach(device => {
            const department = device.phong_ban || 'Chưa phân loại';
            if (!groups[department]) {
                groups[department] = [];
            }
            groups[department].push(device);
        });
        return groups;
    }

    getDepartmentTreeHTML(department, devices) {
        return `
            <div class="tree-department">
                <div class="department-header" onclick="enhancedDevices.toggleDepartmentTree(this)">
                    <span class="tree-icon">📂</span>
                    <span class="department-name">${department}</span>
                    <span class="device-count">(${devices.length} thiết bị)</span>
                </div>
                <div class="department-devices">
                    ${devices.map(device => this.getDeviceTreeItemHTML(device)).join('')}
                </div>
            </div>
        `;
    }

    getDeviceTreeItemHTML(device) {
        return `
            <div class="tree-device">
                <div class="device-tree-info">
                    <span class="tree-icon">📄</span>
                    <span class="device-tree-name">${this.manager.escapeHtml(device.ten_thiet_bi)}</span>
                    <span class="device-tree-details">
                        ${device.model ? `• ${device.model}` : ''}
                        • ${device.so_luong} cái
                        • ${this.getStatusIcon(device.tinh_trang)}
                    </span>
                </div>
                <div class="device-tree-actions">
                    <button class="btn-tree-action" onclick="enhancedDevices.showDeviceDetails(${device.id})">
                        👁️
                    </button>
                    <button class="btn-tree-action" onclick="enhancedDevices.editDevice(${device.id})">
                        ✏️
                    </button>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>${this.manager.filteredDevices.length === 0 ? 'Chưa có thiết bị nào' : 'Không tìm thấy thiết bị phù hợp'}</h3>
                <p>${this.manager.filteredDevices.length === 0 ? 
                    'Hãy thêm thiết bị đầu tiên để bắt đầu quản lý' : 
                    'Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm'
                }</p>
                ${this.manager.filteredDevices.length === 0 ? 
                    '<button class="btn-primary" onclick="enhancedDevices.showAddDeviceModal()">➕ Thêm thiết bị đầu tiên</button>' : 
                    '<button class="btn-secondary" onclick="enhancedDevices.clearFilters()">🧹 Xóa bộ lọc</button>'
                }
            </div>
        `;
    }

    getStatusClass(status) {
        const statusMap = {
            'Đang sử dụng': 'success',
            'Bảo trì': 'warning', 
            'Hỏng': 'danger',
            'Ngừng sử dụng': 'gray'
        };
        return statusMap[status] || 'gray';
    }
// THÊM PHƯƠNG THỨC GET STATUS TOOLTIP
getStatusTooltip(status) {
    const tooltipMap = {
        'Đang sử dụng': 'Đang sử dụng',
        'Bảo trì': 'Cần bảo trì',
        'Hỏng': 'Đang hỏng',
        'Ngừng sử dụng': 'Ngừng sử dụng'
    };
    return tooltipMap[status] || status;
}
    // SỬA LẠI createDeviceDetailsModal - DÙNG PHƯƠNG THỨC NỘI TẠI
createDeviceDetailsModal(device) {
    const modal = document.createElement('div');
    modal.className = 'modal device-details-modal';
    
    const nguyenGia = device.nguyen_gia || 0;
    const thanhTien = device.thanh_tien || (nguyenGia * device.so_luong);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 80%; margin: 5% auto; background: white; border-radius: 8px; overflow: hidden;">
            <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">👁️ CHI TIẾT THIẾT BỊ</h3>
                <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
            </div>
            <div class="modal-body" style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                <div class="device-info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="info-item">
                        <label>Tên thiết bị:</label>
                        <div class="value">${this.escapeHtml(device.ten_thiet_bi)}</div>
                    </div>
                    <div class="info-item">
                        <label>Số lượng:</label>
                        <div class="value">${device.so_luong} ${device.don_vi_tinh || 'cái'}</div>
                    </div>
                    <div class="info-item">
                        <label>Nguyên giá (đơn vị):</label>
                        <div class="value">${this.formatCurrency(nguyenGia)}</div>
                    </div>
                    <div class="info-item">
                        <label>Thành tiền (tổng):</label>
                        <div class="value" style="color: #e74c3c; font-weight: bold;">${this.formatCurrency(thanhTien)}</div>
                    </div>
                    <div class="info-item">
                        <label>Model:</label>
                        <div class="value">${this.escapeHtml(device.model || 'Chưa có')}</div>
                    </div>
                    <div class="info-item">
                        <label>Nhà sản xuất:</label>
                        <div class="value">${this.escapeHtml(device.nha_san_xuat || 'Chưa có')}</div>
                    </div>
                    <div class="info-item">
                        <label>Năm sản xuất:</label>
                        <div class="value">${device.nam_san_xuat || 'Chưa có'}</div>
                    </div>
                    <div class="info-item">
                        <label>Tình trạng:</label>
                        <div class="value">
                            <span class="status-icon-large" title="${this.getStatusTooltip(device.tinh_trang)}">
                                ${this.getStatusIcon(device.tinh_trang)} ${device.tinh_trang}
                            </span>
                        </div>
                    </div>
                    <div class="info-item">
                        <label>Phân loại:</label>
                        <div class="value">${this.escapeHtml(device.phan_loai)}</div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <label>Phòng ban:</label>
                        <div class="value">${this.escapeHtml(device.phong_ban)}</div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <label>Vị trí:</label>
                        <div class="value">${this.escapeHtml(device.vi_tri)}</div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <label>Nhân viên quản lý:</label>
                        <div class="value">${this.escapeHtml(device.nhan_vien_ql)}</div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <label>Ngày nhập:</label>
                        <div class="value">${device.ngay_nhap}</div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <label>Ghi chú:</label>
                        <div class="value">${this.escapeHtml(device.ghi_chu || 'Không có ghi chú')}</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #eee; text-align: right;">
                <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()" style="margin-right: 10px;">Đóng</button>
                <button class="btn-primary" onclick="enhancedDevices.editDevice(${device.id})">✏️ Chỉnh sửa</button>
            </div>
        </div>
    `;
    
    return modal;
}
}

// Tree view methods
EnhancedDevicesManager.prototype.expandAllTree = function() {
    document.querySelectorAll('.department-devices').forEach(el => {
        el.style.display = 'block';
    });
};

EnhancedDevicesManager.prototype.collapseAllTree = function() {
    document.querySelectorAll('.department-devices').forEach(el => {
        el.style.display = 'none';
    });
};

EnhancedDevicesManager.prototype.toggleDepartmentTree = function(element) {
    const devices = element.nextElementSibling;
    if (devices.style.display === 'none') {
        devices.style.display = 'block';
    } else {
        devices.style.display = 'none';
    }
};

EnhancedDevicesManager.prototype.getCurrentPageDevices = function() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredDevices.slice(startIndex, endIndex);
};