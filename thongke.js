// thongke.js - Thống kê và biểu đồ
class ThongKeManager {
    constructor() {
        this.moduleName = "ThongKeManager";
        this.charts = {};
        this.init();
    }
    
    init() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('stats:update', (devices) => this.updateStats(devices));
        AppEvents.on('ui:showStats', () => this.showStats());
    }
    
    setup() {
        console.log('✅ ThongKeManager ready');
    }
    
    updateStats(devices) {
        this.renderStatsCards(devices);
        
        // Chỉ tạo biểu đồ nếu Chart.js available
        if (typeof Chart !== 'undefined') {
            this.updateCharts(devices);
        }
    }
    
    renderStatsCards(devices) {
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;
        
        const total = devices.length;
        const active = devices.filter(d => d.tinh_trang === 'Đang sử dụng').length;
        const maintenance = devices.filter(d => d.tinh_trang === 'Bảo trì').length;
        const broken = devices.filter(d => d.tinh_trang === 'Hỏng').length;
        const totalValue = devices.reduce((sum, device) => sum + (device.nguyen_gia * device.so_luong), 0);
        
        statsContainer.innerHTML = `
            <div class="stats-cards">
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
            </div>
        `;
    }
    
    updateCharts(devices) {
        this.updateStatusChart(devices);
        this.updateDepartmentChart(devices);
    }
    
    updateStatusChart(devices) {
        const container = document.getElementById('status-chart-container');
        if (!container) return;
        
        // Hủy chart cũ nếu có
        if (this.charts.status) {
            this.charts.status.destroy();
        }
        
        const statusCounts = this.countStatus(devices);
        const hasData = Object.values(statusCounts).some(count => count > 0);
        
        if (!hasData) {
            container.innerHTML = '<div class="no-data">Không có dữ liệu</div>';
            return;
        }
        
        container.innerHTML = '<canvas id="status-chart"></canvas>';
        const ctx = document.getElementById('status-chart').getContext('2d');
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#27ae60', '#f39c12', '#e74c3c', '#95a5a6'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    updateDepartmentChart(devices) {
        const container = document.getElementById('department-chart-container');
        if (!container) return;
        
        if (this.charts.department) {
            this.charts.department.destroy();
        }
        
        const deptCounts = this.countByDepartment(devices);
        const hasData = Object.values(deptCounts).some(count => count > 0);
        
        if (!hasData) {
            container.innerHTML = '<div class="no-data">Không có dữ liệu</div>';
            return;
        }
        
        container.innerHTML = '<canvas id="department-chart"></canvas>';
        const ctx = document.getElementById('department-chart').getContext('2d');
        
        this.charts.department = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(deptCounts),
                datasets: [{
                    label: 'Số thiết bị',
                    data: Object.values(deptCounts),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    countStatus(devices) {
        return {
            'Đang sử dụng': devices.filter(d => d.tinh_trang === 'Đang sử dụng').length,
            'Bảo trì': devices.filter(d => d.tinh_trang === 'Bảo trì').length,
            'Hỏng': devices.filter(d => d.tinh_trang === 'Hỏng').length,
            'Ngừng sử dụng': devices.filter(d => d.tinh_trang === 'Ngừng sử dụng').length
        };
    }
    
    countByDepartment(devices) {
        const counts = {};
        devices.forEach(device => {
            const dept = device.phong_ban || 'Chưa phân loại';
            counts[dept] = (counts[dept] || 0) + 1;
        });
        return counts;
    }
    
    showStats() {
        // Hiển thị modal thống kê chi tiết
        AppEvents.emit('ui:showStatsModal');
    }
    
    formatCurrency(amount) {
        if (!amount) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }
}

new ThongKeManager();