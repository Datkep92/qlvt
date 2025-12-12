// modules/phanloai-xuly.js - Gộp Phân loại & Xử lý hàng loạt
class PhanLoaiXuLyManager {
    constructor() {
        this.moduleName = "PhanLoaiXuLyManager";
        this.selectedDevices = new Set();
        this.init();
    }
    
    init() {
    AppEvents.on('app:ready', () => this.setup());
    
    // Selection events
    AppEvents.on('bulk:selectionUpdated', (selected) => this.updateSelection(selected));
    AppEvents.on('bulk:toggleAll', (checked) => this.toggleSelectAll(checked));
    AppEvents.on('bulk:selectAllDevices', () => this.selectAllDevices());
    AppEvents.on('bulk:clearAll', () => this.clearAllSelection());
    AppEvents.on('ui:clearSelection', () => this.clearAllSelection());
    
    // Bulk actions
    AppEvents.on('bulk:updateRequest', () => this.bulkUpdate());
    AppEvents.on('bulk:deleteRequest', () => this.bulkDelete());
    
    // UI events - THÊM EVENT MỚI
    AppEvents.on('ui:showBulkPopup', (selectedDevices) => this.showBulkPopup(selectedDevices));
    // ĐÃ XÓA: AppEvents.on('ui:toggleBulkPanel', () => this.toggleBulkPanel()); 
    
    // Refresh events
    AppEvents.on('data:refresh', () => {
        setTimeout(() => {
            this.initializeSelect2Dropdowns();
        }, 500);
    });
AppEvents.on('categories:updated', (data) => {
        this.handleCategoriesUpdate(data);
    });
}
// Thêm phương thức xử lý
handleCategoriesUpdate(data) {
    console.log('🔄 Updating classification categories:', data.type);
    
    // Refresh select2 dropdowns
    setTimeout(() => {
        if (data.type === 'department') {
            this.initializeDepartmentSelect2();
        } else if (data.type === 'staff') {
            this.initializeStaffSelect2();
        } else if (data.type === 'unit') {
            this.initializeUnitSelect2();
        }
    }, 500);
}

// ... (các hàm toggleSelectAll, updateSelection, selectAllDevices, clearAllSelection, syncCheckboxes)

setup() {
    // ĐÃ XÓA: this.renderBulkPanel(); 
    this.syncCheckboxes();
    // Khởi tạo select2 ngay lập tức
    this.initializeSelect2Dropdowns(); 
    console.log('✅ PhanLoaiXuLyManager ready');
}

// ĐÃ XÓA HÀM renderBulkPanel()

// ĐÃ XÓA HÀM toggleBulkPanel()

// Thay thế hàm getBulkPanelHTML() bằng hàm lấy nội dung chính
getBulkOperationsContentHTML() {
    return `
        <div class="bulk-section">
            <h4>📋 PHÂN LOẠI SẢN PHẨM</h4>
            <select id="bulk-category" class="creatable-select">
                <option value=""></option>
                <option value="taisan">TÀI SẢN</option>
                <option value="haophi">HAO PHÍ</option>
                <option value="thietbi">THIẾT BỊ Y TẾ</option>
                <option value="dungcu">DỤNG CỤ Y TẾ</option>
            </select>
        </div>
        
        <div class="bulk-section">
            <h4>✏️ THAY ĐỔI THÔNG TIN</h4>
            <div class="bulk-grid">
                <div class="bulk-field">
                    <label>Trạng thái:</label>
                    <select id="bulk-status" class="creatable-select">
                        <option value=""></option>
                        <option value="Đang sử dụng">🟢 Đang sử dụng</option>
                        <option value="Bảo trì">🟡 Bảo trì</option>
                        <option value="Hỏng">🔴 Hỏng</option>
                        <option value="Ngừng sử dụng">⚫ Ngừng sử dụng</option>
                    </select>
                </div>
                
                <div class="bulk-field">
                    <label>Phòng ban:</label>
                    <select id="bulk-department" class="creatable-select">
                        <option value=""></option>
                        </select>
                </div>
                
                <div class="bulk-field">
                    <label>Đơn vị:</label>
                    <select id="bulk-unit" class="creatable-select">
                        <option value=""></option>
                        </select>
                </div>
                
                <div class="bulk-field">
                    <label>Nhân viên QL:</label>
                    <select id="bulk-staff" class="creatable-select">
                        <option value=""></option>
                        </select>
                </div>
            </div>
        </div>
        
        <div class="bulk-actions">
            <button class="btn-primary" onclick="AppEvents.emit('bulk:updateRequest')">
                ✅ CẬP NHẬT
            </button>
            <button class="btn-danger" onclick="AppEvents.emit('bulk:deleteRequest')">
                🗑️ XÓA ĐÃ CHỌN
            </button>
            
        </div>
        
        <div class="bulk-selected">
            <h4>📝 DANH SÁCH ĐÃ CHỌN</h4>
            <div id="selected-list" class="selected-list"></div>
        </div>
    `;
}

// Thay thế hàm showBulkPopup() để tạo Modal hoàn chỉnh
showBulkPopup(selectedDevices) {
    this.selectedDevices = selectedDevices;
    
    // Đảm bảo không có modal cũ
    const existingModal = document.querySelector('.bulk-popup-modal');
    if (existingModal) existingModal.remove();

    // Tạo modal popup
    const modal = this.createModal('bulk-popup-modal');
    const selectedCount = this.selectedDevices.size;

    // Sử dụng lại nội dung của panel nhưng bọc trong cấu trúc modal
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto; padding: 0;">
            <div class="bulk-operations-panel full-popup-mode">
                <div class="bulk-header">
                    <h3>📦 THAO TÁC HÀNG LOẠT</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="bulk-content">
                    <div class="selection-stats" style="margin-bottom: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                        <span id="selected-count">${selectedCount}</span> thiết bị được chọn
                        <button class="btn-secondary btn-sm" onclick="AppEvents.emit('bulk:clearAll'); this.closest('.modal').remove()">
                            🗑️ Xóa chọn & Đóng
                        </button>
                    </div>

                    ${this.getBulkOperationsContentHTML()}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Cập nhật danh sách và Select2
    this.updateSelectedList();
    this.initializeSelect2Dropdowns(); 
}

// ... (các hàm initializeDepartmentSelect2, bulkUpdate, etc.)

// Thêm lại hàm getBulkPanelHTML (chỉ làm wrapper cho nội dung) nếu có nơi gọi khác
// KHÔNG CẦN THIẾT vì đã xóa renderBulkPanel và chỉ dùng showBulkPopup

// ... (Các hàm khác)



toggleSelectAll(checked) {
    if (!window.quanLyManager) return;
    
    const currentPageDevices = window.quanLyManager.getCurrentPageDevices();
    
    if (checked) {
        // Chọn tất cả trong trang hiện tại
        currentPageDevices.forEach(device => {
            this.selectedDevices.add(device.id);
        });
    } else {
        // Bỏ chọn tất cả trong trang hiện tại
        currentPageDevices.forEach(device => {
            this.selectedDevices.delete(device.id);
        });
    }
    
    // Update bulk panel
    AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
    
    // Thông báo
    AppEvents.emit('notification:show', {
        message: checked ? 
            `Đã chọn ${currentPageDevices.length} thiết bị trên trang này` :
            `Đã bỏ chọn ${currentPageDevices.length} thiết bị trên trang này`,
        type: 'info'
    });
}
    
  
    
    // ========== PHẦN 1: QUẢN LÝ CHỌN THIẾT BỊ ==========
    updateSelection(selected) {
        this.selectedDevices = selected;
        this.updateBulkPanel();
    }
    
    async selectAllDevices() {
        // Lấy devices từ quanly.js qua event
        AppEvents.emit('data:getCurrentPageDevices', {
            callback: (devices) => {
                devices.forEach(device => {
                    this.selectedDevices.add(device.id);
                });
                
                AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
                AppEvents.emit('notification:show', {
                    message: `Đã chọn ${devices.length} thiết bị`,
                    type: 'success'
                });
            }
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
    syncCheckboxes() {
    const bulkSelectAll = document.getElementById('bulk-select-all');
    const tableSelectAll = document.getElementById('select-all');
    
    if (bulkSelectAll && tableSelectAll) {
        // Khi click trên bulk panel
        bulkSelectAll.addEventListener('change', () => {
            tableSelectAll.checked = bulkSelectAll.checked;
            tableSelectAll.indeterminate = bulkSelectAll.indeterminate;
        });
        
        // Khi click trên table header
        tableSelectAll.addEventListener('change', () => {
            bulkSelectAll.checked = tableSelectAll.checked;
            bulkSelectAll.indeterminate = tableSelectAll.indeterminate;
        });
    }
}



getBulkPanelHTML() {
    return `
        <div class="bulk-operations-panel" id="bulk-panel" style="display: none;">
            <div class="bulk-header">
                <h3>📦 THAO TÁC HÀNG LOẠT</h3>
                <div class="selection-stats">
                    <span id="selected-count">0</span> thiết bị được chọn
                </div>
            </div>
            <div class="bulk-content">
                <div class="bulk-section">
                    <h4>📋 PHÂN LOẠI SẢN PHẨM</h4>
                    <select id="bulk-category" class="creatable-select">
                        <option value=""></option>
                        <option value="taisan">TÀI SẢN</option>
                        <option value="haophi">HAO PHÍ</option>
                        <option value="thietbi">THIẾT BỊ Y TẾ</option>
                        <option value="dungcu">DỤNG CỤ Y TẾ</option>
                    </select>
                </div>
                
                <div class="bulk-section">
                    <h4>✏️ THAY ĐỔI THÔNG TIN</h4>
                    <div class="bulk-grid">
                        <div class="bulk-field">
                            <label>Trạng thái:</label>
                            <select id="bulk-status" class="creatable-select">
                                <option value=""></option>
                                <option value="Đang sử dụng">🟢 Đang sử dụng</option>
                                <option value="Bảo trì">🟡 Bảo trì</option>
                                <option value="Hỏng">🔴 Hỏng</option>
                                <option value="Ngừng sử dụng">⚫ Ngừng sử dụng</option>
                            </select>
                        </div>
                        
                        <div class="bulk-field">
                            <label>Phòng ban:</label>
                            <select id="bulk-department" class="creatable-select">
                                <option value=""></option>
                                <!-- Options sẽ được thêm động -->
                            </select>
                        </div>
                        
                        <div class="bulk-field">
                            <label>Đơn vị:</label>
                            <select id="bulk-unit" class="creatable-select">
                                <option value=""></option>
                                <!-- Options sẽ được thêm động -->
                            </select>
                        </div>
                        
                        <div class="bulk-field">
                            <label>Nhân viên QL:</label>
                            <select id="bulk-staff" class="creatable-select">
                                <option value=""></option>
                                <!-- Options sẽ được thêm động -->
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="bulk-actions">
                    <button class="btn-primary" onclick="AppEvents.emit('bulk:updateRequest')">
                        ✅ CẬP NHẬT
                    </button>
                    <button class="btn-danger" onclick="AppEvents.emit('bulk:deleteRequest')">
                        🗑️ XÓA ĐÃ CHỌN
                    </button>
                    
                </div>
                
                <div class="bulk-selected">
                    <h4>📝 DANH SÁCH ĐÃ CHỌN</h4>
                    <div id="selected-list" class="selected-list"></div>
                </div>
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


async initializeDepartmentSelect2() {
    if (!$('#bulk-department').length) return;
    
    try {
        const departments = await medicalDB.getAllDepartments();
        
        $('#bulk-department').empty().append('<option value=""></option>');
        
        departments.forEach(dept => {
            if (dept.ten_phong) {
                $('#bulk-department').append(
                    `<option value="${dept.ten_phong}">${dept.ten_phong}</option>`
                );
            }
        });
        
        $('#bulk-department').select2({
            placeholder: "Chọn hoặc nhập phòng ban...",
            allowClear: true,
            tags: true,
            createTag: (params) => {
                const term = $.trim(params.term);
                if (term === '') return null;
                
                // Kiểm tra xem đã tồn tại chưa
                const exists = departments.some(dept => 
                    dept.ten_phong.toLowerCase() === term.toLowerCase()
                );
                
                if (exists) return null;
                
                return {
                    id: term,
                    text: term + ' (tạo mới)',
                    newTag: true
                };
            },
            templateResult: (data) => {
                if (data.loading) return data.text;
                
                if (data.newTag) {
                    const $result = $('<span></span>');
                    $result.text(data.text);
                    $result.css('color', '#007bff');
                    $result.css('font-style', 'italic');
                    return $result;
                }
                
                return data.text;
            }
        }).on('select2:select', this.handleNewDepartment.bind(this));
        
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

async initializeStaffSelect2() {
    if (!$('#bulk-staff').length) return;
    
    try {
        const staff = await medicalDB.getAllStaff();
        
        $('#bulk-staff').empty().append('<option value=""></option>');
        
        staff.forEach(s => {
            const staffName = s.ten_nhan_vien || s.ten || '';
            if (staffName) {
                const position = s.chuc_vu ? ` - ${s.chuc_vu}` : '';
                $('#bulk-staff').append(
                    `<option value="${staffName}">${staffName}${position}</option>`
                );
            }
        });
        
        $('#bulk-staff').select2({
            placeholder: "Chọn hoặc nhập nhân viên...",
            allowClear: true,
            tags: true,
            createTag: (params) => {
                const term = $.trim(params.term);
                if (term === '') return null;
                
                // Kiểm tra xem đã tồn tại chưa
                const exists = staff.some(s => {
                    const name = s.ten_nhan_vien || s.ten || '';
                    return name.toLowerCase() === term.toLowerCase();
                });
                
                if (exists) return null;
                
                return {
                    id: term,
                    text: term + ' (thêm mới)',
                    newTag: true
                };
            },
            templateResult: (data) => {
                if (data.loading) return data.text;
                
                if (data.newTag) {
                    const $result = $('<span></span>');
                    $result.text(data.text);
                    $result.css('color', '#007bff');
                    $result.css('font-style', 'italic');
                    return $result;
                }
                
                return data.text;
            }
        }).on('select2:select', this.handleNewStaff.bind(this));
        
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}
// ========== PHẦN 4: HANDLE NEW ENTRIES ==========
async handleNewCategory(e) {
    const data = e.params.data;
    if (data.newTag) {
        const categoryName = data.text.replace(' (mới)', '');
        
        AppEvents.emit('notification:show', {
            message: `Đã thêm phân loại: ${categoryName}`,
            type: 'success'
        });
        
        // Ghi log activity
        try {
            await medicalDB.addActivity({
                type: 'create',
                description: `Thêm phân loại sản phẩm mới: ${categoryName}`,
                user: 'System'
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
}

async handleNewDepartment(e) {
    const data = e.params.data;
    if (data.newTag) {
        const deptName = data.text.replace(' (tạo mới)', '');
        
        try {
            // Thêm vào database
            await medicalDB.addDepartment({ ten_phong: deptName });
            
            // Refresh dropdown
            await this.initializeDepartmentSelect2();
            
            // Refresh filter dropdowns
            if (window.locManager && window.locManager.loadDepartments) {
                window.locManager.loadDepartments();
            }
            
            AppEvents.emit('notification:show', {
                message: `✅ Đã thêm phòng ban: ${deptName}`,
                type: 'success'
            });
            
            // Ghi log activity
            await medicalDB.addActivity({
                type: 'create',
                description: `Thêm phòng ban mới: ${deptName}`,
                user: 'System'
            });
            
        } catch (error) {
            AppEvents.emit('notification:show', {
                message: `❌ Lỗi khi thêm phòng ban: ${error.message}`,
                type: 'error'
            });
            
            // Reset select
            setTimeout(() => {
                $(e.target).val(null).trigger('change');
            }, 100);
        }
    }
}

async handleNewStaff(e) {
    const data = e.params.data;
    if (data.newTag) {
        const staffName = data.text.replace(' (thêm mới)', '');
        
        try {
            // Thêm vào database
            await medicalDB.addStaff({ 
                ten_nhan_vien: staffName,
                ten: staffName,
                chuc_vu: ''
            });
            
            // Refresh dropdown
            await this.initializeStaffSelect2();
            
            // Refresh filter dropdowns
            if (window.locManager && window.locManager.loadStaff) {
                window.locManager.loadStaff();
            }
            
            AppEvents.emit('notification:show', {
                message: `✅ Đã thêm nhân viên: ${staffName}`,
                type: 'success'
            });
            
            // Ghi log activity
            await medicalDB.addActivity({
                type: 'create',
                description: `Thêm nhân viên mới: ${staffName}`,
                user: 'System'
            });
            
        } catch (error) {
            AppEvents.emit('notification:show', {
                message: `❌ Lỗi khi thêm nhân viên: ${error.message}`,
                type: 'error'
            });
            
            // Reset select
            setTimeout(() => {
                $(e.target).val(null).trigger('change');
            }, 100);
        }
    }
}
// Thêm phương thức này vào class PhanLoaiXuLyManager
async loadFilterData() {
    try {
        const departments = await medicalDB.getAllDepartments();
        const units = await medicalDB.getAllUnits();
        const staff = await medicalDB.getAllStaff();
        
        // Cập nhật dropdowns nếu cần
        this.updateSelectOptions('bulk-department', departments, 'ten_phong');
        this.updateSelectOptions('bulk-unit', units, 'ten_don_vi');
        this.updateSelectOptions('bulk-staff', staff, 'ten_nhan_vien');
        
        // Khởi tạo lại Select2
        this.initSelect2Controls();
        
    } catch (error) {
        console.error('Error loading filter data:', error);
    }
}
async handleNewUnit(e) {
    const data = e.params.data;
    if (data.newTag) {
        const unitName = data.text.replace(' (thêm mới)', '');
        
        try {
            // Thêm vào database
            await medicalDB.addUnit({ ten_don_vi: unitName });
            
            // Refresh dropdown
            await this.initializeUnitSelect2();
            
            // Refresh filter dropdowns
            if (window.locManager && window.locManager.loadUnits) {
                window.locManager.loadUnits();
            }
            
            AppEvents.emit('notification:show', {
                message: `✅ Đã thêm đơn vị: ${unitName}`,
                type: 'success'
            });
            
            // Ghi log activity
            await medicalDB.addActivity({
                type: 'create',
                description: `Thêm đơn vị mới: ${unitName}`,
                user: 'System'
            });
            
        } catch (error) {
            AppEvents.emit('notification:show', {
                message: `❌ Lỗi khi thêm đơn vị: ${error.message}`,
                type: 'error'
            });
            
            // Reset select
            setTimeout(() => {
                $(e.target).val(null).trigger('change');
            }, 100);
        }
    }
}
async initializeUnitSelect2() {
    if (!$('#bulk-unit').length) return;
    
    try {
        const units = await medicalDB.getAllUnits();
        
        $('#bulk-unit').empty().append('<option value=""></option>');
        
        units.forEach(unit => {
            if (unit.ten_don_vi) {
                $('#bulk-unit').append(
                    `<option value="${unit.ten_don_vi}">${unit.ten_don_vi}</option>`
                );
            }
        });
        
        $('#bulk-unit').select2({
            placeholder: "Chọn hoặc nhập đơn vị...",
            allowClear: true,
            tags: true,
            createTag: (params) => {
                const term = $.trim(params.term);
                if (term === '') return null;
                
                // Kiểm tra xem đã tồn tại chưa
                const exists = units.some(u => 
                    u.ten_don_vi.toLowerCase() === term.toLowerCase()
                );
                
                if (exists) return null;
                
                return {
                    id: term,
                    text: term + ' (thêm mới)',
                    newTag: true
                };
            },
            templateResult: (data) => {
                if (data.loading) return data.text;
                
                if (data.newTag) {
                    const $result = $('<span></span>');
                    $result.text(data.text);
                    $result.css('color', '#007bff');
                    $result.css('font-style', 'italic');
                    return $result;
                }
                
                return data.text;
            }
        }).on('select2:select', this.handleNewUnit.bind(this));
        
    } catch (error) {
        console.error('Error loading units:', error);
    }
}
    async loadBulkOptions() {
        try {
            const departments = await medicalDB.getAllDepartments();
            const units = await medicalDB.getAllUnits();
            const staff = await medicalDB.getAllStaff();
            
            this.updateSelectOptions('bulk-department', departments, 'ten_phong');
            this.updateSelectOptions('bulk-unit', units, 'ten_don_vi');
            this.updateSelectOptions('bulk-staff', staff, 'ten_nhan_vien');
            
        } catch (error) {
            console.error('Error loading bulk options:', error);
        }
    }
async bulkUpdate() {
    const status = document.getElementById('bulk-status').value;
    const department = document.getElementById('bulk-department').value;
    const unit = document.getElementById('bulk-unit').value;
    const staff = document.getElementById('bulk-staff').value;
    const category = document.getElementById('bulk-category').value;

    if (!status && !department && !unit && !staff && !category) {
        AppEvents.emit('notification:show', {
            message: 'Vui lòng chọn ít nhất một trường để cập nhật',
            type: 'error'
        });
        return;
    }

    if (this.selectedDevices.size === 0) {
        AppEvents.emit('notification:show', {
            message: 'Vui lòng chọn ít nhất một thiết bị',
            type: 'error'
        });
        return;
    }

    const updateData = {};
    if (status) updateData.tinh_trang = status;
    if (department) updateData.phong_ban = department;
    if (unit) updateData.don_vi = unit;
    if (staff) updateData.nhan_vien_ql = staff;
    if (category) updateData.phan_loai = category;

    try {
        let successCount = 0;
        let errorCount = 0;

        for (const deviceId of this.selectedDevices) {
            try {
                await medicalDB.updateDevice(deviceId, updateData);
                successCount++;
            } catch (error) {
                console.error(`Error updating device ${deviceId}:`, error);
                errorCount++;
            }
        }

        await medicalDB.addActivity({
            type: 'update',
            description: `Cập nhật hàng loạt ${successCount} thiết bị`,
            user: 'Quản trị viên'
        });

        AppEvents.emit('notification:show', {
            message: `Đã cập nhật ${successCount} thiết bị thành công${errorCount > 0 ? `, ${errorCount} thiết bị lỗi` : ''}`,
            type: 'success'
        });
        
        // Clear selection and refresh
        this.selectedDevices.clear();
        AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
        AppEvents.emit('data:refresh');
        
        // KHÔNG GỌI this.loadFilterData() - SỬA DÒNG NÀY
        // Thay vào đó, tải lại dữ liệu dropdowns nếu cần
        this.loadAllData(); // Hoặc this.initializeSelect2Dropdowns();
        
    } catch (error) {
        console.error('Error in bulk update:', error);
        AppEvents.emit('notification:show', {
            message: 'Lỗi khi cập nhật thiết bị: ' + error.message,
            type: 'error'
        });
    }
}
    
    async bulkDelete() {
        if (this.selectedDevices.size === 0) {
            AppEvents.emit('notification:show', {
                message: 'Vui lòng chọn ít nhất một thiết bị',
                type: 'error'
            });
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa ${this.selectedDevices.size} thiết bị đã chọn?`)) {
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const deviceId of this.selectedDevices) {
                try {
                    await medicalDB.deleteDevice(deviceId);
                    successCount++;
                } catch (error) {
                    console.error(`Error deleting device ${deviceId}:`, error);
                    errorCount++;
                }
            }

            await medicalDB.addActivity({
                type: 'delete',
                description: `Xóa hàng loạt ${successCount} thiết bị`,
                user: 'Quản trị viên'
            });

            AppEvents.emit('notification:show', {
                message: `Đã xóa ${successCount} thiết bị thành công${errorCount > 0 ? `, ${errorCount} thiết bị lỗi` : ''}`,
                type: 'success'
            });
            
            // Clear selection and refresh
            this.selectedDevices.clear();
            AppEvents.emit('bulk:selectionUpdated', this.selectedDevices);
            AppEvents.emit('data:refresh');
            
        } catch (error) {
            console.error('Error in bulk delete:', error);
            AppEvents.emit('notification:show', {
                message: 'Lỗi khi xóa thiết bị: ' + error.message,
                type: 'error'
            });
        }
    const modal = document.querySelector('.bulk-popup-modal');
    if (modal) {
        modal.remove();
    }
}


// Thêm phương thức cập nhật UI cho popup
updateBulkPanelUI() {
    // Cập nhật số lượng thiết bị được chọn
    const selectedCount = document.getElementById('selected-count');
    if (selectedCount) {
        selectedCount.textContent = this.selectedDevices.size;
    }
    
    // Cập nhật danh sách thiết bị đã chọn
    this.updateSelectedList();
    
    // Đảm bảo panel hiển thị
    const panel = document.getElementById('bulk-panel');
    if (panel) {
        panel.style.display = 'block';
    }
}

// Sửa phương thức initializeSelect2Dropdowns để load đúng dữ liệu
async initializeSelect2Dropdowns() {
    if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
        console.error('jQuery/Select2 not loaded');
        // Fallback: sử dụng dropdown thuần
        this.loadSimpleDropdowns();
        return;
    }
    
    // 1. Load dữ liệu trước
    await this.loadAllData();
    
    // 2. Khởi tạo Select2
    this.initSelect2Controls();
}

// Thêm phương thức load tất cả dữ liệu
async loadAllData() {
    try {
        // Load departments
        const departments = await medicalDB.getAllDepartments();
        const deptSelect = document.getElementById('bulk-department');
        if (deptSelect) {
            deptSelect.innerHTML = '<option value=""></option>' +
                departments.map(dept => 
                    `<option value="${dept.ten_phong}">${dept.ten_phong}</option>`
                ).join('');
        }
        
        // Load units
        const units = await medicalDB.getAllUnits();
        const unitSelect = document.getElementById('bulk-unit');
        if (unitSelect) {
            unitSelect.innerHTML = '<option value=""></option>' +
                units.map(unit => 
                    `<option value="${unit.ten_don_vi}">${unit.ten_don_vi}</option>`
                ).join('');
        }
        
        // Load staff
        const staff = await medicalDB.getAllStaff();
        const staffSelect = document.getElementById('bulk-staff');
        if (staffSelect) {
            staffSelect.innerHTML = '<option value=""></option>' +
                staff.map(s => {
                    const staffName = s.ten_nhan_vien || s.ten || '';
                    const position = s.chuc_vu ? ` - ${s.chuc_vu}` : '';
                    return `<option value="${staffName}">${staffName}${position}</option>`;
                }).join('');
        }
        
    } catch (error) {
        console.error('Error loading data for bulk panel:', error);
    }
}

// Phương thức khởi tạo Select2
initSelect2Controls() {
    // Category
    if ($('#bulk-category').length) {
        $('#bulk-category').select2({
            placeholder: "Chọn hoặc nhập phân loại...",
            allowClear: true,
            tags: true,
            createTag: (params) => {
                const term = $.trim(params.term);
                if (term === '') return null;
                return {
                    id: term.toLowerCase().replace(/\s+/g, '-'),
                    text: term.toUpperCase() + ' (mới)',
                    newTag: true
                };
            }
        }).on('select2:select', this.handleNewCategory.bind(this));
    }
    
    // Status
    if ($('#bulk-status').length) {
        $('#bulk-status').select2({
            placeholder: "Chọn trạng thái...",
            allowClear: true
        });
    }
    
    // Department
    if ($('#bulk-department').length) {
        $('#bulk-department').select2({
            placeholder: "Chọn hoặc nhập phòng ban...",
            allowClear: true,
            tags: true,
            createTag: (params) => {
                const term = $.trim(params.term);
                if (term === '') return null;
                return {
                    id: term,
                    text: term + ' (tạo mới)',
                    newTag: true
                };
            }
        }).on('select2:select', this.handleNewDepartment.bind(this));
    }
    
    // Unit
    if ($('#bulk-unit').length) {
        $('#bulk-unit').select2({
            placeholder: "Chọn hoặc nhập đơn vị...",
            allowClear: true,
            tags: true,
            createTag: (params) => {
                const term = $.trim(params.term);
                if (term === '') return null;
                return {
                    id: term,
                    text: term + ' (thêm mới)',
                    newTag: true
                };
            }
        }).on('select2:select', this.handleNewUnit.bind(this));
    }
    
    // Staff
    if ($('#bulk-staff').length) {
        $('#bulk-staff').select2({
            placeholder: "Chọn hoặc nhập nhân viên...",
            allowClear: true,
            tags: true,
            createTag: (params) => {
                const term = $.trim(params.term);
                if (term === '') return null;
                return {
                    id: term,
                    text: term + ' (thêm mới)',
                    newTag: true
                };
            }
        }).on('select2:select', this.handleNewStaff.bind(this));
    }
}

// Fallback: sử dụng dropdown thuần nếu không có Select2
loadSimpleDropdowns() {
    // Department
    const deptSelect = document.getElementById('bulk-department');
    if (deptSelect) {
        medicalDB.getAllDepartments().then(departments => {
            departments.forEach(dept => {
                if (dept.ten_phong) {
                    const option = document.createElement('option');
                    option.value = dept.ten_phong;
                    option.textContent = dept.ten_phong;
                    deptSelect.appendChild(option);
                }
            });
        });
    }
    
    // Unit
    const unitSelect = document.getElementById('bulk-unit');
    if (unitSelect) {
        medicalDB.getAllUnits().then(units => {
            units.forEach(unit => {
                if (unit.ten_don_vi) {
                    const option = document.createElement('option');
                    option.value = unit.ten_don_vi;
                    option.textContent = unit.ten_don_vi;
                    unitSelect.appendChild(option);
                }
            });
        });
    }
    
    // Staff
    const staffSelect = document.getElementById('bulk-staff');
    if (staffSelect) {
        medicalDB.getAllStaff().then(staff => {
            staff.forEach(s => {
                const staffName = s.ten_nhan_vien || s.ten || '';
                if (staffName) {
                    const position = s.chuc_vu ? ` - ${s.chuc_vu}` : '';
                    const option = document.createElement('option');
                    option.value = staffName;
                    option.textContent = staffName + position;
                    staffSelect.appendChild(option);
                }
            });
        });
    }
}

// Sửa phương thức updateSelectedList để hiển thị đúng
updateSelectedList() {
    const selectedList = document.getElementById('selected-list');
    if (!selectedList) return;
    
    if (this.selectedDevices.size === 0) {
        selectedList.innerHTML = '<div class="no-selection">Chưa có thiết bị nào được chọn</div>';
        return;
    }
    
    // Lấy thông tin thiết bị từ quanLyManager
    if (window.quanLyManager) {
        const allDevices = window.quanLyManager.getAllFilteredDevices();
        const selectedDevices = allDevices.filter(device => 
            this.selectedDevices.has(device.id)
        );
        
        if (selectedDevices.length === 0) {
            selectedList.innerHTML = '<div class="no-selection">Đang tải thông tin thiết bị...</div>';
            return;
        }
        
        const deviceNames = selectedDevices.slice(0, 5).map(device => 
            `<div class="selected-item">• ${this.escapeHtml(device.ten_thiet_bi)} 
                <span class="device-qty">(${device.so_luong} ${device.don_vi_tinh || 'cái'})</span>
            </div>`
        ).join('');
        
        selectedList.innerHTML = deviceNames;
        
        if (selectedDevices.length > 5) {
            selectedList.innerHTML += `<div class="selected-more">... và ${selectedDevices.length - 5} thiết bị khác</div>`;
        }
    } else {
        selectedList.innerHTML = '<div class="no-selection">Không thể tải thông tin thiết bị</div>';
    }
}

// Sửa phương thức updateBulkPanel để tự động hiển thị
updateBulkPanel() {
    const selectedCount = document.getElementById('selected-count');
    
    if (selectedCount) {
        selectedCount.textContent = this.selectedDevices.size;
    }
    
    this.updateSelectedList();
}


  

    
    // ========== UTILITY METHODS ==========
    updateSelectOptions(selectId, data, valueField) {
        const select = document.getElementById(selectId);
        if (select && data) {
            select.innerHTML = `<option value="">${select.options[0].text}</option>` +
                data.map(item => `<option value="${item[valueField]}">${item[valueField]}</option>`).join('');
        }
    }
    
    createModal(className) {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            align-items: center; justify-content: center;
        `;
        return modal;
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
}

new PhanLoaiXuLyManager();