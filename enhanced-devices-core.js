class EnhancedDevicesManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredDevices = [];
        this.selectedDevices = new Set();
        this.viewMode = 'table';
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
        
        this.viewsManager = new DevicesViewsManager(this);
        this.filtersManager = new DevicesFiltersManager(this);
        this.bulkManager = new DevicesBulkManager(this);
        this.exportManager = new DevicesExportManager(this);
        this.maintenanceManager = new DevicesMaintenanceManager(this);
        
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

    // ========== CHỌN TẤT CẢ / BỎ CHỌN TẤT CẢ ==========
    
    selectAllDevices() {
        if (this.filteredDevices && this.filteredDevices.length > 0) {
            this.filteredDevices.forEach(device => {
                this.selectedDevices.add(device.id);
            });
            this.bulkManager.updateBulkPanel();
            this.viewsManager.renderDevices();
            this.showSuccess(`Đã chọn ${this.filteredDevices.length} thiết bị`);
        }
    }

    clearAllSelection() {
        this.selectedDevices.clear();
        this.bulkManager.updateBulkPanel();
        this.viewsManager.renderDevices();
        this.showSuccess('Đã bỏ chọn tất cả thiết bị');
    }

    // ========== SỬA LỖI CHIA THIẾT BỊ ==========

    // CẬP NHẬT phương thức confirmSplitDevice trong enhanced-devices-core.js
async confirmSplitDevice(device, splitQuantity) {
    if (!confirm(`Tách ${splitQuantity} từ ${device.so_luong} thiết bị "${device.ten_thiet_bi}"?\n\nThiết bị gốc sẽ còn: ${device.so_luong - splitQuantity}\nThiết bị mới: ${splitQuantity}`)) {
        return;
    }

    try {
        // Cập nhật thiết bị gốc
        const remainingQuantity = device.so_luong - splitQuantity;
        await medicalDB.updateDevice(device.id, {
            so_luong: remainingQuantity
        });

        // Tạo thiết bị mới
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

        // Log activity
        await medicalDB.addActivity({
            type: 'split',
            description: `Chia thiết bị ${device.ten_thiet_bi}: ${device.so_luong} → ${remainingQuantity} + ${splitQuantity} (ID mới: ${newDeviceId})`,
            user: 'Quản trị viên'
        });

        this.showSuccess(`Đã chia thiết bị thành công!\n\nThiết bị gốc: ${remainingQuantity} cái\nThiết bị mới: ${splitQuantity} cái`);
        
        // Refresh to show both devices
        await this.loadDevices();
        this.viewsManager.renderDevices();
        this.renderStats();

    } catch (error) {
        console.error('Error splitting device:', error);
        this.showError('Lỗi khi chia thiết bị: ' + error.message);
    }
}

    // ========== SỬA LỖI EDIT DEVICE ==========

    editDevice(deviceId) {
        if (window.app) {
            const device = this.allDevices?.find(d => d.id === deviceId);
            if (device) {
                app.showDeviceModal(device);
            } else {
                this.showError('Không tìm thấy thiết bị');
            }
        } else {
            this.showError('Không thể mở chỉnh sửa thiết bị');
        }
    }
    // ========== THỰC THI TÍNH NĂNG THỰC TẾ ==========
    
    showReferenceDataManager() {
        // Tạo modal quản lý dữ liệu tham chiếu
        const modal = this.createReferenceDataModal();
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Load dữ liệu
        this.loadReferenceDataForModal(modal);
    }

    createReferenceDataModal() {
        const modal = document.createElement('div');
        modal.className = 'modal reference-data-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: none;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80%; margin: 5% auto; background: white; border-radius: 8px; overflow: hidden;">
                <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🏢 QUẢN LÝ DỮ LIỆU THAM CHIẾU</h3>
                    <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                    <div class="tabs" style="margin-bottom: 20px;">
                        <button class="tab-btn active" onclick="enhancedDevices.switchReferenceTab('departments', this)">🏥 Phòng Ban</button>
                        <button class="tab-btn" onclick="enhancedDevices.switchReferenceTab('units', this)">📦 Đơn Vị</button>
                        <button class="tab-btn" onclick="enhancedDevices.switchReferenceTab('staff', this)">👤 Nhân Viên</button>
                    </div>
                    
                    <div id="departments-tab" class="tab-content active">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4>DANH SÁCH PHÒNG BAN</h4>
                            <button class="btn-primary" onclick="enhancedDevices.showAddDepartmentForm()">➕ Thêm Phòng Ban</button>
                        </div>
                        <div id="departments-list"></div>
                    </div>
                    
                    <div id="units-tab" class="tab-content" style="display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4>DANH SÁCH ĐƠN VỊ</h4>
                            <button class="btn-primary" onclick="enhancedDevices.showAddUnitForm()">➕ Thêm Đơn Vị</button>
                        </div>
                        <div id="units-list"></div>
                    </div>
                    
                    <div id="staff-tab" class="tab-content" style="display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4>DANH SÁCH NHÂN VIÊN</h4>
                            <button class="btn-primary" onclick="enhancedDevices.showAddStaffForm()">➕ Thêm Nhân Viên</button>
                        </div>
                        <div id="staff-list"></div>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    async loadReferenceDataForModal(modal) {
        try {
            const departments = await medicalDB.getAllDepartments();
            const units = await medicalDB.getAllUnits();
            const staff = await medicalDB.getAllStaff();

            this.renderDepartmentsList(modal, departments);
            this.renderUnitsList(modal, units);
            this.renderStaffList(modal, staff);

        } catch (error) {
            console.error('Error loading reference data:', error);
            this.showError('Lỗi khi tải dữ liệu tham chiếu');
        }
    }

    renderDepartmentsList(modal, departments) {
        const container = modal.querySelector('#departments-list');
        if (departments.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có phòng ban nào</div>';
            return;
        }

        container.innerHTML = `
            <div class="reference-list">
                ${departments.map(dept => `
                    <div class="reference-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                        <div>
                            <div style="font-weight: bold;">${this.escapeHtml(dept.ten_phong)}</div>
                            <div style="font-size: 12px; color: #666;">ID: ${dept.id}</div>
                        </div>
                        <div>
                            <button class="btn-action" onclick="enhancedDevices.editDepartment(${dept.id}, '${this.escapeHtml(dept.ten_phong)}')" style="padding: 5px 10px; margin-right: 5px;">✏️</button>
                            <button class="btn-action" onclick="enhancedDevices.deleteDepartment(${dept.id}, '${this.escapeHtml(dept.ten_phong)}')" style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderUnitsList(modal, units) {
        const container = modal.querySelector('#units-list');
        if (units.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có đơn vị nào</div>';
            return;
        }

        container.innerHTML = `
            <div class="reference-list">
                ${units.map(unit => `
                    <div class="reference-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                        <div>
                            <div style="font-weight: bold;">${this.escapeHtml(unit.ten_don_vi)}</div>
                            <div style="font-size: 12px; color: #666;">ID: ${unit.id}</div>
                        </div>
                        <div>
                            <button class="btn-action" onclick="enhancedDevices.editUnit(${unit.id}, '${this.escapeHtml(unit.ten_don_vi)}')" style="padding: 5px 10px; margin-right: 5px;">✏️</button>
                            <button class="btn-action" onclick="enhancedDevices.deleteUnit(${unit.id}, '${this.escapeHtml(unit.ten_don_vi)}')" style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderStaffList(modal, staff) {
        const container = modal.querySelector('#staff-list');
        if (staff.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có nhân viên nào</div>';
            return;
        }

        container.innerHTML = `
            <div class="reference-list">
                ${staff.map(person => `
                    <div class="reference-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                        <div>
                            <div style="font-weight: bold;">${this.escapeHtml(person.ten_nhan_vien)}</div>
                            <div style="font-size: 12px; color: #666;">${person.chuc_vu || 'Chưa có chức vụ'} • ID: ${person.id}</div>
                        </div>
                        <div>
                            <button class="btn-action" onclick="enhancedDevices.editStaff(${person.id})" style="padding: 5px 10px; margin-right: 5px;">✏️</button>
                            <button class="btn-action" onclick="enhancedDevices.deleteStaff(${person.id}, '${this.escapeHtml(person.ten_nhan_vien)}')" style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    switchReferenceTab(tabName, button) {
        // Update active tab button
        document.querySelectorAll('.reference-data-modal .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Show selected tab content
        document.querySelectorAll('#departments-tab, #units-tab, #staff-tab').forEach(tab => {
            tab.style.display = 'none';
        });
        document.getElementById(`${tabName}-tab`).style.display = 'block';
    }

    showAddDepartmentForm() {
        const name = prompt('Nhập tên phòng ban mới:');
        if (name && name.trim()) {
            this.addDepartment(name.trim());
        }
    }

    async addDepartment(name) {
        try {
            await medicalDB.addDepartment({ ten_phong: name });
            this.showSuccess(`Đã thêm phòng ban: ${name}`);
            this.refreshReferenceData();
        } catch (error) {
            this.showError(`Lỗi khi thêm phòng ban: ${error.message}`);
        }
    }

    editDepartment(id, currentName) {
        const newName = prompt('Chỉnh sửa tên phòng ban:', currentName);
        if (newName && newName.trim() && newName !== currentName) {
            this.updateDepartment(id, newName.trim());
        }
    }

    async updateDepartment(id, newName) {
        try {
            await medicalDB.updateDepartment(id, { ten_phong: newName });
            this.showSuccess(`Đã cập nhật phòng ban thành: ${newName}`);
            this.refreshReferenceData();
        } catch (error) {
            this.showError(`Lỗi khi cập nhật phòng ban: ${error.message}`);
        }
    }

    async deleteDepartment(id, name) {
        if (confirm(`Bạn có chắc chắn muốn xóa phòng ban "${name}"?`)) {
            try {
                await medicalDB.deleteDepartment(id);
                this.showSuccess(`Đã xóa phòng ban: ${name}`);
                this.refreshReferenceData();
            } catch (error) {
                this.showError(`Lỗi khi xóa phòng ban: ${error.message}`);
            }
        }
    }

    showAddUnitForm() {
        const name = prompt('Nhập tên đơn vị mới:');
        if (name && name.trim()) {
            this.addUnit(name.trim());
        }
    }

    async addUnit(name) {
        try {
            await medicalDB.addUnit({ ten_don_vi: name });
            this.showSuccess(`Đã thêm đơn vị: ${name}`);
            this.refreshReferenceData();
        } catch (error) {
            this.showError(`Lỗi khi thêm đơn vị: ${error.message}`);
        }
    }

    editUnit(id, currentName) {
        const newName = prompt('Chỉnh sửa tên đơn vị:', currentName);
        if (newName && newName.trim() && newName !== currentName) {
            this.updateUnit(id, newName.trim());
        }
    }

    async updateUnit(id, newName) {
        try {
            await medicalDB.updateUnit(id, { ten_don_vi: newName });
            this.showSuccess(`Đã cập nhật đơn vị thành: ${newName}`);
            this.refreshReferenceData();
        } catch (error) {
            this.showError(`Lỗi khi cập nhật đơn vị: ${error.message}`);
        }
    }

    async deleteUnit(id, name) {
        if (confirm(`Bạn có chắc chắn muốn xóa đơn vị "${name}"?`)) {
            try {
                await medicalDB.deleteUnit(id);
                this.showSuccess(`Đã xóa đơn vị: ${name}`);
                this.refreshReferenceData();
            } catch (error) {
                this.showError(`Lỗi khi xóa đơn vị: ${error.message}`);
            }
        }
    }

    showAddStaffForm() {
        const name = prompt('Nhập tên nhân viên mới:');
        if (name && name.trim()) {
            const position = prompt('Nhập chức vụ:');
            this.addStaff(name.trim(), position || '');
        }
    }

    async addStaff(name, position) {
        try {
            await medicalDB.addStaff({ 
                ten_nhan_vien: name, 
                chuc_vu: position 
            });
            this.showSuccess(`Đã thêm nhân viên: ${name}`);
            this.refreshReferenceData();
        } catch (error) {
            this.showError(`Lỗi khi thêm nhân viên: ${error.message}`);
        }
    }

    editStaff(id) {
        const staff = this.staff?.find(s => s.id === id);
        if (!staff) return;

        const newName = prompt('Chỉnh sửa tên nhân viên:', staff.ten_nhan_vien);
        if (newName && newName.trim()) {
            const newPosition = prompt('Chỉnh sửa chức vụ:', staff.chuc_vu || '');
            this.updateStaff(id, newName.trim(), newPosition || '');
        }
    }

    async updateStaff(id, newName, newPosition) {
        try {
            await medicalDB.updateStaff(id, { 
                ten_nhan_vien: newName, 
                chuc_vu: newPosition 
            });
            this.showSuccess(`Đã cập nhật nhân viên: ${newName}`);
            this.refreshReferenceData();
        } catch (error) {
            this.showError(`Lỗi khi cập nhật nhân viên: ${error.message}`);
        }
    }

    async deleteStaff(id, name) {
        if (confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}"?`)) {
            try {
                await medicalDB.deleteStaff(id);
                this.showSuccess(`Đã xóa nhân viên: ${name}`);
                this.refreshReferenceData();
            } catch (error) {
                this.showError(`Lỗi khi xóa nhân viên: ${error.message}`);
            }
        }
    }

    async refreshReferenceData() {
        await this.loadReferenceData();
        const modal = document.querySelector('.reference-data-modal');
        if (modal) {
            this.loadReferenceDataForModal(modal);
        }
    }

    // ========== TÍNH NĂNG XEM CHI TIẾT THIẾT BỊ ==========

    showDeviceDetails(deviceId) {
        const device = this.allDevices?.find(d => d.id === deviceId);
        if (!device) {
            this.showError('Không tìm thấy thiết bị');
            return;
        }

        const modal = this.createDeviceDetailsModal(device);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createDeviceDetailsModal(device) {
    const modal = document.createElement('div');
    modal.className = 'modal device-details-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: none;
    `;
    
    // Tính toán thành tiền
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
                        <label>Số lượng:</label>
                        <div class="value">${device.so_luong} ${device.don_vi_tinh || 'cái'}</div>
                    </div>
                    <div class="info-item">
                        <label>Nguyên giá:</label>
                        <div class="value">${this.formatCurrency(device.nguyen_gia)}</div>
                    </div>
                    <div class="info-item">
                        <label>Thành tiền:</label>
                        <div class="value" style="color: #e74c3c; font-weight: bold;">${this.formatCurrency(thanhTien)}</div>
                    </div>
                    <div class="info-item">
                        <label>Tình trạng:</label>
                        <div class="value status-${this.getStatusClass(device.tinh_trang)}">${device.tinh_trang}</div>
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

    getStatusClass(status) {
        const statusMap = {
            'Đang sử dụng': 'success',
            'Bảo trì': 'warning', 
            'Hỏng': 'danger',
            'Ngừng sử dụng': 'gray'
        };
        return statusMap[status] || 'gray';
    }

    // ========== TÍNH NĂNG CHIA THIẾT BỊ ==========

    splitDevice(deviceId) {
        const device = this.allDevices?.find(d => d.id === deviceId);
        if (!device) {
            this.showError('Không tìm thấy thiết bị');
            return;
        }

        if (device.so_luong <= 1) {
            this.showError('Không thể chia thiết bị có số lượng 1');
            return;
        }

        const quantity = prompt(`Nhập số lượng muốn tách từ thiết bị "${device.ten_thiet_bi}" (hiện có: ${device.so_luong}):`);
        const quantityNum = parseInt(quantity);
        
        if (!quantity || isNaN(quantityNum) || quantityNum <= 0 || quantityNum >= device.so_luong) {
            this.showError('Số lượng không hợp lệ');
            return;
        }

        this.confirmSplitDevice(device, quantityNum);
    }
    
    // SỬA LẠI phương thức applyFiltersAndSort trong enhanced-devices-core.js
    applyFiltersAndSort() {
    // LOẠI BỎ filter parent_id để hiển thị TẤT CẢ thiết bị
    let filtered = [...this.allDevices]; // HIỂN THỊ TẤT CẢ, không filter parent_id

    // Apply filters
    filtered = this.filtersManager.applyAllFilters(filtered, this.currentFilters);
    
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
    renderUI() {
        const mainContainer = document.getElementById('devices-section') || this.createMainContainer();
        mainContainer.innerHTML = this.generateMainTemplate();
        this.renderStats();
        this.viewsManager.renderDevices();
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
                        <button class="btn-secondary" onclick="enhancedDevices.exportManager.exportDevices()">
                            📤 Export
                        </button>
                        <button class="btn-secondary" onclick="enhancedDevices.refreshData()">
                            🔄 Refresh
                        </button>
                        <!-- THÊM NÚT MỚI -->
                        <button class="btn-secondary" onclick="enhancedDevices.showReferenceDataManager()">
                            🏢 Quản lý dữ liệu
                        </button>
                    </div>
                </div>
                    
                    <!-- Stats Cards -->
                    <div class="stats-container" id="stats-container"></div>
                </div>

                <!-- Quick Actions & Filters -->
                <div class="controls-section">
                    <!-- Quick Actions -->
                    <div class="quick-actions">
                        <div class="actions-group">
                            <button class="btn-action bulk-btn" onclick="enhancedDevices.bulkManager.toggleBulkOperations()">
                                🎛️ Thao tác hàng loạt
                            </button>
                            <button class="btn-action" onclick="enhancedDevices.exportManager.generateQRCode()">
                                📱 QR Codes
                            </button>
                            <button class="btn-action" onclick="enhancedDevices.maintenanceManager.showMaintenanceSchedule()">
                                🛠️ Lịch bảo trì
                            </button>
                        </div>
                    </div>

                    <!-- Search & Filters -->
                    ${this.filtersManager.renderFilters()}
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
                ${this.bulkManager.renderBulkPanel()}

                <!-- Devices Display Area -->
                <div class="devices-display-area">
                    <div id="devices-table-view" class="view-content ${this.viewMode === 'table' ? 'active' : ''}"></div>
                    <div id="devices-cards-view" class="view-content ${this.viewMode === 'cards' ? 'active' : ''}"></div>
                    <div id="devices-tree-view" class="view-content ${this.viewMode === 'tree' ? 'active' : ''}"></div>
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
                        <div class="page-numbers" id="page-numbers"></div>
                        <button id="next-page" class="btn-pagination" onclick="enhancedDevices.nextPage()">
                            Tiếp ▶️
                        </button>
                    </div>
                </div>
            </div>
        `;
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

    setupEventListeners() {
        this.filtersManager.setupEventListeners();
    }

    // View Management
    switchView(viewMode) {
        this.viewMode = viewMode;
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
        
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.toggle('active', content.id === `devices-${viewMode}-view`);
        });
        
        this.viewsManager.renderDevices();
    }

    // Pagination
    updatePagination() {
        const totalPages = Math.ceil(this.filteredDevices.length / this.itemsPerPage);
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageNumbers = document.getElementById('page-numbers');

        if (pageInfo) pageInfo.textContent = `Trang ${this.currentPage}/${totalPages}`;
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;

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
            this.viewsManager.renderDevices();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredDevices.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.viewsManager.renderDevices();
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.viewsManager.renderDevices();
    }

    changePageSize(size) {
        this.itemsPerPage = parseInt(size);
        this.currentPage = 1;
        this.viewsManager.renderDevices();
    }

    // Sorting
    sortTable(field) {
        if (this.sortConfig.field === field) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.field = field;
            this.sortConfig.direction = 'asc';
        }
        this.applyFiltersAndSort();
        this.viewsManager.renderDevices();
    }

    getSortIcon(field) {
        if (this.sortConfig.field !== field) return '↕️';
        return this.sortConfig.direction === 'asc' ? '↑' : '↓';
    }

    // Public API
    refreshData() {
        this.loadDevices().then(() => {
            this.renderStats();
            this.viewsManager.renderDevices();
            this.showSuccess('Dữ liệu đã được làm mới');
        });
    }

    applyFiltersAndRender() {
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.viewsManager.renderDevices();
        this.renderStats();
    }
// THAY THẾ HOÀN TOÀN phương thức editDevice trong enhanced-devices-core.js
async editDevice(deviceId) {
    try {
        const device = this.allDevices?.find(d => d.id === deviceId);
        if (!device) {
            this.showError('Không tìm thấy thiết bị');
            return;
        }

        // Tạo modal chỉnh sửa riêng thay vì dùng app.showDeviceModal()
        this.showEditDeviceModal(device);
    } catch (error) {
        console.error('Error in editDevice:', error);
        this.showError('Không thể mở chỉnh sửa thiết bị: ' + error.message);
    }
}
// THÊM PHƯƠNG THỨC TÍNH TOÁN GIÁ
calculateTotalPrice() {
    const soLuong = parseInt(document.getElementById('edit-so-luong').value) || 0;
    const nguyenGia = parseFloat(document.getElementById('edit-nguyen-gia').value) || 0;
    const thanhTienInput = document.getElementById('edit-thanh-tien');
    const infoSpan = document.getElementById('price-calculation-info');
    
    if (soLuong > 0 && nguyenGia > 0) {
        const calculatedTotal = nguyenGia * soLuong;
        thanhTienInput.value = calculatedTotal;
        infoSpan.textContent = `Tự động tính: ${this.formatCurrency(nguyenGia)} × ${soLuong} = ${this.formatCurrency(calculatedTotal)}`;
        infoSpan.style.color = '#27ae60';
    } else {
        infoSpan.textContent = 'Tự động tính từ Nguyên giá × Số lượng';
        infoSpan.style.color = '#666';
    }
}

calculateUnitPrice() {
    const soLuong = parseInt(document.getElementById('edit-so-luong').value) || 0;
    const thanhTien = parseFloat(document.getElementById('edit-thanh-tien').value) || 0;
    const nguyenGiaInput = document.getElementById('edit-nguyen-gia');
    const infoSpan = document.getElementById('price-calculation-info');
    
    if (soLuong > 0 && thanhTien > 0) {
        const calculatedUnitPrice = thanhTien / soLuong;
        nguyenGiaInput.value = calculatedUnitPrice;
        infoSpan.textContent = `Tự động tính: ${this.formatCurrency(thanhTien)} ÷ ${soLuong} = ${this.formatCurrency(calculatedUnitPrice)}/cái`;
        infoSpan.style.color = '#e74c3c';
    } else {
        infoSpan.textContent = 'Tự động tính từ Nguyên giá × Số lượng';
        infoSpan.style.color = '#666';
    }
}
// THÊM PHƯƠNG THỨC MỚI để tạo modal chỉnh sửa
showEditDeviceModal(device) {
    const modal = document.createElement('div');
    modal.className = 'modal edit-device-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: block;
    `;
    
    // Tính toán thành tiền
    const nguyenGia = device.nguyen_gia || 0;
    const thanhTien = device.thanh_tien || (nguyenGia * device.so_luong);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 90%; margin: 2% auto; background: white; border-radius: 8px; overflow: hidden;">
            <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">✏️ CHỈNH SỬA THIẾT BỊ</h3>
                <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
            </div>
            <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                <form id="edit-device-form">
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
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
                            <input type="number" name="so_luong" value="${device.so_luong}" required min="1" id="edit-so-luong" onchange="enhancedDevices.calculateTotalPrice()">
                        </div>
                        <div class="form-group">
                            <label>Nguyên giá (VND)</label>
                            <input type="number" name="nguyen_gia" value="${nguyenGia}" step="1000" id="edit-nguyen-gia" onchange="enhancedDevices.calculateTotalPrice()">
                        </div>
                        <div class="form-group">
                            <label>Thành tiền (VND)</label>
                            <input type="number" name="thanh_tien" value="${thanhTien}" step="1000" id="edit-thanh-tien" onchange="enhancedDevices.calculateUnitPrice()">
                            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                <span id="price-calculation-info">Tự động tính từ Nguyên giá × Số lượng</span>
                            </div>
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
                            <select name="phong_ban">
                                <option value="">Chọn phòng ban</option>
                                ${(this.departments || []).map(dept => 
                                    `<option value="${dept.ten_phong}" ${device.phong_ban === dept.ten_phong ? 'selected' : ''}>${dept.ten_phong}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Đơn vị</label>
                            <select name="don_vi">
                                <option value="">Chọn đơn vị</option>
                                ${(this.units || []).map(unit => 
                                    `<option value="${unit.ten_don_vi}" ${device.don_vi === unit.ten_don_vi ? 'selected' : ''}>${unit.ten_don_vi}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Nhân viên quản lý</label>
                            <select name="nhan_vien_ql">
                                <option value="">Chọn nhân viên</option>
                                ${(this.staff || []).map(staff => 
                                    `<option value="${staff.ten_nhan_vien}" ${device.nhan_vien_ql === staff.ten_nhan_vien ? 'selected' : ''}>${staff.ten_nhan_vien}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Ghi chú</label>
                            <textarea name="ghi_chu" rows="3">${this.escapeHtml(device.ghi_chu || '')}</textarea>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #eee; text-align: right;">
                <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()" style="margin-right: 10px;">Hủy</button>
                <button class="btn-primary" onclick="enhancedDevices.updateDevice(${device.id})">💾 Lưu thay đổi</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async updateDevice(deviceId) {
    try {
        const form = document.getElementById('edit-device-form');
        const formData = new FormData(form);
        
        const updates = {
            ten_thiet_bi: formData.get('ten_thiet_bi'),
            model: formData.get('model'),
            nha_san_xuat: formData.get('nha_san_xuat'),
            nam_san_xuat: parseInt(formData.get('nam_san_xuat')) || null,
            so_luong: parseInt(formData.get('so_luong')),
            nguyen_gia: parseFloat(formData.get('nguyen_gia')) || 0,
            thanh_tien: parseFloat(formData.get('thanh_tien')) || 0, // THÊM THÀNH TIỀN
            tinh_trang: formData.get('tinh_trang'),
            phong_ban: formData.get('phong_ban'),
            don_vi: formData.get('don_vi'),
            nhan_vien_ql: formData.get('nhan_vien_ql'),
            ghi_chu: formData.get('ghi_chu')
        };

        // Validate required fields
        if (!updates.ten_thiet_bi.trim() || updates.so_luong < 1) {
            this.showError('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        await medicalDB.updateDevice(deviceId, updates);
        
        // Log activity
        await medicalDB.addActivity({
            type: 'update',
            description: `Cập nhật thiết bị: ${updates.ten_thiet_bi}`,
            user: 'Quản trị viên'
        });

        this.showSuccess('Đã cập nhật thiết bị thành công');
        
        // Close modal and refresh data
        document.querySelector('.edit-device-modal').remove();
        await this.loadDevices();
        this.viewsManager.renderDevices();
        this.renderStats();
        
    } catch (error) {
        console.error('Error updating device:', error);
        this.showError('Lỗi khi cập nhật thiết bị: ' + error.message);
    }
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
        
        this.filtersManager.clearFilterInputs();
        this.applyFiltersAndRender();
        this.showSuccess('Đã xóa tất cả bộ lọc');
    }

    // Utility methods
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

    // Device operations
    showAddDeviceModal() {
        if (window.app) {
            app.showDeviceModal();
        }
    }

    importDevices() {
        if (window.app) {
            app.showTab('import');
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

            this.showSuccess('Đã xóa thiết bị thành công');
            await this.loadDevices();
            this.viewsManager.renderDevices();
            this.renderStats();
            
        } catch (error) {
            console.error('Error deleting device:', error);
            this.showError('Lỗi khi xóa thiết bị');
        }
    }
    
}

// Initialize globally
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedDevices = new EnhancedDevicesManager();
});