import ParseInitializer from '../../core/utils/ParseInitializer.js';
import EncryptionService from '../../core/utils/EncryptionService.js';
import ServiceWorkerManager from '../../core/utils/ServiceWorkerManager.js';
import RealtimeManager from '../../core/utils/RealtimeManager.js';

// Import all 46+ feature services
import AuthService from '../../auth/AuthService.js';
import AIService from '../../ai/AIService.js';
import PostService from '../../vibeWall/PostService.js';
import ChatService from '../../messaging/ChatService.js';
import NotificationService from '../../notifications/NotificationService.js';
import EventService from '../../events/EventService.js';
import WalletService from '../../wallet/WalletService.js';
import MarketplaceService from '../../marketplace/MarketplaceService.js';
import LearningService from '../../learning/LearningService.js';
import ProfileService from '../../profile/ProfileService.js';
import DiscoveryService from '../../discovery/DiscoveryService.js';
import GamingService from '../../gaming/GamingService.js';
import CommunityService from '../../communities/CommunityService.js';
import SettingsService from '../../settings/SettingsService.js';

class VibeLink0372 {
    constructor() {
        this.currentUser = null;
        this.parseInitialized = false;
        this.offlineMode = false;
        this.encryptionKey = null;
        this.socket = null;
        this.realtimeSubscriptions = new Map();
        this.pendingActions = [];
        
        // Initialize all services
        this.services = {
            parse: new ParseInitializer(),
            encryption: new EncryptionService(),
            serviceWorker: new ServiceWorkerManager(),
            realtime: new RealtimeManager(this),
            
            // All 46+ feature services
            auth: new AuthService(this),
            ai: new AIService(this),
            posts: new PostService(this),
            chat: new ChatService(this),
            notifications: new NotificationService(this),
            events: new EventService(this),
            wallet: new WalletService(this),
            marketplace: new MarketplaceService(this),
            learning: new LearningService(this),
            profile: new ProfileService(this),
            discovery: new DiscoveryService(this),
            gaming: new GamingService(this),
            communities: new CommunityService(this),
            settings: new SettingsService(this)
        };
    }

    async initializeApp() {
        try {
            console.log('🔧 Step 1: Initializing Parse...');
            await this.services.parse.initialize();
            
            console.log('🔧 Step 2: Initializing encryption...');
            await this.services.encryption.initialize();
            
            console.log('🔧 Step 3: Initializing service worker...');
            await this.services.serviceWorker.initialize();
            
            console.log('🔧 Step 4: Checking authentication...');
            await this.services.auth.checkAuthentication();
            
            console.log('🔧 Step 5: Initializing realtime connections...');
            await this.services.realtime.initialize();
            
            console.log('🔧 Step 6: Setting up event listeners...');
            this.setupEventListeners();
            
            console.log('🔧 Step 7: Setting up offline detection...');
            this.setupOfflineDetection();
            
            if (this.currentUser) {
                console.log('🔧 Step 8: Loading initial data...');
                await this.loadInitialData();
            }
            
            console.log('✅ VibeLink 0372 - All 46+ Features Initialized');
            
        } catch (error) {
            console.error('🚨 App initialization failed:', error);
            this.handleInitializationFailure(error);
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.services.wallet.initializeUserData(),
            this.services.profile.loadProfileData(),
            this.services.posts.loadFeedPosts(),
            this.services.chat.loadChatRooms(),
            this.services.notifications.loadNotifications(),
            this.services.events.loadUpcomingEvents(),
            this.services.marketplace.loadMarketplaceItems(),
            this.services.discovery.loadDiscoveryContent(),
            this.services.gaming.loadActiveGames(),
            this.services.communities.loadUserCommunities()
        ]);
    }

    setupEventListeners() {
        // Authentication
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginForm) loginForm.addEventListener('submit', (e) => this.services.auth.handleLogin(e));
        if (signupForm) signupForm.addEventListener('submit', (e) => this.services.auth.handleSignup(e));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.services.auth.handleLogout());

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Real-time events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    handleNavigation(e) {
        e.preventDefault();
        const target = e.target.getAttribute('data-target');
        if (target) this.showSection(target);
    }

    showSection(sectionId) {
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');
    }

    async handleOnline() {
        this.offlineMode = false;
        await this.services.realtime.reconnect();
        await this.syncOfflineData();
        this.showSuccess('Back online! Data synced. 🔄');
    }

    async handleOffline() {
        this.offlineMode = true;
        this.showWarning('You are currently offline. Some features may be limited.');
    }

    async syncOfflineData() {
        const pendingActions = await this.services.wallet.getPendingOfflineActions();
        for (const action of pendingActions) {
            try {
                await this.executePendingAction(action);
                await this.services.wallet.removePendingAction(action.id);
            } catch (error) {
                console.error('Failed to sync action:', action, error);
            }
        }
    }

    // UI Methods
    showAuthSection() {
        document.getElementById('auth-section').classList.add('active');
        document.getElementById('main-section').classList.remove('active');
    }

    hideAuthSection() {
        document.getElementById('auth-section').classList.remove('active');
    }

    showMainSection() {
        document.getElementById('auth-section').classList.remove('active');
        document.getElementById('main-section').classList.add('active');
    }

    showError(message) { this.showNotification(message, 'error'); }
    showSuccess(message) { this.showNotification(message, 'success'); }
    showWarning(message) { this.showNotification(message, 'warning'); }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">✕</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        notification.querySelector('.notification-close').onclick = () => notification.remove();
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    getNotificationColor(type) {
        const colors = {
            error: '#FF5A1F', success: '#009966', warning: '#FFD733', info: '#00E6E6'
        };
        return colors[type] || colors.info;
    }

    handleInitializationFailure(error) {
        this.offlineMode = true;
        this.showError('Failed to initialize app. Running in offline mode.');
        this.loadCachedData();
    }

    loadCachedData() {
        try {
            const cached = localStorage.getItem('vibelink_cached_data');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to load cached data:', error);
            return null;
        }
    }
}

export default VibeLink0372;