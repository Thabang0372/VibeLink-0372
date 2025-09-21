// Initialize Parse
Parse.initialize(
    "8fYdKoHo6nrYd3gZw2acyPlb9mWKQbb8BBOQRCse",
    "xSatMs4hrQbw0PcGzXO1j8s76qoX3uUqfhfl59MQ"
);
Parse.serverURL = 'https://parseapi.back4app.com/parse';

// VibeLink Class with all database integration
class VibeLink {
    constructor() {
        console.log("VibeLink 0372 initialized with Parse backend");
        this.currentUser = null;
        this.vibeZones = [
            { icon: "🏠", title: "Smart Feed", desc: "AI-powered personalized content", zone: "feed" },
            { icon: "🎬", title: "QuickVibes", desc: "Short videos & stories", zone: "quickvibes" },
            { icon: "💬", title: "VibeChat", desc: "Encrypted messaging", zone: "vibechat" },
            { icon: "🔴", title: "Go Live", desc: "Live streaming", zone: "live" },
            { icon: "🛍️", title: "Marketplace", desc: "Buy & sell goods", zone: "marketplace" },
            { icon: "💼", title: "Jobs & Gigs", desc: "Find work opportunities", zone: "jobs" },
            { icon: "🎉", title: "Community & Events", desc: "Local gatherings and events", zone: "events" },
            { icon: "🎓", title: "Growth & Learning", desc: "Courses and skill development", zone: "learn" }
        ];
        this.subscriptions = new Map();
        this.isOnline = true;
        this.loadingMore = false;
        this.init();
    }

    init() {
        console.log("Initializing VibeLink with database integration...");
        this.setupEventListeners();
        this.renderVibeZones();
        this.checkCurrentUser();
        this.loadInitialData();
        this.registerServiceWorker();
        this.setupOfflineDetection();
    }

    setupEventListeners() {
        // Auth buttons
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('signupBtn').addEventListener('click', () => this.showAuthModal('signup'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        
        // Password toggle
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePasswordVisibility());
        document.getElementById('toggleNewPassword').addEventListener('click', () => this.toggleNewPasswordVisibility());
        document.getElementById('toggleConfirmPassword').addEventListener('click', () => this.toggleConfirmPasswordVisibility());
        
        // Auth modal
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForm();
        });
        
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        
        // Forgot password
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
        
        // Social auth buttons
        document.querySelector('.google-auth').addEventListener('click', () => this.handleSocialAuth('google'));
        document.querySelector('.facebook-auth').addEventListener('click', () => this.handleSocialAuth('facebook'));
        
        // Post creation
        document.getElementById('createPostBtn').addEventListener('click', () => this.showCreatePostModal());
        document.getElementById('postForm').addEventListener('submit', (e) => this.handleCreatePost(e));
        
        // Post options
        document.getElementById('addEmojiBtn').addEventListener('click', () => this.showEmojiPicker());
        document.getElementById('addHashtagBtn').addEventListener('click', () => this.addHashtag());
        
        // Image preview handling
        document.getElementById('postImage').addEventListener('change', (e) => this.handleImagePreview(e));
        
        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });
        
        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });
        
        // Feed filter
        document.getElementById('feedFilter').addEventListener('change', (e) => {
            this.filterFeed(e.target.value);
        });
        
        // CTA buttons
        document.getElementById('joinNowBtn').addEventListener('click', () => this.showAuthModal('signup'));
        document.getElementById('learnMoreBtn').addEventListener('click', () => this.showLearnMore());
        
        // Profile editing
        document.getElementById('editProfileBtn').addEventListener('click', () => this.showEditProfileModal());
        document.getElementById('editAvatarBtn').addEventListener('click', () => this.editAvatar());
        
        // Infinite scroll
        window.addEventListener('scroll', () => this.handleInfiniteScroll());
        
        // Follow buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('follow-btn')) {
                this.handleFollow(e.target.dataset.userId);
            }
        });
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const icon = document.getElementById('togglePassword').querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'far fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'far fa-eye';
        }
    }

    toggleNewPasswordVisibility() {
        const passwordInput = document.getElementById('newPassword');
        const icon = document.getElementById('toggleNewPassword').querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'far fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'far fa-eye';
        }
    }

    toggleConfirmPasswordVisibility() {
        const passwordInput = document.getElementById('confirmPassword');
        const icon = document.getElementById('toggleConfirmPassword').querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'far fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'far fa-eye';
        }
    }

    checkCurrentUser() {
        const user = Parse.User.current();
        if (user) {
            this.currentUser = user;
            this.updateAuthUI();
            this.hidePreLogin();
        }
    }

    hidePreLogin() {
        document.getElementById('preLogin').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const userAvatar = document.getElementById('userAvatar');
        
        if (this.currentUser) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            settingsBtn.style.display = 'block';
            
            // Update user avatar if available
            if (this.currentUser.get('avatar')) {
                userAvatar.src = this.currentUser.get('avatar').url();
            }
        } else {
            loginBtn.style.display = 'block';
            signupBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            settingsBtn.style.display = 'none';
            userAvatar.src = 'default-avatar.png';
        }
    }

    renderVibeZones() {
        const zonesGrid = document.getElementById('vibeZonesGrid');
        if (!zonesGrid) return;
        
        zonesGrid.innerHTML = '';
        
        this.vibeZones.forEach(zone => {
            const zoneEl = document.createElement('div');
            zoneEl.className = 'vibe-zone';
            zoneEl.innerHTML = `
                <div class="zone-icon">${zone.icon}</div>
                <div class="zone-info">
                    <h4>${zone.title}</h4>
                    <p>${zone.desc}</p>
                </div>
            `;
            zoneEl.addEventListener('click', () => this.handleZoneClick(zone.zone));
            zonesGrid.appendChild(zoneEl);
        });
    }

    async loadInitialData() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Load posts
            await this.loadPosts();
            
            // If user is logged in, load their profile data
            if (this.currentUser) {
                await this.loadUserProfile();
                this.subscribeToRealTimeUpdates();
            }
            
            // Hide loading screen after a minimum time to prevent flickering
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1000);
        } catch (error) {
            console.error("Error loading initial data:", error);
            this.showToast("Error loading content. Please try again.", "error");
            this.hideLoadingScreen();
        }
    }

    async loadPosts(filter = 'latest') {
        try {
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            query.include('author');
            query.descending('createdAt');
            
            if (filter === 'popular') {
                query.descending('likesCount');
            } else if (filter === 'following' && this.currentUser) {
                const following = this.currentUser.get('following') || [];
                query.containedIn('author', following);
            }
            
            query.limit(20);
            const posts = await query.find();
            
            // If no posts, create sample posts
            if (posts.length === 0) {
                this.createSamplePosts();
            } else {
                this.renderPosts(posts);
            }
        } catch (error) {
            console.error("Error loading posts:", error);
            this.showToast("Error loading posts. Please check your connection.", "error");
            this.createSamplePosts(); // Show sample posts on error
        }
    }

    createSamplePosts() {
        const samplePosts = [
            {
                id: '1',
                content: 'Just launched my new digital art collection! 🎨 So excited to share this with everyone. #DigitalArt #NFT #VibeLink',
                author: { get: (key) => key === 'username' ? 'SarahJohnson' : 'default-avatar.png' },
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                get: (key) => {
                    if (key === 'media') return { url: () => 'https://via.placeholder.com/500x300?text=Digital+Art+Collection' };
                    if (key === 'likesCount') return 124;
                    if (key === 'commentsCount') return 23;
                    return null;
                }
            },
            {
                id: '2',
                content: 'Just posted a new tutorial on building responsive web apps with Parse and JavaScript! Check it out and let me know what you think. #WebDev #Tutorial #JavaScript',
                author: { get: (key) => key === 'username' ? 'TechGuru' : 'default-avatar.png' },
                createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
                get: (key) => {
                    if (key === 'likesCount') return 89;
                    if (key === 'commentsCount') return 15;
                    return null;
                }
            },
            {
                id: '3',
                content: 'Beautiful sunset in Cape Town today! 🌅 This city never ceases to amaze me. #Travel #Sunset #CapeTown',
                author: { get: (key) => key === 'username' ? 'TravelDiaries' : 'default-avatar.png' },
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                get: (key) => {
                    if (key === 'media') return { url: () => 'https://via.placeholder.com/500x300?text=Cape+Town+Sunset' };
                    if (key === 'likesCount') return 267;
                    if (key === 'commentsCount') return 42;
                    return null;
                }
            }
        ];
        
        this.renderPosts(samplePosts);
    }

    renderPosts(posts) {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;
        
        postsContainer.innerHTML = '';
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <p>No posts yet. Be the first to share your vibe!</p>
                </div>
            `;
            return;
        }
        
        posts.forEach(post => {
            const author = post.author;
            const postEl = this.createPostElement(post, author);
            postsContainer.appendChild(postEl);
        });
        
        this.attachPostEventListeners();
    }

    createPostElement(post, author) {
        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.dataset.id = post.id;
        
        const mediaHtml = post.get('media') ? `<img src="${post.get('media').url()}" class="post-image" alt="Post image" loading="lazy">` : '';
        
        postEl.innerHTML = `
            <div class="post-header">
                <img src="${author.get('avatar') ? author.get('avatar').url() : 'default-avatar.png'}" alt="Avatar" class="post-avatar" loading="lazy">
                <div class="post-user-info">
                    <div class="post-username">${author.get('username')}</div>
                    <div class="post-time">${this.formatTime(post.createdAt)}</div>
                </div>
                <button class="follow-btn" data-user-id="${author.get('username')}">Follow</button>
            </div>
            <div class="post-content">
                ${post.content}
            </div>
            ${mediaHtml}
            <div class="post-stats">
                <span>${post.get('likesCount') || 0} likes</span>
                <span>${post.get('commentsCount') || 0} comments</span>
            </div>
            <div class="post-buttons">
                <button class="post-btn like-btn" data-id="${post.id}" data-liked="false">
                    <i class="far fa-heart"></i>
                    <span>Like</span>
                </button>
                <button class="post-btn comment-btn" data-id="${post.id}">
                    <i class="far fa-comment"></i>
                    <span>Comment</span>
                </button>
                <button class="post-btn share-btn" data-id="${post.id}">
                    <i class="far fa-share-square"></i>
                    <span>Share</span>
                </button>
            </div>
            <div class="post-comments" id="comments-${post.id}" style="display: none;">
                <!-- Comments will be loaded here -->
            </div>
        `;
        
        return postEl;
    }

    attachPostEventListeners() {
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleLikePost(e));
        });
        
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCommentPost(e));
        });
        
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSharePost(e));
        });
    }

    async handleLikePost(e) {
        if (!this.currentUser) {
            this.showToast("Please log in to like posts", "error");
            this.showAuthModal('login');
            return;
        }
        
        const postId = e.currentTarget.getAttribute('data-id');
        const isLiked = e.currentTarget.getAttribute('data-liked') === 'true';
        
        try {
            // Simulate like action
            const likeIcon = e.currentTarget.querySelector('i');
            const likeCountSpan = e.currentTarget.querySelector('span');
            
            if (isLiked) {
                likeIcon.className = 'far fa-heart';
                likeCountSpan.textContent = 'Like';
                e.currentTarget.setAttribute('data-liked', 'false');
            } else {
                likeIcon.className = 'fas fa-heart';
                likeCountSpan.textContent = 'Liked';
                e.currentTarget.setAttribute('data-liked', 'true');
            }
            
            this.showToast(isLiked ? "Post unliked" : "Post liked", "success");
        } catch (error) {
            console.error("Error liking post:", error);
            this.showToast("Error liking post. Please try again.", "error");
        }
    }

    async handleCommentPost(e) {
        if (!this.currentUser) {
            this.showToast("Please log in to comment", "error");
            this.showAuthModal('login');
            return;
        }
        
        const postId = e.currentTarget.getAttribute('data-id');
        this.showToast("Comment functionality opened", "info");
        // Implement comment functionality here
    }

    async handleSharePost(e) {
        const postId = e.currentTarget.getAttribute('data-id');
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'VibeLink Post',
                    text: 'Check out this post on VibeLink!',
                    url: window.location.href
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            this.showToast("Share link copied to clipboard", "success");
        }
    }

    async handleFollow(userId) {
        if (!this.currentUser) {
            this.showToast("Please log in to follow users", "error");
            this.showAuthModal('login');
            return;
        }
        
        try {
            // Simulate follow action
            this.showToast(`Following ${userId}`, "success");
        } catch (error) {
            console.error("Error following user:", error);
            this.showToast("Error following user. Please try again.", "error");
        }
    }

    async handleCreatePost(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showToast("Please log in to create a post", "error");
            this.showAuthModal('login');
            return;
        }
        
        const content = document.getElementById('postContent').value;
        const imageFile = document.getElementById('postImage').files[0];
        const privacy = document.getElementById('postPrivacy').value;
        
        if (!content.trim()) {
            this.showToast("Post content cannot be empty", "error");
            return;
        }
        
        try {
            const Post = Parse.Object.extend('Post');
            const post = new Post();
            
            post.set('content', content);
            post.set('author', this.currentUser);
            post.set('likesCount', 0);
            post.set('commentsCount', 0);
            post.set('viewsCount', 0);
            post.set('privacy', privacy);
            post.set('aiSuggested', false);
            
            const hashtags = content.match(/#\w+/g) || [];
            post.set('tags', hashtags.map(tag => tag.substring(1)));
            
            if (imageFile) {
                const parseFile = new Parse.File(imageFile.name, imageFile);
                await parseFile.save();
                post.set('media', parseFile);
                post.set('mediaType', 'image');
            }
            
            await post.save();
            
            this.showToast("Post created successfully!", "success");
            this.closeModals();
            document.getElementById('postForm').reset();
            document.getElementById('imagePreview').style.display = 'none';
            
            this.loadPosts();
            this.updateUserPostCount();
            
        } catch (error) {
            console.error("Error creating post:", error);
            this.showToast("Error creating post. Please try again.", "error");
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const stayLoggedIn = document.getElementById('stayLoggedIn').checked;
        
        try {
            this.showLoadingScreen();
            const user = await Parse.User.logIn(username, password);
            this.currentUser = user;
            
            if (stayLoggedIn) {
                // Implement stay logged in logic
                localStorage.setItem('vibelink_stayLoggedIn', 'true');
            }
            
            this.showToast("Login successful!", "success");
            this.hidePreLogin();
            this.updateAuthUI();
            this.closeModals();
            await this.loadUserProfile();
            this.subscribeToRealTimeUpdates();
            this.hideLoadingScreen();
        } catch (error) {
            console.error("Login error:", error);
            this.showToast("Login failed. Please check your credentials.", "error");
            this.hideLoadingScreen();
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showToast("Passwords do not match", "error");
            return;
        }
        
        if (password.length < 6) {
            this.showToast("Password must be at least 6 characters", "error");
            return;
        }
        
        try {
            this.showLoadingScreen();
            const user = new Parse.User();
            user.set('username', username);
            user.set('password', password);
            user.set('email', email);
            user.set('fullname', fullname);
            user.set('avatar', 'default-avatar.png');
            user.set('bio', 'New VibeLink user');
            user.set('postCount', 0);
            user.set('followerCount', 0);
            user.set('followingCount', 0);
            user.set('skills', []);
            user.set('interests', []);
            user.set('badges', []);
            user.set('achievements', []);
            user.set('nfts', []);
            user.set('layoutSkin', 'default');
            user.set('privacySettings', {
                profile: 'public',
                messages: 'everyone',
                notifications: true
            });
            
            await user.signUp();
            this.currentUser = user;
            this.showToast("Account created successfully!", "success");
            this.updateAuthUI();
            this.closeModals();
            await this.loadUserProfile();
            this.subscribeToRealTimeUpdates();
            this.hideLoadingScreen();
        } catch (error) {
            console.error("Signup error:", error);
            this.showToast(`Signup failed: ${error.message}`, "error");
            this.hideLoadingScreen();
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            const swPath = '/service-worker.js';
            
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('SW registered successfully with scope: ', registration.scope);
                    
                    if (registration.installing) {
                        console.log('Service worker installing');
                    } else if (registration.waiting) {
                        console.log('Service worker installed');
                    } else if (registration.active) {
                        console.log('Service worker active');
                    }
                })
                .catch(registrationError => {
                    console.error('SW registration failed: ', registrationError);
                    this.showToast(
                        'Offline functionality unavailable. App will still work normally.',
                        'error'
                    );
                });
        }
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            document.getElementById('offlineIndicator').style.display = 'none';
            this.showToast("You're back online", "success");
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            document.getElementById('offlineIndicator').style.display = 'block';
            this.showToast("You're offline. Some features may not work.", "error");
        });
        
        if (!navigator.onLine) {
            this.isOnline = false;
            document.getElementById('offlineIndicator').style.display = 'block';
        }
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
            </div>
            <div class="toast-content">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        });
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    showLoadingScreen() {
        document.getElementById('loadingScreen').classList.remove('hidden');
    }

    hideLoadingScreen() {
        document.getElementById('loadingScreen').classList.add('hidden');
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ago`;
        } else if (hours > 0) {
            return `${hours}h ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return 'Just now';
        }
    }

    // Other methods for navigation, modals, etc. remain similar to your original code
    // Implement them as needed for full functionality
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.vibeLink = new VibeLink();
});