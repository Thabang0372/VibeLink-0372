class ServiceWorkerManager {
    constructor() { this.registered = false; }
    async initialize() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/service-worker.js');
                this.registered = true;
                console.log('✅ Service Worker registered');
            } catch (error) { console.error('SW registration failed:', error); }
        }
    }
}
window.ServiceWorkerManager = ServiceWorkerManager;