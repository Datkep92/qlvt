// loc.js - Bộ lọc thông minh kiểu nút nổi với Live Filter
class LocManager {
    constructor() {
        this.moduleName = "LocManager";
        this.currentFilters = {
            search: '',
            status: '',
            department: '',
            yearRange: '',
            unit: '',
            staff: '',
            category: '',
            priceRange: '',
            quantityRange: '',
            exactYearRange: null,
            nha_san_xuat: '',
            model: '',
            tinh_trang: ''
        };
        this.isPanelOpen = false;
        this.activeFilterChips = [];
        this.isLiveFilterEnabled = true; // Bật live filter mặc định
        this.filterTimeout = null;
        this.init();
    }

    init() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('ui:showFilters', () => this.toggleFilterPanel());
        AppEvents.on('data:refresh', () => this.loadFilterOptions());
        
        // Lắng nghe khi chuyển chế độ xem
        AppEvents.on('ui:switchView', () => {
            setTimeout(() => this.loadFilterOptions(), 100);
        });
        
        // Lắng nghe sự kiện clear từ nơi khác
        AppEvents.on('filter:clearAll', () => this.clearFilters());
        
        // Lắng nghe khi cần refresh filter từ bên ngoài
        AppEvents.on('filter:refresh', () => {
            this.loadFilterOptions();
            this.updateFilterBadge();
        });
    }

    setup() {
        // Xóa filter section cũ
        this.removeOldFilterSection();
        
        // Tạo nút lọc nổi
        this.renderFloatingFilterButton();
        
        // Tải dữ liệu filter
        this.loadFilterOptions();
        
        console.log('✅ LocManager ready (Floating Filter Mode)');
    }

    // 1. Xóa filter section cũ
    removeOldFilterSection() {
        const filterSection = document.getElementById('filter-section');
        if (filterSection) {
            filterSection.innerHTML = '';
            filterSection.style.display = 'none';
        }
    }

    // 2. Tạo nút lọc nổi
    renderFloatingFilterButton() {
        const buttonHTML = `
            <button class="floating-filter-btn" id="floating-filter-btn">
                <span class="filter-icon">🎯</span>
                <span class="filter-text">Bộ lọc</span>
                <span class="filter-badge" id="filter-badge">0</span>
            </button>
        `;
        
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        
        // Thêm event listener
        document.getElementById('floating-filter-btn').addEventListener('click', () => {
            this.toggleFilterPanel();
        });
    }

    // 3. Toggle panel lọc
    toggleFilterPanel() {
        this.isPanelOpen = !this.isPanelOpen;
        
        if (this.isPanelOpen) {
            this.renderFilterPanel();
        } else {
            this.closeFilterPanel();
        }
    }

    // 4. Render panel lọc
    renderFilterPanel() {
        // Xóa panel cũ nếu có
        this.closeFilterPanel();
        
        // Tạo overlay
        const overlayHTML = `
            <div class="filter-panel-overlay" id="filter-overlay"></div>
        `;
        
        // Tạo panel
        const panelHTML = `
            <div class="filter-panel" id="filter-panel">
                ${this.getFilterPanelHTML()}
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        
        // Thêm event listeners
        document.getElementById('filter-overlay').addEventListener('click', () => this.closeFilterPanel());
        document.getElementById('filter-panel').querySelector('.btn-close').addEventListener('click', () => this.closeFilterPanel());
        
        // Khởi tạo controls
        this.initializeFilterControls();
        
        // Hiển thị với hiệu ứng
        setTimeout(() => {
            document.getElementById('filter-overlay').style.display = 'block';
            document.getElementById('filter-panel').classList.add('active');
        }, 10);
        
        // Focus vào search input
        setTimeout(() => {
            const searchInput = document.getElementById('smart-search');
            if (searchInput) searchInput.focus();
        }, 300);
    }

    // 5. HTML cho panel lọc - ĐÃ THÊM TẤT CẢ BỘ LỌC
    getFilterPanelHTML() {
        const currentYear = new Date().getFullYear();
        
        return `
            <div class="filter-panel-header">
                <h3><span class="section-icon">🎯</span> BỘ LỌC THÔNG MINH</h3>
                <button class="btn-close">✕</button>
            </div>
            
            <div class="filter-panel-body">
                <!-- Tìm kiếm thông minh -->
                <div class="filter-section">
                    <h4><span class="section-icon">🔍</span> TÌM KIẾM THÔNG MINH</h4>
                    <input type="text" 
                           id="smart-search" 
                           class="smart-search-input" 
                           placeholder="Tìm tên, model, serial, NSX..."
                           value="${this.currentFilters.search || ''}">
                </div>
                
                <!-- Trạng thái -->
                <div class="filter-section">
                    <h4><span class="section-icon">📋</span> TRẠNG THÁI</h4>
                    <div class="filter-options">
                        <label class="filter-option ${!this.currentFilters.status ? 'active' : ''}">
                            <input type="radio" name="status" value="" ${!this.currentFilters.status ? 'checked' : ''}>
                            <span>Tất cả</span>
                        </label>
                        <label class="filter-option ${this.currentFilters.status === 'Đang sử dụng' ? 'active' : ''}">
                            <input type="radio" name="status" value="Đang sử dụng" ${this.currentFilters.status === 'Đang sử dụng' ? 'checked' : ''}>
                            <span>🟢 Đang sử dụng</span>
                        </label>
                        <label class="filter-option ${this.currentFilters.status === 'Bảo trì' ? 'active' : ''}">
                            <input type="radio" name="status" value="Bảo trì" ${this.currentFilters.status === 'Bảo trì' ? 'checked' : ''}>
                            <span>🟡 Bảo trì</span>
                        </label>
                        <label class="filter-option ${this.currentFilters.status === 'Hỏng' ? 'active' : ''}">
                            <input type="radio" name="status" value="Hỏng" ${this.currentFilters.status === 'Hỏng' ? 'checked' : ''}>
                            <span>🔴 Hỏng</span>
                        </label>
                        <label class="filter-option ${this.currentFilters.status === 'Ngừng sử dụng' ? 'active' : ''}">
                            <input type="radio" name="status" value="Ngừng sử dụng" ${this.currentFilters.status === 'Ngừng sử dụng' ? 'checked' : ''}>
                            <span>⚫ Ngừng sử dụng</span>
                        </label>
                    </div>
                </div>
                
                <!-- Phòng ban -->
                <div class="filter-section">
                    <h4><span class="section-icon">🏢</span> PHÒNG BAN</h4>
                    <select id="filter-department" class="filter-select">
                        <option value="">Tất cả phòng ban</option>
                    </select>
                </div>
                
                <!-- Phân loại sản phẩm -->
                <div class="filter-section">
                    <h4><span class="section-icon">📦</span> PHÂN LOẠI SP</h4>
                    <div class="filter-checkbox-group">
                        <label class="filter-checkbox ${this.currentFilters.category === 'taisan' ? 'active' : ''}">
                            <input type="checkbox" name="category" value="taisan" ${this.currentFilters.category === 'taisan' ? 'checked' : ''}>
                            <span>TÀI SẢN</span>
                        </label>
                        <label class="filter-checkbox ${this.currentFilters.category === 'haophi' ? 'active' : ''}">
                            <input type="checkbox" name="category" value="haophi" ${this.currentFilters.category === 'haophi' ? 'checked' : ''}>
                            <span>HAO PHÍ</span>
                        </label>
                        <label class="filter-checkbox ${this.currentFilters.category === 'thietbi' ? 'active' : ''}">
                            <input type="checkbox" name="category" value="thietbi" ${this.currentFilters.category === 'thietbi' ? 'checked' : ''}>
                            <span>THIẾT BỊ Y TẾ</span>
                        </label>
                        <label class="filter-checkbox ${this.currentFilters.category === 'dungcu' ? 'active' : ''}">
                            <input type="checkbox" name="category" value="dungcu" ${this.currentFilters.category === 'dungcu' ? 'checked' : ''}>
                            <span>DỤNG CỤ Y TẾ</span>
                        </label>
                    </div>
                </div>
                
                <!-- Năm sản xuất -->
                <div class="filter-section">
                    <h4><span class="section-icon">📅</span> NĂM SẢN XUẤT</h4>
                    <div class="year-range">
                        <div class="year-input">
                            <label>Từ:</label>
                            <input type="number" 
                                   id="year-from" 
                                   min="1900" 
                                   max="${currentYear}" 
                                   placeholder="2000"
                                   value="${this.currentFilters.exactYearRange?.from || ''}">
                        </div>
                        <div class="year-input">
                            <label>Đến:</label>
                            <input type="number" 
                                   id="year-to" 
                                   min="1900" 
                                   max="${currentYear}" 
                                   placeholder="${currentYear}"
                                   value="${this.currentFilters.exactYearRange?.to || ''}">
                        </div>
                    </div>
                </div>
                
                <!-- Đơn vị tính -->
                <div class="filter-section">
                    <h4><span class="section-icon">📏</span> ĐƠN VỊ TÍNH</h4>
                    <select id="filter-unit" class="filter-select">
                        <option value="">Tất cả đơn vị</option>
                    </select>
                </div>
                
                <!-- Nhân viên QL -->
                <div class="filter-section">
                    <h4><span class="section-icon">👤</span> NHÂN VIÊN QUẢN LÝ</h4>
                    <select id="filter-staff" class="filter-select">
                        <option value="">Tất cả nhân viên</option>
                    </select>
                </div>
                
                <!-- Bộ lọc nâng cao -->
                <div class="filter-section">
                    <div class="advanced-toggle" id="advanced-toggle">
                        <h4><span class="section-icon">🎯</span> BỘ LỌC NÂNG CAO</h4>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="advanced-content" id="advanced-content" style="display: ${this.hasAdvancedFilters() ? 'block' : 'none'}">
                        <!-- Khoảng giá -->
                        <div class="filter-input-group">
                            <label>💰 Khoảng giá</label>
                            <select id="price-filter" class="filter-select">
                                <option value="">Tất cả giá</option>
                                <option value="under10m" ${this.currentFilters.priceRange === 'under10m' ? 'selected' : ''}>Dưới 10 triệu</option>
                                <option value="10m-50m" ${this.currentFilters.priceRange === '10m-50m' ? 'selected' : ''}>10-50 triệu</option>
                                <option value="50m-100m" ${this.currentFilters.priceRange === '50m-100m' ? 'selected' : ''}>50-100 triệu</option>
                                <option value="over100m" ${this.currentFilters.priceRange === 'over100m' ? 'selected' : ''}>Trên 100 triệu</option>
                            </select>
                        </div>
                        
                        <!-- Khoảng số lượng -->
                        <div class="filter-input-group">
                            <label>📦 Khoảng số lượng</label>
                            <select id="quantity-filter" class="filter-select">
                                <option value="">Tất cả SL</option>
                                <option value="single" ${this.currentFilters.quantityRange === 'single' ? 'selected' : ''}>Chỉ 1 cái</option>
                                <option value="few" ${this.currentFilters.quantityRange === 'few' ? 'selected' : ''}>2-5 cái</option>
                                <option value="many" ${this.currentFilters.quantityRange === 'many' ? 'selected' : ''}>Trên 5 cái</option>
                            </select>
                        </div>
                        
                        <!-- Nhà sản xuất -->
                        <div class="filter-input-group">
                            <label>🏭 Nhà sản xuất</label>
                            <input type="text" 
                                   id="filter-nha-san-xuat" 
                                   class="filter-input" 
                                   placeholder="Nhập tên NSX"
                                   value="${this.currentFilters.nha_san_xuat || ''}">
                        </div>
                        
                        <!-- Model -->
                        <div class="filter-input-group">
                            <label>🔧 Model</label>
                            <input type="text" 
                                   id="filter-model" 
                                   class="filter-input" 
                                   placeholder="Nhập model"
                                   value="${this.currentFilters.model || ''}">
                        </div>
                    </div>
                </div>
                
                <!-- Gợi ý lọc -->
                <div class="filter-suggestions">
                    <h4><span class="section-icon">💡</span> GỢI Ý NHANH</h4>
                    <div id="filter-suggestions-list">
                        <div class="suggestion-item" onclick="window.locManager.applySuggestion('recent')">
                            🆕 Thiết bị mới nhập (2 năm gần đây)
                        </div>
                        <div class="suggestion-item" onclick="window.locManager.applySuggestion('maintenance')">
                            ⚠️ Thiết bị cần bảo trì
                        </div>
                        <div class="suggestion-item" onclick="window.locManager.applySuggestion('highValue')">
                            💰 Thiết bị cao giá trị (>100tr)
                        </div>
                        <div class="suggestion-item" onclick="window.locManager.applySuggestion('lowStock')">
                            📉 SL tồn thấp (chỉ 1 cái)
                        </div>
                        <div class="suggestion-item" onclick="window.locManager.applySuggestion('old')">
                            🕰️ Thiết bị cũ (>10 năm)
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="filter-panel-footer">
                <div class="live-filter-toggle">
                    <label>
                        <div class="toggle-switch">
                            <input type="checkbox" id="live-filter-toggle" ${this.isLiveFilterEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </div>
                        <span>Lọc tự động</span>
                    </label>
                </div>
                <div class="footer-buttons">
                    <button class="btn-secondary" id="clear-filters">
                        🗑️ Xóa lọc
                    </button>
                    <button class="btn-primary" id="apply-filters">
                        ✅ Áp dụng
                    </button>
                </div>
            </div>
        `;
    }

    // 6. Khởi tạo controls
    async initializeFilterControls() {
        // Load dữ liệu
        await this.loadAllFilterOptions();
        
        // Event listeners cho các nút
        document.getElementById('apply-filters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
        
        // Toggle live filter
        document.getElementById('live-filter-toggle').addEventListener('change', (e) => {
            this.isLiveFilterEnabled = e.target.checked;
        });
        
        // Toggle advanced section
        document.getElementById('advanced-toggle').addEventListener('click', (e) => {
            const content = document.getElementById('advanced-content');
            const icon = e.target.querySelector('.toggle-icon');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            if (icon) {
                icon.textContent = content.style.display === 'none' ? '▼' : '▲';
            }
        });
        
        // Setup live filter events cho tất cả controls
        this.setupLiveFilterEvents();
        
        // Enter key cho search
        document.getElementById('smart-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
    }

    // 7. Setup live filter events cho tất cả controls
    setupLiveFilterEvents() {
        // Lấy tất cả filter controls
        const filterControls = [
            '#smart-search',
            'input[name="status"]',
            '#filter-department',
            'input[name="category"]',
            '#year-from',
            '#year-to',
            '#filter-unit',
            '#filter-staff',
            '#price-filter',
            '#quantity-filter',
            '#filter-nha-san-xuat',
            '#filter-model'
        ];
        
        filterControls.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Xóa event listeners cũ
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
                
                // Thêm event listener mới
                if (selector === '#smart-search') {
                    // Real-time search với debounce
                    newElement.addEventListener('input', this.debounce(() => {
                        if (this.isLiveFilterEnabled) {
                            this.collectFilters();
                            this.applyLiveFilters();
                        }
                    }, 500));
                } else if (selector === 'input[name="status"]' || selector.includes('input[name="category"]')) {
                    // Radio/Checkbox
                    newElement.addEventListener('change', () => {
                        if (this.isLiveFilterEnabled) {
                            this.collectFilters();
                            this.applyLiveFilters();
                        }
                    });
                } else {
                    // Select, input khác
                    newElement.addEventListener('change', () => {
                        if (this.isLiveFilterEnabled) {
                            this.collectFilters();
                            this.applyLiveFilters();
                        }
                    });
                    
                    // Input cho các text field
                    if (selector === '#filter-nha-san-xuat' || selector === '#filter-model') {
                        newElement.addEventListener('input', this.debounce(() => {
                            if (this.isLiveFilterEnabled) {
                                this.collectFilters();
                                this.applyLiveFilters();
                            }
                        }, 300));
                    }
                }
            });
        });
    }

    // 8. Debounce helper
    debounce(func, wait) {
        return (...args) => {
            clearTimeout(this.filterTimeout);
            this.filterTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // 9. Áp dụng live filters
    applyLiveFilters() {
        this.collectFilters();
        this.renderActiveFilters();
        this.updateFilterBadge();
        
        // Gửi sự kiện áp dụng filter
        AppEvents.emit('filter:applied', { ...this.currentFilters });
    }

    // 10. Áp dụng filters khi click nút
    applyFilters() {
        this.collectFilters();
        this.renderActiveFilters();
        this.updateFilterBadge();
        
        // Gửi sự kiện áp dụng filter
        AppEvents.emit('filter:applied', { ...this.currentFilters });
        
        // Đóng panel nếu trên mobile
        if (window.innerWidth <= 768) {
            this.closeFilterPanel();
        }
        
        // Hiển thị thông báo
        this.showNotification('Đã áp dụng bộ lọc', 'success');
    }

    // 11. Thu thập filters từ UI
    collectFilters() {
        // Search
        this.currentFilters.search = document.getElementById('smart-search')?.value || '';
        
        // Status
        const statusRadio = document.querySelector('input[name="status"]:checked');
        this.currentFilters.status = statusRadio?.value || '';
        this.currentFilters.tinh_trang = this.currentFilters.status; // Đồng bộ
        
        // Department
        this.currentFilters.department = document.getElementById('filter-department')?.value || '';
        
        // Category
        const categoryCheckbox = document.querySelector('input[name="category"]:checked');
        this.currentFilters.category = categoryCheckbox?.value || '';
        
        // Year range
        const yearFrom = document.getElementById('year-from')?.value;
        const yearTo = document.getElementById('year-to')?.value;
        if (yearFrom || yearTo) {
            this.currentFilters.exactYearRange = { 
                from: yearFrom || null, 
                to: yearTo || null 
            };
        } else {
            this.currentFilters.exactYearRange = null;
        }
        
        // Unit
        this.currentFilters.unit = document.getElementById('filter-unit')?.value || '';
        
        // Staff
        this.currentFilters.staff = document.getElementById('filter-staff')?.value || '';
        
        // Advanced filters
        this.currentFilters.priceRange = document.getElementById('price-filter')?.value || '';
        this.currentFilters.quantityRange = document.getElementById('quantity-filter')?.value || '';
        this.currentFilters.nha_san_xuat = document.getElementById('filter-nha-san-xuat')?.value || '';
        this.currentFilters.model = document.getElementById('filter-model')?.value || '';
    }

    // 12. Tải tất cả dữ liệu filter
    async loadAllFilterOptions() {
        try {
            // Load departments
            const departments = await medicalDB.getAllDepartments();
            const deptSelect = document.getElementById('filter-department');
            if (deptSelect) {
                const options = departments.map(dept => 
                    `<option value="${dept.ten_phong}" ${this.currentFilters.department === dept.ten_phong ? 'selected' : ''}>
                        ${dept.ten_phong}
                    </option>`
                ).join('');
                deptSelect.innerHTML = `<option value="">Tất cả phòng ban</option>` + options;
            }
            
            // Load units
            const units = await medicalDB.getAllUnits();
            const unitSelect = document.getElementById('filter-unit');
            if (unitSelect) {
                const options = units.map(unit => 
                    `<option value="${unit.ten_don_vi}" ${this.currentFilters.unit === unit.ten_don_vi ? 'selected' : ''}>
                        ${unit.ten_don_vi}
                    </option>`
                ).join('');
                unitSelect.innerHTML = `<option value="">Tất cả đơn vị</option>` + options;
            }
            
            // Load staff
            const staff = await medicalDB.getAllStaff();
            const staffSelect = document.getElementById('filter-staff');
            if (staffSelect) {
                const options = staff.map(s => {
                    const staffName = s.ten_nhan_vien || s.ten || '';
                    return staffName ? 
                        `<option value="${staffName}" ${this.currentFilters.staff === staffName ? 'selected' : ''}>
                            ${staffName}
                        </option>` : '';
                }).filter(opt => opt !== '').join('');
                staffSelect.innerHTML = `<option value="">Tất cả nhân viên</option>` + options;
            }
            
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    }

    // 13. Render thẻ lọc hiện tại
    renderActiveFilters() {
        // Xóa thẻ cũ nếu có
        const existingBar = document.querySelector('.active-filters-bar');
        if (existingBar) existingBar.remove();
        
        // Tạo mảng thẻ filter
        this.activeFilterChips = [];
        
        // Helper để thêm chip
        const addChip = (value, label, key) => {
            if (value && value !== '') {
                this.activeFilterChips.push({ label, key });
            }
        };
        
        addChip(this.currentFilters.search, `🔍 ${this.currentFilters.search}`, 'search');
        addChip(this.currentFilters.status, `📋 ${this.currentFilters.status}`, 'status');
        addChip(this.currentFilters.department, `🏢 ${this.currentFilters.department}`, 'department');
        addChip(this.currentFilters.category, `📦 ${this.currentFilters.category}`, 'category');
        addChip(this.currentFilters.unit, `📏 ${this.currentFilters.unit}`, 'unit');
        addChip(this.currentFilters.staff, `👤 ${this.currentFilters.staff}`, 'staff');
        addChip(this.currentFilters.nha_san_xuat, `🏭 ${this.currentFilters.nha_san_xuat}`, 'nha_san_xuat');
        addChip(this.currentFilters.model, `🔧 ${this.currentFilters.model}`, 'model');
        addChip(this.currentFilters.priceRange, this.getPriceRangeLabel(this.currentFilters.priceRange), 'priceRange');
        addChip(this.currentFilters.quantityRange, this.getQuantityRangeLabel(this.currentFilters.quantityRange), 'quantityRange');
        
        if (this.currentFilters.exactYearRange) {
            const { from, to } = this.currentFilters.exactYearRange;
            if (from || to) {
                let label = '📅 ';
                if (from && to) label += `${from} → ${to}`;
                else if (from) label += `Từ ${from}`;
                else if (to) label += `Đến ${to}`;
                
                this.activeFilterChips.push({
                    label: label,
                    key: 'exactYearRange'
                });
            }
        }
        
        // Chỉ hiển thị nếu có ít nhất 1 filter
        if (this.activeFilterChips.length > 0) {
            const chipsHTML = this.activeFilterChips.map(chip => `
                <div class="filter-chip" title="${chip.label}">
                    ${chip.label}
                    <button class="remove-chip" onclick="window.locManager.removeFilter('${chip.key}')">×</button>
                </div>
            `).join('');
            
            const barHTML = `
                <div class="active-filters-bar active">
                    ${chipsHTML}
                    <button class="filter-chip clear-all" onclick="window.locManager.clearFilters()" title="Xóa tất cả">
                        🗑️ Xóa tất cả
                    </button>
                </div>
            `;
            
            document.body.insertAdjacentHTML('afterbegin', barHTML);
        }
    }

    // 14. Helper cho label
    getPriceRangeLabel(range) {
        const labels = {
            'under10m': '💰 < 10tr',
            '10m-50m': '💰 10-50tr',
            '50m-100m': '💰 50-100tr',
            'over100m': '💰 > 100tr'
        };
        return labels[range] || '';
    }
    
    getQuantityRangeLabel(range) {
        const labels = {
            'single': '📦 1 cái',
            'few': '📦 2-5 cái',
            'many': '📦 > 5 cái'
        };
        return labels[range] || '';
    }

    // 15. Xóa filter cụ thể
    removeFilter(key) {
        if (key === 'exactYearRange') {
            this.currentFilters.exactYearRange = null;
            // Reset UI
            const yearFrom = document.getElementById('year-from');
            const yearTo = document.getElementById('year-to');
            if (yearFrom) yearFrom.value = '';
            if (yearTo) yearTo.value = '';
        } else if (key === 'search') {
            this.currentFilters.search = '';
            const searchInput = document.getElementById('smart-search');
            if (searchInput) searchInput.value = '';
        } else if (key === 'status') {
            this.currentFilters.status = '';
            this.currentFilters.tinh_trang = '';
            // Uncheck all radio buttons
            document.querySelectorAll('input[name="status"]').forEach(radio => {
                radio.checked = false;
            });
        } else if (key === 'category') {
            this.currentFilters.category = '';
            document.querySelectorAll('input[name="category"]').forEach(cb => {
                cb.checked = false;
            });
        } else {
            this.currentFilters[key] = '';
            
            // Reset UI element
            const element = document.getElementById(`filter-${key}`);
            if (element) {
                if (element.type === 'radio' || element.type === 'checkbox') {
                    element.checked = false;
                } else {
                    element.value = '';
                }
            }
        }
        
        // Áp dụng lại filter
        if (this.isLiveFilterEnabled) {
            this.applyLiveFilters();
        } else {
            this.applyFilters();
        }
    }

    // 16. Cập nhật badge
    updateFilterBadge() {
        const activeCount = Object.values(this.currentFilters).filter(v => 
            v && v !== '' && !(typeof v === 'object' && !v)
        ).length;
        
        const badge = document.getElementById('filter-badge');
        if (badge) {
            badge.textContent = activeCount;
            badge.classList.toggle('active', activeCount > 0);
        }
    }

    // 17. Clear all filters
    clearFilters() {
        this.currentFilters = {
            search: '',
            status: '',
            department: '',
            yearRange: '',
            unit: '',
            staff: '',
            category: '',
            priceRange: '',
            quantityRange: '',
            exactYearRange: null,
            nha_san_xuat: '',
            model: '',
            tinh_trang: ''
        };
        
        // Xóa thẻ filter
        const filterBar = document.querySelector('.active-filters-bar');
        if (filterBar) filterBar.remove();
        
        // Update badge
        this.updateFilterBadge();
        
        // Reset UI nếu panel đang mở
        if (this.isPanelOpen) {
            this.closeFilterPanel();
            setTimeout(() => this.renderFilterPanel(), 50);
        }
        
        // Gửi sự kiện clear
        AppEvents.emit('filter:applied', this.currentFilters);
        
        // Thông báo
        this.showNotification('Đã xóa tất cả bộ lọc', 'success');
    }

    // 18. Đóng panel
    closeFilterPanel() {
        const overlay = document.getElementById('filter-overlay');
        const panel = document.getElementById('filter-panel');
        
        if (panel) {
            panel.classList.remove('active');
            setTimeout(() => {
                if (overlay) overlay.remove();
                if (panel) panel.remove();
                this.isPanelOpen = false;
            }, 300);
        }
    }

    // 19. Áp dụng suggestion
    applySuggestion(type) {
        const currentYear = new Date().getFullYear();
        
        // Reset trước khi áp dụng suggestion mới
        this.clearFilters();
        
        setTimeout(() => {
            switch(type) {
                case 'recent':
                    this.currentFilters.exactYearRange = { from: currentYear - 2, to: currentYear };
                    break;
                case 'maintenance':
                    this.currentFilters.status = 'Bảo trì';
                    break;
                case 'highValue':
                    this.currentFilters.priceRange = 'over100m';
                    break;
                case 'lowStock':
                    this.currentFilters.quantityRange = 'single';
                    break;
                case 'old':
                    this.currentFilters.exactYearRange = { from: null, to: currentYear - 10 };
                    break;
            }
            
            // Áp dụng filter
            this.applyFilters();
            
            // Đóng panel
            this.closeFilterPanel();
        }, 100);
    }

    // 20. Kiểm tra có advanced filters không
    hasAdvancedFilters() {
        return this.currentFilters.priceRange || 
               this.currentFilters.quantityRange ||
               this.currentFilters.nha_san_xuat ||
               this.currentFilters.model;
    }

    // 21. Thông báo
    showNotification(message, type = 'info') {
        AppEvents.emit('notification:show', {
            message: message,
            type: type
        });
    }

    // 22. Áp dụng filter cho data
    applyFiltersToData(data) {
        let filtered = [...data];
        const f = this.currentFilters;

        // Search filter
        if (f.search) {
            const term = f.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.ten_thiet_bi?.toLowerCase().includes(term) ||
                item.model?.toLowerCase().includes(term) ||
                item.nha_san_xuat?.toLowerCase().includes(term) ||
                item.serial_number?.toLowerCase().includes(term) ||
                item.phong_ban?.toLowerCase().includes(term)
            );
        }
        
        // Status filter
        if (f.status) filtered = filtered.filter(item => item.tinh_trang === f.status);
        
        // Department filter
        if (f.department) filtered = filtered.filter(item => item.phong_ban === f.department);
        
        // Unit filter
        if (f.unit) filtered = filtered.filter(item => item.don_vi_tinh === f.unit);
        
        // Staff filter
        if (f.staff) filtered = filtered.filter(item => item.nhan_vien_ql === f.staff);
        
        // Category filter
        if (f.category) filtered = filtered.filter(item => item.phan_loai === f.category);
        
        // Nhà sản xuất filter
        if (f.nha_san_xuat) {
            filtered = filtered.filter(item => 
                item.nha_san_xuat?.toLowerCase().includes(f.nha_san_xuat.toLowerCase())
            );
        }
        
        // Model filter
        if (f.model) {
            filtered = filtered.filter(item => 
                item.model?.toLowerCase().includes(f.model.toLowerCase())
            );
        }
        
        // Exact year range
        if (f.exactYearRange) {
            const { from, to } = f.exactYearRange;
            filtered = filtered.filter(item => {
                if (!item.nam_san_xuat) return false;
                const year = item.nam_san_xuat;
                if (from && year < from) return false;
                if (to && year > to) return false;
                return true;
            });
        }
        
        // Price range filter
        if (f.priceRange) filtered = filtered.filter(item => this.filterByPriceRange(item, f.priceRange));
        
        // Quantity range filter
        if (f.quantityRange) filtered = filtered.filter(item => this.filterByQuantityRange(item, f.quantityRange));

        return filtered;
    }

    // 23. Helper methods
    filterByPriceRange(device, range) {
        if (!range || !device.nguyen_gia) return true;
        const price = device.nguyen_gia;
        
        switch(range) {
            case 'under10m': return price < 10000000;
            case '10m-50m': return price >= 10000000 && price < 50000000;
            case '50m-100m': return price >= 50000000 && price < 100000000;
            case 'over100m': return price >= 100000000;
            default: return true;
        }
    }

    filterByQuantityRange(device, range) {
        if (!range || !device.so_luong) return true;
        const quantity = device.so_luong;
        
        switch(range) {
            case 'single': return quantity === 1;
            case 'few': return quantity >= 2 && quantity <= 5;
            case 'many': return quantity > 5;
            default: return true;
        }
    }

    // 24. Tải dữ liệu filter (giữ lại cho tương thích)
    async loadFilterOptions() {
        await this.loadAllFilterOptions();
    }

    // 25. Apply current filters (giữ lại cho tương thích)
    applyCurrentFilters() {
        this.applyFilters();
    }
}

window.locManager = new LocManager();