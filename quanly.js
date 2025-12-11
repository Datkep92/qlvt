class QuanLyManager {
    constructor() {
        this.moduleName = "QuanLyManager";
        this.allDevices = [];
        this.filteredDevices = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.selectedDevices = new Set();
        this.currentFilters = {}; // Lưu filters hiện tại
        this.init();
    }

    init() {
        // QUAN TRỌNG: Chỉ lắng nghe filter:applied từ locManager
        AppEvents.on('filter:applied', (filters) => {
            console.log('QuanLyManager: Received filters', filters);
            this.currentFilters = filters || {};
            this.applyFilters();
        });
        AppEvents.on('action:toggleSelectAll', (isChecked) => {
        this.handleSelectAllFromFooter(isChecked);
    });
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('data:refresh', () => this.loadDevices());
        AppEvents.on('data:refreshView', () => this.refreshView());
        AppEvents.on('data:changePage', (page) => this.changePage(page));
        AppEvents.on('data:changePageSize', (size) => this.changePageSize(size));
        AppEvents.on('data:getDevicesByIds', (data) => {
            const devices = this.allDevices.filter(d => data.deviceIds.includes(d.id));
            if (data.callback) data.callback(devices);
        });
        AppEvents.on('data:getDevice', (data) => this.getDevice(data));
        AppEvents.on('data:getStaff', (data) => this.getStaff(data));

        // CRUD
        AppEvents.on('action:addDevice', () => this.showAddDevice());
        AppEvents.on('action:updateDevice', (data) => this.updateDevice(data));
        AppEvents.on('action:deleteDevice', (id) => this.deleteDevice(id));
        AppEvents.on('action:splitDevice', (id, options) => this.splitDevice(id, options)); // Đã sửa để nhận options

        // Bulk
        AppEvents.on('bulk:toggleAll', (checked) => this.toggleSelectAll(checked));
        AppEvents.on('bulk:toggleDevice', (data) => this.toggleDeviceSelection(data));
        AppEvents.on('bulk:selectAll', () => this.selectAllDevices());
        AppEvents.on('bulk:clearAll', () => this.clearAllSelection());
        
        // Lịch sử
        AppEvents.on('action:recordHistory', (data) => this.recordHistory(data));
        
        // Đã loại bỏ AppEvents.on('action:deviceSplit', ...) không đáng tin cậy. 
        // Logic loadDevices sẽ được gọi bên trong confirmSplitDevice sau khi DB đã cập nhật.
        
        AppEvents.on('data:changed', () => {
            this.loadDevices();
        });
    }
    
    getStaff(data) {
        medicalDB.getStaff(data.staffId).then(staff => {
            if (data.callback) data.callback(staff);
        }).catch(error => {
            console.error('Error getting staff:', error);
            if (data.callback) data.callback(null);
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
        } catch(err){
            console.error(err);
            this.departments=[]; this.units=[]; this.staff=[];
        }
    }

    async loadDevices() {
        try {
            console.log('Loading devices...');
            this.allDevices = await medicalDB.getAllDevices();
            console.log('Total devices from DB:', this.allDevices.length);
            this.applyFilters(); // Áp dụng filters hiện tại
        } catch(err){
            console.error('Error loading devices:', err);
            this.allDevices = [];
            this.filteredDevices = [];
            this.refreshView();
        }
    }

    applyFilters() {
        if (window.locManager) {
            // Sử dụng locManager để filter
            this.filteredDevices = window.locManager.applyFiltersToData(this.allDevices);
            console.log('Filtered devices:', this.filteredDevices.length);
        } else {
            // Fallback: tự filter
            this.filteredDevices = this.applyFiltersManually(this.allDevices);
        }
        
        // Reset về trang 1 khi filter
        this.currentPage = 1;
        this.refreshView();
        AppEvents.emit('stats:update', this.allDevices);
    }
    
    applyFiltersManually(devices) {
        if (!this.currentFilters || Object.keys(this.currentFilters).length === 0) {
            return [...devices];
        }
        
        let filtered = [...devices];
        const f = this.currentFilters;
        
        // Search filter
        if (f.search) {
            const term = f.search.toLowerCase();
            filtered = filtered.filter(item =>
                (item.ten_thiet_bi && item.ten_thiet_bi.toLowerCase().includes(term)) ||
                (item.model && item.model.toLowerCase().includes(term)) ||
                (item.nha_san_xuat && item.nha_san_xuat.toLowerCase().includes(term))
            );
        }
        
        // Status filter
        if (f.status) filtered = filtered.filter(item => item.tinh_trang === f.status);
        
        // Department filter
        if (f.department) filtered = filtered.filter(item => item.phong_ban === f.department);
        
        // Category filter
        if (f.category) filtered = filtered.filter(item => item.phan_loai === f.category);
        
        // Year range filter
        if (f.yearRange && window.locManager) {
            filtered = filtered.filter(item => window.locManager.filterByYearRange(item, f.yearRange));
        }
        
        return filtered;
    }

    // --- Phân trang ---
    changePage(page){
        const totalPages = Math.ceil(this.filteredDevices.length/this.itemsPerPage);
        if(page >= 1 && page <= totalPages){
            this.currentPage = page;
            this.refreshView();
        }
    }

    changePageSize(size){
        this.itemsPerPage = size >= 1000 ? 1000 : parseInt(size);
        this.currentPage = 1;
        this.refreshView();
    }

    refreshView(){
        const devices = this.getCurrentPageDevices();
        AppEvents.emit('data:devicesUpdated', devices);
        this.updatePagination();
        this.updateSelectionInfo();
    }

    getCurrentPageDevices(){
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredDevices.slice(start, end);
    }

    updatePagination(){
        const totalPages = Math.ceil(this.filteredDevices.length/this.itemsPerPage);
        AppEvents.emit('ui:updatePagination',{
            currentPage: this.currentPage,
            totalPages,
            totalDevices: this.filteredDevices.length,
            itemsPerPage: this.itemsPerPage,
            startIndex: (this.currentPage - 1) * this.itemsPerPage + 1,
            endIndex: Math.min(this.currentPage * this.itemsPerPage, this.filteredDevices.length)
        });
    }

    updateSelectionInfo() {
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
    }

    // --- Bulk selection ---
    selectAllDevices(){
        this.getCurrentPageDevices().forEach(d => this.selectedDevices.add(d.id));
        this.updateSelectionInfo();
    }

    clearAllSelection(){
        this.selectedDevices.clear();
        this.updateSelectionInfo();
    }

    toggleSelectAll(checked){
        if(checked){
            this.selectAllDevices();
        } else {
            this.clearAllSelection();
        }
    }

    toggleDeviceSelection(data){
        if(data.checked){
            this.selectedDevices.add(data.deviceId);
        } else {
            this.selectedDevices.delete(data.deviceId);
        }
        this.updateSelectionInfo();
    }

    // --- CRUD ---
    async updateDevice(data) {
        try {
            await medicalDB.updateRecord('devices', data.deviceId, data.updates);
            AppEvents.emit('notification:show', {
                message: 'Cập nhật thiết bị thành công',
                type: 'success'
            });
            AppEvents.emit('action:recordHistory', {
                type: 'update',
                description: `Cập nhật thiết bị #${data.deviceId}`,
                deviceId: data.deviceId
            });
            this.loadDevices(); // Tải lại dữ liệu sau khi cập nhật
        } catch (error) {
            console.error('Error updating device:', error);
            AppEvents.emit('notification:show', {
                message: `Lỗi cập nhật thiết bị: ${error.message}`,
                type: 'error'
            });
        }
    }

    async deleteDevice(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;
        try {
            await medicalDB.deleteRecord('devices', id);
            AppEvents.emit('notification:show', {
                message: 'Xóa thiết bị thành công',
                type: 'success'
            });
            AppEvents.emit('action:recordHistory', {
                type: 'delete',
                description: `Xóa thiết bị #${id}`,
                deviceId: id
            });
            this.loadDevices(); // Tải lại dữ liệu sau khi xóa
        } catch (error) {
            console.error('Error deleting device:', error);
            AppEvents.emit('notification:show', {
                message: `Lỗi xóa thiết bị: ${error.message}`,
                type: 'error'
            });
        }
    }
    
    // PHƯƠNG THỨC XỬ LÝ LOGIC TÁCH THIẾT BỊ (FIX LỖI ĐỒNG BỘ)
    async confirmSplitDevice(device, qty, options = {}) {
        const originalQty = device.so_luong;
        
        // 1. Cập nhật thiết bị gốc
        const updates = {
            so_luong: originalQty - qty,
            // Đảm bảo đồng bộ phân loại sản phẩm
            phan_loai: medicalDB.determineCategory(device.ten_thiet_bi), 
            thanh_tien: (device.nguyen_gia || 0) * (originalQty - qty)
        };
        
        if (!device.id) throw new Error('Device ID not found for splitting');

        await medicalDB.updateRecord('devices', device.id, updates);

        // 2. Tạo số serial duy nhất cho thiết bị mới
        const uniqueSerial = `SPLIT_${device.serial_number}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // 3. Tạo thiết bị mới
        const newDevice = {
            serial_number: uniqueSerial,
            ten_thiet_bi: device.ten_thiet_bi,
            model: device.model || '',
            nha_san_xuat: device.nha_san_xuat || '',
            nam_san_xuat: options.newYear || device.nam_san_xuat || null,
            so_luong: qty,
            nguyen_gia: device.nguyen_gia || 0,
            // Đảm bảo đồng bộ phân loại sản phẩm
            phan_loai: medicalDB.determineCategory(device.ten_thiet_bi), 
            don_vi_tinh: device.don_vi_tinh || 'cái',
            phong_ban: device.phong_ban || 'Chưa gán',
            tinh_trang: device.tinh_trang || 'Đang sử dụng',
            ghi_chu: `Tách từ thiết bị #${device.id} (SL gốc: ${originalQty}). Số lượng tách: ${qty}. Năm SX mới: ${options.newYear || 'Không đổi'} - ${new Date().toLocaleDateString('vi-VN')}`,
            nhan_vien_ql: device.nhan_vien_ql || '',
            ngay_nhap: device.ngay_nhap,
            vi_tri: device.vi_tri || '',
            don_vi: device.don_vi || '',
            is_active: true,
            parent_id: device.id,
        };

        const newDeviceId = await medicalDB.addRecord('devices', newDevice);

        // 4. Ghi lịch sử và thông báo
        AppEvents.emit('action:recordHistory', {
            type: 'split',
            description: `Đã tách ${qty} ${newDevice.don_vi_tinh} từ thiết bị #${device.id} (còn lại ${updates.so_luong})`,
            deviceId: device.id,
            relatedDeviceId: newDeviceId
        });
        AppEvents.emit('notification:show', {
            message: `Đã tách thành công ${qty} thiết bị. Thiết bị mới #${newDeviceId} đã được tạo.`,
            type: 'success'
        });
        
        // 5. Tải lại dữ liệu (FIX LỖI ĐỒNG BỘ: đảm bảo dữ liệu mới đã được tải vào allDevices)
        // Việc này đồng bộ sẽ khắc phục lỗi hiển thị số lượng sai trong chế độ gộp.
        await this.loadDevices(); 
        
        // Phát event để UI tự động mở nhóm vừa tách
        AppEvents.emit('ui:autoExpandGroup', {
            groupName: newDevice.ten_thiet_bi,
            year: newDevice.nam_san_xuat,
            newDeviceId: newDeviceId
        });
    }


    // PHƯƠNG THỨC GỌI TÁCH THIẾT BỊ
    async splitDevice(deviceId, options = {}) {
        const device = this.allDevices.find(d => d.id === deviceId);
        if(!device || device.so_luong <= 1){
            AppEvents.emit('notification:show',{
                message:'Không thể chia thiết bị', 
                type:'error'
            });
            return;
        }
        
        let qty = options.quantity;
        let newYear = options.newYear; 

        // Nếu không có quantity trong options, hỏi người dùng
        if (!qty) {
            qty = parseInt(prompt(`Nhập số lượng muốn tách từ \"${device.ten_thiet_bi}\" (hiện có: ${device.so_luong}):`));
            if(!qty || isNaN(qty) || qty <= 0 || qty >= device.so_luong){
                AppEvents.emit('notification:show',{
                    message:'Số lượng không hợp lệ',
                    type:'error'
                });
                return;
            }
        }
        
        // Gọi phương thức xử lý chia
        try {
            await this.confirmSplitDevice(device, qty, { newYear: newYear });
        } catch (error) {
            console.error('Error during split operation:', error);
            AppEvents.emit('notification:show', {
                message: `Lỗi trong quá trình chia thiết bị: ${error.message}`,
                type: 'error'
            });
        }
    }
    

    getDevice(data){
        const device = this.allDevices.find(d => d.id === data.deviceId);
        if(data.callback) data.callback(device);
    }
    
    recordHistory(data) {
        // Được xử lý bởi history.js
        if (window.historyManager) {
            window.historyManager.recordHistory(data);
        }
    }

    showAddDevice(){
        AppEvents.emit('ui:showAddDevice');
    }
    
    // Phương thức để các module khác truy cập
    getAllDevices() {
        return [...this.allDevices];
    }
    
    getFilteredDevices() {
        return [...this.filteredDevices];
    }
    // ========== PHÂN TRANG NHÓM ==========
// Sửa phương thức getGroupedDevicesForPage trong quanly.js
getGroupedDevicesForPage(page = 1, pageSize = 10) {
    const allDevices = this.getFilteredDevices();
    
    // Kiểm tra nếu không có thiết bị
    if (!allDevices || allDevices.length === 0) {
        return {
            groups: [],
            currentPage: 1,
            totalPages: 0,
            totalGroups: 0,
            pageSize: pageSize,
            startIndex: 0,
            endIndex: 0
        };
    }
    
    // Sử dụng phương thức groupDevicesHierarchically từ hienthiManager để có cấu trúc đầy đủ
    if (window.hienThiManager) {
        const grouped = window.hienThiManager.groupDevicesHierarchically(allDevices);
        const groupArray = Object.values(grouped);
        
        // Phân trang
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedGroups = groupArray.slice(startIndex, endIndex);
        
        return {
            groups: paginatedGroups,
            currentPage: page,
            totalPages: Math.ceil(groupArray.length / pageSize),
            totalGroups: groupArray.length,
            pageSize: pageSize,
            startIndex: groupArray.length > 0 ? startIndex + 1 : 0,
            endIndex: Math.min(endIndex, groupArray.length)
        };
    } else {
        // Fallback: Tạo cấu trúc đơn giản nếu không có hienThiManager
        const groups = {};
        allDevices.forEach(device => {
            const deviceName = device.ten_thiet_bi || 'Chưa đặt tên';
            if (!groups[deviceName]) {
                groups[deviceName] = {
                    name: deviceName,
                    years: {}, // Thêm thuộc tính years
                    devices: [],
                    totalQuantity: 0,
                    totalValue: 0
                };
            }
            
            // Thêm device vào nhóm
            const deviceYear = device.nam_san_xuat || 'Không xác định';
            if (!groups[deviceName].years[deviceYear]) {
                groups[deviceName].years[deviceYear] = {
                    year: deviceYear,
                    devices: [],
                    quantity: 0,
                    value: 0,
                    models: new Set()
                };
            }
            
            // Cập nhật thông tin năm
            const yearGroup = groups[deviceName].years[deviceYear];
            yearGroup.devices.push(device);
            yearGroup.quantity += (device.so_luong || 1);
            yearGroup.value += (device.nguyen_gia || 0) * (device.so_luong || 1);
            if (device.model) {
                yearGroup.models.add(device.model);
            }
            
            // Cập nhật tổng nhóm
            groups[deviceName].devices.push(device);
            groups[deviceName].totalQuantity += (device.so_luong || 1);
            groups[deviceName].totalValue += (device.nguyen_gia || 0) * (device.so_luong || 1);
        });
        
        // Chuyển đổi thành mảng và sắp xếp
        const groupArray = Object.values(groups).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        // Phân trang
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedGroups = groupArray.slice(startIndex, endIndex);
        
        return {
            groups: paginatedGroups,
            currentPage: page,
            totalPages: Math.ceil(groupArray.length / pageSize),
            totalGroups: groupArray.length,
            pageSize: pageSize,
            startIndex: groupArray.length > 0 ? startIndex + 1 : 0,
            endIndex: Math.min(endIndex, groupArray.length)
        };
    }
}

// Phương thức để lấy thiết bị cho chế độ thẻ
getCardDevicesForPage(page = 1, pageSize = 10) {
    const allDevices = this.getFilteredDevices();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDevices = allDevices.slice(startIndex, endIndex);
    
    return {
        devices: paginatedDevices,
        currentPage: page,
        totalPages: Math.ceil(allDevices.length / pageSize),
        totalDevices: allDevices.length,
        pageSize: pageSize,
        startIndex: startIndex + 1,
        endIndex: Math.min(endIndex, allDevices.length)
    };
}
// Phương thức lấy tất cả thiết bị đã lọc (không phân trang) - CHO HIỂN THỊ THẺ
getAllFilteredDevices() {
    return this.getFilteredDevices();
}

// Phương thức để lấy tổng số thiết bị
getTotalDeviceCount() {
    return this.filteredDevices.length;
}

// Phương thức để xử lý khi chọn tất cả thiết bị (cho footer)
handleSelectAllFromFooter(isChecked) {
    if (isChecked) {
        // Chọn tất cả thiết bị đã lọc
        this.filteredDevices.forEach(device => {
            this.selectedDevices.add(device.id);
        });
    } else {
        // Bỏ chọn tất cả
        this.selectedDevices.clear();
    }
    
    this.updateSelectionInfo();
    
    // Thông báo
    AppEvents.emit('notification:show', {
        message: isChecked ? 
            `Đã chọn ${this.filteredDevices.length} thiết bị` : 
            'Đã bỏ chọn tất cả thiết bị',
        type: 'info'
    });
}
    getCurrentPageDevicesCount() {
        return this.getCurrentPageDevices().length;
    }
}

// Khởi tạo global instance
window.quanLyManager = new QuanLyManager();