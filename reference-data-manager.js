class ReferenceDataManager {
    constructor(manager) {
        this.manager = manager;
    }

    showManager() {
        const modal = this.createManagerModal();
        document.body.appendChild(modal);
        this.loadReferenceData(modal);
        modal.style.display = 'block';
    }

    createManagerModal() {
        const modal = document.createElement('div');
        modal.className = 'modal reference-data-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: none;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; max-height: 90%; margin: 2% auto; background: white; border-radius: 8px; overflow: hidden;">
                <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">🏢 QUẢN LÝ DỮ LIỆU THAM CHIẾU</h3>
                    <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    <div class="reference-tabs" style="margin-bottom: 20px;">
                        <button class="tab-btn active" onclick="enhancedDevices.referenceManager.switchTab('departments', this)">🏥 Phòng Ban</button>
                        <button class="tab-btn" onclick="enhancedDevices.referenceManager.switchTab('units', this)">📦 Đơn Vị</button>
                        <button class="tab-btn" onclick="enhancedDevices.referenceManager.switchTab('staff', this)">👤 Nhân Viên</button>
                    </div>
                    
                    <div id="departments-tab" class="tab-content active">
                        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h4>DANH SÁCH PHÒNG BAN</h4>
                            <button class="btn-primary" onclick="enhancedDevices.referenceManager.showAddForm('departments')">
                                ➕ Thêm Phòng Ban
                            </button>
                        </div>
                        <div id="departments-list" class="loading">🔄 Đang tải...</div>
                    </div>
                    
                    <div id="units-tab" class="tab-content" style="display: none;">
                        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h4>DANH SÁCH ĐƠN VỊ</h4>
                            <button class="btn-primary" onclick="enhancedDevices.referenceManager.showAddForm('units')">
                                ➕ Thêm Đơn Vị
                            </button>
                        </div>
                        <div id="units-list" class="loading">🔄 Đang tải...</div>
                    </div>
                    
                    <div id="staff-tab" class="tab-content" style="display: none;">
                        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h4>DANH SÁCH NHÂN VIÊN</h4>
                            <button class="btn-primary" onclick="enhancedDevices.referenceManager.showAddForm('staff')">
                                ➕ Thêm Nhân Viên
                            </button>
                        </div>
                        <div id="staff-list" class="loading">🔄 Đang tải...</div>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    async loadReferenceData(modal) {
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
                    <div class="reference-item">
                        <div class="item-info">
                            <div class="item-name">${this.escapeHtml(dept.ten_phong)}</div>
                            <div class="item-meta">ID: ${dept.id}</div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-action btn-edit" onclick="enhancedDevices.referenceManager.editItem('departments', ${dept.id}, '${this.escapeHtml(dept.ten_phong)}')">
                                ✏️
                            </button>
                            <button class="btn-action btn-delete" onclick="enhancedDevices.referenceManager.deleteItem('departments', ${dept.id}, '${this.escapeHtml(dept.ten_phong)}')">
                                🗑️
                            </button>
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
                    <div class="reference-item">
                        <div class="item-info">
                            <div class="item-name">${this.escapeHtml(unit.ten_don_vi)}</div>
                            <div class="item-meta">ID: ${unit.id}</div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-action btn-edit" onclick="enhancedDevices.referenceManager.editItem('units', ${unit.id}, '${this.escapeHtml(unit.ten_don_vi)}')">
                                ✏️
                            </button>
                            <button class="btn-action btn-delete" onclick="enhancedDevices.referenceManager.deleteItem('units', ${unit.id}, '${this.escapeHtml(unit.ten_don_vi)}')">
                                🗑️
                            </button>
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
                    <div class="reference-item">
                        <div class="item-info">
                            <div class="item-name">${this.escapeHtml(person.ten_nhan_vien)}</div>
                            <div class="item-details">
                                <span class="detail">Chức vụ: ${person.chuc_vu || 'Chưa có'}</span>
                                <span class="detail">ID: ${person.id}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-action btn-edit" onclick="enhancedDevices.referenceManager.editStaff(${person.id})">
                                ✏️
                            </button>
                            <button class="btn-action btn-delete" onclick="enhancedDevices.referenceManager.deleteItem('staff', ${person.id}, '${this.escapeHtml(person.ten_nhan_vien)}')">
                                🗑️
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    switchTab(tabName, button) {
        // Update active tab button
        document.querySelectorAll('.reference-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Show selected tab content
        document.querySelectorAll('#departments-tab, #units-tab, #staff-tab').forEach(tab => {
            tab.style.display = 'none';
        });
        document.getElementById(`${tabName}-tab`).style.display = 'block';
    }

    showAddForm(type) {
        const formHTML = this.getAddFormHTML(type);
        if (confirm(`Thêm ${this.getTypeName(type)} mới?\n\n${formHTML}`)) {
            this.handleAddForm(type);
        }
    }

    getAddFormHTML(type) {
        const typeNames = {
            'departments': 'phòng ban',
            'units': 'đơn vị', 
            'staff': 'nhân viên'
        };

        const baseHTML = `
            Tên ${typeNames[type]}:
            <input type="text" id="new-${type}-name" placeholder="Nhập tên ${typeNames[type]}" style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
        `;

        if (type === 'staff') {
            return baseHTML + `
                Chức vụ:
                <input type="text" id="new-staff-position" placeholder="Nhập chức vụ" style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
            `;
        }

        return baseHTML;
    }

    async handleAddForm(type) {
        const nameInput = document.getElementById(`new-${type}-name`);
        const name = nameInput ? nameInput.value : prompt(`Nhập tên ${this.getTypeName(type)}:`);
        
        if (!name) return;

        try {
            let data = {};

            if (type === 'departments') {
                data.ten_phong = name;
                await medicalDB.addDepartment(data);
            } else if (type === 'units') {
                data.ten_don_vi = name;
                await medicalDB.addUnit(data);
            } else if (type === 'staff') {
                data.ten_nhan_vien = name;
                const positionInput = document.getElementById('new-staff-position');
                data.chuc_vu = positionInput ? positionInput.value : prompt('Nhập chức vụ:') || '';
                await medicalDB.addStaff(data);
            }

            this.manager.showSuccess(`Đã thêm ${this.getTypeName(type)} thành công`);
            
            // Reload data
            const modal = document.querySelector('.reference-data-modal');
            if (modal) {
                this.loadReferenceData(modal);
            }

            // Refresh manager data
            await this.manager.loadReferenceData();
            
        } catch (error) {
            console.error(`Error adding ${type}:`, error);
            this.manager.showError(`Lỗi khi thêm ${this.getTypeName(type)}: ${error.message}`);
        }
    }

    async deleteItem(type, id, name) {
        if (!confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) return;

        try {
            if (dbExtended) {
                await dbExtended.deleteReferenceData(type, id);
                this.manager.showSuccess(`Đã xóa ${this.getTypeName(type)} thành công`);
                
                // Reload data
                const modal = document.querySelector('.reference-data-modal');
                if (modal) {
                    this.loadReferenceData(modal);
                }

                // Refresh manager data
                await this.manager.loadReferenceData();
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            this.manager.showError(`Lỗi khi xóa ${this.getTypeName(type)}: ${error.message}`);
        }
    }

    editItem(type, id, currentName) {
        const newName = prompt(`Chỉnh sửa tên ${this.getTypeName(type)}:`, currentName);
        if (newName && newName !== currentName) {
            this.updateItem(type, id, newName);
        }
    }

    async updateItem(type, id, newName) {
        try {
            const updates = {};
            
            if (type === 'departments') updates.ten_phong = newName;
            else if (type === 'units') updates.ten_don_vi = newName;
            else if (type === 'staff') updates.ten_nhan_vien = newName;

            if (dbExtended) {
                await dbExtended.updateReferenceData(type, id, updates);
                this.manager.showSuccess(`Đã cập nhật ${this.getTypeName(type)} thành công`);
                
                // Reload data
                const modal = document.querySelector('.reference-data-modal');
                if (modal) {
                    this.loadReferenceData(modal);
                }

                // Refresh manager data
                await this.manager.loadReferenceData();
            }
        } catch (error) {
            console.error(`Error updating ${type}:`, error);
            this.manager.showError(`Lỗi khi cập nhật ${this.getTypeName(type)}: ${error.message}`);
        }
    }

    editStaff(id) {
        this.manager.showNotification('Tính năng chỉnh sửa chi tiết nhân viên sẽ được phát triển trong phiên bản tới', 'info');
    }

    getTypeName(type) {
        const names = {
            'departments': 'phòng ban',
            'units': 'đơn vị',
            'staff': 'nhân viên'
        };
        return names[type] || type;
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