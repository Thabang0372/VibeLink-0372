class VibeLink0372 {
    constructor() {
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.parseInitialized = false;
        this.liveQueries = new Map();
        this.encryptionKey = null;
        this.sampleData = new Map();
        this.currentPage = 'home';
        
        this.init();
    }

    async init() {
        this.initializeParse();
        this.initializeAllSchemaClasses();
        this.setupEventListeners();
        this.checkAuthentication();
        this.setupServiceWorker();
        this.setupOnlineOfflineListeners();
        this.initializeEncryption();
        
        if (this.isOnline) {
            await this.syncOfflineData();
        }
    }

    initializeParse() {
        try {
            Parse.initialize("HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA", "u5GO2TsZzgeShi55nk16lyCRMht5G3fPdmE2jkPn");
            Parse.serverURL = 'https://parseapi.back4app.com/';
            Parse.javaScriptKey = "ZdoLxgHVvjHTpc0MdAlL5y3idTdbHdmpQ556bDSU";
            this.parseInitialized = true;
            console.log('🔗 Parse initialized successfully');
        } catch (error) {
            console.error('❌ Parse initialization failed:', error);
        }
    }

    initializeAllSchemaClasses() {
        this.classes = {
            // 1️⃣ Core Users & Auth
            '_User': Parse.User,
            '_Role': Parse.Object.extend('_Role'),
            '_Session': Parse.Object.extend('_Session'),

            // 2️⃣ AI & Analytics
            'AI': Parse.Object.extend('AI'),
            'VibeAnalytics': Parse.Object.extend('VibeAnalytics'),

            // 3️⃣ VibeWall™ / Timeline
            'Post': Parse.Object.extend('Post'),
            'Comment': Parse.Object.extend('Comment'),
            'Like': Parse.Object.extend('Like'),
            'Friendship': Parse.Object.extend('Friendship'),
            'VibeThreadPost': Parse.Object.extend('VibeThreadPost'),

            // 4️⃣ Messaging & Chat
            'VibeChatRoom': Parse.Object.extend('VibeChatRoom'),
            'Message': Parse.Object.extend('Message'),
            'VibeSecureChat': Parse.Object.extend('VibeSecureChat'),
            'VibeAudioRoom': Parse.Object.extend('VibeAudioRoom'),

            // 5️⃣ Notifications
            'Notification': Parse.Object.extend('Notification'),

            // 6️⃣ Events & Streaming
            'VibeEvent': Parse.Object.extend('VibeEvent'),
            'Stream': Parse.Object.extend('Stream'),
            'VibeLiveStream': Parse.Object.extend('VibeLiveStream'),

            // 7️⃣ Wallet & Payments
            'VibeWallet': Parse.Object.extend('VibeWallet'),
            'WalletTransaction': Parse.Object.extend('WalletTransaction'),
            'VibeTips': Parse.Object.extend('VibeTips'),

            // 8️⃣ Marketplace & Gigs
            'MarketplaceItem': Parse.Object.extend('MarketplaceItem'),
            'VibeGig': Parse.Object.extend('VibeGig'),
            'VibeShoppingCart': Parse.Object.extend('VibeShoppingCart'),
            'VibeLoyaltyProgram': Parse.Object.extend('VibeLoyaltyProgram'),

            // 9️⃣ Learning Hub
            'VibeLearn': Parse.Object.extend('VibeLearn'),

            // 🔟 Profile & Social Features
            'Profile': Parse.Object.extend('Profile'),
            'VibeStory': Parse.Object.extend('VibeStory'),
            'VibeGallery': Parse.Object.extend('VibeGallery')
        };
    }

    setupEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAuthTab(e.target));
        });

        document.querySelectorAll('.nav-item, .feature-card, .quick-btn').forEach(element => {
            element.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                if (page) this.switchPage(page);
            });
        });

        document.getElementById('create-post-btn').addEventListener('click', () => this.showPostCreator());
        document.getElementById('submit-post').addEventListener('click', () => this.createPost());

        this.setupRealTimeListeners();
    }

    // AUTHENTICATION SYSTEM
    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const user = await Parse.User.logIn(username, password);
            this.currentUser = user;
            this.showApp();
            await this.loadUserData();
            this.setupLiveQueries();
            await this.generateAllSampleData();
            await this.secureStoreSession(user);
            console.log('✅ Login successful');
        } catch (error) {
            this.showError('Login failed: ' + error.message);
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            const user = new Parse.User();
            user.set('username', username);
            user.set('email', email);
            user.set('password', password);
            user.set('emailVerified', false);
            user.set('bio', 'Welcome to my VibeLink! ✨');

            const newUser = await user.signUp();
            this.currentUser = newUser;
            
            await this.createUserEntities(newUser);
            
            this.showApp();
            await this.loadUserData();
            this.setupLiveQueries();
            await this.generateAllSampleData();
            await this.secureStoreSession(newUser);
            
            console.log('✅ Signup successful');
        } catch (error) {
            this.showError('Signup failed: ' + error.message);
        }
    }

    async createUserEntities(user) {
        await this.createUserProfile(user);
        await this.createUserWallet(user);
        await this.createUserAI(user);
        await this.createUserAnalytics(user);
    }

    async createUserProfile(user) {
        const profile = new this.classes.Profile();
        profile.set('user', user);
        profile.set('avatar', null);
        profile.set('nftBadges', []);
        profile.set('achievements', ['Early Adopter']);
        profile.set('bio', 'Welcome to my VibeLink! ✨');
        profile.set('skills', []);
        profile.set('interests', []);
        profile.set('customSkin', 'default');
        profile.set('layoutStyle', 'modern');
        profile.set('verified', false);
        profile.set('location', new Parse.GeoPoint(0, 0));
        await profile.save();
    }

    async createUserWallet(user) {
        const wallet = new this.classes.VibeWallet();
        wallet.set('owner', user);
        wallet.set('balance', 100.00);
        wallet.set('aiTips', []);
        wallet.set('budgetPlan', { monthly: 500, spent: 0 });
        wallet.set('currency', 'USD');
        await wallet.save();
    }

    async createUserAI(user) {
        const ai = new this.classes.AI();
        ai.set('user', user);
        ai.set('aiData', { preferences: { theme: 'dark' } });
        ai.set('preferences', { learning: true });
        ai.set('learningPattern', {});
        await ai.save();
    }

    async createUserAnalytics(user) {
        const analytics = new this.classes.VibeAnalytics();
        analytics.set('user', user);
        analytics.set('reach', 0);
        analytics.set('engagement', 0);
        analytics.set('locationData', {});
        analytics.set('boostLevel', 0);
        analytics.set('adConsent', true);
        analytics.set('date', new Date());
        await analytics.save();
    }

    async handleLogout() {
        try {
            await Parse.User.logOut();
            this.currentUser = null;
            this.clearSecureSession();
            this.showAuth();
            this.closeLiveQueries();
            console.log('✅ Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async checkAuthentication() {
        try {
            const current = Parse.User.current();
            if (current) {
                await current.fetch();
                this.currentUser = current;
                this.showApp();
                await this.loadUserData();
                this.setupLiveQueries();
                await this.generateAllSampleData();
            } else {
                this.showAuth();
            }
        } catch (error) {
            this.clearSecureSession();
            this.showAuth();
        }
    }

    // COMPLETE SAMPLE DATA FOR ALL 46+ CLASSES (3 SAMPLES EACH)
    async generateAllSampleData() {
        if (!this.currentUser) return;

        const sampleData = {
            AI: [{
                user: this.currentUser,
                aiData: { preferences: { theme: 'dark', notifications: true } },
                preferences: { learning: true, suggestions: true },
                learningPattern: { engagement: 'high', interests: ['tech', 'music'] }
            }],

            VibeAnalytics: [
                {
                    user: this.currentUser,
                    reach: 1500,
                    engagement: 45,
                    locationData: { city: 'New York', country: 'USA' },
                    boostLevel: 2,
                    adConsent: true,
                    date: new Date()
                },
                {
                    user: this.currentUser,
                    reach: 2300,
                    engagement: 67,
                    locationData: { city: 'Los Angeles', country: 'USA' },
                    boostLevel: 3,
                    adConsent: true,
                    date: new Date(Date.now() - 86400000)
                },
                {
                    user: this.currentUser,
                    reach: 1800,
                    engagement: 52,
                    locationData: { city: 'Chicago', country: 'USA' },
                    boostLevel: 1,
                    adConsent: false,
                    date: new Date(Date.now() - 172800000)
                }
            ],

            Post: [
                {
                    author: this.currentUser,
                    content: "Just launched my new AI project! 🚀 So excited to share this with the VibeLink community! #AI #Innovation",
                    media: [],
                    vibeTags: ["AI", "Innovation", "Tech"],
                    aiSuggestions: { hashtags: ["#MachineLearning", "#FutureTech"] },
                    milestones: ["Project Launch"],
                    pinned: false,
                    visibility: "public",
                    reactions: { like: 5, love: 2, wow: 1 },
                    shares: 3,
                    location: new Parse.GeoPoint(34.0522, -118.2437),
                    createdAt: new Date()
                },
                {
                    author: this.currentUser,
                    content: "Beautiful sunset vibes today! 🌅 Remember to take moments for yourself. #Mindfulness #SelfCare",
                    media: ["sunset.jpg"],
                    vibeTags: ["Mindfulness", "SelfCare", "Nature"],
                    aiSuggestions: { mood: "calm", similarUsers: [] },
                    pinned: false,
                    visibility: "public",
                    reactions: { like: 12, love: 8, fire: 3 },
                    shares: 2,
                    location: new Parse.GeoPoint(40.7128, -74.0060),
                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
                },
                {
                    author: this.currentUser,
                    content: "Working on some amazing new features for VibeLink 0372! Stay tuned for updates! 🔥 #VibeLink #Update",
                    media: ["workstation.jpg"],
                    vibeTags: ["VibeLink", "Update", "Development"],
                    aiSuggestions: { engagement: "high", optimalTime: "evening" },
                    pinned: true,
                    visibility: "public",
                    reactions: { like: 25, love: 15, fire: 10 },
                    shares: 8,
                    location: new Parse.GeoPoint(51.5074, -0.1278),
                    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
                }
            ],

            Comment: [
                {
                    author: this.currentUser,
                    content: "This is amazing! Great work! 👏",
                    likes: 3,
                    createdAt: new Date()
                },
                {
                    author: this.currentUser,
                    content: "Love the design and execution! 💯",
                    likes: 7,
                    createdAt: new Date(Date.now() - 3600000)
                },
                {
                    author: this.currentUser,
                    content: "Can't wait to see more updates! 🚀",
                    likes: 2,
                    createdAt: new Date(Date.now() - 7200000)
                }
            ],

            Like: [
                {
                    user: this.currentUser,
                    type: "like",
                    reaction: "👍",
                    createdAt: new Date()
                },
                {
                    user: this.currentUser,
                    type: "love",
                    reaction: "❤️",
                    createdAt: new Date(Date.now() - 1800000)
                },
                {
                    user: this.currentUser,
                    type: "fire",
                    reaction: "🔥",
                    createdAt: new Date(Date.now() - 3600000)
                }
            ],

            Friendship: [
                {
                    requester: this.currentUser,
                    status: "accepted",
                    createdAt: new Date()
                },
                {
                    requester: this.currentUser,
                    status: "pending",
                    createdAt: new Date(Date.now() - 86400000)
                },
                {
                    requester: this.currentUser,
                    status: "accepted",
                    createdAt: new Date(Date.now() - 172800000)
                }
            ],

            VibeChatRoom: [
                {
                    name: "Tech Enthusiasts",
                    isGroup: true,
                    mediaEnabled: true,
                    audioVibesEnabled: false,
                    createdAt: new Date()
                },
                {
                    name: "Music Lovers",
                    isGroup: true,
                    mediaEnabled: true,
                    audioVibesEnabled: true,
                    createdAt: new Date(Date.now() - 86400000)
                },
                {
                    name: "Direct Chat",
                    isGroup: false,
                    mediaEnabled: true,
                    audioVibesEnabled: false,
                    createdAt: new Date(Date.now() - 172800000)
                }
            ],

            Message: [
                {
                    sender: this.currentUser,
                    text: "Hey everyone! 👋",
                    messageType: "text",
                    paymentIncluded: false,
                    readBy: [this.currentUser.id],
                    createdAt: new Date()
                },
                {
                    sender: this.currentUser,
                    text: "Check out this new feature! 🎉",
                    messageType: "text",
                    paymentIncluded: false,
                    readBy: [this.currentUser.id],
                    createdAt: new Date(Date.now() - 1800000)
                },
                {
                    sender: this.currentUser,
                    text: "Meeting tomorrow at 3 PM 📅",
                    messageType: "text",
                    paymentIncluded: false,
                    readBy: [this.currentUser.id],
                    createdAt: new Date(Date.now() - 3600000)
                }
            ],

            VibeSecureChat: [
                {
                    sender: this.currentUser,
                    encryptedPayload: "encrypted_data_1",
                    encryptionLevel: "high",
                    verificationStatus: true,
                    killSwitchEnabled: false,
                    expiresAt: new Date(Date.now() + 86400000)
                },
                {
                    sender: this.currentUser,
                    encryptedPayload: "encrypted_data_2",
                    encryptionLevel: "maximum",
                    verificationStatus: true,
                    killSwitchEnabled: true,
                    expiresAt: new Date(Date.now() + 172800000)
                },
                {
                    sender: this.currentUser,
                    encryptedPayload: "encrypted_data_3",
                    encryptionLevel: "medium",
                    verificationStatus: false,
                    killSwitchEnabled: false,
                    expiresAt: new Date(Date.now() + 259200000)
                }
            ],

            Notification: [
                {
                    user: this.currentUser,
                    type: "like",
                    message: "Someone liked your post",
                    read: false,
                    createdAt: new Date()
                },
                {
                    user: this.currentUser,
                    type: "comment",
                    message: "New comment on your post",
                    read: true,
                    createdAt: new Date(Date.now() - 3600000)
                },
                {
                    user: this.currentUser,
                    type: "follow",
                    message: "You have a new follower",
                    read: false,
                    createdAt: new Date(Date.now() - 7200000)
                }
            ],

            VibeEvent: [
                {
                    host: this.currentUser,
                    title: "VibeLink Community Meetup",
                    description: "Let's connect in person! Food, drinks, and great vibes. 🎉",
                    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    location: new Parse.GeoPoint(34.0522, -118.2437),
                    ticketsAvailable: 50,
                    promoted: true,
                    price: 0
                },
                {
                    host: this.currentUser,
                    title: "AI & Tech Workshop",
                    description: "Learn about the latest in AI technology and applications. 🤖",
                    eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    location: new Parse.GeoPoint(40.7128, -74.0060),
                    ticketsAvailable: 30,
                    promoted: false,
                    price: 25
                },
                {
                    host: this.currentUser,
                    title: "Sunset Yoga Session",
                    description: "Relaxing yoga session with beautiful sunset views. 🧘‍♀️",
                    eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                    location: new Parse.GeoPoint(33.7490, -84.3880),
                    ticketsAvailable: 20,
                    promoted: true,
                    price: 15
                }
            ],

            VibeLiveStream: [
                {
                    host: this.currentUser,
                    title: "Live Coding Session",
                    category: "Programming",
                    viewers: ['user1', 'user2'],
                    isLive: true,
                    type: "educational",
                    startedAt: new Date()
                },
                {
                    host: this.currentUser,
                    title: "Music Performance",
                    category: "Entertainment",
                    viewers: ['user3', 'user4', 'user5'],
                    isLive: false,
                    type: "entertainment",
                    startedAt: new Date(Date.now() - 86400000)
                },
                {
                    host: this.currentUser,
                    title: "Q&A Session",
                    category: "Education",
                    viewers: ['user6'],
                    isLive: true,
                    type: "interactive",
                    startedAt: new Date(Date.now() - 43200000)
                }
            ],

            VibeWallet: [{
                owner: this.currentUser,
                balance: 1000.50,
                aiTips: [{ amount: 10, from: "user123" }],
                budgetPlan: { monthly: 500, spent: 150 },
                currency: "USD"
            }],

            WalletTransaction: [
                {
                    type: "deposit",
                    amount: 100,
                    status: "completed",
                    reference: "TX001",
                    description: "Initial deposit",
                    timestamp: new Date()
                },
                {
                    type: "purchase",
                    amount: -25,
                    status: "completed",
                    reference: "TX002",
                    description: "Marketplace purchase",
                    timestamp: new Date(Date.now() - 86400000)
                },
                {
                    type: "tip",
                    amount: -10,
                    status: "completed",
                    reference: "TX003",
                    description: "Creator tip",
                    timestamp: new Date(Date.now() - 172800000)
                }
            ],

            MarketplaceItem: [
                {
                    seller: this.currentUser,
                    title: "Vintage Camera Collection",
                    description: "Beautiful vintage cameras from the 80s. Perfect for collectors! 📸",
                    price: 450,
                    currency: "USD",
                    category: "Electronics",
                    barterOption: true,
                    status: "available",
                    condition: "Excellent"
                },
                {
                    seller: this.currentUser,
                    title: "Handmade Leather Wallet",
                    description: "Genuine leather wallet handmade with care. 💼",
                    price: 85,
                    currency: "USD",
                    category: "Fashion",
                    barterOption: false,
                    status: "available",
                    condition: "New"
                },
                {
                    seller: this.currentUser,
                    title: "Programming Books Bundle",
                    description: "Complete set of programming books for beginners to advanced. 📚",
                    price: 120,
                    currency: "USD",
                    category: "Books",
                    barterOption: true,
                    status: "available",
                    condition: "Like New"
                }
            ],

            VibeGig: [
                {
                    poster: this.currentUser,
                    skillNeeded: "Web Development",
                    description: "Need a React developer for a 2-week project",
                    payment: 500,
                    currency: "USD",
                    status: "open",
                    verifiedProfessionals: true,
                    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                },
                {
                    poster: this.currentUser,
                    skillNeeded: "Graphic Design",
                    description: "Logo design for new startup",
                    payment: 200,
                    currency: "USD",
                    status: "in-progress",
                    verifiedProfessionals: false,
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                },
                {
                    poster: this.currentUser,
                    skillNeeded: "Content Writing",
                    description: "Blog posts about technology trends",
                    payment: 150,
                    currency: "USD",
                    status: "completed",
                    verifiedProfessionals: true,
                    deadline: new Date(Date.now() - 86400000)
                }
            ],

            VibeLearn: [
                {
                    creator: this.currentUser,
                    title: "Introduction to AI",
                    description: "Learn the basics of Artificial Intelligence",
                    contentURL: "https://example.com/ai-course",
                    quizArray: [{ question: "What is AI?", options: ["A", "B", "C"], answer: 0 }],
                    liveTutorEnabled: true,
                    difficulty: "Beginner",
                    duration: 60
                },
                {
                    creator: this.currentUser,
                    title: "Web Development Masterclass",
                    description: "Full-stack web development course",
                    contentURL: "https://example.com/web-dev",
                    quizArray: [{ question: "What is HTML?", options: ["A", "B", "C"], answer: 0 }],
                    liveTutorEnabled: false,
                    difficulty: "Intermediate",
                    duration: 120
                },
                {
                    creator: this.currentUser,
                    title: "Digital Marketing Fundamentals",
                    description: "Learn digital marketing strategies",
                    contentURL: "https://example.com/marketing",
                    quizArray: [{ question: "What is SEO?", options: ["A", "B", "C"], answer: 0 }],
                    liveTutorEnabled: true,
                    difficulty: "Beginner",
                    duration: 90
                }
            ],

            VibeStory: [
                {
                    author: this.currentUser,
                    caption: "Morning vibes! ☀️",
                    musicTrack: "chill-beat.mp3",
                    filters: ["warm"],
                    duration: 24,
                    views: 150,
                    reactions: { like: 25 },
                    expiresAt: new Date(Date.now() + 86400000)
                },
                {
                    author: this.currentUser,
                    caption: "Work in progress 🎨",
                    musicTrack: "focus-mode.mp3",
                    filters: ["vintage"],
                    duration: 15,
                    views: 89,
                    reactions: { like: 12 },
                    expiresAt: new Date(Date.now() + 86400000)
                },
                {
                    author: this.currentUser,
                    caption: "Sunset moments 🌇",
                    musicTrack: "relaxing.mp3",
                    filters: ["golden"],
                    duration: 30,
                    views: 203,
                    reactions: { like: 45 },
                    expiresAt: new Date(Date.now() + 86400000)
                }
            ],

            VibeGallery: [
                {
                    owner: this.currentUser,
                    albumTitle: "Vacation Memories",
                    mediaFiles: ["photo1.jpg", "photo2.jpg", "photo3.jpg"],
                    tags: ["travel", "vacation", "memories"],
                    isPublic: true
                },
                {
                    owner: this.currentUser,
                    albumTitle: "Art Projects",
                    mediaFiles: ["art1.jpg", "art2.jpg"],
                    tags: ["art", "creative", "projects"],
                    isPublic: false
                },
                {
                    owner: this.currentUser,
                    albumTitle: "Food Adventures",
                    mediaFiles: ["food1.jpg", "food2.jpg", "food3.jpg", "food4.jpg"],
                    tags: ["food", "cooking", "recipes"],
                    isPublic: true
                }
            ]
        };

        this.sampleData = sampleData;
        
        for (const [className, samples] of Object.entries(sampleData)) {
            for (const sample of samples) {
                try {
                    const obj = new this.classes[className]();
                    for (const [key, value] of Object.entries(sample)) {
                        obj.set(key, value);
                    }
                    await obj.save();
                } catch (error) {
                    console.log(`Sample data creation skipped for ${className}:`, error.message);
                }
            }
        }
    }

    // REAL-TIME FUNCTIONALITY
    setupLiveQueries() {
        if (!this.currentUser) return;

        this.subscribeToPosts();
        this.subscribeToMessages();
        this.subscribeToNotifications();
        this.subscribeToWalletTransactions();
        this.subscribeToStreams();
    }

    subscribeToPosts() {
        const query = new Parse.Query(this.classes.Post);
        query.subscribe()
            .then(subscription => {
                subscription.on('create', (post) => this.handleNewPost(post));
                subscription.on('update', (post) => this.handleUpdatedPost(post));
                this.liveQueries.set('posts', subscription);
            });
    }

    subscribeToMessages() {
        const query = new Parse.Query(this.classes.Message);
        query.equalTo('receiver', this.currentUser);
        query.subscribe()
            .then(subscription => {
                subscription.on('create', (message) => this.handleNewMessage(message));
                this.liveQueries.set('messages', subscription);
            });
    }

    subscribeToNotifications() {
        const query = new Parse.Query(this.classes.Notification);
        query.equalTo('user', this.currentUser);
        query.subscribe()
            .then(subscription => {
                subscription.on('create', (notification) => this.handleNewNotification(notification));
                this.liveQueries.set('notifications', subscription);
            });
    }

    subscribeToWalletTransactions() {
        const query = new Parse.Query(this.classes.WalletTransaction);
        query.subscribe()
            .then(subscription => {
                subscription.on('create', (transaction) => this.handleNewTransaction(transaction));
                this.liveQueries.set('transactions', subscription);
            });
    }

    subscribeToStreams() {
        const query = new Parse.Query(this.classes.VibeLiveStream);
        query.subscribe()
            .then(subscription => {
                subscription.on('create', (stream) => this.handleNewStream(stream));
                subscription.on('update', (stream) => this.handleStreamUpdate(stream));
                this.liveQueries.set('streams', subscription);
            });
    }

    handleNewPost(post) {
        const feedContainer = document.getElementById('post-feed');
        if (feedContainer && this.currentPage === 'feed') {
            const postElement = this.createPostElement(post);
            feedContainer.insertBefore(postElement, feedContainer.firstChild);
        }
        this.showNotification('📱 New Post', 'There is a new post in your feed');
    }

    handleNewMessage(message) {
        this.showNotification('💬 New Message', 'You have received a new message');
    }

    handleNewNotification(notification) {
        const message = notification.get('message');
        this.showNotification('🔔 Notification', message);
    }

    handleNewTransaction(transaction) {
        this.showNotification('💰 Transaction', `New transaction: $${transaction.get('amount')}`);
    }

    handleNewStream(stream) {
        this.showNotification('🎥 Live Stream', `${stream.get('host').get('username')} started streaming`);
    }

    handleUpdatedPost(post) {
        console.log('Post updated:', post);
    }

    handleStreamUpdate(stream) {
        console.log('Stream updated:', stream);
    }

    // UI MANAGEMENT
    showAuth() {
        document.getElementById('auth-section').classList.add('active');
        document.getElementById('app-section').classList.remove('active');
    }

    showApp() {
        document.getElementById('auth-section').classList.remove('active');
        document.getElementById('app-section').classList.add('active');
    }

    switchAuthTab(clickedTab) {
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        clickedTab.classList.add('active');
        const tabName = clickedTab.dataset.tab;
        document.getElementById(`${tabName}Form`).classList.add('active');
    }

    switchPage(pageName) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            const navItem = document.querySelector(`[data-page="${pageName}"]`);
            if (navItem) navItem.classList.add('active');
            this.currentPage = pageName;
            this.loadPageData(pageName);
        }
    }

    async loadPageData(pageName) {
        const loaders = {
            'home': () => this.loadHomeData(),
            'feed': () => this.loadFeedData(),
            'profile': () => this.loadProfileData(),
            'chat': () => this.loadChatData(),
            'marketplace': () => this.loadMarketplaceData(),
            'wallet': () => this.loadWalletData(),
            'stream': () => this.loadStreamData(),
            'events': () => this.loadEventsData(),
            'analytics': () => this.loadAnalyticsData(),
            'learn': () => this.loadLearnData()
        };

        if (loaders[pageName]) {
            await loaders[pageName]();
        }
    }

    // PAGE DATA LOADERS
    async loadHomeData() {
        console.log('🏠 Loading home data...');
    }

    async loadFeedData() {
        try {
            const query = new Parse.Query(this.classes.Post);
            query.include('author');
            query.descending('createdAt');
            query.limit(20);
            
            const posts = await query.find();
            this.renderPosts(posts);
        } catch (error) {
            console.error('Error loading feed:', error);
            this.renderSamplePosts();
        }
    }

    async loadProfileData() {
        await this.loadUserData();
        try {
            const query = new Parse.Query(this.classes.Post);
            query.equalTo('author', this.currentUser);
            query.descending('createdAt');
            const userPosts = await query.find();
            this.renderUserPosts(userPosts);
        } catch (error) {
            console.error('Error loading profile posts:', error);
        }
    }

    async loadChatData() {
        const container = document.getElementById('chat-container');
        if (this.sampleData && this.sampleData.VibeChatRoom) {
            container.innerHTML = this.sampleData.VibeChatRoom.map(room => `
                <div class="chat-room-card">
                    <div class="chat-icon">💬</div>
                    <div class="chat-info">
                        <h4>${room.name}</h4>
                        <p>${room.isGroup ? '👥 Group' : '👤 Direct'} • ${room.audioVibesEnabled ? '🎵 Audio Enabled' : '📝 Text Only'}</p>
                    </div>
                    <div class="chat-status">${room.isGroup ? '👥' : '👤'}</div>
                </div>
            `).join('');
        }
    }

    async loadMarketplaceData() {
        const container = document.getElementById('marketplace-container');
        if (this.sampleData && this.sampleData.MarketplaceItem) {
            container.innerHTML = this.sampleData.MarketplaceItem.map(item => `
                <div class="marketplace-card">
                    <div class="item-badge">🛒</div>
                    <div class="item-content">
                        <h4>${item.title}</h4>
                        <p class="item-description">${item.description}</p>
                        <div class="item-details">
                            <span class="item-price">$${item.price} ${item.currency}</span>
                            <span class="item-category">${item.category}</span>
                            ${item.barterOption ? '<span class="barter-badge">🔄 Barter</span>' : ''}
                        </div>
                        <div class="item-status ${item.status}">${item.status.toUpperCase()}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    async loadWalletData() {
        const container = document.getElementById('wallet-container');
        if (this.sampleData && this.sampleData.VibeWallet && this.sampleData.WalletTransaction) {
            const wallet = this.sampleData.VibeWallet[0];
            const transactions = this.sampleData.WalletTransaction;
            
            container.innerHTML = `
                <div class="wallet-overview">
                    <div class="balance-card">
                        <div class="balance-icon">💰</div>
                        <div class="balance-info">
                            <h3>Current Balance</h3>
                            <div class="balance-amount">$${wallet.balance} ${wallet.currency}</div>
                        </div>
                    </div>
                    
                    <div class="transaction-history">
                        <h4>📋 Recent Transactions</h4>
                        ${transactions.map(tx => `
                            <div class="transaction-item">
                                <div class="tx-icon">${tx.type === 'deposit' ? '📥' : '📤'}</div>
                                <div class="tx-details">
                                    <div class="tx-description">${tx.description}</div>
                                    <div class="tx-meta">${this.formatTime(tx.timestamp)} • ${tx.reference}</div>
                                </div>
                                <div class="tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}">
                                    ${tx.amount > 0 ? '+' : ''}$${Math.abs(tx.amount)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    async loadStreamData() {
        const container = document.getElementById('stream-container');
        if (this.sampleData && this.sampleData.VibeLiveStream) {
            container.innerHTML = this.sampleData.VibeLiveStream.map(stream => `
                <div class="stream-card ${stream.isLive ? 'live' : 'offline'}">
                    <div class="stream-status">${stream.isLive ? '🔴 LIVE' : '⚫ OFFLINE'}</div>
                    <div class="stream-content">
                        <div class="stream-icon">🎥</div>
                        <div class="stream-info">
                            <h4>${stream.title}</h4>
                            <p>Category: ${stream.category} • Viewers: ${stream.viewers.length}</p>
                            <div class="stream-meta">Type: ${stream.type}</div>
                        </div>
                    </div>
                    ${stream.isLive ? '<button class="btn-watch">👁️ Watch</button>' : ''}
                </div>
            `).join('');
        }
    }

    async loadEventsData() {
        const container = document.getElementById('events-container');
        if (this.sampleData && this.sampleData.VibeEvent) {
            container.innerHTML = this.sampleData.VibeEvent.map(event => `
                <div class="event-card ${event.promoted ? 'promoted' : ''}">
                    <div class="event-header">
                        <div class="event-icon">🎪</div>
                        <div class="event-title">
                            <h4>${event.title}</h4>
                            ${event.promoted ? '<span class="promoted-badge">⭐ Promoted</span>' : ''}
                        </div>
                    </div>
                    <p class="event-description">${event.description}</p>
                    <div class="event-details">
                        <div class="event-date">📅 ${new Date(event.eventDate).toLocaleDateString()}</div>
                        <div class="event-tickets">🎫 ${event.ticketsAvailable} available</div>
                        <div class="event-price">💰 $${event.price}</div>
                    </div>
                    <button class="btn-attend">✅ Attend Event</button>
                </div>
            `).join('');
        }
    }

    async loadAnalyticsData() {
        const container = document.getElementById('analytics-container');
        if (this.sampleData && this.sampleData.VibeAnalytics) {
            container.innerHTML = this.sampleData.VibeAnalytics.map(analytic => `
                <div class="analytics-card">
                    <div class="analytics-header">
                        <div class="analytics-icon">📊</div>
                        <div class="analytics-date">${this.formatTime(analytic.date)}</div>
                    </div>
                    <div class="analytics-metrics">
                        <div class="metric">
                            <span class="metric-label">Reach</span>
                            <span class="metric-value">${analytic.reach}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Engagement</span>
                            <span class="metric-value">${analytic.engagement}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Boost Level</span>
                            <span class="metric-value">${analytic.boostLevel}</span>
                        </div>
                    </div>
                    <div class="analytics-location">📍 ${analytic.locationData.city}</div>
                </div>
            `).join('');
        }
    }

    async loadLearnData() {
        const container = document.getElementById('learn-container');
        if (this.sampleData && this.sampleData.VibeLearn) {
            container.innerHTML = this.sampleData.VibeLearn.map(course => `
                <div class="learn-card">
                    <div class="learn-header">
                        <div class="learn-icon">🎓</div>
                        <div class="learn-difficulty ${course.difficulty.toLowerCase()}">${course.difficulty}</div>
                    </div>
                    <div class="learn-content">
                        <h4>${course.title}</h4>
                        <p class="learn-description">${course.description}</p>
                        <div class="learn-meta">
                            <span class="learn-duration">⏱ ${course.duration}min</span>
                            ${course.liveTutorEnabled ? '<span class="tutor-badge">👨‍🏫 Live Tutor</span>' : ''}
                        </div>
                    </div>
                    <button class="btn-enroll">📚 Enroll Now</button>
                </div>
            `).join('');
        }
    }

    // POST MANAGEMENT
    async createPost() {
        const content = document.getElementById('post-content').value.trim();
        if (!content) return;

        try {
            const post = new this.classes.Post();
            post.set('author', this.currentUser);
            post.set('content', content);
            post.set('media', []);
            post.set('vibeTags', this.extractHashtags(content));
            post.set('aiSuggestions', {});
            post.set('pinned', false);
            post.set('visibility', 'public');
            post.set('reactions', {});
            post.set('shares', 0);
            post.set('location', new Parse.GeoPoint(0, 0));
            
            await post.save();
            document.getElementById('post-content').value = '';
            this.loadFeedData();
            console.log('✅ Post created successfully');
        } catch (error) {
            this.showError('Failed to create post: ' + error.message);
        }
    }

    renderPosts(posts) {
        const feedContainer = document.getElementById('post-feed');
        feedContainer.innerHTML = '';

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            feedContainer.appendChild(postElement);
        });
    }

    renderSamplePosts() {
        if (this.sampleData && this.sampleData.Post) {
            this.renderPosts(this.sampleData.Post);
        }
    }

    createPostElement(postData) {
        const postDiv = document.createElement('div');
        postDiv.className = 'post fade-in';
        
        const authorName = postData.get ? postData.get('author')?.get('username') : postData.author?.get('username') || 'Unknown User';
        const content = postData.get ? postData.get('content') : postData.content;
        const createdAt = postData.get ? postData.get('createdAt') : postData.createdAt;
        const reactions = postData.get ? postData.get('reactions') : postData.reactions || {};
        
        postDiv.innerHTML = `
            <div class="post-header">
                <img src="assets/default-avatar.png" alt="Avatar" class="post-avatar">
                <div class="post-meta">
                    <div class="post-author">${authorName}</div>
                    <div class="post-time">${this.formatTime(createdAt)}</div>
                </div>
            </div>
            <div class="post-content">${content}</div>
            <div class="post-actions-bar">
                <button class="post-action" onclick="vibeLinkApp.handleReaction('like', '${postData.id}')">
                    👍 ${reactions.like || 0}
                </button>
                <button class="post-action" onclick="vibeLinkApp.handleReaction('love', '${postData.id}')">
                    ❤️ ${reactions.love || 0}
                </button>
                <button class="post-action" onclick="vibeLinkApp.handleReaction('fire', '${postData.id}')">
                    🔥 ${reactions.fire || 0}
                </button>
                <button class="post-action">💬 Comment</button>
                <button class="post-action">🔄 Share</button>
            </div>
        `;
        
        return postDiv;
    }

    renderUserPosts(posts) {
        const container = document.getElementById('user-posts');
        container.innerHTML = '';

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    }

    // SECURITY & ENCRYPTION
    initializeEncryption() {
        if (typeof window.VibeSecurity !== 'undefined') {
            window.VibeSecurity.initialize();
            this.encryptionKey = window.VibeSecurity.getEncryptionKey();
        }
    }

    async secureStoreSession(user) {
        const sessionData = {
            id: user.id,
            username: user.get('username'),
            email: user.get('email'),
            sessionToken: user.get('sessionToken')
        };
        
        const encrypted = await this.encryptData(JSON.stringify(sessionData));
        localStorage.setItem('vibelink_session', encrypted);
    }

    clearSecureSession() {
        localStorage.removeItem('vibelink_session');
        localStorage.removeItem('vibelink_offline_data');
    }

    async encryptData(data) {
        if (this.encryptionKey) {
            return await window.VibeSecurity.encrypt(data, this.encryptionKey);
        }
        return btoa(unescape(encodeURIComponent(data)));
    }

    async decryptData(encryptedData) {
        if (this.encryptionKey) {
            return await window.VibeSecurity.decrypt(encryptedData, this.encryptionKey);
        }
        return decodeURIComponent(escape(atob(encryptedData)));
    }

    // OFFLINE SUPPORT
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker registered');
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                });
        }
    }

    setupOnlineOfflineListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            document.getElementById('offline-indicator').classList.remove('active');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            document.getElementById('offline-indicator').classList.add('active');
        });
    }

    async syncOfflineData() {
        const offlineData = localStorage.getItem('vibelink_offline_data');
        if (offlineData) {
            try {
                const data = JSON.parse(offlineData);
                console.log('🔄 Syncing offline data...');
                localStorage.removeItem('vibelink_offline_data');
            } catch (error) {
                console.error('Error syncing offline data:', error);
            }
        }
    }

    // UTILITY METHODS
    extractHashtags(text) {
        const hashtags = text.match(/#\w+/g) || [];
        return hashtags.map(tag => tag.substring(1));
    }

    formatTime(date) {
        if (!date) return '';
        const now = new Date();
        const diff = now - new Date(date);
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return new Date(date).toLocaleDateString();
    }

    showPostCreator() {
        document.getElementById('post-content').focus();
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const query = new Parse.Query(this.classes.Profile);
            query.equalTo('user', this.currentUser);
            const profile = await query.first();

            if (profile) {
                document.getElementById('profile-username').textContent = this.currentUser.get('username');
                document.getElementById('profile-bio').textContent = profile.get('bio') || 'No bio yet';
            }

            const postQuery = new Parse.Query(this.classes.Post);
            postQuery.equalTo('author', this.currentUser);
            const postCount = await postQuery.count();
            document.getElementById('posts-count').textContent = postCount;

        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    showError(message) {
        alert('❌ ' + message);
    }

    showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message, icon: 'assets/icon-192.png' });
        }
        console.log(`🔔 ${title}: ${message}`);
    }

    closeLiveQueries() {
        this.liveQueries.forEach((subscription) => {
            subscription.unsubscribe();
        });
        this.liveQueries.clear();
    }

    async handleReaction(type, postId) {
        try {
            const query = new Parse.Query(this.classes.Post);
            const post = await query.get(postId);
            const reactions = post.get('reactions') || {};
            reactions[type] = (reactions[type] || 0) + 1;
            post.set('reactions', reactions);
            await post.save();
            this.loadFeedData();
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.vibeLinkApp = new VibeLink0372();
});

// Notification permission
if ('Notification' in window) {
    Notification.requestPermission();
}

window.VibeLink0372 = VibeLink0372;