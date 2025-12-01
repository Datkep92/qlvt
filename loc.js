// loc.js - Quản lý lọc và tìm kiếm
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
            category: ''
        };
        this.init();
    }

    init() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('ui:showFilters', () => this.showFilters());
        AppEvents.on('filter:apply', (filters) => this.applyFilters(filters));
        AppEvents.on('filter:clear', () => this.clearFilters());
    }

    setup() {
        this.renderFilters();
        console.log('✅ LocManager ready');
    }

    renderFilters() {
        const filterSection = document.getElementById('filter-section');
        if (!filterSection) return;
        filterSection.innerHTML = this.getFiltersHTML();
        this.bindFilterEvents();
    }

    getFiltersHTML() {
        return `
            <div class="filters-container">
                <div class="search-box">
                    <input type="text" id="global-search" 
                        placeholder="🔍 Tìm kiếm thiết bị, model..." 
                        value="${this.currentFilters.search}">
                    <button class="btn-search" onclick="AppEvents.emit('ui:applySearch')">Tìm</button>
                </div>

                <select id="unit-filter">
                    <option value="">📦 Tất cả đơn vị</option>
                </select>

                <select id="staff-filter">
                    <option value="">👤 Tất cả nhân viên</option>
                </select>

                <select id="category-filter">
                    <option value="">📋 Tất cả phân loại SP</option>
                    <option value="taisan">TÀI SẢN</option>
                    <option value="haophi">HAO PHÍ</option>
                </select>

                <div class="filter-row">
                    <select id="status-filter">
                        <option value="">🏷️ Tất cả trạng thái</option>
                        <option value="Đang sử dụng" ${this.currentFilters.status === 'Đang sử dụng' ? 'selected' : ''}>🟢 Đang sử dụng</option>
                        <option value="Bảo trì" ${this.currentFilters.status === 'Bảo trì' ? 'selected' : ''}>🟡 Bảo trì</option>
                        <option value="Hỏng" ${this.currentFilters.status === 'Hỏng' ? 'selected' : ''}>🔴 Hỏng</option>
                        <option value="Ngừng sử dụng" ${this.currentFilters.status === 'Ngừng sử dụng' ? 'selected' : ''}>⚫ Ngừng sử dụng</option>
                    </select>
                    
                    <select id="department-filter">
                        <option value="">🏥 Tất cả phòng ban</option>
                    </select>
                    
                    <select id="year-filter">
                        <option value="">📅 Tất cả năm</option>
                        <option value="under5" ${this.currentFilters.yearRange === 'under5' ? 'selected' : ''}>🆕 Dưới 5 năm</option>
                        <option value="5-10" ${this.currentFilters.yearRange === '5-10' ? 'selected' : ''}>📊 5-10 năm</option>
                        <option value="10-20" ${this.currentFilters.yearRange === '10-20' ? 'selected' : ''}>🕰️ 10-20 năm</option>
                        <option value="over20" ${this.currentFilters.yearRange === 'over20' ? 'selected' : ''}>🏛️ Trên 20 năm</option>
                    </select>
                    
                    <button class="btn-secondary" onclick="AppEvents.emit('ui:showAdvancedFilters')">
                        🔧 Nâng cao
                    </button>
                    
                    <button class="btn-clear" onclick="AppEvents.emit('filter:clear')" title="Xóa bộ lọc">
                        🧹
                    </button>
                </div>
            </div>
        `;
    }

    bindFilterEvents() {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyCurrentFilters();
            });
        }

        ['unit-filter', 'staff-filter', 'category-filter', 'status-filter', 'department-filter', 'year-filter'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', (e) => {
                const map = {
                    'unit-filter': 'unit',
                    'staff-filter': 'staff',
                    'category-filter': 'category',
                    'status-filter': 'status',
                    'department-filter': 'department',
                    'year-filter': 'yearRange'
                };
                this.currentFilters[map[id]] = e.target.value;
                this.applyCurrentFilters();
            });
        });

        this.loadDepartments();
        this.loadUnits();
        this.loadStaff();
    }

    async loadDepartments() {
        try {
            const depts = await medicalDB.getAllDepartments();
            const select = document.getElementById('department-filter');
            if (select) {
                select.innerHTML = `<option value="">🏥 Tất cả phòng ban</option>` +
                    depts.map(d => `<option value="${d.ten_phong}" ${this.currentFilters.department===d.ten_phong?'selected':''}>${d.ten_phong}</option>`).join('');
            }
        } catch (err) { console.error(err); }
    }

    async loadUnits() {
        try {
            const units = await medicalDB.getAllUnits();
            const select = document.getElementById('unit-filter');
            if (select) {
                select.innerHTML = `<option value="">📦 Tất cả đơn vị</option>` +
                    units.map(u => `<option value="${u.ten_don_vi}" ${this.currentFilters.unit===u.ten_don_vi?'selected':''}>${u.ten_don_vi}</option>`).join('');
            }
        } catch(err){ console.error(err); }
    }

    async loadStaff() {
    try {
        const staff = await medicalDB.getAllStaff();
        const select = document.getElementById('staff-filter');
        if (select) {
            select.innerHTML = `<option value="">👤 Tất cả nhân viên</option>` +
                staff.map(s => {
                    // Sửa lỗi: staff có thể có ten_nhan_vien hoặc ten
                    const staffName = s.ten_nhan_vien || s.ten || '';
                    if (!staffName) return '';
                    
                    // Kiểm tra nếu đã chọn filter này trước đó
                    const isSelected = this.currentFilters.staff === staffName;
                    return `<option value="${staffName}" ${isSelected ? 'selected' : ''}>${staffName}</option>`;
                }).filter(option => option !== '').join('');
        }
    } catch(err){ 
        console.error('Error loading staff:', err); 
        // Fallback: hiển thị select rỗng
        const select = document.getElementById('staff-filter');
        if (select) {
            select.innerHTML = `<option value="">👤 Tất cả nhân viên</option>`;
        }
    }
}

    applyCurrentFilters() {
        AppEvents.emit('filter:apply', {...this.currentFilters});
    }

    applyFilters(filters) {
        this.currentFilters = {...filters};
    }

    clearFilters() {
        this.currentFilters = {
            search: '',
            status: '',
            department: '',
            yearRange: '',
            unit: '',
            staff: '',
            category: ''
        };
        this.applyCurrentFilters();
        this.renderFilters();
    }

    showFilters() {
        this.renderFilters();
    }

    applyFiltersToData(data) {
        let filtered = [...data];
        const f = this.currentFilters;

        if (f.search) {
            const term = f.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.ten_thiet_bi?.toLowerCase().includes(term) ||
                item.model?.toLowerCase().includes(term) ||
                item.nha_san_xuat?.toLowerCase().includes(term)
            );
        }
        if (f.status) filtered = filtered.filter(item => item.tinh_trang === f.status);
        if (f.department) filtered = filtered.filter(item => item.phong_ban === f.department);
        if (f.unit) filtered = filtered.filter(item => item.don_vi_tinh === f.unit);
        if (f.staff) filtered = filtered.filter(item => item.nhan_vien_ql === f.staff);
        if (f.category) filtered = filtered.filter(item => item.phan_loai === f.category);
        if (f.yearRange) filtered = filtered.filter(item => this.filterByYearRange(item, f.yearRange));

        return filtered;
    }

    filterByYearRange(device, range) {
        if (!range || !device.nam_san_xuat) return true;
        const age = new Date().getFullYear() - device.nam_san_xuat;
        switch(range){
            case 'under5': return age <=5;
            case '5-10': return age>5 && age<=10;
            case '10-20': return age>10 && age<=20;
            case 'over20': return age>20;
            default: return true;
        }
    }
}

window.locManager = new LocManager();
