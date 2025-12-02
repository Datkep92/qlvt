
// qr-manager.js - Version với Debug UI cho điện thoại
class QRManager {
    constructor() {
        this.moduleName = "QRManager";
        this.qrCodeReady = typeof QRCode !== 'undefined';
        
        // Tạo debug panel cho điện thoại
        this.createMobileDebugPanel();
        
        this.init();
    }
    
    // Tạo panel debug cho điện thoại
    createMobileDebugPanel() {
        // Chỉ tạo khi chưa có
        if (document.getElementById('mobile-debug-panel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'mobile-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 8px;
            z-index: 99999;
            font-family: Arial;
            font-size: 12px;
            display: none;
            max-height: 70vh;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong style="color:#00ff00;">🔧 DEBUG PANEL</strong>
                <button onclick="document.getElementById('mobile-debug-panel').style.display='none'" 
                        style="background:red; color:white; border:none; border-radius:3px; padding:3px 8px;">
                    ✕
                </button>
            </div>
            <div id="debug-content"></div>
            <div style="margin-top:10px; display:flex; gap:5px;">
                <button onclick="window.qrManager.testDatabase()" style="flex:1; padding:5px; background:#007bff; color:white; border:none; border-radius:3px;">
                    Test DB
                </button>
                <button onclick="window.qrManager.showQRSelectionModal()" style="flex:1; padding:5px; background:#28a745; color:white; border:none; border-radius:3px;">
                    Open QR
                </button>
                <button onclick="window.qrManager.showMockData()" style="flex:1; padding:5px; background:#ffc107; color:white; border:none; border-radius:3px;">
                    Mock Data
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Thêm nút toggle debug panel
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'debug-toggle-btn';
        toggleBtn.textContent = '🐛';
        toggleBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 99999;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #333;
            color: white;
            border: 2px solid #00ff00;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        toggleBtn.onclick = () => {
            const panel = document.getElementById('mobile-debug-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };
        
        document.body.appendChild(toggleBtn);
    }
    
    // Cập nhật debug info
    updateDebugInfo(message, type = 'info') {
        const debugContent = document.getElementById('debug-content');
        if (!debugContent) return;
        
        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        };
        
        const time = new Date().toLocaleTimeString();
        const msg = `<div style="color:${colors[type]}; margin:2px 0; font-size:11px;">
            [${time}] ${message}
        </div>`;
        
        debugContent.innerHTML = msg + debugContent.innerHTML;
        
        // Giới hạn số dòng
        if (debugContent.children.length > 20) {
            debugContent.removeChild(debugContent.lastChild);
        }
    }
    
    // Test database connection
    async testDatabase() {
        this.updateDebugInfo('Testing database connection...', 'info');
        
        // Test 1: Kiểm tra biến global
        this.updateDebugInfo(`1. Checking window.medicalDB: ${typeof window.medicalDB !== 'undefined' ? 'FOUND ✓' : 'NOT FOUND ✗'}`, 
                           typeof window.medicalDB !== 'undefined' ? 'success' : 'error');
        
        // Test 2: Kiểm tra phương thức
        if (window.medicalDB) {
            this.updateDebugInfo(`2. medicalDB.getAllDevices: ${typeof window.medicalDB.getAllDevices === 'function' ? 'EXISTS ✓' : 'MISSING ✗'}`,
                               typeof window.medicalDB.getAllDevices === 'function' ? 'success' : 'warning');
            
            // Test 3: Thực tế gọi database
            try {
                this.updateDebugInfo('3. Calling getAllDevices()...', 'info');
                const devices = await window.medicalDB.getAllDevices();
                this.updateDebugInfo(`   Result: ${devices.length} devices loaded ✓`, 'success');
                
                if (devices.length > 0) {
                    this.updateDebugInfo(`   Sample: ${devices[0].ten_thiet_bi}`, 'info');
                }
            } catch (error) {
                this.updateDebugInfo(`   Error: ${error.message} ✗`, 'error');
            }
        }
        
        // Test 4: Kiểm tra indexedDB
        this.updateDebugInfo(`4. IndexedDB supported: ${'indexedDB' in window ? 'YES ✓' : 'NO ✗'}`,
                           'indexedDB' in window ? 'success' : 'warning');
        
        // Test 5: Kiểm tra localStorage
        this.updateDebugInfo(`5. localStorage: ${'localStorage' in window ? 'YES ✓' : 'NO ✗'}`,
                           'localStorage' in window ? 'success' : 'warning');
    }
    
    // Hiển thị mock data cho testing
    async showMockData() {
        const mockDevices = [
            {
                id: 1,
                ten_thiet_bi: "Máy đo huyết áp điện tử (TEST)",
                model: "TEST-100",
                so_luong: 3,
                tinh_trang: "Đang sử dụng",
                phong_ban: "Khoa Test"
            },
            {
                id: 2,
                ten_thiet_bi: "Máy X-quang di động (TEST)",
                model: "TEST-X200",
                so_luong: 1,
                tinh_trang: "Mới",
                phong_ban: "Khoa Test"
            }
        ];
        
        this.updateDebugInfo('Showing mock data (2 test devices)', 'success');
        this.showDeviceSelectionModal(mockDevices);
    }
    
    // Hàm chính với fallback đầy đủ
    async showQRSelectionModal() {
        this.updateDebugInfo('=== QR SELECTION STARTED ===', 'info');
        
        let devices = [];
        let source = '';
        
        // PHƯƠNG PHÁP 1: Từ database chính
        if (window.medicalDB && typeof window.medicalDB.getAllDevices === 'function') {
            this.updateDebugInfo('Method 1: Trying medicalDB...', 'info');
            try {
                devices = await window.medicalDB.getAllDevices();
                source = 'medicalDB';
                this.updateDebugInfo(`✓ Loaded ${devices.length} devices from DB`, 'success');
            } catch (error) {
                this.updateDebugInfo(`✗ DB Error: ${error.message}`, 'error');
            }
        } else {
            this.updateDebugInfo('✗ medicalDB not available', 'warning');
        }
        
        // PHƯƠNG PHÁP 2: Từ localStorage (fallback)
        if (devices.length === 0) {
            this.updateDebugInfo('Method 2: Trying localStorage...', 'info');
            try {
                const stored = localStorage.getItem('medical-devices');
                if (stored) {
                    devices = JSON.parse(stored);
                    source = 'localStorage';
                    this.updateDebugInfo(`✓ Loaded ${devices.length} devices from localStorage`, 'success');
                } else {
                    this.updateDebugInfo('✗ No data in localStorage', 'info');
                }
            } catch (error) {
                this.updateDebugInfo(`✗ localStorage Error: ${error.message}`, 'error');
            }
        }
        
        // PHƯƠNG PHÁP 3: Mock data
        if (devices.length === 0) {
            this.updateDebugInfo('Method 3: Using mock data...', 'warning');
            devices = [
                {
                    id: 101,
                    ten_thiet_bi: "Máy đo nhịp tim (Demo)",
                    model: "DEMO-HR50",
                    so_luong: 2,
                    tinh_trang: "Đang sử dụng",
                    phong_ban: "Khoa Demo"
                },
                {
                    id: 102,
                    ten_thiet_bi: "Máy thở oxy (Demo)",
                    model: "DEMO-OX100",
                    so_luong: 1,
                    tinh_trang: "Bảo trì",
                    phong_ban: "Khoa Demo"
                }
            ];
            source = 'mock';
            this.updateDebugInfo(`✓ Created ${devices.length} mock devices`, 'success');
        }
        
        // Hiển thị kết quả
        this.updateDebugInfo(`=== FINAL: ${devices.length} devices from ${source} ===`, 
                           devices.length > 0 ? 'success' : 'error');
        
        if (devices.length === 0) {
            this.showError('Không tìm thấy thiết bị nào');
            return;
        }
        
        // Hiển thị modal
        this.showDeviceSelectionModal(devices);
    }
    
    // Hiển thị modal chọn thiết bị (giữ nguyên từ code trước)
    showDeviceSelectionModal(devices) {
        // Đóng modal cũ
        this.closeAllModals();
        
        // Tạo modal mới
        const modal = this.createModal('qr-selection-modal');
        
        // Tạo nội dung đơn giản cho mobile
        let deviceListHTML = '';
        devices.forEach((device, index) => {
            deviceListHTML += `
                <div style="margin:10px 0; padding:10px; border:1px solid #ddd; border-radius:5px;">
                    <div style="display:flex; align-items:center;">
                        <input type="checkbox" id="device-${device.id}" 
                               style="margin-right:10px; transform: scale(1.5);"
                               onchange="window.qrManager.updateMobileSelection()">
                        <div style="flex:1;">
                            <strong>${device.ten_thiet_bi || 'Không tên'}</strong>
                            <div style="font-size:12px; color:#666;">
                                Model: ${device.model || 'N/A'} | 
                                SL: ${device.so_luong || 1} | 
                                ${device.tinh_trang || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        modal.innerHTML = `
            <div style="background:white; border-radius:10px; width:95%; max-height:80vh; overflow-y:auto;">
                <div style="padding:15px; border-bottom:1px solid #eee;">
                    <h3 style="margin:0; color:#2c3e50;">📱 CHỌN THIẾT BỊ</h3>
                    <p style="color:#666; margin:5px 0;">Tổng: ${devices.length} thiết bị</p>
                </div>
                
                <div style="padding:15px;">
                    <div style="margin-bottom:15px;">
                        <label style="display:flex; align-items:center; font-weight:bold;">
                            <input type="checkbox" id="select-all-mobile" 
                                   style="margin-right:10px; transform: scale(1.5);"
                                   onchange="window.qrManager.toggleSelectAllMobile()">
                            Chọn tất cả
                        </label>
                    </div>
                    
                    <div id="mobile-device-list">
                        ${deviceListHTML}
                    </div>
                </div>
                
                <div style="padding:15px; border-top:1px solid #eee; display:flex; gap:10px;">
                    <button onclick="window.qrManager.closeModal()" 
                            style="flex:1; padding:12px; background:#6c757d; color:white; border:none; border-radius:5px; font-size:16px;">
                        Hủy
                    </button>
                    <button id="generate-qr-mobile" onclick="window.qrManager.generateFromMobileSelection()"
                            style="flex:2; padding:12px; background:#28a745; color:white; border:none; border-radius:5px; font-size:16px; font-weight:bold;"
                            disabled>
                        📱 Tạo QR Code
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.updateMobileSelection();
    }
    
    // Helper functions cho mobile
    updateMobileSelection() {
        const checkboxes = document.querySelectorAll('#mobile-device-list input[type="checkbox"]:checked');
        const selectedCount = checkboxes.length;
        const generateBtn = document.getElementById('generate-qr-mobile');
        
        if (generateBtn) {
            generateBtn.disabled = selectedCount === 0;
            generateBtn.textContent = selectedCount > 0 
                ? `📱 Tạo QR (${selectedCount})` 
                : '📱 Tạo QR Code';
        }
        
        // Cập nhật select all
        const selectAll = document.getElementById('select-all-mobile');
        if (selectAll) {
            const total = document.querySelectorAll('#mobile-device-list input[type="checkbox"]').length;
            selectAll.checked = selectedCount === total && total > 0;
        }
        
        this.updateDebugInfo(`Selected: ${selectedCount} devices`, 'info');
    }
    
    toggleSelectAllMobile() {
        const selectAll = document.getElementById('select-all-mobile');
        const checkboxes = document.querySelectorAll('#mobile-device-list input[type="checkbox"]');
        
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
        });
        
        this.updateMobileSelection();
    }
    
    generateFromMobileSelection() {
        const checkboxes = document.querySelectorAll('#mobile-device-list input[type="checkbox"]:checked');
        const selectedDevices = [];
        
        // Lấy thông tin thiết bị đã chọn (tạm thời dùng mock data)
        if (checkboxes.length > 0) {
            selectedDevices.push({
                id: 999,
                ten_thiet_bi: "Thiết bị test từ mobile",
                model: "MOBILE-TEST",
                so_luong: 1,
                tinh_trang: "Đang sử dụng"
            });
        }
        
        if (selectedDevices.length > 0) {
            this.updateDebugInfo(`Generating QR for ${selectedDevices.length} devices`, 'success');
            this.generateDetailedQR(selectedDevices);
            this.closeModal();
        }
    }
    
    // Các hàm helper khác giữ nguyên
    createModal(className) {
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        
        return modal;
    }
    
    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
    }
    
    showError(message) {
        alert('❌ ' + message);
        this.updateDebugInfo('ERROR: ' + message, 'error');
    }
    
    // Hàm tạo QR (đơn giản hóa cho mobile)
    async generateDetailedQR(devices) {
        if (!this.qrCodeReady) {
            this.showError('Thư viện QR chưa sẵn sàng');
            return;
        }
        
        // Tạo QR đơn giản cho 1 thiết bị
        const device = devices[0];
        const qrText = `Thiết bị: ${device.ten_thiet_bi}\nModel: ${device.model}\nTrạng thái: ${device.tinh_trang}`;
        
        // Tạo QR code
        const qrDiv = document.createElement('div');
        qrDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
        document.body.appendChild(qrDiv);
        
        new QRCode(qrDiv, {
            text: qrText,
            width: 250,
            height: 250,
            colorDark: "#000000",
            colorLight: "#ffffff"
        });
        
        setTimeout(() => {
            const canvas = qrDiv.querySelector('canvas');
            if (canvas) {
                const dataUrl = canvas.toDataURL('image/png');
                
                // Hiển thị QR
                const qrModal = this.createModal('qr-display-modal');
                qrModal.innerHTML = `
                    <div style="background:white; padding:20px; border-radius:10px; text-align:center;">
                        <h3>QR Code</h3>
                        <img src="${dataUrl}" style="width:250px; height:250px; margin:20px 0;">
                        <p>${device.ten_thiet_bi}</p>
                        <button onclick="window.qrManager.closeModal()" 
                                style="padding:10px 20px; background:#007bff; color:white; border:none; border-radius:5px;">
                            Đóng
                        </button>
                    </div>
                `;
                document.body.appendChild(qrModal);
            }
            
            document.body.removeChild(qrDiv);
        }, 100);
        
        this.updateDebugInfo('QR generated successfully', 'success');
    }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    window.qrManager = new QRManager();
    
    // Hiển thị thông báo
    setTimeout(() => {
        const debugPanel = document.getElementById('mobile-debug-panel');
        if (debugPanel) {
            debugPanel.style.display = 'block';
            window.qrManager.updateDebugInfo('QR Manager đã sẵn sàng!', 'success');
            window.qrManager.updateDebugInfo('Nhấn "Test DB" để kiểm tra database', 'info');
        }
    }, 1000);
});
