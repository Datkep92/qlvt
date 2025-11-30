class DevicesBulkManager {
    constructor(manager) {
        this.manager = manager;
    }

    renderBulkPanel() {
        return `
            <div class="bulk-operations-panel" id="bulk-panel" style="display: none;">
                <div class="bulk-header">
                    <h4>🎛️ THAO TÁC HÀNG LOẠT (<span id="selected-count">0</span> thiết bị)</h4>
                    <button class="btn-close" onclick="enhancedDevices.bulkManager.toggleBulkOperations()">✕</button>
                </div>
                <div class="bulk-content">
                    <div class="bulk-actions">
                        <select id="bulk-status" class="bulk-select">
                            <option value="">🏷️ Thay đổi trạng thái...</option>
                            <option value="Đang sử dụng">🟢 Đang sử dụng</option>
                            <option value="Bảo trì">🟡 Bảo trì</option>
                            <option value="Hỏng">🔴 Hỏng</option>
                            <option value="Ngừng sử dụng">⚫ Ngừng sử dụng</option>
                        </select>
                        
                        <select id="bulk-department" class="bulk-select">
                            <option value="">🏥 Thay đổi phòng ban...</option>
                            ${(this.manager.departments || []).map(dept => 
                                `<option value="${dept.ten_phong}">${dept.ten_phong}</option>`
                            ).join('')}
                        </select>

                        <select id="bulk-unit" class="bulk-select">
                            <option value="">📦 Thay đổi đơn vị...</option>
                            ${(this.manager.units || []).map(unit => 
                                `<option value="${unit.ten_don_vi}">${unit.ten_don_vi}</option>`
                            ).join('')}
                        </select>

                        <select id="bulk-staff" class="bulk-select">
                            <option value="">👤 Thay đổi nhân viên...</option>
                            ${(this.manager.staff || []).map(staff => 
                                `<option value="${staff.ten_nhan_vien}">${staff.ten_nhan_vien}</option>`
                            ).join('')}
                        </select>

                        <button class="btn-warning" onclick="enhancedDevices.bulkManager.bulkUpdate()">
                            ✅ Cập Nhật
                        </button>
                        <button class="btn-danger" onclick="enhancedDevices.bulkManager.bulkDelete()">
                            🗑️ Xóa thiết bị
                        </button>
                        <button class="btn-secondary" onclick="enhancedDevices.exportManager.bulkExport()">
                            📤 Export
                        </button>
                    </div>
                    <div class="bulk-selected">
                        <strong>Thiết bị đã chọn:</strong>
                        <div id="selected-list" class="selected-list"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async bulkUpdate() {
        const status = document.getElementById('bulk-status').value;
        const department = document.getElementById('bulk-department').value;
        const unit = document.getElementById('bulk-unit').value;
        const staff = document.getElementById('bulk-staff').value;

        if (!status && !department && !unit && !staff) {
            this.manager.showError('Vui lòng chọn ít nhất một trường để cập nhật');
            return;
        }

        if (this.manager.selectedDevices.size === 0) {
            this.manager.showError('Vui lòng chọn ít nhất một thiết bị');
            return;
        }

        const updateData = {};
        if (status) updateData.tinh_trang = status;
        if (department) updateData.phong_ban = department;
        if (unit) updateData.don_vi = unit;
        if (staff) updateData.nhan_vien_ql = staff;

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const deviceId of this.manager.selectedDevices) {
                try {
                    await medicalDB.updateDevice(deviceId, updateData);
                    successCount++;
                    
                    // Update local data
                    const deviceIndex = this.manager.allDevices.findIndex(d => d.id === deviceId);
                    if (deviceIndex !== -1) {
                        Object.assign(this.manager.allDevices[deviceIndex], updateData);
                    }
                } catch (error) {
                    console.error(`Error updating device ${deviceId}:`, error);
                    errorCount++;
                }
            }

            // Log activity
            await medicalDB.addActivity({
                type: 'update',
                description: `Cập nhật hàng loạt ${successCount} thiết bị`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess(`Đã cập nhật ${successCount} thiết bị thành công${errorCount > 0 ? `, ${errorCount} thiết bị lỗi` : ''}`);
            
            // Clear selection and refresh
            this.manager.selectedDevices.clear();
            this.updateBulkPanel();
            this.manager.applyFiltersAndRender();
            this.manager.renderStats();
            
        } catch (error) {
            console.error('Error in bulk update:', error);
            this.manager.showError('Lỗi khi cập nhật thiết bị: ' + error.message);
        }
    }

    async bulkDelete() {
        if (this.manager.selectedDevices.size === 0) {
            this.manager.showError('Vui lòng chọn ít nhất một thiết bị');
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa ${this.manager.selectedDevices.size} thiết bị đã chọn?`)) {
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            const deletedDevices = [];

            for (const deviceId of this.manager.selectedDevices) {
                try {
                    const device = this.manager.allDevices.find(d => d.id === deviceId);
                    if (device) {
                        deletedDevices.push(device.ten_thiet_bi);
                    }
                    
                    await medicalDB.deleteDevice(deviceId);
                    successCount++;
                } catch (error) {
                    console.error(`Error deleting device ${deviceId}:`, error);
                    errorCount++;
                }
            }

            // Log activity
            await medicalDB.addActivity({
                type: 'delete',
                description: `Xóa hàng loạt ${successCount} thiết bị: ${deletedDevices.slice(0, 3).join(', ')}${deletedDevices.length > 3 ? '...' : ''}`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess(`Đã xóa ${successCount} thiết bị thành công${errorCount > 0 ? `, ${errorCount} thiết bị lỗi` : ''}`);
            
            // Clear selection and refresh
            this.manager.selectedDevices.clear();
            await this.manager.loadDevices();
            this.updateBulkPanel();
            this.manager.viewsManager.renderDevices();
            this.manager.renderStats();
            
        } catch (error) {
            console.error('Error in bulk delete:', error);
            this.manager.showError('Lỗi khi xóa thiết bị: ' + error.message);
        }
    }


   


    toggleDeviceSelection(deviceId, isSelected) {
        if (isSelected) {
            this.manager.selectedDevices.add(deviceId);
        } else {
            this.manager.selectedDevices.delete(deviceId);
        }
        this.updateBulkPanel();
        this.manager.viewsManager.renderDevices();
    }

    toggleSelectAll(selectAll) {
        const currentPageDevices = this.manager.getCurrentPageDevices();
        
        if (selectAll) {
            currentPageDevices.forEach(device => {
                this.manager.selectedDevices.add(device.id);
            });
        } else {
            currentPageDevices.forEach(device => {
                this.manager.selectedDevices.delete(device.id);
            });
        }
        
        this.updateBulkPanel();
        this.manager.viewsManager.renderDevices();
    }

    updateBulkPanel() {
        const panel = document.getElementById('bulk-panel');
        const selectedCount = document.getElementById('selected-count');
        const selectedList = document.getElementById('selected-list');
        
        if (this.manager.selectedDevices.size > 0) {
            panel.style.display = 'block';
            selectedCount.textContent = this.manager.selectedDevices.size;
            
            // Update selected devices list
            const selectedDevicesList = Array.from(this.manager.selectedDevices).slice(0, 5).map(id => {
                const device = this.manager.allDevices.find(d => d.id === id);
                return device ? device.ten_thiet_bi : 'Unknown';
            });
            
            selectedList.innerHTML = selectedDevicesList.map(name => 
                `<div class="selected-item">• ${this.manager.escapeHtml(name)}</div>`
            ).join('');
            
            if (this.manager.selectedDevices.size > 5) {
                selectedList.innerHTML += `<div class="selected-more">... và ${this.manager.selectedDevices.size - 5} thiết bị khác</div>`;
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

    async bulkUpdateStatus() {
        const status = document.getElementById('bulk-status').value;
        const department = document.getElementById('bulk-department').value;

        if (!status && !department) {
            this.manager.showError('Vui lòng chọn ít nhất một trường để cập nhật');
            return;
        }

        if (this.manager.selectedDevices.size === 0) {
            this.manager.showError('Vui lòng chọn ít nhất một thiết bị');
            return;
        }

        const updateData = {};
        if (status) updateData.tinh_trang = status;
        if (department) updateData.phong_ban = department;

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const deviceId of this.manager.selectedDevices) {
                try {
                    await medicalDB.updateDevice(deviceId, updateData);
                    successCount++;
                    
                    // Update local data
                    const deviceIndex = this.manager.allDevices.findIndex(d => d.id === deviceId);
                    if (deviceIndex !== -1) {
                        Object.assign(this.manager.allDevices[deviceIndex], updateData);
                    }
                } catch (error) {
                    console.error(`Error updating device ${deviceId}:`, error);
                    errorCount++;
                }
            }

            // Log activity
            await medicalDB.addActivity({
                type: 'update',
                description: `Cập nhật hàng loạt ${successCount} thiết bị`,
                user: 'Quản trị viên'
            });

            this.manager.showSuccess(`Đã cập nhật ${successCount} thiết bị thành công${errorCount > 0 ? `, ${errorCount} thiết bị lỗi` : ''}`);
            
            // Clear selection and refresh
            this.manager.selectedDevices.clear();
            this.updateBulkPanel();
            this.manager.applyFiltersAndRender();
            this.manager.renderStats();
            
        } catch (error) {
            console.error('Error in bulk update:', error);
            this.manager.showError('Lỗi khi cập nhật thiết bị: ' + error.message);
        }
    }

    
}