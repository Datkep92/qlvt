class EnhancedDevicesManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredDevices = [];
        this.selectedDevices = new Set();
        this.viewMode = 'table'; // 'table', 'cards', 'tree'
        this.currentFilters = {
            search: '',
            status: '',
            yearRange: '',
            department: '',
            unit: '',
            category: '',
            priceRange: '',
            dateRange: ''
        };
        this.sortConfig = {
            field: 'ten_thiet_bi',
            direction: 'asc'
        };
        this.init();
    }

    async init() {
        try {
            await this.loadReferenceData();
            await this.loadDevices();
            this.renderUI();
            this.setupEventListeners();
            console.log('🚀 Enhanced Devices Manager initialized');
        } catch (error) {
            console.error('❌ Error initializing:', error);
        }
    }

    renderUI() {
        const mainContainer = document.getElementById('devices-section') || this.createMainContainer();
        mainContainer.innerHTML = this.generateMainTemplate();
        this.renderStats();
        this.renderDevices();
    }

    createMainContainer() {
        const container = document.createElement('div');
        container.id = 'devices-section';
        container.className = 'devices-section';
        document.querySelector('.main-content').appendChild(container);
        return container;
    }

    generateMainTemplate() {
        return `
            <div class="enhanced-devices-container">
                <!-- Header với Stats -->
                <div class="devices-header">
                    <div class="header-main">
                        <h1>🏥 QUẢN LÝ THIẾT BỊ Y TẾ</h1>
                        <div class="header-actions">
                            <button class="btn-primary" onclick="enhancedDevices.showAddDeviceModal()">
                                ➕ Thêm mới
                            </button>
                            <button class="btn-secondary" onclick="enhancedDevices.importDevices()">
                                📥 Import
                            </button>
                            <button class="btn-secondary" onclick="enhancedDevices.exportDevices()">
                                📤 Export
                            </button>
                            <button class="btn-secondary" onclick="enhancedDevices.refreshData()">
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                    
                    <!-- Stats Cards -->
                    <div class="stats-container" id="stats-container">
                        <!-- Stats sẽ được render bằng JS -->
                    </div>
                </div>

                <!-- Quick Actions & Filters -->
                <div class="controls-section">
                    <!-- Quick Actions -->
                    <div class="quick-actions">
                        <div class="actions-group">
                            <button class="btn-action bulk-btn" onclick="enhancedDevices.toggleBulkOperations()">
                                🎛️ Thao tác hàng loạt
                            </button>
                            <button class="btn-action" onclick="enhancedDevices.generateQRCode()">
                                📱 QR Codes
                            </button>
                            <button class="btn-action" onclick="enhancedDevices.showMaintenanceSchedule()">
                                🛠️ Lịch bảo trì
                            </button>
                        </div>
                    </div>

                    <!-- Search & Filters -->
                    <div class="filters-section">
                        <div class="search-box">
                            <input type="text" id="global-search" placeholder="🔍 Tìm kiếm thiết bị, model, serial..." 
                                   class="search-input">
                            <button class="btn-search" onclick="enhancedDevices.performSearch()">Tìm</button>
                        </div>
                        
                        <div class="filter-group">
                            <select id="status-filter" class="filter-select">
                                <option value="">🏷️ Tất cả trạng thái</option>
                                <option value="Đang sử dụng">🟢 Đang sử dụng</option>
                                <option value="Bảo trì">🟡 Bảo trì</option>
                                <option value="Hỏng">🔴 Hỏng</option>
                                <option value="Ngừng sử dụng">⚫ Ngừng sử dụng</option>
                            </select>

                            <select id="department-filter" class="filter-select">
                                <option value="">🏥 Tất cả phòng ban</option>
                                ${this.departments.map(dept => 
                                    `<option value="${dept.ten_phong}">${dept.ten_phong}</option>`
                                ).join('')}
                            </select>

                            <select id="year-filter" class="filter-select">
                                <option value="">📅 Tất cả năm</option>
                                <option value="under5">🆕 Dưới 5 năm</option>
                                <option value="5-10">📊 5-10 năm</option>
                                <option value="10-20">🕰️ 10-20 năm</option>
                                <option value="over20">🏛️ Trên 20 năm</option>
                            </select>

                            <button class="btn-secondary" onclick="enhancedDevices.showAdvancedFilters()">
                                🔧 Bộ lọc nâng cao
                            </button>
                        </div>
                    </div>
                </div>

                <!-- View Toggle -->
                <div class="view-toggle">
                    <button class="view-btn ${this.viewMode === 'table' ? 'active' : ''}" 
                            data-view="table" onclick="enhancedDevices.switchView('table')">
                        📋 Bảng
                    </button>
                    <button class="view-btn ${this.viewMode === 'cards' ? 'active' : ''}" 
                            data-view="cards" onclick="enhancedDevices.switchView('cards')">
                        🃏 Thẻ
                    </button>
                    <button class="view-btn ${this.viewMode === 'tree' ? 'active' : ''}" 
                            data-view="tree" onclick="enhancedDevices.switchView('tree')">
                        🌲 Cây
                    </button>
                    <div class="view-info">
                        <span id="display-count">Hiển thị 1-10 của 150</span>
                        <select id="page-size" class="page-size-select" onchange="enhancedDevices.changePageSize(this.value)">
                            <option value="10">10 / trang</option>
                            <option value="25">25 / trang</option>
                            <option value="50">50 / trang</option>
                            <option value="100">100 / trang</option>
                        </select>
                    </div>
                </div>

                <!-- Bulk Operations Panel -->
                <div class="bulk-operations-panel" id="bulk-panel" style="display: none;">
                    <div class="bulk-header">
                        <h4>🎛️ THAO TÁC HÀNG LOẠT (<span id="selected-count">0</span> thiết bị)</h4>
                        <button class="btn-close" onclick="enhancedDevices.toggleBulkOperations()">✕</button>
                    </div>
                    <div class="bulk-content">
                        <div class="bulk-actions">
                            <select id="bulk-status" class="bulk-select">
                                <option value="">🏷️ Thay đổi trạng thái...</option>
                                <option value="Đang sử dụng">🟢 Đang sử dụng</option>
                                <option value="Bảo trì">🟡 Bảo trì</option>
                                <option value="Hỏng">🔴 Hỏng</option>
                            </select>
                            
                            <select id="bulk-department" class="bulk-select">
                                <option value="">🏥 Thay đổi phòng ban...</option>
                                ${this.departments.map(dept => 
                                    `<option value="${dept.ten_phong}">${dept.ten_phong}</option>`
                                ).join('')}
                            </select>

                            <button class="btn-danger" onclick="enhancedDevices.bulkDelete()">
                                🗑️ Xóa thiết bị
                            </button>
                            <button class="btn-secondary" onclick="enhancedDevices.bulkExport()">
                                📤 Export
                            </button>
                        </div>
                        <div class="bulk-selected">
                            <strong>Thiết bị đã chọn:</strong>
                            <div id="selected-list" class="selected-list"></div>
                        </div>
                    </div>
                </div>

                <!-- Devices Display Area -->
                <div class="devices-display-area">
                    <div id="devices-table-view" class="view-content ${this.viewMode === 'table' ? 'active' : ''}">
                        <!-- Table view sẽ được render bằng JS -->
                    </div>
                    
                    <div id="devices-cards-view" class="view-content ${this.viewMode === 'cards' ? 'active' : ''}">
                        <!-- Cards view sẽ được render bằng JS -->
                    </div>
                    
                    <div id="devices-tree-view" class="view-content ${this.viewMode === 'tree' ? 'active' : ''}">
                        <!-- Tree view sẽ được render bằng JS -->
                    </div>
                </div>

                <!-- Pagination -->
                <div class="pagination-section">
                    <div class="pagination-info">
                        <span id="page-info">Trang 1/15</span>
                    </div>
                    <div class="pagination-controls">
                        <button id="prev-page" class="btn-pagination" onclick="enhancedDevices.previousPage()">
                            ◀️ Trước
                        </button>
                        <div class="page-numbers" id="page-numbers">
                            <!-- Page numbers sẽ được render bằng JS -->
                        </div>
                        <button id="next-page" class="btn-pagination" onclick="enhancedDevices.nextPage()">
                            Tiếp ▶️
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modals sẽ được thêm bằng JS -->
        `;
    }

    async loadReferenceData() {
        try {
            this.departments = await medicalDB.getAllDepartments();
            this.units = await medicalDB.getAllUnits();
            this.staff = await medicalDB.getAllStaff();
        } catch (error) {
            console.error('Error loading reference data:', error);
            this.departments = [];
            this.units = [];
            this.staff = [];
        }
    }

    async loadDevices() {
        try {
            const devices = await medicalDB.getAllDevices();
            this.allDevices = devices;
            this.applyFiltersAndSort();
        } catch (error) {
            console.error('Error loading devices:', error);
            this.allDevices = [];
            this.filteredDevices = [];
        }
    }

    applyFiltersAndSort() {
        let filtered = this.allDevices.filter(device => 
            device.parent_id === null || device.parent_id === undefined
        );

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(device =>
                device.ten_thiet_bi.toLowerCase().includes(searchTerm) ||
                (device.model && device.model.toLowerCase().includes(searchTerm)) ||
                (device.nha_san_xuat && device.nha_san_xuat.toLowerCase().includes(searchTerm)) ||
                (device.serial_number && device.serial_number.toLowerCase().includes(searchTerm))
            );
        }

        // Apply status filter
        if (this.currentFilters.status) {
            filtered = filtered.filter(device => device.tinh_trang === this.currentFilters.status);
        }

        // Apply department filter
        if (this.currentFilters.department) {
            filtered = filtered.filter(device => device.phong_ban === this.currentFilters.department);
        }

        // Apply year filter
        if (this.currentFilters.yearRange) {
            filtered = filtered.filter(device => 
                this.filterByYearRange(device.nam_san_xuat, this.currentFilters.yearRange)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[this.sortConfig.field];
            let bValue = b[this.sortConfig.field];

            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();

            if (aValue < bValue) return this.sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.filteredDevices = filtered;
    }

    renderStats() {
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;

        const total = this.allDevices.length;
        const active = this.allDevices.filter(d => d.tinh_trang === 'Đang sử dụng').length;
        const maintenance = this.allDevices.filter(d => d.tinh_trang === 'Bảo trì').length;
        const broken = this.allDevices.filter(d => d.tinh_trang === 'Hỏng').length;
        const totalValue = this.allDevices.reduce((sum, device) => sum + (device.nguyen_gia * device.so_luong), 0);

        statsContainer.innerHTML = `
            <div class="stat-card total">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <div class="stat-number">${total}</div>
                    <div class="stat-label">Tổng thiết bị</div>
                </div>
            </div>
            <div class="stat-card active">
                <div class="stat-icon">🟢</div>
                <div class="stat-info">
                    <div class="stat-number">${active}</div>
                    <div class="stat-label">Đang sử dụng</div>
                </div>
            </div>
            <div class="stat-card maintenance">
                <div class="stat-icon">🟡</div>
                <div class="stat-info">
                    <div class="stat-number">${maintenance}</div>
                    <div class="stat-label">Bảo trì</div>
                </div>
            </div>
            <div class="stat-card broken">
                <div class="stat-icon">🔴</div>
                <div class="stat-info">
                    <div class="stat-number">${broken}</div>
                    <div class="stat-label">Hỏng</div>
                </div>
            </div>
            <div class="stat-card value">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                    <div class="stat-number">${this.formatCurrency(totalValue)}</div>
                    <div class="stat-label">Tổng giá trị</div>
                </div>
            </div>
        `;
    }

    renderDevices() {
        this.renderTableView();
        this.renderCardsView();
        this.renderTreeView();
        this.updatePagination();
        this.updateDisplayCount();
    }

    renderTableView() {
        const container = document.getElementById('devices-table-view');
        if (!container) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedDevices = this.filteredDevices.slice(startIndex, endIndex);

        if (paginatedDevices.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="devices-table">
                    <thead>
                        <tr>
                            <th width="30px">
                                <input type="checkbox" id="select-all" onchange="enhancedDevices.toggleSelectAll(this.checked)">
                            </th>
                            <th width="50px">#</th>
                            <th onclick="enhancedDevices.sortTable('ten_thiet_bi')">
                                TÊN THIẾT BỊ ${this.getSortIcon('ten_thiet_bi')}
                            </th>
                            <th width="80px" onclick="enhancedDevices.sortTable('nam_san_xuat')">
                                NĂM SX ${this.getSortIcon('nam_san_xuat')}
                            </th>
                            <th width="80px" onclick="enhancedDevices.sortTable('so_luong')">
                                SL ${this.getSortIcon('so_luong')}
                            </th>
                            <th width="120px" onclick="enhancedDevices.sortTable('nguyen_gia')">
                                GIÁ ${this.getSortIcon('nguyen_gia')}
                            </th>
                            <th width="100px">TRẠNG THÁI</th>
                            <th width="120px">PHÒNG BAN</th>
                            <th width="100px">ĐƠN VỊ</th>
                            <th width="100px">NHÂN VIÊN</th>
                            <th width="120px">HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedDevices.map((device, index) => this.getTableRowHTML(device, startIndex + index)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getTableRowHTML(device, index) {
        return `
            <tr class="device-row ${this.selectedDevices.has(device.id) ? 'selected' : ''}">
                <td>
                    <input type="checkbox" ${this.selectedDevices.has(device.id) ? 'checked' : ''} 
                           onchange="enhancedDevices.toggleDeviceSelection(${device.id}, this.checked)">
                </td>
                <td>${index + 1}</td>
                <td>
                    <div class="device-name-cell">
                        <div class="device-name-main">${this.escapeHtml(device.ten_thiet_bi)}</div>
                        ${device.model ? `<div class="device-model">Model: ${this.escapeHtml(device.model)}</div>` : ''}
                        ${device.nha_san_xuat ? `<div class="device-manufacturer">NSX: ${this.escapeHtml(device.nha_san_xuat)}</div>` : ''}
                    </div>
                </td>
                <td>${device.nam_san_xuat || '-'}</td>
                <td>
                    <span class="quantity-badge">${device.so_luong}</span>
                </td>
                <td class="price-cell">${this.formatCurrency(device.nguyen_gia)}</td>
                <td>
                    <span class="status-badge status-${this.getStatusClass(device.tinh_trang)}">
                        ${device.tinh_trang}
                    </span>
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

    renderCardsView() {
        const container = document.getElementById('devices-cards-view');
        if (!container) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedDevices = this.filteredDevices.slice(startIndex, endIndex);

        if (paginatedDevices.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = `
            <div class="cards-grid">
                ${paginatedDevices.map(device => this.getDeviceCardHTML(device)).join('')}
            </div>
        `;
    }

    getDeviceCardHTML(device) {
        return `
            <div class="device-card ${this.selectedDevices.has(device.id) ? 'selected' : ''}">
                <div class="card-header">
                    <div class="card-checkbox">
                        <input type="checkbox" ${this.selectedDevices.has(device.id) ? 'checked' : ''}
                               onchange="enhancedDevices.toggleDeviceSelection(${device.id}, this.checked)">
                    </div>
                    <div class="card-title">${this.escapeHtml(device.ten_thiet_bi)}</div>
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
                            <span class="info-value price">${this.formatCurrency(device.nguyen_gia)}</span>
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

    renderTreeView() {
        const container = document.getElementById('devices-tree-view');
        if (!container) return;

        // Nhóm thiết bị theo phòng ban
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
        this.filteredDevices.forEach(device => {
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
                    <span class="device-tree-name">${this.escapeHtml(device.ten_thiet_bi)}</span>
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

    // ========== CORE FUNCTIONALITY ==========

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.debouncedFilter();
            });
        }

        // Filter changes
        ['status-filter', 'department-filter', 'year-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.currentFilters[id.replace('-filter', '')] = e.target.value;
                    this.applyFiltersAndRender();
                });
            }
        });
    }

    debouncedFilter = this.debounce(() => {
        this.applyFiltersAndRender();
    }, 300);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    applyFiltersAndRender() {
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderDevices();
        this.renderStats();
    }

    // ========== VIEW MANAGEMENT ==========

    switchView(viewMode) {
        this.viewMode = viewMode;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
        
        // Show/hide view contents
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.toggle('active', content.id === `devices-${viewMode}-view`);
        });
        
        this.renderDevices();
    }

    // ========== SELECTION & BULK OPERATIONS ==========

    toggleDeviceSelection(deviceId, isSelected) {
        if (isSelected) {
            this.selectedDevices.add(deviceId);
        } else {
            this.selectedDevices.delete(deviceId);
        }
        this.updateBulkPanel();
        this.renderDevices(); // Re-render to update selection styles
    }

    toggleSelectAll(selectAll) {
        const currentPageDevices = this.getCurrentPageDevices();
        
        if (selectAll) {
            currentPageDevices.forEach(device => {
                this.selectedDevices.add(device.id);
            });
        } else {
            currentPageDevices.forEach(device => {
                this.selectedDevices.delete(device.id);
            });
        }
        
        this.updateBulkPanel();
        this.renderDevices();
    }

    updateBulkPanel() {
        const panel = document.getElementById('bulk-panel');
        const selectedCount = document.getElementById('selected-count');
        const selectedList = document.getElementById('selected-list');
        
        if (this.selectedDevices.size > 0) {
            panel.style.display = 'block';
            selectedCount.textContent = this.selectedDevices.size;
            
            // Update selected devices list
            const selectedDevicesList = Array.from(this.selectedDevices).slice(0, 5).map(id => {
                const device = this.allDevices.find(d => d.id === id);
                return device ? device.ten_thiet_bi : 'Unknown';
            });
            
            selectedList.innerHTML = selectedDevicesList.map(name => 
                `<div class="selected-item">• ${this.escapeHtml(name)}</div>`
            ).join('');
            
            if (this.selectedDevices.size > 5) {
                selectedList.innerHTML += `<div class="selected-more">... và ${this.selectedDevices.size - 5} thiết bị khác</div>`;
            }
        } else {
            panel.style.display = 'none';
        }
    }

    toggleBulkOperations() {
        const panel = document.getElementById('bulk-panel');
        if (panel.style.display === 'none') {
            this.updateBulkPanel();
        } else {
            panel.style.display = 'none';
        }
    }

    async bulkDelete() {
        if (!confirm(`Bạn có chắc chắn muốn xóa ${this.selectedDevices.size} thiết bị đã chọn?`)) {
            return;
        }

        try {
            for (const deviceId of this.selectedDevices) {
                await medicalDB.deleteDevice(deviceId);
            }
            
            this.showSuccess(`Đã xóa ${this.selectedDevices.size} thiết bị thành công`);
            this.selectedDevices.clear();
            await this.loadDevices();
            this.renderDevices();
            this.renderStats();
            
        } catch (error) {
            console.error('Error in bulk delete:', error);
            this.showError('Lỗi khi xóa thiết bị');
        }
    }

    // ========== PAGINATION ==========

    updatePagination() {
        const totalPages = Math.ceil(this.filteredDevices.length / this.itemsPerPage);
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageNumbers = document.getElementById('page-numbers');

        if (pageInfo) pageInfo.textContent = `Trang ${this.currentPage}/${totalPages}`;
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;

        // Render page numbers
        if (pageNumbers) {
            let pagesHTML = '';
            const maxVisiblePages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            if (startPage > 1) {
                pagesHTML += `<button class="page-number" onclick="enhancedDevices.goToPage(1)">1</button>`;
                if (startPage > 2) pagesHTML += `<span class="page-ellipsis">...</span>`;
            }

            for (let i = startPage; i <= endPage; i++) {
                pagesHTML += `
                    <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                            onclick="enhancedDevices.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pagesHTML += `<span class="page-ellipsis">...</span>`;
                pagesHTML += `<button class="page-number" onclick="enhancedDevices.goToPage(${totalPages})">${totalPages}</button>`;
            }

            pageNumbers.innerHTML = pagesHTML;
        }
    }

    updateDisplayCount() {
        const element = document.getElementById('display-count');
        if (element) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredDevices.length);
            element.textContent = `Hiển thị ${startIndex}-${endIndex} của ${this.filteredDevices.length}`;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderDevices();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredDevices.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderDevices();
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderDevices();
    }

    changePageSize(size) {
        this.itemsPerPage = parseInt(size);
        this.currentPage = 1;
        this.renderDevices();
    }

    // ========== SORTING ==========

    sortTable(field) {
        if (this.sortConfig.field === field) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.field = field;
            this.sortConfig.direction = 'asc';
        }
        this.applyFiltersAndSort();
        this.renderDevices();
    }

    getSortIcon(field) {
        if (this.sortConfig.field !== field) return '↕️';
        return this.sortConfig.direction === 'asc' ? '↑' : '↓';
    }

    // ========== UTILITY METHODS ==========

    getCurrentPageDevices() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredDevices.slice(startIndex, endIndex);
    }

    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>${this.filteredDevices.length === 0 ? 'Chưa có thiết bị nào' : 'Không tìm thấy thiết bị phù hợp'}</h3>
                <p>${this.filteredDevices.length === 0 ? 
                    'Hãy thêm thiết bị đầu tiên để bắt đầu quản lý' : 
                    'Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm'
                }</p>
                ${this.filteredDevices.length === 0 ? 
                    '<button class="btn-primary" onclick="enhancedDevices.showAddDeviceModal()">➕ Thêm thiết bị đầu tiên</button>' : 
                    '<button class="btn-secondary" onclick="enhancedDevices.clearFilters()">🧹 Xóa bộ lọc</button>'
                }
            </div>
        `;
    }

    filterByYearRange(deviceYear, range) {
        if (!range || !deviceYear) return true;
        
        const currentYear = new Date().getFullYear();
        const age = currentYear - deviceYear;
        
        switch (range) {
            case 'under5': return age <= 5;
            case '5-10': return age > 5 && age <= 10;
            case '10-20': return age > 10 && age <= 20;
            case 'over20': return age > 20;
            default: return true;
        }
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

    getStatusIcon(status) {
        const iconMap = {
            'Đang sử dụng': '🟢',
            'Bảo trì': '🟡',
            'Hỏng': '🔴',
            'Ngừng sử dụng': '⚫'
        };
        return iconMap[status] || '⚪';
    }

    formatCurrency(amount) {
        if (!amount) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
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

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // ========== PUBLIC METHODS ==========

    refreshData() {
        this.loadDevices().then(() => {
            this.renderStats();
            this.renderDevices();
            this.showSuccess('Dữ liệu đã được làm mới');
        });
    }

    performSearch() {
        this.applyFiltersAndRender();
    }

    clearFilters() {
        this.currentFilters = {
            search: '',
            status: '',
            yearRange: '',
            department: '',
            unit: '',
            category: '',
            priceRange: '',
            dateRange: ''
        };
        
        // Reset UI elements
        document.getElementById('global-search').value = '';
        document.getElementById('status-filter').value = '';
        document.getElementById('department-filter').value = '';
        document.getElementById('year-filter').value = '';
        
        this.applyFiltersAndRender();
        this.showSuccess('Đã xóa tất cả bộ lọc');
    }

    // ========== PLACEHOLDER METHODS ==========

    showAddDeviceModal() {
        if (window.app) {
            app.showDeviceModal();
        }
    }

    showDeviceDetails(deviceId) {
        if (window.deviceDetailsManager) {
            deviceDetailsManager.showDeviceDetails(deviceId);
        }
    }

    editDevice(deviceId) {
        if (window.devicesManager) {
            devicesManager.editDevice(deviceId);
        }
    }

    async deleteDevice(deviceId) {
        if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;

        try {
            const devices = await medicalDB.getAllDevices();
            const device = devices.find(d => d.id === deviceId);
            
            await medicalDB.deleteDevice(deviceId);
            await medicalDB.addActivity({
                type: 'delete',
                description: `Xóa thiết bị: ${device.ten_thiet_bi}`,
                user: 'Quản trị viên'
            });

            this.showSuccess('Đã xóa thiết bị thành công');
            await this.loadDevices();
            this.renderDevices();
            this.renderStats();
            
        } catch (error) {
            console.error('Error deleting device:', error);
            this.showError('Lỗi khi xóa thiết bị');
        }
    }

    splitDevice(deviceId) {
        if (window.devicesManager) {
            devicesManager.splitDevice(deviceId);
        }
    }

    importDevices() {
        if (window.app) {
            app.showTab('import');
        }
    }

    exportDevices() {
        if (window.devicesManager) {
            devicesManager.exportToExcel();
        }
    }

    showAdvancedFilters() {
        this.showNotification('Tính năng bộ lọc nâng cao sẽ được phát triển trong phiên bản tới', 'info');
    }

    generateQRCode() {
        this.showNotification('Tính năng QR Code sẽ được phát triển trong phiên bản tới', 'info');
    }

    showMaintenanceSchedule() {
        this.showNotification('Tính năng lịch bảo trì sẽ được phát triển trong phiên bản tới', 'info');
    }

    bulkExport() {
        this.showNotification('Tính năng export hàng loạt sẽ được phát triển trong phiên bản tới', 'info');
    }

    expandAllTree() {
        document.querySelectorAll('.department-devices').forEach(el => {
            el.style.display = 'block';
        });
    }

    collapseAllTree() {
        document.querySelectorAll('.department-devices').forEach(el => {
            el.style.display = 'none';
        });
    }

    toggleDepartmentTree(element) {
        const devices = element.nextElementSibling;
        if (devices.style.display === 'none') {
            devices.style.display = 'block';
        } else {
            devices.style.display = 'none';
        }
    }
}

// Initialize globally
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedDevices = new EnhancedDevicesManager();
});