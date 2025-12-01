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

        AppEvents.on('filter:apply', (filters) => this.applyFilters(filters));
        AppEvents.on('filter:clear', () => this.clearFilters());
    AppEvents.on('data:getStaff', (data) => this.getStaff(data));

        AppEvents.on('data:refresh', () => this.loadDevices());
        AppEvents.on('data:refreshView', () => this.refreshView());
        AppEvents.on('data:changePage', (page) => this.changePage(page));
        AppEvents.on('data:changePageSize', (size) => this.changePageSize(size));
        AppEvents.on('data:getDevicesByIds', (data) => {
            const devices = this.allDevices.filter(d => data.deviceIds.includes(d.id));
            if (data.callback) data.callback(devices);
        });
        AppEvents.on('data:getDevice', (data) => this.getDevice(data));

        // CRUD
        AppEvents.on('action:addDevice', () => this.showAddDevice());
        AppEvents.on('action:updateDevice', (data) => this.updateDevice(data));
        AppEvents.on('action:deleteDevice', (id) => this.deleteDevice(id));
        AppEvents.on('action:splitDevice', (id) => this.splitDevice(id));

        // Bulk
        AppEvents.on('bulk:toggleAll', (checked) => this.toggleSelectAll(checked));
        AppEvents.on('bulk:toggleDevice', (data) => this.toggleDeviceSelection(data));
        AppEvents.on('bulk:selectAll', () => this.selectAllDevices());
        AppEvents.on('bulk:clearAll', () => this.clearAllSelection());
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
            this.allDevices = await medicalDB.getAllDevices();
            this.applyCurrentFilters();
            this.refreshView();
            AppEvents.emit('stats:update', this.allDevices);
        } catch(err){
            console.error(err);
            this.allDevices = [];
            this.filteredDevices = [];
            this.refreshView();
        }
    }

    applyCurrentFilters() {
        if (window.locManager) {
            this.filteredDevices = window.locManager.applyFiltersToData(this.allDevices);
        } else {
            this.filteredDevices = [...this.allDevices];
        }
    }

    applyFilters(filters){
        if (filters) this.currentFilters = filters;
        this.currentPage=1;
        this.applyFiltersDebounced();
    }

    applyFiltersImmediate(){
        this.applyCurrentFilters();
        this.refreshView();
    }

    debounce(func, wait){
        let timeout;
        return (...args)=>{
            clearTimeout(timeout);
            timeout = setTimeout(()=>func(...args), wait);
        }
    }

    clearFilters(){
        if(window.locManager) window.locManager.clearFilters();
        this.currentPage=1;
        this.applyCurrentFilters();
        this.refreshView();
    }

    // --- Phân trang ---
    changePage(page){
        if(page>=1 && page<=Math.ceil(this.filteredDevices.length/this.itemsPerPage)){
            this.currentPage=page;
            this.refreshView();
        }
    }

    changePageSize(size){
        this.itemsPerPage = size>=1000 ? 1000:size;
        this.currentPage=1;
        this.refreshView();
    }

    refreshView(){
        const devices = this.getCurrentPageDevices();
        AppEvents.emit('data:devicesUpdated', devices);
        this.updatePagination();
    }

    getCurrentPageDevices(){
        const start = (this.currentPage-1)*this.itemsPerPage;
        const end = start+this.itemsPerPage;
        return this.filteredDevices.slice(start,end);
    }

    updatePagination(){
        const totalPages = Math.ceil(this.filteredDevices.length/this.itemsPerPage);
        AppEvents.emit('ui:updatePagination',{
            currentPage:this.currentPage,
            totalPages,
            totalDevices:this.filteredDevices.length,
            itemsPerPage:this.itemsPerPage,
            startIndex:(this.currentPage-1)*this.itemsPerPage+1,
            endIndex: Math.min(this.currentPage*this.itemsPerPage, this.filteredDevices.length)
        });
    }

    // --- Bulk selection ---
    selectAllDevices(){
        this.getCurrentPageDevices().forEach(d=>this.selectedDevices.add(d.id));
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
    }

    clearAllSelection(){
        this.selectedDevices.clear();
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
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
   toggleSelectAll(checked){
    this.getCurrentPageDevices().forEach(d=>{
        if(checked) this.selectedDevices.add(d.id);
        else this.selectedDevices.delete(d.id);
    });
    
    // QUAN TRỌNG: Phát event để cập nhật bulk panel
    AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
    
    // Refresh view để cập nhật trạng thái checkbox
    this.refreshView();
}

    toggleDeviceSelection(data){
    if(data.checked) this.selectedDevices.add(data.deviceId);
    else this.selectedDevices.delete(data.deviceId);
    
    // QUAN TRỌNG: Phát event để cập nhật bulk panel
    AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
}

    // --- CRUD ---
    async addNewDevice(deviceData){
        try{
            const newId = await medicalDB.addDevice(deviceData);
            await this.loadDevices();
            return newId;
        }catch(err){ throw err; }
    }

    async updateDevice(data){
        try{
            await medicalDB.updateDevice(data.deviceId, data.updates);
            const idx = this.allDevices.findIndex(d=>d.id===data.deviceId);
            if(idx!==-1) Object.assign(this.allDevices[idx], data.updates);
            await medicalDB.addActivity({type:'update', description:`Cập nhật thiết bị: ${data.updates.ten_thiet_bi}`, user:'Quản trị viên'});
            this.applyCurrentFilters();
            this.refreshView();
            AppEvents.emit('stats:update', this.allDevices);
        }catch(err){ console.error(err); }
    }

    async deleteDevice(deviceId){
        if(!confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;
        try{
            const device = this.allDevices.find(d=>d.id===deviceId);
            await medicalDB.deleteDevice(deviceId);
            await medicalDB.addActivity({type:'delete', description:`Xóa thiết bị: ${device.ten_thiet_bi}`, user:'Quản trị viên'});
            this.allDevices = this.allDevices.filter(d=>d.id!==deviceId);
            this.selectedDevices.delete(deviceId);
            this.applyCurrentFilters();
            this.refreshView();
            AppEvents.emit('stats:update', this.allDevices);
        }catch(err){ console.error(err); }
    }

    async splitDevice(deviceId){
        const device = this.allDevices.find(d=>d.id===deviceId);
        if(!device || device.so_luong<=1){
            AppEvents.emit('notification:show',{message:'Không thể chia thiết bị',type:'error'});
            return;
        }
        const qty = parseInt(prompt(`Nhập số lượng muốn tách từ "${device.ten_thiet_bi}" (hiện có: ${device.so_luong}):`));
        if(!qty || isNaN(qty)||qty<=0||qty>=device.so_luong){
            AppEvents.emit('notification:show',{message:'Số lượng không hợp lệ',type:'error'});
            return;
        }
        await this.confirmSplitDevice(device, qty);
    }

    async confirmSplitDevice(device, qty) {
    if (!confirm(`Tách ${qty} từ ${device.so_luong} thiết bị "${device.ten_thiet_bi}"?`)) return;
    
    try {
        // 1. Cập nhật số lượng thiết bị gốc
        await medicalDB.updateDevice(device.id, { so_luong: device.so_luong - qty });
        
        // 2. Tạo serial_number DUY NHẤT
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 12);
        const uniqueSerial = `SPLIT_${timestamp}_${device.id}_${randomStr}`;
        
        // 3. Tạo thiết bị mới - LOẠI BỎ id và các trường tự động
        const newDevice = {
            // KHÔNG copy id, created_at, updated_at (sẽ được tự động tạo)
            serial_number: uniqueSerial,
            ten_thiet_bi: device.ten_thiet_bi,
            model: device.model || '',
            nha_san_xuat: device.nha_san_xuat || '',
            nam_san_xuat: device.nam_san_xuat || null,
            so_luong: qty,
            nguyen_gia: device.nguyen_gia || 0,
            phan_loai: device.phan_loai || '',
            don_vi_tinh: device.don_vi_tinh || 'cái',
            phong_ban: device.phong_ban || '',
            tinh_trang: device.tinh_trang || 'Đang sử dụng',
            ghi_chu: `Tách từ thiết bị ${device.id} (${device.serial_number}) - ${new Date().toLocaleDateString('vi-VN')}`,
            nhan_vien_ql: device.nhan_vien_ql || '',
            ngay_nhap: device.ngay_nhap || new Date().toISOString().split('T')[0],
            vi_tri: device.vi_tri || '',
            don_vi: device.don_vi || '',
            is_active: device.is_active !== undefined ? device.is_active : true,
            parent_id: device.id // Chỉ lưu parent_id thôi
            // created_at và updated_at sẽ được tự động thêm trong addDevice
        };
        
        console.log('Thiết bị mới:', newDevice);
        
        // 4. Thêm thiết bị mới
        await medicalDB.addDevice(newDevice);
        
        // 5. Ghi log hoạt động
        await medicalDB.addActivity({
            type: 'split',
            description: `Chia thiết bị ${device.ten_thiet_bi} (ID: ${device.id}) thành ${qty} thiết bị mới`,
            user: 'Quản trị viên'
        });
        
        // 6. Tải lại dữ liệu
        await this.loadDevices();
        
        AppEvents.emit('notification:show', {
            message: `Đã tách thành công ${qty} thiết bị từ "${device.ten_thiet_bi}"`,
            type: 'success'
        });
        
    } catch (error) {
        console.error('Lỗi khi tách thiết bị:', error);
        AppEvents.emit('notification:show', {
            message: `Lỗi khi tách thiết bị: ${error.message}`,
            type: 'error'
        });
        
        // Nếu có lỗi, khôi phục số lượng gốc
        try {
            await medicalDB.updateDevice(device.id, { so_luong: device.so_luong });
        } catch (rollbackError) {
            console.error('Lỗi khi khôi phục:', rollbackError);
        }
    }
}

    getDevice(data){
        const device = this.allDevices.find(d=>d.id===data.deviceId);
        if(data.callback) data.callback(device);
    }

    showAddDevice(){
        AppEvents.emit('ui:showAddDevice');
    }
}

window.quanLyManager = new QuanLyManager();
