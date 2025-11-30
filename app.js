class MedicalEquipmentApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.charts = {}; // Lưu trữ các chart instance
        this.init();
    }

    async init() {
        // Đợi Chart.js load xong
        await this.waitForChartJS();
        this.setupEventListeners();
        this.showTab('dashboard');
    }

    waitForChartJS() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }

            // Nếu Chart chưa load, đợi thêm
            let attempts = 0;
            const checkChart = () => {
                attempts++;
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else if (attempts < 10) {
                    setTimeout(checkChart, 100);
                } else {
                    console.warn('Chart.js not loaded, continuing without charts');
                    resolve();
                }
            };
            checkChart();
        });
    }

   
    async loadInitialData() {
        const sampleDevices = [
            {
                serial_number: `DEV_${Date.now()}_1`,
                ten_thiet_bi: "Bàn đạp cắt đốt (MH551) Olympus",
                nam_san_xuat: 2012,
                so_luong: 1,
                nguyen_gia: 45864000,
                phan_loai: "DỤNG CỤ Y TẾ",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Gây mê hồi sức",
                tinh_trang: "Đang sử dụng",
                nha_san_xuat: "Olympus",
                model: "MH551",
                ghi_chu: "Thiết bị nội soi",
                nhan_vien_ql: "Admin",
                ngay_nhap: new Date().toISOString().split('T')[0],
                vi_tri: "Khoa Gây mê hồi sức",
                is_active: true
            },
            {
                serial_number: `DEV_${Date.now()}_2`,
                ten_thiet_bi: "Bàn để khăn CN có bánh xe",
                nam_san_xuat: 1975,
                so_luong: 5,
                nguyen_gia: 1500000,
                phan_loai: "DỤNG CỤ Y TẾ",
                don_vi_tinh: "cái", 
                phong_ban: "Khoa Gây mê hồi sức",
                tinh_trang: "Đang sử dụng",
                nha_san_xuat: "",
                model: "",
                ghi_chu: "",
                nhan_vien_ql: "Admin",
                ngay_nhap: new Date().toISOString().split('T')[0],
                vi_tri: "Khoa Gây mê hồi sức",
                is_active: true
            },
            {
                serial_number: `DEV_${Date.now()}_3`,
                ten_thiet_bi: "Bàn Mayo",
                nam_san_xuat: 2019,
                so_luong: 9,
                nguyen_gia: 5170000,
                phan_loai: "DỤNG CỤ Y TẾ",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Gây mê hồi sức",
                tinh_trang: "Bảo trì",
                nha_san_xuat: "",
                model: "",
                ghi_chu: "Cần bảo trì định kỳ",
                nhan_vien_ql: "Admin",
                ngay_nhap: new Date().toISOString().split('T')[0],
                vi_tri: "Khoa Gây mê hồi sức", 
                is_active: true
            },
            {
                serial_number: `DEV_${Date.now()}_4`,
                ten_thiet_bi: "Máy đo SPO2",
                nam_san_xuat: 2022,
                so_luong: 5,
                nguyen_gia: 200000,
                phan_loai: "THIẾT BỊ ĐIỆN TỬ",
                don_vi_tinh: "cái",
                phong_ban: "Khoa Gây mê hồi sức",
                tinh_trang: "Đang sử dụng",
                nha_san_xuat: "",
                model: "",
                ghi_chu: "",
                nhan_vien_ql: "Admin",
                ngay_nhap: new Date().toISOString().split('T')[0],
                vi_tri: "Khoa Gây mê hồi sức",
                is_active: true
            }
        ];

        for (const device of sampleDevices) {
            await medicalDB.addDevice(device);
        }

        // Thêm activity mẫu
        await medicalDB.addActivity({
            type: 'create',
            description: 'Khởi tạo dữ liệu mẫu',
            user: 'Hệ thống'
        });
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.showTab(tab);
            });
        });

      

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('device-modal');
            if (e.target === modal) {
                this.hideDeviceModal();
            }
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
    }
/*
    showTab(tabName) {
    // Nếu rời khỏi dashboard, hủy charts
    if (this.currentTab === 'dashboard' && tabName !== 'dashboard') {
        this.destroyAllCharts();
    }
        // Ẩn tất cả tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Bỏ active tất cả tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Hiển thị tab được chọn
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        this.currentTab = tabName;

        // Load nội dung cho tab
        switch(tabName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'devices':
                if (window.devicesManager) {
                    devicesManager.refresh();
                }
                break;
            case 'search':
                if (window.searchManager) {
                    // Đã được init tự động
                }
                break;
            case 'import':
                if (window.importManager) {
                    // Đã được init tự động  
                }
                break;
            case 'maintenance':
                if (window.maintenanceManager) {
                    maintenanceManager.loadMaintenanceRecords();
                }
                break;
            case 'reports':
                if (window.reportsManager) {
                    // Đã được init tự động
                }
                break;
        }
    }
*/
// Trong showTab method, thay thế phần devices
showTab(tabName) {
    // Ẩn tất cả tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Xóa active class từ tất cả tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Hiển thị tab được chọn
    const selectedTab = document.getElementById(tabName);
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (selectedTab && selectedButton) {
        selectedTab.style.display = 'block';
        selectedButton.classList.add('active');
        this.currentTab = tabName;
        
        // Khởi tạo enhanced devices manager khi vào tab devices
        if (tabName === 'devices' && !window.enhancedDevices) {
            // Load enhanced devices manager
            this.loadEnhancedDevices();
        }
    }
}

loadEnhancedDevices() {
    // Đảm bảo CSS đã được load
    if (!document.querySelector('link[href*="enhanced-devices.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'enhanced-devices.css';
        document.head.appendChild(link);
    }
    
    // Load enhanced devices manager
    if (!window.enhancedDevices) {
        const script = document.createElement('script');
        script.src = 'enhanced-devices.js';
        script.onload = () => {
            console.log('✅ Enhanced Devices Manager loaded');
        };
        document.body.appendChild(script);
    }
}
    async updateDashboard() {
        try {
            const devices = await medicalDB.getAllDevices();
            this.updateStatistics(devices);
            
            // Chỉ update charts nếu Chart.js available
            if (typeof Chart !== 'undefined') {
                this.updateCharts(devices);
            }
            
            this.updateRecentActivities();
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    updateStatistics(devices) {
        const totalDevices = devices.length;
        const activeDevices = devices.filter(d => d.tinh_trang === 'Đang sử dụng').length;
        const maintenanceNeeded = devices.filter(d => d.tinh_trang === 'Bảo trì').length;
        const totalValue = devices.reduce((sum, device) => sum + (device.nguyen_gia * device.so_luong), 0);

        document.getElementById('total-devices').textContent = totalDevices.toLocaleString();
        document.getElementById('active-devices').textContent = activeDevices.toLocaleString();
        document.getElementById('maintenance-needed').textContent = maintenanceNeeded.toLocaleString();
        document.getElementById('total-value').textContent = this.formatCurrency(totalValue);
    }

    updateCharts(devices) {
        this.updateStatusChart(devices);
        this.updateYearChart(devices);
    }

    updateStatusChart(devices) {
    const container = document.getElementById('status-chart');
    if (!container) return;

    // Hủy chart cũ hoàn toàn
    if (this.charts.status) {
        try {
            this.charts.status.destroy();
        } catch (error) {
            console.warn('Error destroying status chart:', error);
        }
        this.charts.status = null;
    }

    const statusCounts = this.countStatus(devices);
    
    // Kiểm tra nếu có dữ liệu để hiển thị
    const hasData = Object.values(statusCounts).some(count => count > 0);
    
    if (!hasData) {
        container.innerHTML = '<div class="no-data-chart"><p>Không có dữ liệu để hiển thị</p></div>';
        return;
    }

    // TẠO CANVAS MỚI HOÀN TOÀN - CÁCH TRIỆT ĐỂ
    container.innerHTML = '<canvas id="status-chart-canvas"></canvas>';
    const canvas = document.getElementById('status-chart-canvas');
    
    if (!canvas) return;

    try {
        this.charts.status = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#27ae60', // Đang sử dụng
                        '#f39c12', // Bảo trì  
                        '#e74c3c', // Hỏng
                        '#95a5a6'  // Ngừng sử dụng
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating status chart:', error);
        container.innerHTML = '<div class="chart-error"><p>Lỗi khi tạo biểu đồ</p></div>';
    }
}

updateYearChart(devices) {
    const container = document.getElementById('year-chart');
    if (!container) return;

    // Hủy chart cũ hoàn toàn
    if (this.charts.year) {
        try {
            this.charts.year.destroy();
        } catch (error) {
            console.warn('Error destroying year chart:', error);
        }
        this.charts.year = null;
    }

    const yearData = this.groupByDecade(devices);
    
    // Kiểm tra nếu có dữ liệu để hiển thị
    const hasData = Object.values(yearData).some(count => count > 0);
    
    if (!hasData) {
        container.innerHTML = '<div class="no-data-chart"><p>Không có dữ liệu để hiển thị</p></div>';
        return;
    }

    // TẠO CANVAS MỚI HOÀN TOÀN - CÁCH TRIỆT ĐỂ
    container.innerHTML = '<canvas id="year-chart-canvas"></canvas>';
    const canvas = document.getElementById('year-chart-canvas');
    
    if (!canvas) return;

    try {
        this.charts.year = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(yearData).sort(),
                datasets: [{
                    label: 'Số lượng thiết bị',
                    data: Object.values(yearData),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating year chart:', error);
        container.innerHTML = '<div class="chart-error"><p>Lỗi khi tạo biểu đồ</p></div>';
    }
}


// Thêm vào class MedicalEquipmentApp
destroyAllCharts() {
    Object.keys(this.charts).forEach(chartName => {
        if (this.charts[chartName] && typeof this.charts[chartName].destroy === 'function') {
            try {
                this.charts[chartName].destroy();
            } catch (error) {
                console.error(`Error destroying ${chartName} chart:`, error);
            }
        }
        this.charts[chartName] = null;
    });
    this.charts = {};
}
    countStatus(devices) {
        const statusCounts = {
            'Đang sử dụng': 0,
            'Bảo trì': 0,
            'Hỏng': 0,
            'Ngừng sử dụng': 0
        };

        devices.forEach(device => {
            if (statusCounts.hasOwnProperty(device.tinh_trang)) {
                statusCounts[device.tinh_trang]++;
            } else {
                statusCounts['Đang sử dụng']++;
            }
        });

        return statusCounts;
    }

    groupByDecade(devices) {
        const decades = {};
        
        devices.forEach(device => {
            if (device.nam_san_xuat) {
                const decade = Math.floor(device.nam_san_xuat / 10) * 10;
                const decadeLabel = `${decade}s`;
                
                if (!decades[decadeLabel]) {
                    decades[decadeLabel] = 0;
                }
                decades[decadeLabel]++;
            }
        });

        return decades;
    }

    async updateRecentActivities() {
        try {
            const activities = await medicalDB.getRecentActivities(5);
            this.displayActivities(activities);
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    }

    displayActivities(activities) {
        const activityList = document.getElementById('activity-list');
        
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="empty-activity">
                    <p>Chưa có hoạt động nào gần đây</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-meta">
                        <span class="activity-user">${activity.user}</span>
                        <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'create': '➕',
            'update': '✏️', 
            'delete': '🗑️',
            'import': '📥',
            'export': '📤',
            'maintenance': '🔧'
        };
        return icons[type] || '📋';
    }

    formatTime(timestamp) {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffMs = now - activityTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Vừa xong';
        } else if (diffMins < 60) {
            return `${diffMins} phút trước`;
        } else if (diffHours < 24) {
            return `${diffHours} giờ trước`;
        } else if (diffDays === 1) {
            return 'Hôm qua';
        } else if (diffDays < 7) {
            return `${diffDays} ngày trước`;
        } else {
            return activityTime.toLocaleDateString('vi-VN');
        }
    }

    showDeviceModal(device = null) {
        const modal = document.getElementById('device-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('device-form');
        
        if (device) {
            title.textContent = 'Sửa thiết bị';
            form.dataset.editId = device.id;
            
            // Điền form với dữ liệu thiết bị
            document.getElementById('device-name').value = device.ten_thiet_bi;
            document.getElementById('manufacture-year').value = device.nam_san_xuat || '';
            document.getElementById('device-quantity').value = device.so_luong;
            document.getElementById('device-price').value = device.nguyen_gia;
            document.getElementById('device-status').value = device.tinh_trang;
            document.getElementById('device-notes').value = device.ghi_chu || '';
        } else {
            title.textContent = 'Thêm thiết bị mới';
            form.reset();
            delete form.dataset.editId;
        }
        
        modal.style.display = 'block';
    }

    hideDeviceModal() {
        document.getElementById('device-modal').style.display = 'none';
    }

    async saveDevice() {
        const form = document.getElementById('device-form');
        const formData = {
            ten_thiet_bi: document.getElementById('device-name').value.trim(),
            nam_san_xuat: parseInt(document.getElementById('manufacture-year').value) || null,
            so_luong: parseInt(document.getElementById('device-quantity').value) || 1,
            nguyen_gia: parseFloat(document.getElementById('device-price').value) || 0,
            tinh_trang: document.getElementById('device-status').value,
            ghi_chu: document.getElementById('device-notes').value.trim()
        };

        if (!formData.ten_thiet_bi) {
            alert('Vui lòng nhập tên thiết bị');
            return;
        }

        try {
            if (form.dataset.editId) {
                // Cập nhật thiết bị tồn tại
                await medicalDB.updateDevice(parseInt(form.dataset.editId), formData);
                await medicalDB.addActivity({
                    type: 'update',
                    description: `Cập nhật thiết bị: ${formData.ten_thiet_bi}`,
                    user: 'Quản trị viên'
                });
                this.showNotification('Cập nhật thiết bị thành công', 'success');
            } else {
                // Thêm thiết bị mới
                formData.serial_number = `DEV_${Date.now()}`;
                formData.phan_loai = 'DỤNG CỤ Y TẾ';
                formData.phong_ban = 'Khoa Gây mê hồi sức';
                formData.don_vi_tinh = 'cái';
                formData.nhan_vien_ql = 'Quản trị viên';
                formData.ngay_nhap = new Date().toISOString().split('T')[0];
                formData.vi_tri = 'Khoa Gây mê hồi sức';
                formData.is_active = true;
                
                await medicalDB.addDevice(formData);
                await medicalDB.addActivity({
                    type: 'create',
                    description: `Thêm thiết bị mới: ${formData.ten_thiet_bi}`,
                    user: 'Quản trị viên'
                });
                this.showNotification('Thêm thiết bị thành công', 'success');
            }

            this.hideDeviceModal();
            
            // Refresh các tab liên quan
            if (this.currentTab === 'devices' && window.devicesManager) {
                devicesManager.refresh();
            }
            if (this.currentTab === 'dashboard') {
                this.updateDashboard();
            }
            
        } catch (error) {
            console.error('Error saving device:', error);
            this.showNotification('Lỗi khi lưu thiết bị: ' + error.message, 'error');
        }
    }

    logout() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            // Trong ứng dụng thực tế, bạn sẽ xóa token, redirect, etc.
            this.showNotification('Đã đăng xuất', 'info');
            
            // Reload page để reset state
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
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

    // Hủy tất cả charts khi không cần thiết
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Khởi tạo ứng dụng khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MedicalEquipmentApp();
});

// Cleanup khi page unload
window.addEventListener('beforeunload', () => {
    if (window.app && typeof app.destroyCharts === 'function') {
        app.destroyCharts();
    }
});