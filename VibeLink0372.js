class VibeLink0372 {
    constructor() {
        this.currentUser = null;
        this.services = {};
    }

    async init() {
        Parse.initialize("HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA", "ZdoLxgHVvjHTpc0MdAlL5y3idTdbHdmpQ556bDSU");
        Parse.serverURL = 'https://parseapi.back4app.com/';

        // All services
        this.services.encryption = new EncryptionService();
        this.services.auth    = new AuthService(this);
        this.services.profile = new ProfileService(this);
        this.services.posts   = new PostService(this);
        this.services.chat    = new ChatService(this);
        this.services.wallet  = new WalletService(this);
        this.services.communities = new CommunityService(this);
        this.services.events  = new EventService(this);
        this.services.marketplace = new MarketplaceService(this);
        this.services.learning = new LearningService(this);
        this.services.gaming  = new GamingService(this);
        this.services.discovery = new DiscoveryService(this);
        this.services.settings = new SettingsService(this);
        this.services.ar      = new ARService(this);
        this.services.qa      = new QAService(this);
        this.services.ai      = new AIService(this);
        this.services.realtime = new RealtimeManager(this);

        await this.checkAuth();
        this.setupNavigation();
        this.setupEventListeners();
        if (this.currentUser) await this.loadInitialData();
    }

    async checkAuth() {
        this.currentUser = Parse.User.current();
        if (this.currentUser) {
            document.getElementById('auth-section').classList.remove('active');
            document.getElementById('main-section').classList.add('active');
        } else {
            document.getElementById('auth-section').classList.add('active');
            document.getElementById('main-section').classList.remove('active');
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.services.posts.loadFeed(),
            this.services.chat.loadChatRooms(),
            this.services.wallet.displayWalletInfo(),
            this.services.profile.loadProfileData(),
            this.services.communities.loadCommunities(),
            this.services.events.loadEvents(),
            this.services.marketplace.loadItems(),
            this.services.marketplace.loadGigs(),
            this.services.learning.loadCourses(),
            this.services.gaming.loadSessions(),
            this.services.discovery.loadRecommendations(),
            this.services.settings.displaySettings(),
            this.services.ar.loadExperiences(),
            this.services.qa.loadQuestions()
        ]);
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
            });
        });
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                if (section) this.switchSection(section);
            });
        });
        document.getElementById('menu-btn')?.addEventListener('click', () => {
            document.getElementById('slide-menu')?.classList.toggle('hidden');
        });
        document.getElementById('close-menu')?.addEventListener('click', () => {
            document.getElementById('slide-menu')?.classList.add('hidden');
        });
    }

    switchSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${sectionId}-section`)?.classList.add('active');

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-section="${sectionId}"]`)?.classList.add('active');

        const loaders = {
            home:    () => this.services.posts.loadFeed(),
            feed:    () => this.services.posts.loadFeed(),
            profile: () => this.services.profile.loadProfileData(),
            communities: () => this.services.communities.loadCommunities(),
            events:  () => this.services.events.loadEvents(),
            discovery: () => this.services.discovery.loadRecommendations(),
            chat:    () => this.services.chat.loadChatRooms(),
            wallet:  () => this.services.wallet.displayWalletInfo(),
            marketplace: () => { this.services.marketplace.loadItems(); this.services.marketplace.loadGigs(); },
            learning: () => this.services.learning.loadCourses(),
            gaming:  () => this.services.gaming.loadSessions(),
            settings: () => this.services.settings.displaySettings(),
            ar:      () => this.services.ar.loadExperiences(),
            qa:      () => this.services.qa.loadQuestions()
        };
        if (loaders[sectionId]) loaders[sectionId]();
    }

    setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', e => this.handleLogin(e));
        document.getElementById('signupForm')?.addEventListener('submit', e => this.handleSignup(e));
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('logout-menu-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('show-signup')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('login-form').classList.remove('active'); document.getElementById('signup-form').classList.add('active'); });
        document.getElementById('show-login')?.addEventListener('click', e => { e.preventDefault(); document.getElementById('signup-form').classList.remove('active'); document.getElementById('login-form').classList.add('active'); });

        document.getElementById('home-post-btn')?.addEventListener('click', () => {
            const input = document.getElementById('home-post-input');
            if (input.value) this.services.posts.createPost(input.value).then(() => input.value = '');
        });
        document.getElementById('feed-create-post')?.addEventListener('click', () => {
            const input = document.getElementById('feed-post-content');
            if (input.value) this.services.posts.createPost(input.value).then(() => input.value = '');
        });
        document.getElementById('floating-create-btn')?.addEventListener('click', () => {
            const txt = prompt("What's on your mind?");
            if (txt) this.services.posts.createPost(txt);
        });

        document.getElementById('send-message')?.addEventListener('click', () => {
            const input = document.getElementById('message-input');
            if (input.value) this.services.chat.sendMessage(input.value).then(() => input.value = '');
        });
        document.getElementById('send-chat-message')?.addEventListener('click', () => {
            const input = document.getElementById('chat-message-input');
            if (input.value) this.services.chat.sendMessage(input.value).then(() => input.value = '');
        });
        document.getElementById('create-chat-room')?.addEventListener('click', () => {
            const name = prompt('Room name:'); if (name) this.services.chat.createRoom(name);
        });
        document.getElementById('create-audio-room')?.addEventListener('click', () => {
            const name = prompt('Audio room name:'); if (name) this.services.chat.createAudioRoom(name);
        });
        document.getElementById('create-secure-chat')?.addEventListener('click', () => {
            const id = prompt('User ID:'); if (id) this.services.chat.createSecureChat(id);
        });

        const addFunds = () => { const amt = parseFloat(prompt('Amount:')); if (amt) this.services.wallet.addFunds(amt); };
        document.getElementById('add-funds-btn')?.addEventListener('click', addFunds);
        document.getElementById('add-funds-btn-wallet')?.addEventListener('click', addFunds);
        const sendMoney = () => { const id = prompt('Recipient ID:'); const amt = parseFloat(prompt('Amount:')); if (id && amt) this.services.wallet.sendMoney(id, amt); };
        document.getElementById('send-money-btn')?.addEventListener('click', sendMoney);
        document.getElementById('send-money-btn-wallet')?.addEventListener('click', sendMoney);
        const sendTip = () => { const id = prompt('Creator ID:'); const amt = parseFloat(prompt('Amount:')); const msg = prompt('Message:'); if (id && amt) this.services.wallet.sendTip(id, amt, msg); };
        document.getElementById('send-tip-btn')?.addEventListener('click', sendTip);
        document.getElementById('send-tip-btn-wallet')?.addEventListener('click', sendTip);

        document.getElementById('create-community-btn')?.addEventListener('click', () => {
            const name = prompt('Community name:'); const desc = prompt('Description:'); if (name) this.services.communities.createCommunity({ name, description: desc });
        });
        document.getElementById('create-event-btn')?.addEventListener('click', () => {
            const title = prompt('Event title:'); const desc = prompt('Description:'); const date = prompt('Date (YYYY-MM-DD HH:MM):'); const tickets = parseInt(prompt('Tickets:')) || 0;
            if (title && date) this.services.events.createEvent({ title, description: desc, date, tickets, location: 'Online' });
        });
        document.getElementById('start-live-stream-btn')?.addEventListener('click', () => {
            const title = prompt('Stream title:'); if (title) this.services.events.startLiveStream(title);
        });
        document.getElementById('create-listing-btn')?.addEventListener('click', () => {
            const title = prompt('Title:'); const desc = prompt('Description:'); const price = parseFloat(prompt('Price:')); if (title && price) this.services.marketplace.createItem({ title, description: desc, price });
        });
        document.getElementById('create-gig-btn')?.addEventListener('click', () => {
            const skill = prompt('Skill needed:'); const desc = prompt('Description:'); const payment = parseFloat(prompt('Payment:')); if (skill && payment) this.services.marketplace.createGig({ skill, desc, payment });
        });
        document.getElementById('create-course-btn')?.addEventListener('click', () => {
            const title = prompt('Course title:'); const desc = prompt('Description:'); const price = parseFloat(prompt('Price:')); if (title) this.services.learning.createCourse({ title, description: desc, price });
        });
        document.getElementById('create-quiz-btn')?.addEventListener('click', () => {
            const title = prompt('Quiz title:'); const questions = prompt('Questions (JSON array):'); if (title && questions) this.services.learning.createQuiz({ title, questions: JSON.parse(questions), courseId: null });
        });
        document.getElementById('create-game-session-btn')?.addEventListener('click', () => {
            const title = prompt('Game session title:'); const type = prompt('Game type:'); if (title && type) this.services.gaming.createSession({ title, gameType: type });
        });
        document.getElementById('create-tournament-btn')?.addEventListener('click', () => {
            const title = prompt('Tournament title:'); const type = prompt('Game type:'); const max = parseInt(prompt('Max participants:')); if (title && type && max) this.services.gaming.createTournament({ title, gameType: type, max });
        });
        document.getElementById('create-ar-btn')?.addEventListener('click', () => {
            const type = prompt('AR experience type:'); if (type) this.services.ar.createExperience({ type });
        });
        document.getElementById('ask-question-btn')?.addEventListener('click', () => {
            const question = prompt('Your question:'); const topic = prompt('Topic:'); if (question && topic) this.services.qa.askQuestion({ question, topic });
        });
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            const bio = prompt('New bio:'); if (bio) { this.currentUser.set('bio', bio); this.currentUser.save().then(() => this.services.profile.loadProfileData()); }
        });
        document.getElementById('profile-settings-btn')?.addEventListener('click', () => this.switchSection('settings'));
        document.getElementById('export-data-btn')?.addEventListener('click', () => this.services.settings.exportUserData());
        document.getElementById('close-chat')?.addEventListener('click', () => {
            document.getElementById('chat-window')?.classList.add('hidden');
            if (this.services.chat.subscription) this.services.chat.subscription.unsubscribe();
        });
        document.getElementById('close-story')?.addEventListener('click', () => document.getElementById('story-viewer').classList.add('hidden'));
        document.getElementById('search-btn')?.addEventListener('click', () => {
            const query = prompt('Search:'); if (query) this.services.discovery.search(query).then(posts => alert(`Found ${posts.length} posts`));
        });
        document.getElementById('upload-gallery-btn')?.addEventListener('click', () => {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,video/*';
            inp.onchange = async e => { const file = e.target.files[0]; const caption = prompt('Caption:'); if (file && caption) await this.services.profile.uploadToGallery(file, caption); };
            inp.click();
        });
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.profile-pane').forEach(p => p.classList.remove('active'));
                document.getElementById(`profile-${tab.dataset.tab}-tab`)?.classList.add('active');
                if (tab.dataset.tab === 'wallet') this.services.wallet.displayWalletInfo();
            });
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pwd = document.getElementById('loginPassword').value;
        if (!email || !pwd) return showNotification('Enter email and password', 'error');
        try {
            await Parse.User.logIn(email, pwd);
            location.reload();
        } catch (err) { showNotification(err.message, 'error'); }
    }

    async handleSignup(e) {
        e.preventDefault();
        const user = new Parse.User();
        user.set('username', document.getElementById('signupUsername').value);
        user.set('email', document.getElementById('signupEmail').value);
        user.set('password', document.getElementById('signupPassword').value);
        user.set('bio', document.getElementById('signupBio').value);
        try {
            await user.signUp();
            location.reload();
        } catch (err) { showNotification(err.message, 'error'); }
    }

    async logout() {
        await Parse.User.logOut();
        location.reload();
    }
}
window.VibeLink0372 = VibeLink0372;