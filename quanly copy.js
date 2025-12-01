// quanly.js - Quản lý dữ liệu thiết bị
class QuanLyManager {
    constructor() {
        this.moduleName = "QuanLyManager";
        this.allDevices = [];
        this.filteredDevices = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.selectedDevices = new Set();
        this.init();
        this.applyFiltersDebounced = this.debounce(this.applyFiltersImmediate.bind(this), 300);

    }
    
    init() {
        AppEvents.on('app:ready', () => this.setup());
        
        // Data events
        
AppEvents.on('data:getDevicesByIds', (data) => {
    const devices = this.allDevices.filter(device => 
        data.deviceIds.includes(device.id)
    );
    if (data.callback) {
        data.callback(devices);
    }
});
AppEvents.on('data:refresh', () => this.loadDevices());
        AppEvents.on('data:refreshView', () => this.refreshView());
        AppEvents.on('data:getDevice', (data) => this.getDevice(data));
         AppEvents.on('data:changePage', (page) => this.changePage(page));
    AppEvents.on('data:changePageSize', (size) => this.changePageSize(size));
        // Action events
        AppEvents.on('action:addDevice', () => this.showAddDevice());
        AppEvents.on('action:updateDevice', (data) => this.updateDevice(data));
        AppEvents.on('action:deleteDevice', (deviceId) => this.deleteDevice(deviceId));
        AppEvents.on('action:splitDevice', (deviceId) => this.splitDevice(deviceId));
        
        // Filter events
        AppEvents.on('filter:apply', (filters) => this.applyFilters(filters));
        AppEvents.on('filter:clear', () => this.clearFilters());
        
        // Bulk events
        AppEvents.on('bulk:toggleAll', (checked) => this.toggleSelectAll(checked));
        AppEvents.on('bulk:toggleDevice', (data) => this.toggleDeviceSelection(data));
    AppEvents.on('bulk:selectAll', () => this.selectAllDevices());
    AppEvents.on('bulk:clearAll', () => this.clearAllSelection());
    AppEvents.on('reference:manage', () => this.showReferenceDataManager());
}
// Thêm methods mới
changePage(page) {
    if (page >= 1 && page <= Math.ceil(this.filteredDevices.length / this.itemsPerPage)) {
        this.currentPage = page;
        this.refreshView();
    }
}

changePageSize(size) {
    this.itemsPerPage = size >= 1000 ? 1000 : size; // "all" = 1000
    this.currentPage = 1;
    this.refreshView();
}

// Đảm bảo refreshView được gọi đúng
refreshView() {
    const paginatedDevices = this.getCurrentPageDevices();
    AppEvents.emit('data:devicesUpdated', paginatedDevices);
    this.updatePagination();
}
selectAllDevices() {
    const currentPageDevices = this.getCurrentPageDevices();
    currentPageDevices.forEach(device => {
        this.selectedDevices.add(device.id);
    });
    
    AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
    AppEvents.emit('notification:show', {
        message: `Đã chọn ${currentPageDevices.length} thiết bị`,
        type: 'success'
    });
}

clearAllSelection() {
    this.selectedDevices.clear();
    AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
    AppEvents.emit('notification:show', {
        message: 'Đã bỏ chọn tất cả thiết bị',
        type: 'success'
    });
}
    
    async setup() {
        await this.loadReferenceData();
        await this.loadDevices();
        console.log('✅ QuanLyManager ready');
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
            this.allDevices = await medicalDB.getAllDevices();
            this.applyCurrentFilters();
            this.refreshView();
            AppEvents.emit('stats:update', this.allDevices);
        } catch (error) {
            console.error('Error loading devices:', error);
            this.allDevices = [];
            this.filteredDevices = [];
            this.refreshView();
        }
    }
    
    applyCurrentFilters() {
        // Giữ nguyên bộ lọc hiện tại
        if (this.currentFilters) {
            this.filteredDevices = this.applyFiltersToDevices(this.allDevices, this.currentFilters);
        } else {
            this.filteredDevices = [...this.allDevices];
        }
    }
    


applyFilters(filters) {
    this.currentFilters = filters;
    this.currentPage = 1;
    this.applyFiltersDebounced(); // Dùng debounced version
}

applyFiltersImmediate() {
    // Thực hiện filtering thực sự
    this.filteredDevices = this.applyFiltersToDevices(this.allDevices, this.currentFilters);
    this.refreshView();
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
    
    applyFiltersToDevices(devices, filters) {
    let filtered = [...devices];
    
    if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(device =>
            device.ten_thiet_bi.toLowerCase().includes(searchTerm) ||
            (device.model && device.model.toLowerCase().includes(searchTerm)) ||
            (device.nha_san_xuat && device.nha_san_xuat.toLowerCase().includes(searchTerm))
        );
    }
    
    if (filters.status) {
        filtered = filtered.filter(device => device.tinh_trang === filters.status);
    }
    
    if (filters.department) {
        filtered = filtered.filter(device => device.phong_ban === filters.department);
    }

    if (filters.unit) {
        filtered = filtered.filter(device => device.don_vi_tinh === filters.unit);
    }

    if (filters.staff) {
        filtered = filtered.filter(device => device.nhan_vien_ql === filters.staff);
    }

    if (filters.category) {
        filtered = filtered.filter(device => device.phan_loai === filters.category);
    }
    
    if (filters.yearRange) {
        filtered = filtered.filter(device => this.filterByYearRange(device, filters.yearRange));
    }
    
    return filtered;
}

    
    filterByYearRange(device, range) {
        if (!range || !device.nam_san_xuat) return true;
        
        const currentYear = new Date().getFullYear();
        const age = currentYear - device.nam_san_xuat;
        
        switch (range) {
            case 'under5': return age <= 5;
            case '5-10': return age > 5 && age <= 10;
            case '10-20': return age > 10 && age <= 20;
            case 'over20': return age > 20;
            default: return true;
        }
    }
    
    clearFilters() {
        this.currentFilters = null;
        this.currentPage = 1;
        this.filteredDevices = [...this.allDevices];
        this.refreshView();
    }
    
    refreshView() {
        const paginatedDevices = this.getCurrentPageDevices();
        AppEvents.emit('data:devicesUpdated', paginatedDevices);
        this.updatePagination();
    }
    
    getCurrentPageDevices() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredDevices.slice(startIndex, endIndex);
    }
    
    updatePagination() {
    const totalPages = Math.ceil(this.filteredDevices.length / this.itemsPerPage);
    
    const paginationInfo = {
        currentPage: this.currentPage,
        totalPages: totalPages,
        totalDevices: this.filteredDevices.length,
        itemsPerPage: this.itemsPerPage,
        startIndex: (this.currentPage - 1) * this.itemsPerPage + 1,
        endIndex: Math.min(this.currentPage * this.itemsPerPage, this.filteredDevices.length)
    };
    
    AppEvents.emit('ui:updatePagination', paginationInfo);
}
    
    getDevice(data) {
        const device = this.allDevices.find(d => d.id === data.deviceId);
        if (data.callback) {
            data.callback(device);
        }
    }
    
    showAddDevice() {
        // Hiển thị form thêm thiết bị
        AppEvents.emit('ui:showAddDevice');
    }
    
    async updateDevice(data) {
        try {
            await medicalDB.updateDevice(data.deviceId, data.updates);
            
            // Update local data
            const deviceIndex = this.allDevices.findIndex(d => d.id === data.deviceId);
            if (deviceIndex !== -1) {
                Object.assign(this.allDevices[deviceIndex], data.updates);
            }
            
            await medicalDB.addActivity({
                type: 'update',
                description: `Cập nhật thiết bị: ${data.updates.ten_thiet_bi}`,
                user: 'Quản trị viên'
            });
            
            this.applyCurrentFilters();
            this.refreshView();
            AppEvents.emit('stats:update', this.allDevices);
            AppEvents.emit('notification:show', {message: 'Đã cập nhật thiết bị thành công', type: 'success'});
            
        } catch (error) {
            console.error('Error updating device:', error);
            AppEvents.emit('notification:show', {message: 'Lỗi khi cập nhật thiết bị: ' + error.message, type: 'error'});
        }
    }
 
// Thêm method add device
async addNewDevice(deviceData) {
    try {
        const newId = await medicalDB.addDevice(deviceData);
        await this.loadDevices(); // Refresh data
        return newId;
    } catch (error) {
        console.error('Error adding device:', error);
        throw error;
    }
}
    async deleteDevice(deviceId) {
        if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;
        
        try {
            const device = this.allDevices.find(d => d.id === deviceId);
            await medicalDB.deleteDevice(deviceId);
            
            await medicalDB.addActivity({
                type: 'delete',
                description: `Xóa thiết bị: ${device.ten_thiet_bi}`,
                user: 'Quản trị viên'
            });
            
            // Remove from local data
            this.allDevices = this.allDevices.filter(d => d.id !== deviceId);
            this.selectedDevices.delete(deviceId);
            
            this.applyCurrentFilters();
            this.refreshView();
            AppEvents.emit('stats:update', this.allDevices);
            AppEvents.emit('notification:show', {message: 'Đã xóa thiết bị thành công', type: 'success'});
            
        } catch (error) {
            console.error('Error deleting device:', error);
            AppEvents.emit('notification:show', {message: 'Lỗi khi xóa thiết bị', type: 'error'});
        }
    }
    
    async splitDevice(deviceId) {
        const device = this.allDevices.find(d => d.id === deviceId);
        if (!device) return;
        
        if (device.so_luong <= 1) {
            AppEvents.emit('notification:show', {message: 'Không thể chia thiết bị có số lượng 1', type: 'error'});
            return;
        }
        
        const quantity = prompt(`Nhập số lượng muốn tách từ thiết bị "${device.ten_thiet_bi}" (hiện có: ${device.so_luong}):`);
        const quantityNum = parseInt(quantity);
        
        if (!quantity || isNaN(quantityNum) || quantityNum <= 0 || quantityNum >= device.so_luong) {
            AppEvents.emit('notification:show', {message: 'Số lượng không hợp lệ', type: 'error'});
            return;
        }
        
        await this.confirmSplitDevice(device, quantityNum);
    }
    
    async confirmSplitDevice(device, splitQuantity) {
        if (!confirm(`Tách ${splitQuantity} từ ${device.so_luong} thiết bị "${device.ten_thiet_bi}"?`)) {
            return;
        }
        
        try {
            // Update original device
            const remainingQuantity = device.so_luong - splitQuantity;
            await medicalDB.updateDevice(device.id, {
                so_luong: remainingQuantity
            });
            
            // Create new device
            const newDevice = {
                ten_thiet_bi: device.ten_thiet_bi,
                model: device.model,
                nha_san_xuat: device.nha_san_xuat,
                nam_san_xuat: device.nam_san_xuat,
                so_luong: splitQuantity,
                nguyen_gia: device.nguyen_gia,
                phan_loai: device.phan_loai,
                don_vi_tinh: device.don_vi_tinh,
                phong_ban: device.phong_ban,
                tinh_trang: device.tinh_trang,
                nhan_vien_ql: device.nhan_vien_ql,
                ngay_nhap: device.ngay_nhap,
                vi_tri: device.vi_tri,
                ghi_chu: `Tách từ thiết bị ${device.id} - ${new Date().toLocaleDateString('vi-VN')}`,
                serial_number: `SPLIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                is_active: true,
                parent_id: device.id
            };
            
            const newDeviceId = await medicalDB.addDevice(newDevice);
            
            await medicalDB.addActivity({
                type: 'split',
                description: `Chia thiết bị ${device.ten_thiet_bi}: ${device.so_luong} → ${remainingQuantity} + ${splitQuantity}`,
                user: 'Quản trị viên'
            });
            
            await this.loadDevices();
            AppEvents.emit('notification:show', {message: `Đã chia thiết bị thành công! Thiết bị gốc: ${remainingQuantity} cái, Thiết bị mới: ${splitQuantity} cái`, type: 'success'});
            
        } catch (error) {
            console.error('Error splitting device:', error);
            AppEvents.emit('notification:show', {message: 'Lỗi khi chia thiết bị: ' + error.message, type: 'error'});
        }
    }
    
    toggleSelectAll(checked) {
        const currentPageDevices = this.getCurrentPageDevices();
        
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
        this.refreshView();
    }
    
    toggleDeviceSelection(data) {
        if (data.checked) {
            this.selectedDevices.add(data.deviceId);
        } else {
            this.selectedDevices.delete(data.deviceId);
        }
        
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
    }
}

new QuanLyManager();