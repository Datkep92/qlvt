// hienthi.js - Hiển thị giao diện chính (Hoàn chỉnh)
class HienThiManager {
    constructor() {
        this.moduleName = "HienThiManager";
        this.currentView = 'table';
        this.expandedGroups = new Set();
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
                const devices = window.quanLyManager.getCurrentPageDevices();
                this.renderDevices(devices);
                this.updateGlobalCheckbox();
            }
        });
    }

    async setup() {
        this.renderMainLayout();
        this.bindGlobalEvents();
        console.log('✅ HienThiManager ready');
    }

    // ========== MAIN LAYOUT ==========
    renderMainLayout() {
        const appContainer = document.getElementById('app') || document.body;
        appContainer.innerHTML = this.getMainTemplate();
        
        if (!document.getElementById('bulk-panel-section')) {
            const bulkContainer = document.createElement('div');
            bulkContainer.id = 'bulk-panel-section';
            appContainer.appendChild(bulkContainer);
        }
    }

    getMainTemplate() {
        return `
            <div class="medical-app">
                <!-- Header -->
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
                
                <!-- Bộ lọc -->
                <div class="filter-section" id="filter-section">
                    <!-- Filter sẽ được render bởi loc.js -->
                </div>
                
                
                
                <!-- Chế độ xem + Chọn tất cả -->
                <div class="view-controls-section">
                    <div class="view-mode-controls">
                        <div class="view-toggle-group">
                            <span class="view-label">Chế độ xem:</span>
                            <button class="view-btn ${this.currentView === 'table' ? 'active' : ''}" 
                                    onclick="window.hienThiManager.switchView('table')"
                                    title="Chế độ bảng">
                                📋 Bảng
                            </button>
                            <button class="view-btn ${this.currentView === 'cards' ? 'active' : ''}" 
                                    onclick="window.hienThiManager.switchView('cards')"
                                    title="Chế độ thẻ">
                                🃏 Thẻ
                            </button>
                            <button class="view-btn ${this.currentView === 'tree' ? 'active' : ''}" 
                                    onclick="window.hienThiManager.switchView('tree')"
                                    title="Chế độ cây">
                                🌲 Cây
                            </button>
                            <button class="view-btn ${this.currentView === 'group' ? 'active' : ''}" 
                                    onclick="window.hienThiManager.switchView('group')"
                                    title="Chế độ nhóm">
                                📊 Nhóm
                            </button>
                        </div>
                        <!-- Bulk Panel -->
                <div class="bulk-panel-section" id="bulk-panel-section">
                    <!-- Bulk panel sẽ được render bởi phanloai.js -->
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
                </div>
                
                <!-- Nội dung chính -->
                <main class="app-main">
                    <div id="devices-container">
                        <div class="loading">🔄 Đang tải thiết bị...</div>
                    </div>
                </main>
                
                <!-- Phân trang -->
                <div class="pagination-section" id="pagination-section"></div>
            </div>
        `;
    }

    // ========== RENDER VIEWS ==========
    renderDevices(data) {
        const container = document.getElementById('devices-container');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        try {
            switch(this.currentView) {
                case 'table':
                    container.innerHTML = this.renderTableView(data);
                    break;
                case 'cards':
                    container.innerHTML = this.renderCardsView(data);
                    break;
                case 'tree':
                    container.innerHTML = this.renderTreeView(data);
                    break;
                case 'group':
                    container.innerHTML = this.renderGroupView(data);
                    break;
                default:
                    container.innerHTML = this.renderTableView(data);
            }
            
            this.bindViewEvents();
        } catch (error) {
            console.error('Error rendering devices:', error);
            container.innerHTML = `<div class="error">Lỗi hiển thị: ${error.message}</div>`;
        }
    }

    // ========== TABLE VIEW ==========
    renderTableView(devices) {
        const selectedDevices = window.quanLyManager?.selectedDevices || new Set();
        
        return `
            <div class="table-container">
                <table class="devices-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="select-all" 
                                     onchange="AppEvents.emit('bulk:toggleAll', this.checked)"></th>
                            <th>#</th>
                            <th>Tên thiết bị</th>
                            <th>Model</th>
                            <th>Năm SX</th>
                            <th>SL</th>
                            <th>Giá</th>
                            <th>Trạng thái</th>
                            <th>Phòng ban</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devices.map((device, index) => this.getTableRowHTML(device, index, selectedDevices)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

   getTableRowHTML(device, index, selectedDevices) {
    return `
        <tr class="device-row">
            <!-- Các cột hiện tại -->
            
            <td>
                <div class="action-buttons">
                    <!-- THÊM NÚT NÀY -->
                    <button class="btn-action" onclick="window.historyManager.showDeviceHistory(${device.id})" 
                            title="Xem lịch sử" style="background: #8b5cf6;">
                        🕒
                    </button>
                    
                    <!-- Các nút hiện có -->
                    <button class="btn-action" onclick="AppEvents.emit('ui:showDeviceDetails', ${device.id})">👁️</button>
                    <button class="btn-action" onclick="AppEvents.emit('ui:showEditDevice', ${device.id})">✏️</button>
                    <button class="btn-action" onclick="AppEvents.emit('action:splitDevice', ${device.id})">🔄</button>
                    <button class="btn-action btn-delete" onclick="AppEvents.emit('action:deleteDevice', ${device.id})">🗑️</button>
                </div>
            </td>
        </tr>
    `;
}

    // ========== CARDS VIEW ==========
    renderCardsView(devices) {
        const selectedDevices = window.quanLyManager?.selectedDevices || new Set();
        
        return `
            <div class="cards-grid">
                ${devices.map(device => this.getDeviceCardHTML(device, selectedDevices)).join('')}
            </div>
        `;
    }

    getDeviceCardHTML(device, selectedDevices) {
        const totalValue = (device.nguyen_gia || 0) * (device.so_luong || 1);
        const isSelected = selectedDevices.has(device.id);
        
        return `
            <div class="device-card ${isSelected ? 'selected' : ''}">
                <div class="card-header">
                    <input type="checkbox" 
                           onchange="window.hienThiManager.toggleDeviceSelection(${device.id}, this.checked)"
                           ${isSelected ? 'checked' : ''}>
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
                    <button class="btn-card" onclick="AppEvents.emit('ui:showDeviceDetails', ${device.id})">👁️ Chi tiết</button>
                    <button class="btn-card" onclick="AppEvents.emit('ui:showEditDevice', ${device.id})">✏️ Sửa</button>
                </div>
            </div>
        `;
    }

    // ========== TREE VIEW ==========
    renderTreeView(devices) {
        const grouped = this.groupByDepartment(devices);
        const selectedDevices = window.quanLyManager?.selectedDevices || new Set();
        
        return `
            <div class="tree-view">
                ${Object.entries(grouped).map(([dept, deptDevices]) => `
                    <div class="tree-department">
                        <div class="dept-header" onclick="this.classList.toggle('collapsed')">
                            <span class="tree-icon">📂</span>
                            <span class="dept-name">${this.escapeHtml(dept)}</span>
                            <span class="dept-count">(${deptDevices.length})</span>
                        </div>
                        <div class="dept-devices">
                            ${deptDevices.map(device => this.getTreeDeviceHTML(device, selectedDevices)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getTreeDeviceHTML(device, selectedDevices) {
        const isSelected = selectedDevices.has(device.id);
        
        return `
            <div class="tree-device ${isSelected ? 'selected' : ''}">
                <input type="checkbox" 
                       onchange="window.hienThiManager.toggleDeviceSelection(${device.id}, this.checked)"
                       ${isSelected ? 'checked' : ''}
                       style="margin-right: 8px;">
                <span class="tree-icon">📄</span>
                <span class="device-name">${this.escapeHtml(device.ten_thiet_bi)}</span>
                <span class="device-details">
                    ${device.model ? `• ${device.model}` : ''}
                    • ${device.so_luong} cái
                    • ${this.getStatusIcon(device.tinh_trang)}
                </span>
                <div class="tree-actions">
                    <button class="btn-action" onclick="AppEvents.emit('ui:showDeviceDetails', ${device.id})">👁️</button>
                    <button class="btn-action" onclick="AppEvents.emit('ui:showEditDevice', ${device.id})">✏️</button>
                </div>
            </div>
        `;
    }

    // ========== GROUP VIEW ==========
    renderGroupView(devices) {
        try {
            const groupedDevices = this.groupDevicesByName(devices);
            const groupKeys = Object.keys(groupedDevices);
            const selectedDevices = window.quanLyManager?.selectedDevices || new Set();
            
            if (groupKeys.length === 0) {
                return `<div class="empty-state">Không có thiết bị để nhóm</div>`;
            }
            
            return `
                <div class="group-view">
                    ${groupKeys.map((groupName, groupIndex) => this.renderGroupItem(groupName, groupedDevices[groupName], groupIndex, selectedDevices)).join('')}
                    
                    ${groupKeys.length > 0 ? `
                        <div class="group-select-all">
                            <input type="checkbox" id="select-all-groups" 
                                   onchange="window.hienThiManager.toggleSelectAllGroups(this.checked, '${groupKeys.map(k => this.escapeHtml(k)).join('|')}')">
                            <label for="select-all-groups">Chọn tất cả nhóm</label>
                            <span class="selected-count">${selectedDevices.size} thiết bị đã chọn</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            console.error('Error rendering group view:', error);
            return `<div class="error">Lỗi hiển thị chế độ nhóm: ${error.message}</div>`;
        }
    }

    renderGroupItem(groupName, groupData, groupIndex, selectedDevices) {
        const isExpanded = this.expandedGroups.has(groupName);
        const isGroupSelected = this.isGroupSelected(groupName, selectedDevices);
        const activeCount = groupData.items.reduce((sum, item) => 
            sum + (item.tinh_trang === 'Đang sử dụng' ? item.so_luong : 0), 0);
        const totalCount = groupData.items.reduce((sum, item) => sum + item.so_luong, 0);
        
        return `
            <div class="device-group" data-group="${this.escapeHtml(groupName)}">
                <div class="group-header ${isExpanded ? 'expanded' : ''}" 
                     onclick="window.hienThiManager.toggleGroup('${this.escapeHtml(groupName)}')">
                    <div class="group-info">
                        <input type="checkbox" 
                               class="group-checkbox"
                               onclick="event.stopPropagation(); window.hienThiManager.toggleGroupSelection('${this.escapeHtml(groupName)}', this.checked)"
                               ${isGroupSelected ? 'checked' : ''}
                               title="Chọn toàn bộ nhóm">
                        
                        <span class="group-stt">${groupIndex + 1}</span>
                        <span class="group-icon">📁</span>
                        <span class="group-name">${this.escapeHtml(groupName)}</span>
                        <span class="group-stats">
                            — Tổng: ${activeCount}/${totalCount} active
                        </span>
                    </div>
                    <div class="group-actions">
                        <button class="btn-action" onclick="event.stopPropagation(); window.hienThiManager.splitGroup('${this.escapeHtml(groupName)}')" title="Chia nhanh">🔄</button>
                        <button class="btn-action" onclick="event.stopPropagation(); window.hienThiManager.editGroupName('${this.escapeHtml(groupName)}')" title="Sửa tên nhóm">✏️</button>
                        <button class="btn-action" onclick="event.stopPropagation(); window.hienThiManager.deleteGroup('${this.escapeHtml(groupName)}')" title="Xóa nhóm">🗑️</button>
                        <span class="toggle-icon">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                
                ${isExpanded ? `
                    <div class="group-content">
                        ${this.renderGroupItems(groupData.items, groupName, selectedDevices)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderGroupItems(items, groupName, selectedDevices) {
        const allInGroupSelected = items.every(item => selectedDevices.has(item.id));
        
        return `
            <div class="group-items">
                <div class="group-items-header">
                    <div class="items-checkbox">
                        <input type="checkbox" 
                               class="select-all-items"
                               onclick="window.hienThiManager.toggleSelectAllItemsInGroup('${this.escapeHtml(groupName)}', this.checked)"
                               ${allInGroupSelected ? 'checked' : ''}
                               title="Chọn tất cả trong nhóm này">
                        <span class="items-count">${items.length} thiết bị trong nhóm</span>
                    </div>
                    <div class="items-actions">
                        <button class="btn-small" onclick="window.hienThiManager.selectGroupForBulk('${this.escapeHtml(groupName)}', 'category')" title="Phân loại nhóm">🏷️</button>
                        <button class="btn-small" onclick="window.hienThiManager.selectGroupForBulk('${this.escapeHtml(groupName)}', 'room')" title="Điều chuyển phòng">🏢</button>
                        <button class="btn-small" onclick="window.hienThiManager.selectGroupForBulk('${this.escapeHtml(groupName)}', 'status')" title="Đổi trạng thái">🔄</button>
                    </div>
                </div>
                
                ${items.map((item, index) => this.renderGroupItemRow(item, index, groupName, selectedDevices)).join('')}
            </div>
        `;
    }

    renderGroupItemRow(item, index, groupName, selectedDevices) {
        const activeQty = item.tinh_trang === 'Đang sử dụng' ? item.so_luong : 0;
        const isItemSelected = selectedDevices.has(item.id);
        
        return `
            <div class="group-item ${isItemSelected ? 'selected' : ''}" data-item-id="${item.id}">
                <div class="item-main">
                    <div class="item-info">
                        <input type="checkbox" 
                               class="item-checkbox"
                               onclick="event.stopPropagation(); window.hienThiManager.toggleItemSelection(${item.id}, this.checked, '${this.escapeHtml(groupName)}')"
                               ${isItemSelected ? 'checked' : ''}>
                        
                        <span class="item-stt">${index + 1}</span>
                        <span class="item-icon">📄</span>
                        <span class="item-name">${this.escapeHtml(item.ten_thiet_bi)}</span>
                        <span class="item-details">
                            ${item.nam_san_xuat ? `${item.nam_san_xuat} • ` : ''}
                            SL: ${activeQty}/${item.so_luong} ${this.getStatusIcon(item.tinh_trang)}
                        </span>
                        <span class="item-location">
                            ${item.phong_ban ? `• ${this.escapeHtml(item.phong_ban)}` : ''}
                            ${item.nhan_vien_ql ? `• NV: ${this.escapeHtml(item.nhan_vien_ql)}` : ''}
                        </span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-action" onclick="event.stopPropagation(); AppEvents.emit('ui:showDeviceDetails', ${item.id})" title="Chi tiết">👁️</button>
                        <button class="btn-action" onclick="event.stopPropagation(); AppEvents.emit('ui:showEditDevice', ${item.id})" title="Sửa">✏️</button>
                        <button class="btn-action" onclick="event.stopPropagation(); AppEvents.emit('action:splitDevice', ${item.id})" title="Chia/điều chuyển">🔄</button>
                        <button class="btn-action btn-delete" onclick="event.stopPropagation(); AppEvents.emit('action:deleteDevice', ${item.id})" title="Xóa">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== GROUP VIEW FUNCTIONS ==========
    groupDevicesByName(devices) {
        const groups = {};
        
        devices.forEach(device => {
            const key = device.ten_thiet_bi || 'Chưa đặt tên';
            
            if (!groups[key]) {
                groups[key] = { name: key, items: [] };
            }
            
            const existingItem = groups[key].items.find(item => 
                item.nam_san_xuat === device.nam_san_xuat &&
                item.nguyen_gia === device.nguyen_gia &&
                item.phong_ban === device.phong_ban &&
                item.nhan_vien_ql === device.nhan_vien_ql &&
                item.tinh_trang === device.tinh_trang
            );
            
            if (existingItem) {
                existingItem.so_luong += device.so_luong;
            } else {
                groups[key].items.push({...device});
            }
        });
        
        return groups;
    }

    isGroupSelected(groupName, selectedDevices) {
        if (!window.quanLyManager) return false;
        
        const devices = window.quanLyManager.getCurrentPageDevices();
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        
        return groupDevices.length > 0 && 
               groupDevices.every(device => selectedDevices.has(device.id));
    }

    toggleGroup(groupName) {
        if (this.expandedGroups.has(groupName)) {
            this.expandedGroups.delete(groupName);
        } else {
            this.expandedGroups.add(groupName);
        }
        this.refreshView();
    }

    toggleGroupSelection(groupName, checked) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getCurrentPageDevices();
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        
        if (checked) {
            groupDevices.forEach(device => {
                window.quanLyManager.selectedDevices.add(device.id);
            });
        } else {
            groupDevices.forEach(device => {
                window.quanLyManager.selectedDevices.delete(device.id);
            });
        }
        
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
    }

    toggleItemSelection(itemId, checked, groupName) {
        if (!window.quanLyManager) return;
        
        if (checked) {
            window.quanLyManager.selectedDevices.add(itemId);
        } else {
            window.quanLyManager.selectedDevices.delete(itemId);
        }
        
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
    }

    toggleSelectAllGroups(checked, groupNames) {
        if (!window.quanLyManager) return;
        
        const groupArray = groupNames.split('|');
        const devices = window.quanLyManager.getCurrentPageDevices();
        
        if (checked) {
            devices.forEach(device => {
                if (groupArray.includes(device.ten_thiet_bi)) {
                    window.quanLyManager.selectedDevices.add(device.id);
                }
            });
        } else {
            devices.forEach(device => {
                if (groupArray.includes(device.ten_thiet_bi)) {
                    window.quanLyManager.selectedDevices.delete(device.id);
                }
            });
        }
        
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
    }

    toggleSelectAllItemsInGroup(groupName, checked) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getCurrentPageDevices();
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        
        if (checked) {
            groupDevices.forEach(device => {
                window.quanLyManager.selectedDevices.add(device.id);
            });
        } else {
            groupDevices.forEach(device => {
                window.quanLyManager.selectedDevices.delete(device.id);
            });
        }
        
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
    }

    selectGroupForBulk(groupName, actionType) {
        if (!window.quanLyManager) return;
        
        const devices = window.quanLyManager.getCurrentPageDevices();
        const groupDevices = devices.filter(d => d.ten_thiet_bi === groupName);
        
        groupDevices.forEach(device => {
            window.quanLyManager.selectedDevices.add(device.id);
        });
        
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
        
        this.showNotification(`Nhóm "${groupName}" đã được chọn. Sử dụng panel THAO TÁC HÀNG LOẠT để ${this.getActionDescription(actionType)}`);
        AppEvents.emit('ui:toggleBulkPanel');
    }

    getActionDescription(actionType) {
        switch(actionType) {
            case 'category': return 'phân loại';
            case 'room': return 'điều chuyển phòng';
            case 'status': return 'đổi trạng thái';
            default: return 'thao tác';
        }
    }

    editGroupName(groupName) {
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

    deleteGroup(groupName) {
        if (confirm(`Xóa toàn bộ nhóm "${groupName}"?`)) {
            if (!window.quanLyManager || !window.quanLyManager.allDevices) {
                this.showNotification('Không thể xóa nhóm', 'error');
                return;
            }
            
            const devices = window.quanLyManager.allDevices.filter(d => d.ten_thiet_bi === groupName);
            
            devices.forEach(device => {
                AppEvents.emit('action:deleteDevice', device.id);
            });
            
            setTimeout(() => {
                if (window.quanLyManager) {
                    window.quanLyManager.loadDevices();
                }
            }, 500);
        }
    }

    splitGroup(groupName) {
        if (!window.quanLyManager || !window.quanLyManager.allDevices) {
            this.showNotification('Không thể chia nhóm', 'error');
            return;
        }
        
        const devices = window.quanLyManager.allDevices.filter(d => d.ten_thiet_bi === groupName);
        
        if (devices.length === 0) {
            this.showNotification('Không tìm thấy thiết bị trong nhóm', 'error');
            return;
        }
        
        this.showSplitGroupModal(groupName, devices);
    }

    showSplitGroupModal(groupName, devices) {
        const modal = this.createModal('split-group-modal');
        const totalQuantity = devices.reduce((sum, device) => sum + (device.so_luong || 0), 0);
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔄 CHIA NHÓM: ${this.escapeHtml(groupName)}</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p>Tổng số lượng trong nhóm: <strong>${totalQuantity}</strong></p>
                    <div class="split-options">
                        <label for="split-quantity">Số lượng muốn tách:</label>
                        <input type="number" id="split-quantity" min="1" max="${totalQuantity - 1}" value="1">
                        
                        <label for="split-device">Chọn thiết bị để tách:</label>
                        <select id="split-device">
                            ${devices.map(device => `
                                <option value="${device.id}">
                                    ${this.escapeHtml(device.ten_thiet_bi)} - SL: ${device.so_luong} - ${device.phong_ban || ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Hủy</button>
                    <button class="btn-primary" onclick="window.hienThiManager.executeSplitGroup('${this.escapeHtml(groupName)}')">Chia</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    executeSplitGroup(groupName) {
        const modal = document.querySelector('.split-group-modal');
        if (!modal) return;
        
        const quantity = parseInt(modal.querySelector('#split-quantity').value);
        const deviceId = parseInt(modal.querySelector('#split-device').value);
        
        if (!quantity || isNaN(quantity) || quantity <= 0) {
            this.showNotification('Số lượng không hợp lệ', 'error');
            return;
        }
        
        AppEvents.emit('action:splitDevice', deviceId);
        modal.remove();
    }

    // ========== SELECTION MANAGEMENT ==========
    globalToggleAll(checked) {
        if (!window.quanLyManager) {
            console.error('quanLyManager not initialized');
            return;
        }
        
        const currentPageDevices = window.quanLyManager.getCurrentPageDevices();
        
        if (checked) {
            currentPageDevices.forEach(device => {
                window.quanLyManager.selectedDevices.add(device.id);
            });
        } else {
            currentPageDevices.forEach(device => {
                window.quanLyManager.selectedDevices.delete(device.id);
            });
        }
        
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
        this.showNotification(
            checked ? `Đã chọn ${currentPageDevices.length} thiết bị` : 
                     `Đã bỏ chọn ${currentPageDevices.length} thiết bị`,
            'info'
        );
        this.refreshView();
    }

    globalClearAll() {
        if (!window.quanLyManager) {
            console.error('quanLyManager not initialized');
            return;
        }
        
        window.quanLyManager.selectedDevices.clear();
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
        
        const globalCheckbox = document.getElementById('global-select-all');
        if (globalCheckbox) {
            globalCheckbox.checked = false;
            globalCheckbox.indeterminate = false;
        }
        
        this.showNotification('Đã bỏ chọn tất cả thiết bị', 'success');
        this.refreshView();
    }

    toggleDeviceSelection(deviceId, checked) {
        if (!window.quanLyManager) {
            console.error('quanLyManager not initialized');
            return;
        }
        
        if (checked) {
            window.quanLyManager.selectedDevices.add(deviceId);
        } else {
            window.quanLyManager.selectedDevices.delete(deviceId);
        }
        
        AppEvents.emit('bulk:selectionUpdated', window.quanLyManager.selectedDevices);
        this.updateGlobalCheckbox();
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
            window.quanLyManager.selectedDevices.has(device.id)
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

    updateGroupSelections(selectedDevices) {
        this.refreshView();
    }

    updateSelectionInfo() {
        const selectionInfo = document.getElementById('selection-info');
        if (!selectionInfo || !window.quanLyManager) return;
        
        const selectedCount = window.quanLyManager.selectedDevices.size;
        const selectedCountSpan = selectionInfo.querySelector('.selected-count');
        
        if (selectedCountSpan) {
            selectedCountSpan.textContent = selectedCount;
        } else {
            selectionInfo.innerHTML = `<span class="selected-count">${selectedCount}</span> thiết bị được chọn`;
        }
        
        selectionInfo.style.display = selectedCount > 0 ? 'block' : 'none';
    }

    // ========== VIEW CONTROLS ==========
    switchView(view) {
        this.currentView = view;
        
        // Update active state
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        // Refresh view
        this.refreshView();
    }

    refreshView() {
        if (window.quanLyManager) {
            const devices = window.quanLyManager.getCurrentPageDevices();
            this.renderDevices(devices);
            this.updateGlobalCheckbox();
            this.updateSelectionInfo();
        }
    }

    bindViewEvents() {
        // Add any additional view-specific event bindings here
    }

    // ========== MODAL FUNCTIONS ==========
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

    renderDeviceModal(device) {
        const modal = this.createModal('device-details');
        modal.innerHTML = this.getDeviceDetailsHTML(device);
        document.body.appendChild(modal);
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
                 <!-- THÊM NÚT NÀY -->
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
    // Ghi lịch sử khi thêm thiết bị
async addDevice(deviceData) {
    try {
        const deviceId = await medicalDB.addDevice(deviceData);
        
        // Ghi lịch sử
        AppEvents.emit('action:recordHistory', {
            type: 'create',
            deviceId: deviceId,
            deviceName: deviceData.ten_thiet_bi,
            description: `Thêm mới thiết bị: ${deviceData.ten_thiet_bi}`,
            changes: deviceData,
            user: 'Quản trị viên'
        });
        
        return deviceId;
    } catch (error) {
        throw error;
    }
}

// Ghi lịch sử khi cập nhật
async updateDevice(deviceId, updates) {
    try {
        await medicalDB.updateDevice(deviceId, updates);
        
        // Ghi lịch sử
        AppEvents.emit('action:recordHistory', {
            type: 'update',
            deviceId: deviceId,
            deviceName: updates.ten_thiet_bi,
            description: `Cập nhật thiết bị`,
            changes: updates,
            user: 'Quản trị viên'
        });
        
    } catch (error) {
        throw error;
    }
}

// Ghi lịch sử khi xóa
async deleteDevice(deviceId) {
    try {
        const device = await medicalDB.getDevice(deviceId);
        await medicalDB.deleteDevice(deviceId);
        
        // Ghi lịch sử
        AppEvents.emit('action:recordHistory', {
            type: 'delete',
            deviceId: deviceId,
            deviceName: device.ten_thiet_bi,
            description: `Xóa thiết bị: ${device.ten_thiet_bi}`,
            changes: {},
            user: 'Quản trị viên'
        });
        
    } catch (error) {
        throw error;
    }
}
// Thêm hàm mới
async showDeviceHistory(deviceId) {
    if (window.historyManager) {
        window.historyManager.showDeviceHistory(deviceId);
    } else {
        this.showNotification('Hệ thống lịch sử chưa sẵn sàng', 'warning');
    }
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

    renderEditModal(device) {
        const modal = this.createModal('edit-device');
        modal.innerHTML = this.getEditDeviceHTML(device);
        document.body.appendChild(modal);
        
        this.loadEditModalData(modal, device);
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

 

    // ========== UTILITY FUNCTIONS ==========
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
        if (!amount) return '0 ₫';
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

    groupByDepartment(devices) {
        const groups = {};
        devices.forEach(device => {
            const dept = device.phong_ban || 'Chưa phân loại';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(device);
        });
        return groups;
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
        
        this.bindPaginationEvents();
    }

    bindPaginationEvents() {
        const pageSizeSelect = document.getElementById('page-size-select');
        if (pageSizeSelect) {
            pageSizeSelect.onchange = (event) => {
                const size = event.target.value === '1000' ? 1000 : parseInt(event.target.value);
                AppEvents.emit('data:changePageSize', size);
            };
        }
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

    // ========== GLOBAL EVENTS ==========
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
}

// Khởi tạo global instance
window.hienThiManager = new HienThiManager();