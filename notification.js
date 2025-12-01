// notification.js - Quản lý thông báo
class NotificationManager {
    constructor() {
        this.moduleName = "NotificationManager";
        this.init();
    }
    
    init() {
        AppEvents.on('app:ready', () => this.setup());
        AppEvents.on('notification:show', (data) => this.showNotification(data));
    }
    
    setup() {
        console.log('✅ NotificationManager ready');
    }
    
    showNotification(data) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${data.type}`;
        notification.innerHTML = `
            <span>${data.message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Style cơ bản
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 10000;
            max-width: 400px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            animation: slideIn 0.3s ease;
        `;
        
        // Màu sắc theo type
        const colors = {
            success: '#27ae60',
            error: '#e74c3c', 
            warning: '#f39c12',
            info: '#3498db'
        };
        
        notification.style.background = colors[data.type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Tự động ẩn sau 5s
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

new NotificationManager();