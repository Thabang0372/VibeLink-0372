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
        this.init();
    }

    init() {
        console.log("Initializing VibeLink with database integration...");
        this.setupEventListeners();
        this.renderVibeZones();
        this.checkCurrentUser();
        this.loadInitialData();
        this.registerServiceWorker();
    }

    setupEventListeners() {
        // Auth buttons
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('signupBtn').addEventListener('click', () => this.showAuthModal('signup'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        
        // Auth modal
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForm();
        });
        
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        
        // Post creation
        document.getElementById('createPostBtn').addEventListener('click', () => this.showCreatePostModal());
        document.getElementById('postForm').addEventListener('submit', (e) => this.handleCreatePost(e));
        
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
    }

    renderVibeZones() {
        const zonesGrid = document.getElementById('vibeZonesGrid');
        zonesGrid.innerHTML = '';
        
        this.vibeZones.forEach(zone => {
            const zoneEl = document.createElement('div');
            zoneEl.className = 'vibe-zone';
            zoneEl.innerHTML = `
                <div class="zone-icon">${zone.icon}</div>
                <h4>${zone.title}</h4>
                <p>${zone.desc}</p>
            `;
            zoneEl.addEventListener('click', () => this.handleZoneClick(zone.zone));
            zonesGrid.appendChild(zoneEl);
        });
    }

    async loadInitialData() {
        try {
            // Load posts
            await this.loadPosts();
            
            // If user is logged in, load their profile data
            if (this.currentUser) {
                await this.loadUserProfile();
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
            this.showMessage("Error loading content. Please try again.", "error");
        }
    }

    async loadPosts(filter = 'latest') {
        try {
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            query.include('user');
            query.descending('createdAt');
            
            if (filter === 'popular') {
                query.descending('likes');
            } else if (filter === 'following' && this.currentUser) {
                // For following filter, we would need a follow system
                // This is a placeholder implementation
                const following = this.currentUser.get('following') || [];
                query.containedIn('user', following);
            }
            
            query.limit(20);
            const posts = await query.find();
            
            this.renderPosts(posts);
        } catch (error) {
            console.error("Error loading posts:", error);
            this.showMessage("Error loading posts. Please try again.", "error");
        }
    }

    renderPosts(posts) {
        const postsContainer = document.getElementById('postsContainer');
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
            const user = post.get('user');
            const postEl = document.createElement('div');
            postEl.className = 'post';
            
            postEl.innerHTML = `
                <div class="post-header">
                    <img src="default-avatar.png" alt="Avatar" class="post-avatar">
                    <div class="post-user-info">
                        <div class="post-username">${user ? user.get('username') : 'Unknown User'}</div>
                        <div class="post-time">${this.formatTime(post.createdAt)}</div>
                    </div>
                </div>
                <div class="post-content">
                    ${post.get('content')}
                </div>
                ${post.get('image') ? `<img src="${post.get('image').url()}" class="post-image" alt="Post image">` : ''}
                <div class="post-actions">
                    <button class="post-action like-btn" data-id="${post.id}">
                        <i class="far fa-heart"></i>
                        <span>${post.get('likes') || 0}</span>
                    </button>
                    <button class="post-action comment-btn" data-id="${post.id}">
                        <i class="far fa-comment"></i>
                        <span>${post.get('comments') || 0}</span>
                    </button>
                    <button class="post-action share-btn" data-id="${post.id}">
                        <i class="far fa-share-square"></i>
                        <span>Share</span>
                    </button>
                </div>
            `;
            
            postsContainer.appendChild(postEl);
        });
        
        // Add event listeners to action buttons
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

    async handleCreatePost(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showMessage("Please log in to create a post", "error");
            this.showAuthModal('login');
            return;
        }
        
        const content = document.getElementById('postContent').value;
        const imageFile = document.getElementById('postImage').files[0];
        
        if (!content.trim()) {
            this.showMessage("Post content cannot be empty", "error");
            return;
        }
        
        try {
            const Post = Parse.Object.extend('Post');
            const post = new Post();
            
            post.set('content', content);
            post.set('user', this.currentUser);
            post.set('likes', 0);
            post.set('comments', 0);
            
            if (imageFile) {
                const parseFile = new Parse.File(imageFile.name, imageFile);
                await parseFile.save();
                post.set('image', parseFile);
            }
            
            await post.save();
            
            this.showMessage("Post created successfully!", "success");
            this.closeModals();
            document.getElementById('postForm').reset();
            
            // Reload posts
            this.loadPosts();
            
            // Update user's post count
            this.updateUserPostCount();
            
        } catch (error) {
            console.error("Error creating post:", error);
            this.showMessage("Error creating post. Please try again.", "error");
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const user = await Parse.User.logIn(username, password);
            this.currentUser = user;
            this.showMessage("Login successful!", "success");
            this.updateAuthUI();
            this.closeModals();
            this.loadUserProfile();
        } catch (error) {
            console.error("Login error:", error);
            this.showMessage("Login failed. Please check your credentials.", "error");
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
            this.showMessage("Passwords do not match", "error");
            return;
        }
        
        try {
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
            
            await user.signUp();
            this.currentUser = user;
            this.showMessage("Account created successfully!", "success");
            this.updateAuthUI();
            this.closeModals();
            this.loadUserProfile();
        } catch (error) {
            console.error("Signup error:", error);
            this.showMessage("Signup failed. Please try again.", "error");
        }
    }

    async logout() {
        try {
            await Parse.User.logOut();
            this.currentUser = null;
            this.showMessage("Logged out successfully", "success");
            this.updateAuthUI();
            this.hideUserProfile();
        } catch (error) {
            console.error("Logout error:", error);
            this.showMessage("Logout failed. Please try again.", "error");
        }
    }

    checkCurrentUser() {
        const user = Parse.User.current();
        if (user) {
            this.currentUser = user;
            this.updateAuthUI();
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (this.currentUser) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            signupBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
        }
    }

    showAuthModal(mode) {
        const authModal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const authTitle = document.getElementById('authTitle');
        const authSwitch = document.getElementById('authSwitch');
        
        authModal.style.display = 'flex';
        
        if (mode === 'login') {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            authTitle.textContent = 'Log In to VibeLink';
            authSwitch.innerHTML = 'Don\'t have an account? <a href="#" id="switchToSignup">Sign up</a>';
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            authTitle.textContent = 'Join VibeLink';
            authSwitch.innerHTML = 'Already have an account? <a href="#" id="switchToSignup">Log in</a>';
        }
        
        // Re-add event listener for the switch link
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForm();
        });
    }

    toggleAuthForm() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const authTitle = document.getElementById('authTitle');
        const authSwitch = document.getElementById('authSwitch');
        
        if (loginForm.style.display === 'block') {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            authTitle.textContent = 'Join VibeLink';
            authSwitch.innerHTML = 'Already have an account? <a href="#" id="switchToSignup">Log in</a>';
        } else {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            authTitle.textContent = 'Log In to VibeLink';
            authSwitch.innerHTML = 'Don\'t have an account? <a href="#" id="switchToSignup">Sign up</a>';
        }
        
        // Re-add event listener for the switch link
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthForm();
        });
    }

    showCreatePostModal() {
        if (!this.currentUser) {
            this.showMessage("Please log in to create a post", "error");
            this.showAuthModal('login');
            return;
        }
        
        const modal = document.getElementById('createPostModal');
        modal.style.display = 'flex';
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    handleZoneClick(zone) {
        this.showMessage(`Entering ${zone} zone...`, "success");
        // Here you would implement zone-specific functionality
    }

    handleNavigation(e) {
        e.preventDefault();
        const zone = e.currentTarget.getAttribute('data-zone');
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Handle different navigation zones
        switch(zone) {
            case 'feed':
                this.loadPosts();
                document.getElementById('userProfile').style.display = 'none';
                document.querySelector('.content-feed').style.display = 'block';
                break;
            case 'profile':
                if (this.currentUser) {
                    this.loadUserProfile();
                    document.getElementById('userProfile').style.display = 'block';
                    document.querySelector('.content-feed').style.display = 'none';
                } else {
                    this.showMessage("Please log in to view your profile", "error");
                    this.showAuthModal('login');
                }
                break;
            default:
                this.showMessage(`Navigating to ${zone}...`, "success");
        }
    }

    filterFeed(filter) {
        this.loadPosts(filter);
    }

    async loadUserProfile() {
        if (!this.currentUser) return;
        
        try {
            // Refresh user data
            await this.currentUser.fetch();
            
            // Update profile UI
            document.getElementById('profileUsername').textContent = this.currentUser.get('username');
            document.getElementById('profileBio').textContent = this.currentUser.get('bio') || 'No bio yet';
            document.getElementById('postCount').textContent = this.currentUser.get('postCount') || 0;
            document.getElementById('followerCount').textContent = this.currentUser.get('followerCount') || 0;
            document.getElementById('followingCount').textContent = this.currentUser.get('followingCount') || 0;
            
            // Load user's posts
            await this.loadUserPosts();
            
        } catch (error) {
            console.error("Error loading user profile:", error);
            this.showMessage("Error loading profile. Please try again.", "error");
        }
    }

    async loadUserPosts() {
        if (!this.currentUser) return;
        
        try {
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            query.equalTo('user', this.currentUser);
            query.descending('createdAt');
            const posts = await query.find();
            
            this.renderProfilePosts(posts);
        } catch (error) {
            console.error("Error loading user posts:", error);
        }
    }

    renderProfilePosts(posts) {
        const postsContainer = document.getElementById('profilePostsContainer');
        postsContainer.innerHTML = '';
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <p>You haven't posted anything yet.</p>
                </div>
            `;
            return;
        }
        
        posts.forEach(post => {
            const postEl = document.createElement('div');
            postEl.className = 'post';
            
            postEl.innerHTML = `
                <div class="post-header">
                    <img src="default-avatar.png" alt="Avatar" class="post-avatar">
                    <div class="post-user-info">
                        <div class="post-username">${this.currentUser.get('username')}</div>
                        <div class="post-time">${this.formatTime(post.createdAt)}</div>
                    </div>
                </div>
                <div class="post-content">
                    ${post.get('content')}
                </div>
                ${post.get('image') ? `<img src="${post.get('image').url()}" class="post-image" alt="Post image">` : ''}
                <div class="post-actions">
                    <button class="post-action like-btn" data-id="${post.id}">
                        <i class="far fa-heart"></i>
                        <span>${post.get('likes') || 0}</span>
                    </button>
                    <button class="post-action comment-btn" data-id="${post.id}">
                        <i class="far fa-comment"></i>
                        <span>${post.get('comments') || 0}</span>
                    </button>
                </div>
            `;
            
            postsContainer.appendChild(postEl);
        });
    }

    hideUserProfile() {
        document.getElementById('userProfile').style.display = 'none';
        document.querySelector('.content-feed').style.display = 'block';
    }

    async updateUserPostCount() {
        if (!this.currentUser) return;
        
        try {
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            query.equalTo('user', this.currentUser);
            const postCount = await query.count();
            
            this.currentUser.set('postCount', postCount);
            await this.currentUser.save();
            
            document.getElementById('postCount').textContent = postCount;
        } catch (error) {
            console.error("Error updating post count:", error);
        }
    }

    handleLikePost(e) {
        if (!this.currentUser) {
            this.showMessage("Please log in to like posts", "error");
            this.showAuthModal('login');
            return;
        }
        
        const postId = e.currentTarget.getAttribute('data-id');
        this.showMessage("Liked post!", "success");
        // Here you would implement the actual like functionality
    }

    handleCommentPost(e) {
        if (!this.currentUser) {
            this.showMessage("Please log in to comment", "error");
            this.showAuthModal('login');
            return;
        }
        
        const postId = e.currentTarget.getAttribute('data-id');
        this.showMessage("Comment feature coming soon!", "success");
        // Here you would implement the comment functionality
    }

    handleSharePost(e) {
        const postId = e.currentTarget.getAttribute('data-id');
        
        if (navigator.share) {
            navigator.share({
                title: 'VibeLink Post',
                text: 'Check out this post on VibeLink!',
                url: `${window.location.origin}/post/${postId}`
            })
            .catch(error => {
                console.log('Error sharing:', error);
                this.showMessage("Post link copied to clipboard!", "success");
            });
        } else {
            this.showMessage("Post link copied to clipboard!", "success");
            // Fallback for browsers that don't support Web Share API
        }
    }

    showSettings() {
        this.showMessage("Settings feature coming soon!", "success");
    }

    showLearnMore() {
        this.showMessage("VibeLink 0372® - Where the World Vibe Starts!", "success");
    }

    showMessage(message, type = 'success') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
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

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Use a relative path for GitHub Pages compatibility 
            const swPath = 'service-worker.js';
            
            navigator.serviceWorker.register(swPath)
                .then(registration => {
                    console.log('SW registered successfully: ', registration);
                    
                    // Check if the service worker is actually installed
                    if (registration.installing) {
                        console.log('Service worker installing');
                    } else if (registration.waiting) {
                        console.log('Service worker installed');
                    } else if (registration.active) {
                        console.log('Service worker active');
                    }
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                    
                    // Provide more helpful error message
                    this.showMessage(
                        'Service Worker registration failed. ' +
                        'This might be due to running from file:// or browser restrictions. ' +
                        'The app will still work without offline functionality.',
                        'error'
                    );
                });
        } else {
            console.log('Service Workers are not supported in this browser');
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.vibeLink = new VibeLink();
});