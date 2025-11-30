class ImportManager {
    constructor() {
        this.previewData = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('excel-file');
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        document.getElementById('confirm-import')?.addEventListener('click', this.confirmImport.bind(this));
        document.getElementById('cancel-import')?.addEventListener('click', this.cancelImport.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#3498db';
        e.currentTarget.style.background = '#f8f9fa';
    }

    handleDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            return;
        }

        try {
            await this.checkXLSXLoaded();
            this.showLoading();
            const data = await this.readExcelFile(file);
            this.previewData = data;
            this.showPreview(data);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Lỗi khi đọc file Excel: ' + error.message);
            this.resetUploadArea();
        }
    }

    checkXLSXLoaded() {
        return new Promise((resolve, reject) => {
            if (typeof XLSX !== 'undefined') return resolve();
            
            let attempts = 0;
            const check = () => {
                attempts++;
                if (typeof XLSX !== 'undefined') resolve();
                else if (attempts < 10) setTimeout(check, 500);
                else reject(new Error('Không thể tải thư viện Excel'));
            };
            check();
        });
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            if (typeof XLSX === 'undefined') {
                reject(new Error('Thư viện Excel chưa được tải'));
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length === 0) {
                        reject(new Error('File Excel không có dữ liệu'));
                        return;
                    }

                    const headers = jsonData[0];
                    const processedData = jsonData.slice(1)
                        .map(row => {
                            const obj = {};
                            headers.forEach((header, colIndex) => {
                                obj[header] = row[colIndex] || '';
                            });
                            return obj;
                        })
                        .filter(row => Object.values(row).some(value => 
                            value !== null && value !== undefined && 
                            value.toString().trim() !== ''
                        ));

                    resolve(processedData);
                } catch (error) {
                    reject(new Error('Lỗi khi đọc file Excel: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Lỗi khi đọc file'));
            reader.readAsArrayBuffer(file);
        });
    }

    showPreview(data) {
        if (data.length === 0) {
            alert('Không tìm thấy dữ liệu trong file Excel');
            this.resetUploadArea();
            return;
        }

        const previewSection = document.getElementById('preview-section');
        const previewTable = document.getElementById('preview-table');
        
        if (!previewSection || !previewTable) return;

        previewTable.innerHTML = '';
        const headers = Object.keys(data[0]);
        
        // Create header row
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        previewTable.appendChild(headerRow);
        
        // Create data rows
        data.slice(0, 10).forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';
                tr.appendChild(td);
            });
            previewTable.appendChild(tr);
        });

        previewSection.style.display = 'block';
        this.showUploadSuccess(data.length);
    }

    async confirmImport() {
        if (this.previewData.length === 0) {
            alert('Không có dữ liệu để import');
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn import ${this.previewData.length} thiết bị?`)) return;

        const importBtn = document.getElementById('confirm-import');
        this.setButtonLoading(importBtn, true);

        try {
            const results = await medicalDB.importDevicesFromData(this.previewData);
            this.showImportResults(results);
            await this.refreshAfterImport();
        } catch (error) {
            alert('Lỗi khi import dữ liệu: ' + error.message);
        } finally {
            this.setButtonLoading(importBtn, false);
        }
    }

    showImportResults(results) {
        const previewSection = document.getElementById('preview-section');
        if (!previewSection) return;

        const resultsHTML = `
            <div class="import-results">
                <h3>${results.success > 0 ? '✅' : '❌'} Import hoàn tất</h3>
                <div class="result-stats">
                    <p><strong>Thành công:</strong> ${results.success} thiết bị</p>
                    <p><strong>Lỗi:</strong> ${results.errors} thiết bị</p>
                </div>
                ${results.errors > 0 ? `
                    <div class="errors-list">
                        <h4>Chi tiết lỗi:</h4>
                        <ul>
                            ${results.errorsList.map(error => `
                                <li>${this.escapeHtml(error.device)}: ${this.escapeHtml(error.error)}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div class="import-actions">
                    <button onclick="importManager.resetAndGoToDevices()" class="btn-primary">
                        ${results.success > 0 ? '✅ Xem danh sách thiết bị' : 'Thử lại'}
                    </button>
                    <button onclick="importManager.resetUploadArea()" class="btn-secondary">
                        Import tiếp
                    </button>
                </div>
            </div>
        `;

        previewSection.innerHTML = resultsHTML;
        previewSection.style.display = 'block';
    }

    cancelImport() {
        this.resetUploadArea();
        this.previewData = [];
    }

    resetUploadArea() {
        const uploadArea = document.getElementById('upload-area');
        const previewSection = document.getElementById('preview-section');
        
        if (uploadArea) {
            uploadArea.innerHTML = `
                <input type="file" id="excel-file" accept=".xlsx, .xls" hidden>
                <div class="upload-placeholder">
                    <span>📁 Kéo thả file Excel vào đây hoặc click để chọn</span>
                    <p>Hỗ trợ định dạng .xlsx, .xls</p>
                </div>
            `;
            
            // Re-attach event listener
            const fileInput = document.getElementById('excel-file');
            if (fileInput) {
                fileInput.addEventListener('change', this.handleFileSelect.bind(this));
            }
        }
        
        if (previewSection) {
            previewSection.style.display = 'none';
            previewSection.innerHTML = '';
        }
        
        this.previewData = [];
    }

    // Utility methods
    showLoading() {
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = '<div class="loading">📊 Đang xử lý file Excel...</div>';
        }
    }

    showUploadSuccess(dataLength) {
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-success">
                    <span>✅ Đã tải lên thành công</span>
                    <p>File: ${dataLength} dòng dữ liệu</p>
                    <p>Đang hiển thị 10 dòng đầu tiên</p>
                </div>
            `;
        }
    }

    async refreshAfterImport() {
        if (window.enhancedDevices) {
            await enhancedDevices.refreshData();
        }
    }

    resetAndGoToDevices() {
        this.resetUploadArea();
        if (window.app) {
            app.showTab('devices');
        }
    }

    setButtonLoading(button, isLoading) {
        if (button) {
            button.textContent = isLoading ? '🔄 Đang import...' : 'Xác nhận Import';
            button.disabled = isLoading;
        }
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.importManager = new ImportManager();
});