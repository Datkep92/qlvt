class DevicesFiltersManager {
    constructor(manager) {
        this.manager = manager;
        this.debouncedFilter = this.debounce(() => {
            this.manager.applyFiltersAndRender();
        }, 300);
    }

    renderFilters() {
        return `
            <div class="filters-section">
                <div class="search-box">
                    <input type="text" id="global-search" placeholder="🔍 Tìm kiếm thiết bị, model, serial..." 
                           class="search-input" value="${this.manager.currentFilters.search}">
                    <button class="btn-search" onclick="enhancedDevices.filtersManager.performSearch()">Tìm</button>
                </div>
                
                <div class="filter-group">
                    <select id="status-filter" class="filter-select">
                        <option value="">🏷️ Tất cả trạng thái</option>
                        <option value="Đang sử dụng" ${this.manager.currentFilters.status === 'Đang sử dụng' ? 'selected' : ''}>🟢 Đang sử dụng</option>
                        <option value="Bảo trì" ${this.manager.currentFilters.status === 'Bảo trì' ? 'selected' : ''}>🟡 Bảo trì</option>
                        <option value="Hỏng" ${this.manager.currentFilters.status === 'Hỏng' ? 'selected' : ''}>🔴 Hỏng</option>
                        <option value="Ngừng sử dụng" ${this.manager.currentFilters.status === 'Ngừng sử dụng' ? 'selected' : ''}>⚫ Ngừng sử dụng</option>
                    </select>

                    <select id="department-filter" class="filter-select">
                        <option value="">🏥 Tất cả phòng ban</option>
                        ${this.manager.departments.map(dept => 
                            `<option value="${dept.ten_phong}" ${this.manager.currentFilters.department === dept.ten_phong ? 'selected' : ''}>${dept.ten_phong}</option>`
                        ).join('')}
                    </select>

                    <select id="year-filter" class="filter-select">
                        <option value="">📅 Tất cả năm</option>
                        <option value="under5" ${this.manager.currentFilters.yearRange === 'under5' ? 'selected' : ''}>🆕 Dưới 5 năm</option>
                        <option value="5-10" ${this.manager.currentFilters.yearRange === '5-10' ? 'selected' : ''}>📊 5-10 năm</option>
                        <option value="10-20" ${this.manager.currentFilters.yearRange === '10-20' ? 'selected' : ''}>🕰️ 10-20 năm</option>
                        <option value="over20" ${this.manager.currentFilters.yearRange === 'over20' ? 'selected' : ''}>🏛️ Trên 20 năm</option>
                    </select>

                    <button class="btn-secondary" onclick="enhancedDevices.filtersManager.showAdvancedFilters()">
                        🔧 Bộ lọc nâng cao
                    </button>
                    
                    <button class="btn-clear" onclick="enhancedDevices.clearFilters()" title="Xóa bộ lọc">
                        🧹
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.manager.currentFilters.search = e.target.value;
                this.debouncedFilter();
            });
        }

        // Filter changes
        ['status-filter', 'department-filter', 'year-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    const filterType = id.replace('-filter', '');
                    this.manager.currentFilters[filterType] = e.target.value;
                    this.manager.applyFiltersAndRender();
                });
            }
        });
    }

    applyAllFilters(devices, filters) {
        let filtered = devices;

        // Apply search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(device =>
                device.ten_thiet_bi.toLowerCase().includes(searchTerm) ||
                (device.model && device.model.toLowerCase().includes(searchTerm)) ||
                (device.nha_san_xuat && device.nha_san_xuat.toLowerCase().includes(searchTerm)) ||
                (device.serial_number && device.serial_number.toLowerCase().includes(searchTerm))
            );
        }

        // Apply status filter
        if (filters.status) {
            filtered = filtered.filter(device => device.tinh_trang === filters.status);
        }

        // Apply department filter
        if (filters.department) {
            filtered = filtered.filter(device => device.phong_ban === filters.department);
        }

        // Apply year filter
        if (filters.yearRange) {
            filtered = filtered.filter(device => 
                this.filterByYearRange(device.nam_san_xuat, filters.yearRange)
            );
        }

        // Apply price range filter
        if (filters.priceRange) {
            filtered = filtered.filter(device => 
                this.filterByPriceRange(device.nguyen_gia, filters.priceRange)
            );
        }

        return filtered;
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

    filterByPriceRange(price, range) {
        if (!range || !price) return true;
        
        switch (range) {
            case 'under10m': return price <= 10000000;
            case '10m-50m': return price > 10000000 && price <= 50000000;
            case '50m-100m': return price > 50000000 && price <= 100000000;
            case 'over100m': return price > 100000000;
            default: return true;
        }
    }

    performSearch() {
        this.manager.applyFiltersAndRender();
    }

    showAdvancedFilters() {
        const modal = this.createAdvancedFiltersModal();
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createAdvancedFiltersModal() {
        const modal = document.createElement('div');
        modal.className = 'modal advanced-filters-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔧 Bộ Lọc Nâng Cao</h3>
                    <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="filter-section">
                        <h4>💰 Khoảng Giá</h4>
                        <select id="advanced-price-filter" class="filter-select">
                            <option value="">Tất cả giá</option>
                            <option value="under10m" ${this.manager.currentFilters.priceRange === 'under10m' ? 'selected' : ''}>Dưới 10 triệu</option>
                            <option value="10m-50m" ${this.manager.currentFilters.priceRange === '10m-50m' ? 'selected' : ''}>10 - 50 triệu</option>
                            <option value="50m-100m" ${this.manager.currentFilters.priceRange === '50m-100m' ? 'selected' : ''}>50 - 100 triệu</option>
                            <option value="over100m" ${this.manager.currentFilters.priceRange === 'over100m' ? 'selected' : ''}>Trên 100 triệu</option>
                        </select>
                    </div>

                    <div class="filter-section">
                        <h4>📊 Phân Loại</h4>
                        <select id="advanced-category-filter" class="filter-select">
                            <option value="">Tất cả phân loại</option>
                            <option value="THIẾT BỊ Y TẾ" ${this.manager.currentFilters.category === 'THIẾT BỊ Y TẾ' ? 'selected' : ''}>Thiết bị y tế</option>
                            <option value="DỤNG CỤ Y TẾ" ${this.manager.currentFilters.category === 'DỤNG CỤ Y TẾ' ? 'selected' : ''}>Dụng cụ y tế</option>
                            <option value="THIẾT BỊ NỘI THẤT" ${this.manager.currentFilters.category === 'THIẾT BỊ NỘI THẤT' ? 'selected' : ''}>Thiết bị nội thất</option>
                            <option value="VẬT TƯ Y TẾ" ${this.manager.currentFilters.category === 'VẬT TƯ Y TẾ' ? 'selected' : ''}>Vật tư y tế</option>
                        </select>
                    </div>

                    <div class="filter-section">
                        <h4>📅 Khoảng Thời Gian</h4>
                        <div class="date-range">
                            <input type="date" id="date-from" placeholder="Từ ngày" class="date-input">
                            <span>đến</span>
                            <input type="date" id="date-to" placeholder="Đến ngày" class="date-input">
                        </div>
                    </div>

                    <div class="filter-section">
                        <h4>👤 Nhân Viên Quản Lý</h4>
                        <select id="advanced-staff-filter" class="filter-select">
                            <option value="">Tất cả nhân viên</option>
                            ${this.manager.staff.map(staff => 
                                `<option value="${staff.ten_nhan_vien}">${staff.ten_nhan_vien}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Hủy</button>
                    <button class="btn-primary" onclick="enhancedDevices.filtersManager.applyAdvancedFilters()">Áp Dụng</button>
                    <button class="btn-clear" onclick="enhancedDevices.filtersManager.clearAdvancedFilters()">Xóa Lọc</button>
                </div>
            </div>
        `;
        return modal;
    }

    applyAdvancedFilters() {
        const priceFilter = document.getElementById('advanced-price-filter').value;
        const categoryFilter = document.getElementById('advanced-category-filter').value;
        const staffFilter = document.getElementById('advanced-staff-filter').value;
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;

        this.manager.currentFilters.priceRange = priceFilter;
        this.manager.currentFilters.category = categoryFilter;
        this.manager.currentFilters.staff = staffFilter;
        
        if (dateFrom || dateTo) {
            this.manager.currentFilters.dateRange = { from: dateFrom, to: dateTo };
        }

        this.manager.applyFiltersAndRender();
        
        // Close modal
        document.querySelector('.advanced-filters-modal').remove();
        this.manager.showSuccess('Đã áp dụng bộ lọc nâng cao');
    }

    clearAdvancedFilters() {
        this.manager.currentFilters.priceRange = '';
        this.manager.currentFilters.category = '';
        this.manager.currentFilters.staff = '';
        this.manager.currentFilters.dateRange = '';
        
        document.getElementById('advanced-price-filter').value = '';
        document.getElementById('advanced-category-filter').value = '';
        document.getElementById('advanced-staff-filter').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
    }

    clearFilterInputs() {
        const searchInput = document.getElementById('global-search');
        const statusFilter = document.getElementById('status-filter');
        const departmentFilter = document.getElementById('department-filter');
        const yearFilter = document.getElementById('year-filter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (departmentFilter) departmentFilter.value = '';
        if (yearFilter) yearFilter.value = '';
    }

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
}