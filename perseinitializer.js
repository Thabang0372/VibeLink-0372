import ParseInitializer from '../../core/utils/ParseInitializer.js';
import EncryptionService from '../../core/utils/EncryptionService.js';
import ServiceWorkerManager from '../../core/utils/ServiceWorkerManager.js';
import RealtimeManager from '../../core/utils/RealtimeManager.js';

// Import all services
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
        this.offlineMode = false;
        this.services = {};

        this.services = {
            parse: new ParseInitializer(),
            encryption: new EncryptionService(),
            serviceWorker: new ServiceWorkerManager(),
            realtime: new RealtimeManager(this),
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
            // ✅ FIX: Use correct keys and server URL
            Parse.initialize(
                "HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA",
                "ZdoLxgHVvjHTpc0MdAlL5y3idTdbHdmpQ556bDSU"
            );
            Parse.serverURL = 'https://vibelink0372.b4a.io';

            await this.services.encryption.initialize();
            await this.services.serviceWorker.initialize();
            await this.services.auth.checkAuthentication();
            await this.services.realtime.initialize();
            this.setupEventListeners();
            if (this.currentUser) await this.loadInitialData();
            console.log('✅ VibeLink 0372 ready');
        } catch (error) {
            console.error('🚨 Init failed:', error);
            this.handleInitializationFailure(error);
        }
    }

    // … rest of your class unchanged …
}

export default VibeLink0372;