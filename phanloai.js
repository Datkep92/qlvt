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
    
    // UI events
    AppEvents.on('ui:toggleBulkPanel', () => this.toggleBulkPanel());
    
    // Refresh events
    AppEvents.on('data:refresh', () => {
        setTimeout(() => {
            this.initializeSelect2Dropdowns();
        }, 500);
    });
}



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

// Gọi trong setup() hoặc updateBulkPanel()
setup() {
    this.renderBulkPanel();
    this.syncCheckboxes();
    console.log('✅ PhanLoaiXuLyManager ready');
}
    // ========== PHẦN 2: BULK OPERATIONS PANEL ==========
    // ========== PHẦN 2: BULK OPERATIONS PANEL ==========
renderBulkPanel() {
    const bulkSection = document.getElementById('bulk-panel-section');
    if (!bulkSection) return;
    
    bulkSection.innerHTML = this.getBulkPanelHTML();
    
    // Không gọi loadBulkOptions() nữa vì sẽ xử lý bằng Select2
    setTimeout(() => {
        this.initializeSelect2Dropdowns();
    }, 100);
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
    // ========== PHẦN 3: SELECT2 INTEGRATION ==========
async initializeSelect2Dropdowns() {
    if (typeof $ === 'undefined') {
        console.error('jQuery not loaded');
        return;
    }
    
    if (typeof $.fn.select2 === 'undefined') {
        console.error('Select2 not loaded');
        return;
    }
    
    // Khởi tạo Select2 cho category
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
        }).on('select2:select', this.handleNewCategory.bind(this));
    }
    
    // Khởi tạo Select2 cho department với data từ DB
    await this.initializeDepartmentSelect2();
    
    // Khởi tạo Select2 cho staff với data từ DB
    await this.initializeStaffSelect2();
    
    // Khởi tạo Select2 cho unit với data từ DB
    await this.initializeUnitSelect2();
    
    // Khởi tạo Select2 cho status
    if ($('#bulk-status').length) {
        $('#bulk-status').select2({
            placeholder: "Chọn trạng thái...",
            allowClear: true
        });
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
    
    updateBulkPanel() {
    const panel = document.getElementById('bulk-panel');
    const selectedCount = document.getElementById('selected-count');
    
    if (panel) {
        if (this.selectedDevices.size > 0) {
            // Hiển thị panel khi có thiết bị được chọn
            panel.style.display = 'block';
            
            // Cập nhật số lượng
            if (selectedCount) {
                selectedCount.textContent = this.selectedDevices.size;
            }
            
            this.updateSelectedList();
        } else {
            // Ẩn panel khi không có thiết bị được chọn
            panel.style.display = 'none';
        }
    }
}
    
    updateSelectedList() {
        const selectedList = document.getElementById('selected-list');
        if (!selectedList) return;
        
        AppEvents.emit('data:getDevicesByIds', {
            deviceIds: Array.from(this.selectedDevices),
            callback: (devices) => {
                const deviceNames = devices.slice(0, 5).map(device => 
                    `<div class="selected-item">• ${this.escapeHtml(device.ten_thiet_bi)}</div>`
                ).join('');
                
                selectedList.innerHTML = deviceNames;
                
                if (devices.length > 5) {
                    selectedList.innerHTML += `<div class="selected-more">... và ${devices.length - 5} thiết bị khác</div>`;
                }
            }
        });
    }
    
    // ========== PHẦN 3: BULK ACTIONS ==========
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
    }
    
    toggleBulkPanel() {
        const panel = document.getElementById('bulk-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
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