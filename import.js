// modules/import.js - Quản lý import Excel
class ImportManager {
    constructor() {
        this.moduleName = "ImportManager";
        this.init();
    }
    
    // Trong init() của import.js - thêm event handler
init() {
    AppEvents.on('app:ready', () => this.setup());
    AppEvents.on('ui:showImport', () => this.showImport()); // THÊM DÒNG NÀY
    AppEvents.on('import:processFile', (file) => this.processExcelFile(file));
}
    
    setup() {
        console.log('✅ ImportManager ready');
        this.renderImportTab();
    }
    
    renderImportTab() {
        // Tìm hoặc tạo tab import trong navigation
        const nav = document.querySelector('.app-header')?.nextElementSibling;
        if (nav && nav.classList.contains('tab-navigation')) {
            const importBtn = document.createElement('button');
            importBtn.className = 'tab-btn';
            importBtn.dataset.tab = 'import';
            importBtn.textContent = '📥 Import Excel';
            importBtn.onclick = () => AppEvents.emit('ui:showImport');
            nav.appendChild(importBtn);
        }
    }
    
    showImport() {
        const modal = this.createModal('import-modal');
        modal.innerHTML = this.getImportHTML();
        document.body.appendChild(modal);
        this.bindImportEvents();
    }
    
    getImportHTML() {
        return `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>📥 IMPORT TỪ EXCEL</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="import-container">
                        <div class="upload-area" id="upload-area">
                            <input type="file" id="excel-file" accept=".xlsx, .xls" hidden>
                            <div class="upload-placeholder">
                                <span>📁 Kéo thả file Excel vào đây hoặc click để chọn</span>
                                <p>Hỗ trợ định dạng .xlsx, .xls</p>
                            </div>
                        </div>

                        <div id="preview-section" class="preview-section" style="display: none;">
                            <h3>Xem trước dữ liệu</h3>
                            <div class="table-container">
                                <table id="preview-table" class="data-table">
                                    <!-- Preview data will be loaded here -->
                                </table>
                            </div>
                            
                            <div class="import-actions">
                                <button id="confirm-import" class="btn-primary">Xác nhận Import</button>
                                <button id="cancel-import" class="btn-secondary">Hủy</button>
                            </div>
                        </div>

                        <div class="import-instructions">
                            <h4>📋 Hướng dẫn import:</h4>
                            <ul>
                                <li>File Excel cần có các cột: Tên thiết bị, Model, Số lượng, Nguyên giá</li>
                                <li>Các cột khác: Nhà sản xuất, Năm sản xuất, Phòng ban, Tình trạng (tùy chọn)</li>
                                <li>Định dạng ngày: YYYY-MM-DD</li>
                                <li>Định dạng số: Không có dấu phân cách hàng nghìn</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindImportEvents() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('excel-file');
        
        if (uploadArea && fileInput) {
            // Click to select file
            uploadArea.addEventListener('click', () => fileInput.click());
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
            
            // File input change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
            
            // Confirm import button
            const confirmBtn = document.getElementById('confirm-import');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => this.confirmImport());
            }
            
            // Cancel button
            const cancelBtn = document.getElementById('cancel-import');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.cancelImport());
            }
        }
    }
    
    handleFileSelect(file) {
        if (!file) return;
        
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
            AppEvents.emit('notification:show', {
                message: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)',
                type: 'error'
            });
            return;
        }
        
        AppEvents.emit('notification:show', {
            message: 'Đang xử lý file...',
            type: 'info'
        });
        
        this.processExcelFile(file);
    }
    
    async processExcelFile(file) {
        try {
            const data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
            
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            if (jsonData.length < 2) {
                AppEvents.emit('notification:show', {
                    message: 'File Excel không có dữ liệu',
                    type: 'error'
                });
                return;
            }
            
            this.showPreview(jsonData);
            
        } catch (error) {
            console.error('Error processing Excel file:', error);
            AppEvents.emit('notification:show', {
                message: 'Lỗi khi đọc file Excel: ' + error.message,
                type: 'error'
            });
        }
    }
    
    showPreview(data) {
        const previewSection = document.getElementById('preview-section');
        const previewTable = document.getElementById('preview-table');
        
        if (!previewSection || !previewTable) return;
        
        // Clear previous data
        previewTable.innerHTML = '';
        
        // Create header
        const headerRow = document.createElement('tr');
        if (data.length > 0) {
            data[0].forEach((header, index) => {
                const th = document.createElement('th');
                th.textContent = header || `Cột ${index + 1}`;
                headerRow.appendChild(th);
            });
            previewTable.appendChild(headerRow);
        }
        
        // Create data rows (max 10 rows for preview)
        const maxRows = Math.min(data.length - 1, 10);
        for (let i = 1; i <= maxRows; i++) {
            const row = document.createElement('tr');
            data[i].forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell || '';
                row.appendChild(td);
            });
            previewTable.appendChild(row);
        }
        
        // Show total rows info
        if (data.length - 1 > 10) {
            const infoRow = document.createElement('tr');
            const infoCell = document.createElement('td');
            infoCell.colSpan = data[0].length;
            infoCell.style.textAlign = 'center';
            infoCell.style.fontStyle = 'italic';
            infoCell.textContent = `... và ${data.length - 11} dòng khác`;
            infoRow.appendChild(infoCell);
            previewTable.appendChild(infoRow);
        }
        
        previewSection.style.display = 'block';
        this.previewData = data;
    }
    
    async confirmImport() {
        if (!this.previewData || this.previewData.length < 2) {
            AppEvents.emit('notification:show', {
                message: 'Không có dữ liệu để import',
                type: 'error'
            });
            return;
        }
        
        const headers = this.previewData[0];
        const rows = this.previewData.slice(1);
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const row of rows) {
                try {
                    const deviceData = this.mapRowToDevice(headers, row);
                    if (deviceData.ten_thiet_bi) {
                        await medicalDB.addDevice(deviceData);
                        successCount++;
                    }
                } catch (error) {
                    console.error('Error importing row:', error);
                    errorCount++;
                }
            }
            
            await medicalDB.addActivity({
                type: 'import',
                description: `Import ${successCount} thiết bị từ Excel`,
                user: 'Quản trị viên'
            });
            
            AppEvents.emit('notification:show', {
                message: `Import thành công ${successCount} thiết bị${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
                type: 'success'
            });
            
            // Refresh data
            AppEvents.emit('data:refresh');
            this.closeImportModal();
            
        } catch (error) {
            console.error('Error during import:', error);
            AppEvents.emit('notification:show', {
                message: 'Lỗi khi import dữ liệu: ' + error.message,
                type: 'error'
            });
        }
    }
    
    mapRowToDevice(headers, row) {
    const device = {
        serial_number: `IMPORT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ten_thiet_bi: '',
        model: '',
        nha_san_xuat: '',
        nam_san_xuat: null,
        so_luong: 1,
        nguyen_gia: 0,
        phan_loai: 'THIẾT BỊ Y TẾ',
        don_vi_tinh: 'cái',
        phong_ban: 'Khoa Gây mê hồi sức',
        tinh_trang: 'Đang sử dụng',
        nhan_vien_ql: 'Quản trị viên',
        ngay_nhap: new Date().toISOString().split('T')[0],
        vi_tri: 'Khoa Gây mê hồi sức',
        ghi_chu: 'Import từ Excel',
        is_active: true
    };

    headers.forEach((header, index) => {
        const value = row[index];
        if (!value) return;

        const headerLower = header.toString().trim().toLowerCase();

        // TÊN
        if (headerLower.includes('tên') || headerLower.includes('name')) {
            device.ten_thiet_bi = value.toString().trim();
        }

        // MODEL
        else if (headerLower.includes('model')) {
            device.model = value.toString().trim();
        }

        // ⭐⭐ NĂM SẢN XUẤT — ƯU TIÊN MATCH CHÍNH XÁC ⭐⭐
        else if (
            headerLower.includes('năm sản xuất') ||
            headerLower.includes('year of manufacture') ||
            headerLower === 'năm'
        ) {
            device.nam_san_xuat = parseInt(value) || null;
        }

        // NHÀ SẢN XUẤT (khác với “Năm sản xuất”)
        else if (
            headerLower.includes('nhà sản xuất') ||
            headerLower.includes('manufacturer')
        ) {
            device.nha_san_xuat = value.toString().trim();
        }

        // SỐ LƯỢNG
        else if (headerLower.includes('số lượng') || headerLower.includes('quantity')) {
            device.so_luong = parseInt(value) || 1;
        }

        // NGUYÊN GIÁ
        else if (
            headerLower.includes('nguyên giá') ||
            headerLower.includes('giá') ||
            headerLower.includes('price')
        ) {
            device.nguyen_gia = parseFloat(value) || 0;
        }

        // PHÒNG BAN
        else if (headerLower.includes('phòng') || headerLower.includes('department')) {
            device.phong_ban = value.toString().trim();
        }

        // TÌNH TRẠNG
        else if (headerLower.includes('trạng thái') || headerLower.includes('status')) {
            device.tinh_trang = value.toString().trim();
        }

        // GHI CHÚ
        else if (headerLower.includes('ghi chú') || headerLower.includes('note')) {
            device.ghi_chu = value.toString().trim();
        }
    });

    return device;
}

    
    cancelImport() {
        this.closeImportModal();
    }
    
    closeImportModal() {
        const modal = document.querySelector('.import-modal');
        if (modal) {
            modal.remove();
        }
        this.previewData = null;
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
}

new ImportManager();