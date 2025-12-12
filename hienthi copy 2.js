// hienthi.js - Hiển thị giao diện chính với chế độ gộp tối ưu
class HienThiManager {
    constructor() {
        this.moduleName = "HienThiManager";
        this.currentView = 'cards'; // Mặc định là chế độ thẻ
        this.expandedGroups = new Set(); // Lưu nhóm đang mở (tên thiết bị)
        this.expandedYears = new Set(); // Lưu năm đang mở (tên_thiet_bi + năm)
        this.selectedDevices = new Set(); // Lưu thiết bị đang chọn
        this.currentEditDevice = null;
        this.init();
    }

    // ========== KHỞI TẠO ==========
    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('data:devicesUpdated', (data) => this.renderDevices(data));
        AppEvents.on('ui:switchView', (view) => this.switchView(view));
        AppEvents.on('ui:showDeviceDetails', (deviceId) => this.showDeviceDetails(deviceId));
        AppEvents.on('ui:showEditDevice', (deviceId) => this.showEditDevice(deviceId));
        AppEvents.on('ui:updatePagination', (data) => this.renderPagination(data));
        AppEvents.on('ui:changePage', (page) => this.changePage(page));
        AppEvents.on('ui:changePageSize', (size) => this.changePageSize(size));
        AppEvents.on('ui:showDeviceHistory', (deviceId) => this.showDeviceHistory(deviceId));
        AppEvents.on('bulk:selectionUpdated', (selected) => this.updateGroupSelections(selected));
        AppEvents.on('ui:toggleBulkPanel', () => this.toggleBulkPanel());
        AppEvents.on('data:refreshView', () => {
            if (window.quanLyManager) {
                // Sử dụng data:refreshView để kích hoạt lại renderDevices với dữ liệu hiện tại
                const devices = window.quanLyManager.getCurrentPageDevices();
                this.renderDevices(devices);
                this.updateGlobalCheckbox();
            }
        });
        AppEvents.on('ui:autoExpandGroup', (data) => {
    if (data.groupName) {
        // Mở nhóm chứa thiết bị
        this.expandedGroups.add(data.groupName);
        
        // Mở năm nếu có
        if (data.year) {
            const yearKey = `${data.groupName}_${data.year}`;
            this.expandedYears.add(yearKey);
        }
        
        // Refresh view
        this.refreshView();
        
        // Highlight thiết bị mới
        setTimeout(() => {
            this.highlightNewDevice();
        }, 300);
    }
});
        // Theo dõi selection từ quanLyManager
        AppEvents.on('bulk:selectionUpdated', (selected) => {
            this.selectedDevices = selected || new Set();
            this.refreshView();
        });
    }

    async setup() {
        this.renderMainLayout();
        this.bindGlobalEvents();
        console.log('✅ HienThiManager ready');
    }
// Phương thức highlight thiết bị mới
highlightNewDevice() {
    const lastSplitDevice = document.querySelector('.split-device:last-child');
    if (lastSplitDevice) {
        lastSplitDevice.classList.add('highlight-new');
        setTimeout(() => {
            lastSplitDevice.classList.remove('highlight-new');
        }, 2000);
    }
}

    // ========== MAIN LAYOUT ==========
    renderMainLayout() {
        const appContainer = document.getElementById('app') || document.body;
        appContainer.innerHTML = this.getMainTemplate();
    }

    getMainTemplate() {
        return `
            <div class="medical-app">
                <header class="app-header">
                    <h1>🏥 QUẢN LÝ THIẾT BỊ Y TẾ</h1>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="AppEvents.emit('action:addDevice')">
                            ➕ Thêm thiết bị
                        </button>
                        <button class="btn-secondary" onclick="AppEvents.emit('ui:showImport')">
                            📥 Import Excel
                        </button>
                        <button class="btn-secondary" onclick="AppEvents.emit('ui:showExport')">
                            📤 Export
                        </button>
                        <button class="btn-secondary" onclick="AppEvents.emit('ui:showMaintenance')">
                            🛠️ Bảo trì
                        </button>
                    </div>
                </header>
                
                <div class="filter-section" id="filter-section">
                    </div>
                
                <div class="view-controls-section">
                    <div class="view-mode-controls">
                        <div class="view-toggle-group">
                            <span class="view-label">Chế độ xem:</span>
                            <button class="view-btn ${this.currentView === 'cards' ? 'active' : ''}" 
                                    onclick="window.hienThiManager.switchView('cards')"
                                    title="Chế độ thẻ">
                                🃏 Thẻ
                            </button>
                            <button class="view-btn ${this.currentView === 'group' ? 'active' : ''}" 
                                    onclick="window.hienThiManager.switchView('group')"
                                    title="Chế độ nhóm gộp">
                                📊 Nhóm gộp
                            </button>
                        </div>
                        
                        <div class="selection-controls">
                            <div class="global-select-control">
                                <input type="checkbox" id="global-select-all" 
                                       onchange="window.hienThiManager.globalToggleAll(this.checked)"
                                       title="Chọn tất cả thiết bị hiển thị">
                                <label for="global-select-all">Chọn tất cả trang</label>
                            </div>
                            
                            <div class="selection-info" id="selection-info">
                                <span class="selected-count">0</span> thiết bị được chọn
                            </div>
                        </div>
                    </div>
                    
                    <div class="bulk-panel-section" id="bulk-panel-section">
                        </div>
                </div>
                
                <main class="app-main">
                    <div id="devices-container">
                        <div class="loading">🔄 Đang tải thiết bị...</div>
                    </div>
                </main>
                
                <div class="pagination-section" id="pagination-section"></div>
            </div>
        `;
    }

    // ========== RENDER VIEWS ==========
    renderDevices(data) {
        const container = document.getElementById('devices-container');
        if (!container) return;
        
        // FIX LOGIC: Kiểm tra trạng thái rỗng và quyết định dữ liệu để hiển thị
        if (this.currentView === 'group') {
            const allFiltered = window.quanLyManager?.getFilteredDevices() || [];
            if (allFiltered.length === 0) {
                container.innerHTML = this.getEmptyStateHTML();
                this.togglePagination(false); // Ẩn phân trang
                return;
            }
        } else if (!data || data.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            this.togglePagination(false); // Ẩn phân trang
            return;
        }
        
        try {
            switch(this.currentView) {
                case 'cards':
                    // Cards view: sử dụng dữ liệu đã phân trang
                    container.innerHTML = this.renderCardsView(data);
                    this.togglePagination(true); // Hiển thị phân trang
                    break;
                case 'group':
                    // Group view: Tự lấy toàn bộ dữ liệu đã lọc và bỏ qua phân trang
                    container.innerHTML = this.renderGroupView(); // Sửa: gọi không tham số
                    this.togglePagination(false); // Ẩn phân trang
                    break;
                default:
                    container.innerHTML = this.renderCardsView(data);
                    this.togglePagination(true);
            }
            
            this.bindViewEvents();
            this.updateSelectionInfo();
        } catch (error) {
            console.error('Error rendering devices:', error);
            container.innerHTML = `<div class="error">Lỗi hiển thị: ${error.message}</div>`;
        }
    }

    // ========== CARDS VIEW ==========
    renderCardsView(devices) {
        return `
            <div class="cards-grid">
                ${devices.map(device => this.getDeviceCardHTML(device)).join('')}
            </div>
        `;
    }

    getDeviceCardHTML(device) {
        const totalValue = (device.nguyen_gia || 0) * (device.so_luong || 1);
        const isSelected = this.selectedDevices.has(device.id);
        
        return `
            <div class="device-card ${isSelected ? 'selected' : ''}" data-device-id="${device.id}">
                <div class="card-header">
                    <input type="checkbox" 
                           onchange="window.hienThiManager.toggleDeviceSelection(${device.id}, this.checked)"
                           ${isSelected ? 'checked' : ''}
                           class="device-checkbox">
                    <h3>${this.escapeHtml(device.ten_thiet_bi)}</h3>
                    <span class="status-badge status-${this.getStatusClass(device.tinh_trang)}">
                        ${this.getStatusIcon(device.tinh_trang)}
                    </span>
                </div>
                <div class="card-content">
                    <div class="card-info">
                        <div class="info-item">
                            <label>Model:</label>
                            <span>${this.escapeHtml(device.model || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <label>Năm SX:</label>
                            <span>${device.nam_san_xuat || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Số lượng:</label>
                            <span>${device.so_luong} ${device.don_vi_tinh || 'cái'}</span>
                        </div>
                        <div class="info-item">
                            <label>Giá trị:</label>
                            <span class="price">${this.formatCurrency(totalValue)}</span>
                        </div>
                        <div class="info-item">
                            <label>Phòng ban:</label>
                            <span>${this.escapeHtml(device.phong_ban || 'N/A')}</span>
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-card" onclick="AppEvents.emit('ui:showDeviceDetails', ${device.id})">👁️</button>
                    <button class="btn-card" onclick="AppEvents.emit('ui:showEditDevice', ${device.id})">✏️</button>
                    <button class="btn-card" onclick="AppEvents.emit('action:splitDevice', ${device.id})">🔄</button>
                </div>
            </div>
        `;
    }

    // ========== GROUP VIEW HIỆN ĐẠI (PHÂN CẤP) ==========
renderGroupView() {
    if (!window.quanLyManager) return `<div class="error">Lỗi tải dữ liệu quản lý</div>`;

    // Lấy toàn bộ danh sách thiết bị đã lọc
    const devices = window.quanLyManager.getFilteredDevices();

    // Nhóm thiết bị theo tên và năm
    const grouped = this.groupDevicesHierarchically(devices);
    const groupKeys = Object.keys(grouped).sort();
    
    if (groupKeys.length === 0) {
        return `<div class="empty-state">
            <div class="empty-icon">📭</div>
            <h4>Không có thiết bị để nhóm</h4>
            <p>Không tìm thấy thiết bị nào phù hợp với bộ lọc hiện tại</p>
        </div>`;
    }
    
    return `
        <div class="group-view-container">
            <div class="group-header-stats">
                <div class="group-stat">
                    <span class="stat-icon">📁</span>
                    <span class="stat-value">${groupKeys.length}</span>
                    <span class="stat-label">Nhóm thiết bị</span>
                </div>
                <div class="group-stat">
                    <span class="stat-icon">📦</span>
                    <span class="stat-value">${devices.reduce((sum, d) => sum + (d.so_luong || 1), 0)}</span>
                    <span class="stat-label">Tổng số lượng</span>
                </div>
                <div class="group-stat">
                    <span class="stat-icon">💰</span>
                    <span class="stat-value">${this.formatCurrencyCompact(this.calculateTotalValue(devices))}</span>
                    <span class="stat-label">Tổng giá trị</span>
                </div>
            </div>
            
            <div class="group-controls">
                <div class="group-search">
                    <input type="text" placeholder="🔍 Tìm kiếm nhóm theo tên..." 
                           oninput="window.hienThiManager.filterGroups(this.value)">
                </div>
                <div class="group-buttons">
                    <button class="btn-group" onclick="window.hienThiManager.expandAllGroups()">📖 Mở tất cả</button>
                    <button class="btn-group" onclick="window.hienThiManager.collapseAllGroups()">📕 Đóng tất cả</button>
                    <button class="btn-group" onclick="window.hienThiManager.exportGroupReport()">📤 Xuất báo cáo</button>
                </div>
            </div>
            
            <div class="group-list">
                ${groupKeys.map(groupName => this.renderGroupItemCompact(groupName, grouped[groupName])).join('')}
            </div>
            
            ${this.selectedDevices.size > 0 ? `
                <div class="group-footer">
                    <div class="selected-summary">
                        <span class="selected-count">${this.selectedDevices.size}</span> thiết bị được chọn
                        <button class="btn-clear-selection" onclick="window.hienThiManager.clearAllSelections()">
                            🗑️ Xóa chọn
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}
// Thêm vào class HienThiManager
formatCurrencyCompact(amount) {
    if (amount === undefined || amount === null) return '0 ₫';
    
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
    } else if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + ' tr';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'k';
    }
    
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}
    renderGroupItemCompact(groupName, groupData) {
    const isGroupExpanded = this.expandedGroups.has(groupName);
    const yearKeys = Object.keys(groupData.years);
    
    // Kiểm tra chọn tất cả
    const allDevicesInGroup = groupData.devices.map(d => d.id);
    const allSelected = allDevicesInGroup.length > 0 && 
                       allDevicesInGroup.every(id => this.selectedDevices.has(id));
    const someSelected = allDevicesInGroup.some(id => this.selectedDevices.has(id));
    
    return `
        <div class="compact-group-item ${isGroupExpanded ? 'expanded' : ''}">
            <div class="group-header-compact" onclick="window.hienThiManager.toggleGroup('${this.escapeHtml(groupName)}')">
                
                <div class="group-info-compact">
                    <div class="group-title-row">
                        <div class="group-icon-title">
                        <div class="group-checkbox" onclick="event.stopPropagation()">
                    <input type="checkbox" 
                           ${allSelected ? 'checked' : ''}
                           ${someSelected && !allSelected ? 'data-indeterminate="true"' : ''}
                           onchange="window.hienThiManager.toggleGroupSelection('${this.escapeHtml(groupName)}', this.checked)">
                </div>
                            <span class="group-icon">${isGroupExpanded ? '📂' : '📁'}</span>
                            <h3 class="group-name">${this.escapeHtml(groupName)} ${isGroupExpanded ? '▼' : '▶'}</h3> 
                        </div>
                    </div>
                    
                    <div class="group-stats-compact">
                        <div class="stat-badge">
                            <span class="stat-icon">📦</span>
                            <span class="stat-value">${groupData.totalQuantity}</span>
                            <span class="stat-label">cái</span>
                        </div>
                        <div class="stat-badge">
                            <span class="stat-icon">💰</span>
                            <span class="stat-value">${this.formatCurrencyCompact(groupData.totalValue)}</span>
                        </div>
                        <div class="stat-badge">
                            <span class="stat-icon">🏢</span>
                            <span class="stat-value">${this.getUniqueDepartments(groupData.devices)}</span>
                            <span class="stat-label">phòng</span>
                        </div>
                         <button class="action-btn" onclick="window.hienThiManager.renameGroup('${this.escapeHtml(groupName)}')" title="Đổi tên">
                    <span class="btn-icon">✏️</span>
                </button>
                <button class="action-btn" onclick="window.hienThiManager.exportGroup('${this.escapeHtml(groupName)}')" title="Xuất nhóm">
                    <span class="btn-icon">📤</span>
                </button>
                    </div>
                </div>
            </div>           
            ${isGroupExpanded ? `
                <div class="years-list">
                    ${yearKeys.map(year => this.renderYearItemCompact(groupName, year, groupData.years[year])).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Helper function để tính số phòng ban độc lập (không đổi)
getUniqueDepartments(devices) {
    const depts = new Set();
    devices.forEach(device => {
        if (device.phong_ban) depts.add(device.phong_ban);
    });
    return depts.size;
}

renderYearItemCompact(groupName, year, yearData) {
    const yearKey = `${groupName}_${year}`;
    const isYearExpanded = this.expandedYears.has(yearKey);
    
    // Lấy danh sách model trong năm
    const modelList = Array.from(yearData.models || []);
    const modelText = modelList.length > 0 ? 
        `<span class="model-badge">${modelList.slice(0, 2).join(', ')}${modelList.length > 2 ? '...' : ''}</span>` : 
        '';
    
    // Kiểm tra chọn tất cả thiết bị trong năm
    const allDevicesInYear = yearData.devices.map(d => d.id);
    const allSelected = allDevicesInYear.length > 0 && 
                       allDevicesInYear.every(id => this.selectedDevices.has(id));
    const someSelected = allDevicesInYear.some(id => this.selectedDevices.has(id));
    
    return `
        <div class="year-item-compact ${isYearExpanded ? 'expanded' : ''}">
            <!-- H2: Header năm -->
            <div class="year-header-compact" onclick="window.hienThiManager.toggleYear('${this.escapeHtml(groupName)}', '${year}')">
                <div class="year-checkbox" onclick="event.stopPropagation()">
                    <input type="checkbox" 
                           ${allSelected ? 'checked' : ''}
                           ${someSelected && !allSelected ? 'data-indeterminate="true"' : ''}
                           onchange="window.hienThiManager.toggleYearSelection('${this.escapeHtml(groupName)}', '${year}', this.checked)">
                </div>
                
                <div class="year-info-compact">
                    <div class="year-title-row">
                        <div class="year-icon-title">
                            <span class="year-icon">📅</span>
                            <h4 class="year-title">
                                ${year === 'Không xác định' ? 'Năm không xác định' : `Năm ${year}`} ${isYearExpanded ? '▼' : '▶'}
                                ${modelText}
                            </h4>
                        </div>
                        <div class="year-toggle">${isYearExpanded ? '' : ''}</div>
                    </div>
                    
                    <div class="year-stats-compact">
                        <div class="stat-badge small">
                            <span class="stat-icon">📦</span>
                            <span class="stat-value">${yearData.quantity}</span>
                            <span class="stat-label">cái</span>
                        </div>
                        <div class="stat-badge small price">
                            <span class="stat-icon">💰</span>
                            <span class="stat-value">${this.formatCurrencyCompact(yearData.value)}</span>
                        </div>
                        <div class="stat-badge small">
                            <span class="stat-icon">🏢</span>
                            <span class="stat-value">${this.getUniqueDepartments(yearData.devices)}</span>
                            <span class="stat-label">phòng</span>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Danh sách thiết bị trong năm -->
            ${isYearExpanded ? `
                <div class="year-devices-list">
                    ${yearData.devices.map(device => this.renderDeviceInYearCompact(device)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Helper function
getUniqueDepartments(devices) {
    const depts = new Set();
    devices.forEach(device => {
        if (device.phong_ban) depts.add(device.phong_ban);
    });
    return depts.size;
}

// Sửa phần renderDeviceInYearCompact trong file hienthi.js
renderDeviceInYearCompact(device) {
    const isSelected = this.selectedDevices.has(device.id);
    const deviceValue = (device.nguyen_gia || 0) * (device.so_luong || 1);
    const isSplitDevice = device.parent_id || device.serial_number?.includes('SPLIT_');
    
    return `
        <div class="device-item-year-compact ${isSelected ? 'selected' : ''} ${isSplitDevice ? 'split-device' : ''}" 
             data-device-id="${device.id}">
            
            <!-- Checkbox -->
            <div class="device-checkbox-year" onclick="event.stopPropagation()">
                <input type="checkbox" 
                       ${isSelected ? 'checked' : ''}
                       onchange="window.hienThiManager.toggleDeviceSelection(${device.id}, this.checked)">
            </div>
            
            <!-- Thông tin thiết bị -->
            <div class="device-info-year" onclick="AppEvents.emit('ui:showDeviceDetails', ${device.id})">
                <!-- Dòng 1: Model và status -->
                <div class="device-model-row">
                    ${device.model ? `<span class="device-model">${this.escapeHtml(device.model)}</span>` : ''}
                    <span class="device-status ${this.getStatusClass(device.tinh_trang)}">
                        ${this.getStatusIcon(device.tinh_trang)} ${device.tinh_trang}
                    </span>
                </div>
                
                <!-- Dòng 2: Thông tin cơ bản -->
                <div class="device-basic-year">
                    <div class="detail-item">
                        <span class="detail-icon">📦</span>
                        <span class="detail-text">${device.so_luong} ${device.don_vi_tinh || 'cái'}</span>
                    </div>
                    <div class="detail-item price">
                        <span class="detail-icon">💰</span>
                        <span class="detail-text">${this.formatCurrencyCompact(deviceValue)}</span>
                    </div>
                </div>
                
                <!-- Dòng 3: Thông tin bổ sung -->
                <div class="device-extra-year">
                    <div class="detail-item">
                        <span class="detail-icon">🏢</span>
                        <span class="detail-text">${device.phong_ban || 'Chưa gán'}</span>
                    </div>
                    ${device.nhan_vien_ql ? `
                    <div class="detail-item">
                        <span class="detail-icon">👤</span>
                        <span class="detail-text">${this.escapeHtml(device.nhan_vien_ql)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Action buttons - FIXED: Các nút liên quan đến thiết bị này -->
            <div class="device-actions-year">
                <button class="action-btn tiny" 
                        onclick="AppEvents.emit('ui:showEditDevice', ${device.id}); event.stopPropagation()" 
                        title="Sửa thiết bị">
                    ✏️
                </button>
                <button class="action-btn tiny" 
                        onclick="AppEvents.emit('action:splitDevice', ${device.id}); event.stopPropagation()" 
                        title="Chia thiết bị này">
                    🔄
                </button>
                <button class="action-btn tiny delete" 
                        onclick="AppEvents.emit('action:deleteDevice', ${device.id}); event.stopPropagation()" 
                        title="Xóa thiết bị">
                    🗑️
                </button>
            </div>
        </div>
    `;
}
    // Nhóm thiết bị theo cấu trúc phân cấp: Tên → Năm → Danh sách
    // Phương thức chỉ phân theo Tên → Năm
groupDevicesHierarchically(devices) {
    const groups = {};
    
    devices.forEach(device => {
        const deviceName = device.ten_thiet_bi || 'Chưa đặt tên';
        const deviceYear = device.nam_san_xuat || 'Không xác định';
        
        // Level 1: Theo tên
        if (!groups[deviceName]) {
            groups[deviceName] = {
                name: deviceName,
                years: {},
                totalQuantity: 0,
                totalValue: 0,
                devices: []
            };
        }
        
        // Level 2: Theo năm
        if (!groups[deviceName].years[deviceYear]) {
            groups[deviceName].years[deviceYear] = {
                year: deviceYear,
                devices: [],
                quantity: 0,
                value: 0,
                // Thêm model info nếu cần hiển thị
                models: new Set()
            };
        }
        
        const yearGroup = groups[deviceName].years[deviceYear];
        yearGroup.devices.push(device);
        yearGroup.quantity += (device.so_luong || 1);
        yearGroup.value += (device.nguyen_gia || 0) * (device.so_luong || 1);
        
        // Thêm model vào set để hiển thị
        if (device.model) {
            yearGroup.models.add(device.model);
        }
        
        // Cập nhật tổng nhóm
        groups[deviceName].devices.push(device);
        groups[deviceName].totalQuantity += (device.so_luong || 1);
        groups[deviceName].totalValue += (device.nguyen_gia || 0) * (device.so_luong || 1);
    });
    
    // Sắp xếp năm giảm dần
    Object.values(groups).forEach(group => {
        group.years = Object.fromEntries(
            Object.entries(group.years).sort(([yearA], [yearB]) => {
                if (yearA === 'Không xác định') return 1;
                if (yearB === 'Không xác định') return -1;
                return parseInt(yearB) - parseInt(yearA);
            })
        );
    });
    
    return groups;
}

    renderGroupItem(groupName, groupData) {
        const isGroupExpanded = this.expandedGroups.has(groupName);
        const yearKeys = Object.keys(groupData.years);
        
        // Kiểm tra xem toàn bộ nhóm có được chọn không
        const allDevicesInGroup = groupData.devices.map(d => d.id);
        const allSelected = allDevicesInGroup.length > 0 && 
                           allDevicesInGroup.every(id => this.selectedDevices.has(id));
        const someSelected = allDevicesInGroup.some(id => this.selectedDevices.has(id));
        
        return `
            <div class="device-group-item ${isGroupExpanded ? 'expanded' : ''} ${someSelected ? 'has-selected' : ''}">
                <div class="group-header" onclick="window.hienThiManager.toggleGroup('${this.escapeHtml(groupName)}')">
                    <div class="group-selector" onclick="event.stopPropagation()">
                        <input type="checkbox" class="group-checkbox"
                               ${allSelected ? 'checked' : ''}
                               ${someSelected && !allSelected ? 'data-indeterminate="true"' : ''}
                               onchange="window.hienThiManager.toggleGroupSelection('${this.escapeHtml(groupName)}', this.checked)">
                    </div>
                    
                    <div class="group-icon">${isGroupExpanded ? '📂' : '📁'}</div>
                    
                    <div class="group-main-info">
                        <h4 class="group-name">${this.escapeHtml(groupName)}</h4>
                        <div class="group-stats">
                            <span class="stat">
                                <span class="stat-icon">📦</span>
                                <span class="stat-text">${groupData.totalQuantity} cái</span>
                            </span>
                            <span class="stat">
                                <span class="stat-icon">💰</span>
                                <span class="stat-text">${this.formatCurrency(groupData.totalValue)}</span>
                            </span>
                            <span class="stat">
                                <span class="stat-icon">📅</span> 
                                <span class="stat-text">${yearKeys.length} năm</span>
                            </span>
                        </div>
                    </div>
                    
                    <div class="group-actions" onclick="event.stopPropagation()">
                        <button class="btn-action" title="Chia toàn bộ nhóm"
                                onclick="window.hienThiManager.splitEntireGroup('${this.escapeHtml(groupName)}')">
                            🔄
                        </button>
                        <button class="btn-action" title="Sửa tên nhóm"
                                onclick="window.hienThiManager.renameGroup('${this.escapeHtml(groupName)}')">
                            ✏️
                        </button>
                        <button class="btn-action" title="Xuất nhóm"
                                onclick="window.hienThiManager.exportGroup('${this.escapeHtml(groupName)}')">
                            📤
                        </button>
                    </div>
                    
                    <div class="group-toggle">${isGroupExpanded ? '▼' : '▶'}</div>
                </div>
                
                ${isGroupExpanded ? `
                    <div class="group-years">
                        ${yearKeys.map(year => this.renderYearItem(groupName, year, groupData.years[year])).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderYearItem(groupName, year, yearData) {
        const yearKey = `${groupName}_${year}`;
        const isYearExpanded = this.expandedYears.has(yearKey);
        
        // Kiểm tra xem toàn bộ năm có được chọn không
        const allDevicesInYear = yearData.devices.map(d => d.id);
        const allSelected = allDevicesInYear.length > 0 && 
                           allDevicesInYear.every(id => this.selectedDevices.has(id));
        const someSelected = allDevicesInYear.some(id => this.selectedDevices.has(id));
        
        return `
            <div class="year-item ${isYearExpanded ? 'expanded' : ''} ${someSelected ? 'has-selected' : ''}">
                <div class="year-header" onclick="window.hienThiManager.toggleYear('${this.escapeHtml(groupName)}', '${year}')">
                    <div class="year-selector" onclick="event.stopPropagation()">
                        <input type="checkbox" class="year-checkbox"
                               ${allSelected ? 'checked' : ''}
                               ${someSelected && !allSelected ? 'data-indeterminate="true"' : ''}
                               onchange="window.hienThiManager.toggleYearSelection('${this.escapeHtml(groupName)}', '${year}', this.checked)">
                    </div>
                    
                    <div class="year-icon">${isYearExpanded ? '📅' : '📆'}</div> 
                    
                    <div class="year-main-info">
                        <h5 class="year-title">
                            <span class="year-value">${year === 'Không xác định' ? 'Năm không xác định' : `Năm ${year}`}</span>
                            <span class="year-badge">${yearData.quantity} cái</span>
                            <span class="year-badge">${this.formatCurrency(yearData.value)}</span>
                        </h5>
                    </div>
                    
                    <div class="year-actions" onclick="event.stopPropagation()">
                        <button class="btn-action" title="Chia toàn bộ năm"
                                onclick="window.hienThiManager.splitYear('${this.escapeHtml(groupName)}', '${year}')">
                            🔄
                        </button>
                    </div>
                    
                    <div class="year-toggle">${isYearExpanded ? '▼' : '▶'}</div>
                </div>
                
                ${isYearExpanded ? `
                    <div class="year-devices">
                        ${yearData.devices.map(device => this.renderDeviceInYear(device)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
getSplitInfoHTML(device) {
    if (!device.parent_id && !device.serial_number?.includes('SPLIT_')) return '';
    
    let info = '';
    if (device.parent_id) {
        info += `<div class="device-split-info">Tách từ thiết bị #${device.parent_id}</div>`;
    }
    if (device.ghi_chu && device.ghi_chu.includes('Tách từ')) {
        info += `<div class="device-split-info">${device.ghi_chu}</div>`;
    }
    return info;
}
renderDeviceInYear(device) {
    const isSelected = this.selectedDevices.has(device.id);
    const deviceValue = (device.nguyen_gia || 0) * (device.so_luong || 1);
    
    // Kiểm tra nếu device có parent_id (được tách ra)
    const isSplitDevice = device.parent_id || device.serial_number?.includes('SPLIT_');
    const splitInfo = isSplitDevice ? this.getSplitInfoHTML(device) : '';
    
    return `
        <div class="device-in-year ${isSelected ? 'selected' : ''} ${isSplitDevice ? 'split-device' : ''}" data-device-id="${device.id}">
            <div class="device-selector">
                <input type="checkbox" 
                       ${isSelected ? 'checked' : ''}
                       onchange="window.hienThiManager.toggleDeviceSelection(${device.id}, this.checked)">
            </div>
            
            <div class="device-info">
                <div class="device-main">
                    <span class="device-name">${this.escapeHtml(device.ten_thiet_bi)}</span>
                    ${device.model ? `<span class="device-model">(${this.escapeHtml(device.model)})</span>` : ''}
                    ${isSplitDevice ? '<span class="split-badge">🔄</span>' : ''}
                </div>
                <div class="device-details">
                    <span class="detail">
                        <span class="detail-icon">📦</span>
                        <strong>${device.so_luong}</strong> ${device.don_vi_tinh || 'cái'}
                    </span>
                    <span class="detail">
                        <span class="detail-icon">💰</span>
                        ${this.formatCurrency(deviceValue)}
                    </span>
                    <span class="detail">
                        <span class="detail-icon">🏢</span>
                        ${device.phong_ban || 'Chưa gán'}
                    </span>
                    <span class="detail">
                        <span class="detail-icon status-${this.getStatusClass(device.tinh_trang)}">${this.getStatusIcon(device.tinh_trang)}</span>
                        ${device.tinh_trang}
                    </span>
                </div>
                ${splitInfo}
            </div>
            
            <div class="device-actions">
                <button class="btn-action" title="Xem chi tiết"
                        onclick="AppEvents.emit('ui:showDeviceDetails', ${device.id})">
                    👁️
                </button>
                <button class="btn-action" title="Chỉnh sửa"
                        onclick="AppEvents.emit('ui:showEditDevice', ${device.id})">
                    ✏️
                </button>
                <button class="btn-action" title="Chia thiết bị"
                        onclick="AppEvents.emit('action:splitDevice', ${device.id})">
                    🔄
                </button>
                <button class="btn-action btn-delete" title="Xóa thiết bị"
                        onclick="AppEvents.emit('action:deleteDevice', ${device.id})">
                    🗑️
                </button>
            </div>
        </div>
    `;
}

    // Trong phương thức toggleGroup
toggleGroup(groupName) {
    if (this.expandedGroups.has(groupName)) {
        this.expandedGroups.delete(groupName);
        // Đóng tất cả các năm trong nhóm này
        const devices = window.quanLyManager?.getFilteredDevices() || [];
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        groupDevices.forEach(device => {
            const yearKey = `${groupName}_${device.nam_san_xuat || 'Không xác định'}`;
            this.expandedYears.delete(yearKey);
        });
    } else {
        this.expandedGroups.add(groupName);
        // TỰ ĐỘNG MỞ TẤT CẢ CÁC NĂM TRONG NHÓM KHI NHÓM MỞ
        const devices = window.quanLyManager?.getFilteredDevices() || [];
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        const uniqueYears = [...new Set(groupDevices.map(d => d.nam_san_xuat || 'Không xác định'))];
        
        uniqueYears.forEach(year => {
            const yearKey = `${groupName}_${year}`;
            this.expandedYears.add(yearKey);
        });
    }
    this.refreshView();
}

    toggleYear(groupName, year) {
    const yearKey = `${groupName}_${year}`;
    
    // FIX: Kiểm tra nếu năm chỉ có 1 thiết bị, tự động mở luôn thiết bị đó
    if (!window.quanLyManager) return;
    
    const devices = window.quanLyManager.getFilteredDevices();
    const yearDevices = devices.filter(d => 
        d.ten_thiet_bi === groupName && 
        (d.nam_san_xuat === year || (d.nam_san_xuat === null && year === 'Không xác định'))
    );
    
    // Nếu năm chỉ có 1 thiết bị, hiển thị trực tiếp chi tiết
    if (yearDevices.length === 1) {
        AppEvents.emit('ui:showDeviceDetails', yearDevices[0].id);
        return;
    }
    
    // Ngược lại, toggle như bình thường
    if (this.expandedYears.has(yearKey)) {
        this.expandedYears.delete(yearKey);
    } else {
        this.expandedYears.add(yearKey);
    }
    this.refreshView();
}

    expandAllGroups() {
    if (!window.quanLyManager) return;
    
    const devices = window.quanLyManager.getFilteredDevices();
    const grouped = this.groupDevicesHierarchically(devices);
    
    Object.keys(grouped).forEach(groupName => {
        this.expandedGroups.add(groupName);
        // Mở tất cả các năm trong mỗi nhóm
        Object.keys(grouped[groupName].years).forEach(year => {
            this.expandedYears.add(`${groupName}_${year}`);
        });
    });
    
    this.refreshView();
    this.showNotification(`Đã mở ${Object.keys(grouped).length} nhóm và tất cả năm`, 'info');
}

    collapseAllGroups() {
    this.expandedGroups.clear();
    this.expandedYears.clear();
    this.refreshView();
    this.showNotification('Đã đóng tất cả nhóm và năm', 'info');
}

    toggleGroupSelection(groupName, checked) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getFilteredDevices(); // Sửa: Dùng filtered devices
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        
        if (checked) {
            groupDevices.forEach(device => {
                this.selectedDevices.add(device.id);
            });
        } else {
            groupDevices.forEach(device => {
                this.selectedDevices.delete(device.id);
            });
        }
        
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
        this.refreshView();
    }

    toggleYearSelection(groupName, year, checked) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getFilteredDevices(); // Sửa: Dùng filtered devices
        const yearDevices = devices.filter(d => 
            d.ten_thiet_bi === groupName && 
            (d.nam_san_xuat === year || (d.nam_san_xuat === null && year === 'Không xác định'))
        );
        
        if (checked) {
            yearDevices.forEach(device => {
                this.selectedDevices.add(device.id);
            });
        } else {
            yearDevices.forEach(device => {
                this.selectedDevices.delete(device.id);
            });
        }
        
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
        this.refreshView();
    }

    toggleDeviceSelection(deviceId, checked) {
        if (checked) {
            this.selectedDevices.add(deviceId);
        } else {
            this.selectedDevices.delete(deviceId);
        }
        
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
        this.refreshView();
    }

    clearAllSelections() {
        this.selectedDevices.clear();
        AppEvents.emit('bulk:selectionUpdated', new Set());
        this.showNotification('Đã xóa tất cả lựa chọn', 'success');
        this.refreshView();
    }

    // ========== GROUP ACTIONS ==========
    splitEntireGroup(groupName) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getFilteredDevices(); // Sửa: Dùng filtered devices
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        
        if (groupDevices.length === 0) {
            this.showNotification('Không có thiết bị trong nhóm', 'warning');
            return;
        }
        
        this.showSplitGroupModal(groupName, groupDevices);
    }

    splitYear(groupName, year) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getFilteredDevices(); // Sửa: Dùng filtered devices
        const yearDevices = devices.filter(d => 
            d.ten_thiet_bi === groupName && 
            (d.nam_san_xuat === year || (d.nam_san_xuat === null && year === 'Không xác định'))
        );
        
        if (yearDevices.length === 0) {
            this.showNotification('Không có thiết bị trong năm này', 'warning');
            return;
        }
        
        const yearDisplay = year === 'Không xác định' ? 'năm không xác định' : `năm ${year}`;
        this.showSplitYearModal(groupName, yearDisplay, yearDevices);
    }

    renameGroup(groupName) {
        const newName = prompt('Nhập tên mới cho nhóm:', groupName);
        if (newName && newName.trim() !== '' && newName !== groupName) {
            if (!window.quanLyManager || !window.quanLyManager.allDevices) {
                this.showNotification('Không thể cập nhật tên nhóm', 'error');
                return;
            }
            
            const devices = window.quanLyManager.allDevices.filter(d => d.ten_thiet_bi === groupName);
            
            devices.forEach(device => {
                AppEvents.emit('action:updateDevice', {
                    deviceId: device.id,
                    updates: { ten_thiet_bi: newName.trim() }
                });
            });
            
            setTimeout(() => {
                if (window.quanLyManager) {
                    window.quanLyManager.loadDevices();
                }
            }, 500);
        }
    }

    exportGroup(groupName) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getFilteredDevices(); // Sửa: Dùng filtered devices
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        
        if (groupDevices.length === 0) {
            this.showNotification('Không có thiết bị trong nhóm', 'warning');
            return;
        }
        
        const reportData = {
            groupName: groupName,
            devices: groupDevices,
            totalDevices: groupDevices.length,
            totalQuantity: groupDevices.reduce((sum, d) => sum + (d.so_luong || 1), 0),
            totalValue: groupDevices.reduce((sum, d) => sum + (d.nguyen_gia || 0) * (d.so_luong || 1), 0),
            generatedAt: new Date().toLocaleString('vi-VN')
        };
        
        AppEvents.emit('export:custom', {
            filename: `Bao-cao-nhom-${groupName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`,
            data: reportData
        });
        
        this.showNotification(`Xuất báo cáo nhóm "${groupName}" thành công`, 'success');
    }

    exportGroupReport() {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getFilteredDevices(); // Sửa: Dùng filtered devices
        const grouped = this.groupDevicesHierarchically(devices);
        
        AppEvents.emit('export:groupReport', {
            groups: grouped,
            totalDevices: devices.length,
            generatedAt: new Date().toLocaleString('vi-VN')
        });
        
        this.showNotification('Xuất báo cáo nhóm thành công', 'success');
    }

    filterGroups(searchTerm) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getFilteredDevices(); // Sửa: Dùng filtered devices
        const grouped = this.groupDevicesHierarchically(devices);
        
        const filteredGroups = Object.entries(grouped)
            .filter(([groupName]) => 
                groupName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        
        // Tạm thời chỉ hiển thị nhóm được tìm thấy
        const container = document.querySelector('.group-list');
        if (container) {
            if (filteredGroups.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h4>Không tìm thấy nhóm</h4>
                        <p>Không có nhóm nào phù hợp với "${searchTerm}"</p>
                    </div>
                `;
            } else {
                container.innerHTML = filteredGroups.map(([groupName, groupData]) => 
                    this.renderGroupItem(groupName, groupData)
                ).join('');
            }
        }
    }

    // ========== MODAL FUNCTIONS ==========
    showSplitGroupModal(groupName, devices) {
        const totalQuantity = devices.reduce((sum, device) => sum + (device.so_luong || 1), 0);
        
        const modal = this.createModal('split-group-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔄 CHIA NHÓM: ${this.escapeHtml(groupName)}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p>Tổng số lượng trong nhóm: <strong>${totalQuantity}</strong> cái</p>
                    <p>Số thiết bị: <strong>${devices.length}</strong></p>
                    
                    <div class="split-options">
                        <div class="form-group">
                            <label for="split-method">Phương pháp chia:</label>
                            <select id="split-method" class="form-control">
                                <option value="year">Chia theo năm sản xuất</option>
                                <option value="quantity">Chia theo số lượng</option>
                                <option value="room">Chia theo phòng ban</option>
                            </select>
                        </div>
                        
                        <div id="split-options-container">
                            </div>
                    </div>
                    
                    <div class="split-preview" id="split-preview">
                        </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Hủy</button>
                    <button class="btn-primary" onclick="window.hienThiManager.confirmSplitGroup('${this.escapeHtml(groupName)}')">Chia nhóm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Thêm sự kiện cho select method
        const methodSelect = modal.querySelector('#split-method');
        if (methodSelect) {
            methodSelect.addEventListener('change', (e) => this.updateSplitOptions(e.target.value));
        }
    }

    showSplitYearModal(groupName, yearDisplay, devices) {
        const totalQuantity = devices.reduce((sum, device) => sum + (device.so_luong || 1), 0);
        
        const modal = this.createModal('split-year-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔄 CHIA NĂM: ${this.escapeHtml(groupName)} (${yearDisplay})</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p>Tổng số lượng trong năm: <strong>${totalQuantity}</strong> cái</p>
                    
                    <div class="split-options">
                        <label for="split-quantity">Số lượng muốn tách (từ 1 đến ${totalQuantity - 1}):</label>
                        <input type="number" id="split-quantity" min="1" max="${totalQuantity - 1}" value="1" class="form-control">
                        
                        <label for="split-device">Chọn thiết bị để tách:</label>
                        <select id="split-device" class="form-control">
                            ${devices.map(device => `
                                <option value="${device.id}">
                                    ${this.escapeHtml(device.ten_thiet_bi)} - SL: ${device.so_luong} - ${device.phong_ban || ''}
                                </option>
                            `).join('')}
                        </select>
                        
                        <div class="form-check" style="margin-top: 10px;">
                            <input type="checkbox" id="create-new-year" class="form-check-input">
                            <label for="create-new-year" class="form-check-label">Tạo thiết bị với năm mới</label>
                        </div>
                        
                        <div id="new-year-input" style="display: none; margin-top: 10px;">
                            <label for="new-year-value">Năm sản xuất mới:</label>
                            <input type="number" id="new-year-value" min="1900" max="2100" value="${new Date().getFullYear()}" class="form-control">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Hủy</button>
                    <button class="btn-primary" onclick="window.hienThiManager.confirmSplitYear('${this.escapeHtml(groupName)}', '${yearDisplay}')">Chia</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Thêm sự kiện cho checkbox
        const createNewYearCheckbox = modal.querySelector('#create-new-year');
        const newYearInput = modal.querySelector('#new-year-input');
        if (createNewYearCheckbox && newYearInput) {
            createNewYearCheckbox.addEventListener('change', (e) => {
                newYearInput.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    confirmSplitGroup(groupName) {
        const modal = document.querySelector('.split-group-modal');
        if (!modal) return;
        
        const method = modal.querySelector('#split-method').value;
        
        switch(method) {
            case 'year':
                this.splitGroupByYear(groupName);
                break;
            case 'quantity':
                this.splitGroupByQuantity(groupName);
                break;
            case 'room':
                this.splitGroupByRoom(groupName);
                break;
        }
        
        modal.remove();
    }
confirmSplitYear(groupName, yearDisplay) {
    const modal = document.querySelector('.split-year-modal');
    if (!modal) return;
    
    const quantity = parseInt(modal.querySelector('#split-quantity').value);
    const deviceId = parseInt(modal.querySelector('#split-device').value);
    const createNewYear = modal.querySelector('#create-new-year').checked;
    const newYear = createNewYear ? parseInt(modal.querySelector('#new-year-value').value) : null;
    
    if (!quantity || isNaN(quantity) || quantity <= 0) {
        this.showNotification('Số lượng không hợp lệ', 'error');
        return;
    }
    
    // Gọi action split device với options
    AppEvents.emit('action:splitDevice', deviceId, { quantity, newYear });
    
    // Loại bỏ AppEvents.emit('action:deviceSplit'); vì logic đã được fix đồng bộ trong quanly.js
    
    modal.remove();
}

    // ========== UTILITY FUNCTIONS ==========
    switchView(view) {
        this.currentView = view;
        
        // Update active state
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Sử dụng querySelector để tìm nút chính xác và thêm class active
        const btn = document.querySelector(`.view-btn[onclick*="'${view}'"]`);
        if (btn) btn.classList.add('active');
        
        // Refresh view
        this.refreshView();
    }

    refreshView() {
        if (window.quanLyManager) {
            // Lấy dữ liệu đã phân trang để render (data sẽ được emit)
            const devices = window.quanLyManager.getCurrentPageDevices();
            this.renderDevices(devices);
            this.updateGlobalCheckbox();
            this.updateSelectionInfo();
        }
    }

    // THÊM: Hàm tiện ích để điều khiển hiển thị phân trang
    togglePagination(show) {
        const paginationSection = document.getElementById('pagination-section');
        if (paginationSection) {
            paginationSection.style.display = show ? 'block' : 'none';
        }
    }

    updateGlobalCheckbox() {
        const globalCheckbox = document.getElementById('global-select-all');
        if (!globalCheckbox || !window.quanLyManager) return;
        
        const currentPageDevices = window.quanLyManager.getCurrentPageDevices();
        
        if (currentPageDevices.length === 0) {
            globalCheckbox.checked = false;
            globalCheckbox.indeterminate = false;
            return;
        }
        
        const selectedOnPage = currentPageDevices.filter(device => 
            this.selectedDevices.has(device.id)
        ).length;
        
        if (selectedOnPage === 0) {
            globalCheckbox.checked = false;
            globalCheckbox.indeterminate = false;
        } else if (selectedOnPage === currentPageDevices.length) {
            globalCheckbox.checked = true;
            globalCheckbox.indeterminate = false;
        } else {
            globalCheckbox.checked = false;
            globalCheckbox.indeterminate = true;
        }
    }

    globalToggleAll(checked) {
        if (!window.quanLyManager) {
            console.error('quanLyManager not initialized');
            return;
        }
        
        const currentPageDevices = window.quanLyManager.getCurrentPageDevices();
        
        if (checked) {
            currentPageDevices.forEach(device => {
                this.selectedDevices.add(device.id);
            });
        } else {
            currentPageDevices.forEach(device => {
                this.selectedDevices.delete(device.id);
            });
        }
        
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
        this.showNotification(
            checked ? `Đã chọn ${currentPageDevices.length} thiết bị` : 
                     `Đã bỏ chọn ${currentPageDevices.length} thiết bị`,
            'info'
        );
        this.refreshView();
    }

    updateSelectionInfo() {
        const selectionInfo = document.getElementById('selection-info');
        if (!selectionInfo) return;
        
        const selectedCount = this.selectedDevices.size;
        const selectedCountSpan = selectionInfo.querySelector('.selected-count');
        
        if (selectedCountSpan) {
            selectedCountSpan.textContent = selectedCount;
        } else {
            selectionInfo.innerHTML = `<span class="selected-count">${selectedCount}</span> thiết bị được chọn`;
        }
        
        // Luôn hiển thị thông tin lựa chọn khi có > 0 thiết bị được chọn
        selectionInfo.style.display = selectedCount > 0 ? 'block' : 'none';
    }

    updateGroupSelections(selectedDevices) {
        this.selectedDevices = selectedDevices || new Set();
        this.refreshView();
    }

    calculateTotalValue(devices) {
        return devices.reduce((sum, device) => 
            sum + (device.nguyen_gia || 0) * (device.so_luong || 1), 0
        );
    }

    // ========== FORMATTING FUNCTIONS ==========
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe || '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatCurrency(amount) {
        if (amount === undefined || amount === null) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    getStatusClass(status) {
        const statusMap = {
            'Đang sử dụng': 'success',
            'Bảo trì': 'warning', 
            'Hỏng': 'danger',
            'Ngừng sử dụng': 'secondary'
        };
        return statusMap[status] || 'secondary';
    }

    getStatusIcon(status) {
        const iconMap = {
            'Đang sử dụng': '🟢',
            'Bảo trì': '🟡',
            'Hỏng': '🔴',
            'Ngừng sử dụng': '⚫'
        };
        return iconMap[status] || '⚪';
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>Không có thiết bị nào</h3>
                <p>Hãy thêm thiết bị đầu tiên để bắt đầu quản lý</p>
                <button class="btn-primary" onclick="AppEvents.emit('action:addDevice')">
                    ➕ Thêm thiết bị đầu tiên
                </button>
            </div>
        `;
    }

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
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }

    showNotification(message, type = 'info') {
        AppEvents.emit('notification:show', {
            message: message,
            type: type
        });
    }

    // ========== PAGINATION ==========
    renderPagination(paginationInfo) {
        const paginationSection = document.getElementById('pagination-section');
        if (!paginationSection) return;
        
        const { currentPage, totalPages, totalDevices, startIndex, endIndex, itemsPerPage } = paginationInfo;
        
        paginationSection.innerHTML = `
            <div class="pagination-info">
                <span class="device-count">Hiển thị ${startIndex}-${endIndex} của ${totalDevices} thiết bị</span>
                <span class="page-size-selector">
                    <select id="page-size-select" onchange="window.hienThiManager.changePageSizeHandler(event)">
                        <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10/trang</option>
                        <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25/trang</option>
                        <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50/trang</option>
                        <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100/trang</option>
                        <option value="1000" ${itemsPerPage === 1000 ? 'selected' : ''}>Tất cả</option>
                    </select>
                </span>
            </div>
            <div class="pagination-controls">
                ${this.renderPageButtons(currentPage, totalPages)}
            </div>
        `;
        
    }

    renderPageButtons(currentPage, totalPages) {
        if (totalPages <= 1) return '';
        
        let buttons = '';
        const maxVisiblePages = 5;
        
        // Previous button
        if (currentPage > 1) {
            buttons += `<button class="page-nav" onclick="AppEvents.emit('data:changePage', ${currentPage - 1})">◀️ Trước</button>`;
        } else {
            buttons += `<button class="page-nav disabled" disabled>◀️ Trước</button>`;
        }
        
        // Page numbers
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            buttons += `<button class="page-number" onclick="AppEvents.emit('data:changePage', 1)">1</button>`;
            if (startPage > 2) buttons += `<span class="page-dots">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            buttons += `
                <button class="page-number ${i === currentPage ? 'active' : ''}" 
                        onclick="AppEvents.emit('data:changePage', ${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) buttons += `<span class="page-dots">...</span>`;
            buttons += `<button class="page-number" onclick="AppEvents.emit('data:changePage', ${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        if (currentPage < totalPages) {
            buttons += `<button class="page-nav" onclick="AppEvents.emit('data:changePage', ${currentPage + 1})">Sau ▶️</button>`;
        } else {
            buttons += `<button class="page-nav disabled" disabled>Sau ▶️</button>`;
        }
        
        return buttons;
    }

    changePage(page) {
        AppEvents.emit('data:changePage', page);
    }

    changePageSize(size) {
        AppEvents.emit('data:changePageSize', size === 'all' ? 1000 : parseInt(size));
    }

    changePageSizeHandler(event) {
        const size = event.target.value === '1000' ? 1000 : parseInt(event.target.value);
        AppEvents.emit('data:changePageSize', size);
    }

    toggleBulkPanel() {
        AppEvents.emit('ui:toggleBulkPanel');
    }

    bindViewEvents() {
        // Add any additional view-specific event bindings here
    }

    bindGlobalEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-close-modal')) {
                this.closeAllModals();
            }
        });
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
    }

    // ========== DEVICE DETAILS & EDIT ==========
    showDeviceDetails(deviceId) {
        if (!window.quanLyManager) {
            this.showNotification('Không thể hiển thị chi tiết', 'error');
            return;
        }
        
        AppEvents.emit('data:getDevice', {
            deviceId: deviceId, 
            callback: (device) => {
                if (device) {
                    this.renderDeviceModal(device);
                }
            }
        });
    }

    showEditDevice(deviceId) {
        if (!window.quanLyManager) {
            this.showNotification('Không thể chỉnh sửa', 'error');
            return;
        }
        
        AppEvents.emit('data:getDevice', {
            deviceId: deviceId, 
            callback: (device) => {
                if (device) {
                    this.currentEditDevice = device;
                    this.renderEditModal(device);
                }
            }
        });
    }

    async showDeviceHistory(deviceId) {
        if (window.historyManager) {
            window.historyManager.showDeviceHistory(deviceId);
        } else {
            this.showNotification('Hệ thống lịch sử chưa sẵn sàng', 'warning');
        }
    }

    // ========== DEVICE MODAL TEMPLATES ==========
    renderDeviceModal(device) {
        const modal = this.createModal('device-details');
        modal.innerHTML = this.getDeviceDetailsHTML(device);
        document.body.appendChild(modal);
    }

    renderEditModal(device) {
        const modal = this.createModal('edit-device');
        modal.innerHTML = this.getEditDeviceHTML(device);
        document.body.appendChild(modal);
        
        this.loadEditModalData(modal, device);
    }

    getDeviceDetailsHTML(device) {
        const totalValue = (device.nguyen_gia || 0) * (device.so_luong || 1);
        
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>👁️ CHI TIẾT THIẾT BỊ</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="device-details-grid">
                        <div class="detail-item">
                            <label>Tên thiết bị:</label>
                            <span>${this.escapeHtml(device.ten_thiet_bi)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Model:</label>
                            <span>${this.escapeHtml(device.model || 'N/A')}</span>
                        </div>
                        <div class="detail-item">
                            <label>Nhà SX:</label>
                            <span>${this.escapeHtml(device.nha_san_xuat || 'N/A')}</span>
                        </div>
                        <div class="detail-item">
                            <label>Năm SX:</label>
                            <span>${device.nam_san_xuat || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Số lượng:</label>
                            <span>${device.so_luong} ${device.don_vi_tinh || 'cái'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Nguyên giá:</label>
                            <span>${this.formatCurrency(device.nguyen_gia || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Thành tiền:</label>
                            <span class="total-price">${this.formatCurrency(totalValue)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Trạng thái:</label>
                            <span class="status-badge status-${this.getStatusClass(device.tinh_trang)}">
                                ${device.tinh_trang}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Phòng ban:</label>
                            <span>${this.escapeHtml(device.phong_ban || 'N/A')}</span>
                        </div>
                        <div class="detail-item">
                            <label>Nhân viên QL:</label>
                            <span>${this.escapeHtml(device.nhan_vien_ql || 'N/A')}</span>
                        </div>
                        <div class="detail-item">
                            <label>Phân loại SP:</label>
                            <span>${device.phan_loai || 'N/A'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Ghi chú:</label>
                            <span>${this.escapeHtml(device.ghi_chu || 'Không có ghi chú')}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AppEvents.emit('ui:showDeviceHistory', ${device.id})">
                        🕒 Lịch sử
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Đóng</button>
                    <button class="btn-primary" onclick="AppEvents.emit('ui:showEditDevice', ${device.id}); this.closest('.modal').remove()">
                        ✏️ Chỉnh sửa
                    </button>
                </div>
            </div>
        `;
    }

    getEditDeviceHTML(device) {
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✏️ CHỈNH SỬA THIẾT BỊ</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <form id="edit-device-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Tên thiết bị *</label>
                                <input type="text" name="ten_thiet_bi" value="${this.escapeHtml(device.ten_thiet_bi)}" required>
                            </div>
                            <div class="form-group">
                                <label>Model</label>
                                <input type="text" name="model" value="${this.escapeHtml(device.model || '')}">
                            </div>
                            <div class="form-group">
                                <label>Nhà sản xuất</label>
                                <input type="text" name="nha_san_xuat" value="${this.escapeHtml(device.nha_san_xuat || '')}">
                            </div>
                            <div class="form-group">
                                <label>Năm sản xuất</label>
                                <input type="number" name="nam_san_xuat" value="${device.nam_san_xuat || ''}">
                            </div>
                            <div class="form-group">
                                <label>Số lượng *</label>
                                <input type="number" name="so_luong" value="${device.so_luong}" required min="1">
                            </div>
                            <div class="form-group">
                                <label>Nguyên giá (VND)</label>
                                <input type="number" name="nguyen_gia" value="${device.nguyen_gia || 0}" step="1000">
                            </div>
                            <div class="form-group">
                                <label>Phân loại SP</label>
                                <select name="phan_loai">
                                    <option value="">Chọn phân loại</option>
                                    <option value="taisan" ${device.phan_loai === 'taisan' ? 'selected' : ''}>TÀI SẢN</option>
                                    <option value="haophi" ${device.phan_loai === 'haophi' ? 'selected' : ''}>HAO PHÍ</option>
                                    <option value="thietbi" ${device.phan_loai === 'thietbi' ? 'selected' : ''}>THIẾT BỊ Y TẾ</option>
                                    <option value="dungcu" ${device.phan_loai === 'dungcu' ? 'selected' : ''}>DỤNG CỤ Y TẾ</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Tình trạng</label>
                                <select name="tinh_trang">
                                    <option value="Đang sử dụng" ${device.tinh_trang === 'Đang sử dụng' ? 'selected' : ''}>🟢 Đang sử dụng</option>
                                    <option value="Bảo trì" ${device.tinh_trang === 'Bảo trì' ? 'selected' : ''}>🟡 Bảo trì</option>
                                    <option value="Hỏng" ${device.tinh_trang === 'Hỏng' ? 'selected' : ''}>🔴 Hỏng</option>
                                    <option value="Ngừng sử dụng" ${device.tinh_trang === 'Ngừng sử dụng' ? 'selected' : ''}>⚫ Ngừng sử dụng</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Phòng ban</label>
                                <select name="phong_ban" id="edit-phong-ban">
                                    <option value="">Chọn phòng ban</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Nhân viên QL</label>
                                <select name="nhan_vien_ql" id="edit-nhan-vien">
                                    <option value="">Chọn nhân viên</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Đơn vị tính</label>
                                <select name="don_vi_tinh" id="edit-don-vi-tinh">
                                    <option value="cái" ${device.don_vi_tinh === 'cái' ? 'selected' : ''}>cái</option>
                                    <option value="bộ" ${device.don_vi_tinh === 'bộ' ? 'selected' : ''}>bộ</option>
                                    <option value="chiếc" ${device.don_vi_tinh === 'chiếc' ? 'selected' : ''}>chiếc</option>
                                    <option value="hộp" ${device.don_vi_tinh === 'hộp' ? 'selected' : ''}>hộp</option>
                                </select>
                            </div>
                            <div class="form-group full-width">
                                <label>Ghi chú</label>
                                <textarea name="ghi_chu" rows="3">${this.escapeHtml(device.ghi_chu || '')}</textarea>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Hủy</button>
                    <button class="btn-primary" onclick="window.hienThiManager.saveDevice(${device.id})">💾 Lưu thay đổi</button>
                </div>
            </div>
        `;
    }

    async loadEditModalData(modal, currentDevice) {
        try {
            const departments = await medicalDB.getAllDepartments();
            const staff = await medicalDB.getAllStaff();
            
            // Fill departments
            const deptSelect = modal.querySelector('#edit-phong-ban');
            if (deptSelect) {
                deptSelect.innerHTML = '<option value="">Chọn phòng ban</option>' +
                    departments.map(dept => 
                        `<option value="${dept.ten_phong}">${dept.ten_phong}</option>`
                    ).join('');
                
                if (currentDevice && currentDevice.phong_ban) {
                    deptSelect.value = currentDevice.phong_ban;
                }
            }
            
            // Fill staff
            const staffSelect = modal.querySelector('#edit-nhan-vien');
            if (staffSelect) {
                staffSelect.innerHTML = '<option value="">Chọn nhân viên</option>' +
                    staff.map(s => {
                        const staffName = s.ten_nhan_vien || s.ten || '';
                        const staffPosition = s.chuc_vu || '';
                        return `<option value="${staffName}">${staffName}${staffPosition ? ` - ${staffPosition}` : ''}</option>`;
                    }).join('');
                
                if (currentDevice && currentDevice.nhan_vien_ql) {
                    staffSelect.value = currentDevice.nhan_vien_ql;
                }
            }
            
            // Set unit
            const unitSelect = modal.querySelector('#edit-don-vi-tinh');
            if (unitSelect && currentDevice && currentDevice.don_vi_tinh) {
                unitSelect.value = currentDevice.don_vi_tinh;
            }
            
        } catch (error) {
            console.error('Error loading edit modal data:', error);
        }
    }

    saveDevice(deviceId) {
        const form = document.getElementById('edit-device-form');
        if (!form) return;
        
        const formData = new FormData(form);
        const updates = {};
        
        for (let [key, value] of formData.entries()) {
            if (key === 'so_luong' || key === 'nam_san_xuat' || key === 'nguyen_gia') {
                updates[key] = value ? parseInt(value) : null;
            } else {
                updates[key] = value;
            }
        }
        
        AppEvents.emit('action:updateDevice', {deviceId, updates});
        
        const modal = document.querySelector('.edit-device');
        if (modal) {
            modal.remove();
        }
    }
}

// Khởi tạo global instance
window.hienThiManager = new HienThiManager();