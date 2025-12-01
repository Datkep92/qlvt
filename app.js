// app.js - App chính cực nhẹ
class MedicalApp {
    constructor() {
        console.log('🚀 Medical Equipment App Starting...');
        this.init();
    }
    
    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    }
    
    start() {
        setTimeout(() => {
            AppEvents.emit('app:ready');
            console.log('✅ App initialized');
        }, 100);
    }
}
class EventBus {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

window.AppEvents = new EventBus();
window.app = new MedicalApp();