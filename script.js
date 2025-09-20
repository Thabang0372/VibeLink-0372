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
        this.subscriptions = new Map(); // For real-time subscriptions
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
                // For following filter, we would need a follow system
                const following = this.currentUser.get('following') || [];
                query.containedIn('author', following);
            }
            
            query.limit(20);
            const posts = await query.find();
            
            this.renderPosts(posts);
        } catch (error) {
            console.error("Error loading posts:", error);
            this.showToast("Error loading posts. Please try again.", "error");
        }
    }

    renderPosts(posts) {
        const postsContainer = document.getElementById('postsContainer');
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <p>No posts yet. Be the first to share your vibe!</p>
                </div>
            `;
            return;
        }
        
        posts.forEach(post => {
            const author = post.get('author');
            const postEl = this.createPostElement(post, author);
            postsContainer.appendChild(postEl);
        });
        
        this.attachPostEventListeners();
    }

    createPostElement(post, author) {
        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.dataset.id = post.id;
        
        postEl.innerHTML = `
            <div class="post-header">
                <img src="${author.get('avatar') ? author.get('avatar').url() : 'default-avatar.png'}" alt="Avatar" class="post-avatar">
                <div class="post-user-info">
                    <div class="post-username">${author ? author.get('username') : 'Unknown User'}</div>
                    <div class="post-time">${this.formatTime(post.createdAt)}</div>
                </div>
            </div>
            <div class="post-content">
                ${post.get('content')}
            </div>
            ${post.get('media') ? `<img src="${post.get('media').url()}" class="post-image" alt="Post image">` : ''}
            <div class="post-actions">
                <button class="post-action like-btn" data-id="${post.id}" data-liked="${this.currentUser && this.hasUserLiked(post)}">
                    <i class="${this.currentUser && this.hasUserLiked(post) ? 'fas' : 'far'} fa-heart"></i>
                    <span>${post.get('likesCount') || 0}</span>
                </button>
                <button class="post-action comment-btn" data-id="${post.id}">
                    <i class="far fa-comment"></i>
                    <span>${post.get('commentsCount') || 0}</span>
                </button>
                <button class="post-action share-btn" data-id="${post.id}">
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
            
            // Extract hashtags from content
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
            
            // Reload posts
            this.loadPosts();
            
            // Update user's post count
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
        
        try {
            this.showLoadingScreen();
            const user = await Parse.User.logIn(username, password);
            this.currentUser = user;
            this.showToast("Login successful!", "success");
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

    async handleForgotPassword() {
        const email = document.getElementById('username').value || document.getElementById('email').value;
        
        if (!email) {
            this.showToast("Please enter your email address", "error");
            return;
        }
        
        try {
            await Parse.User.requestPasswordReset(email);
            this.showToast("Password reset instructions sent to your email", "success");
        } catch (error) {
            console.error("Password reset error:", error);
            this.showToast("Error sending password reset. Please check your email.", "error");
        }
    }

    async handleSocialAuth(provider) {
        this.showToast(`${provider} authentication coming soon!`, "info");
        // Implementation for social auth would go here
    }

    async logout() {
        try {
            // Unsubscribe from real-time updates
            this.unsubscribeFromRealTimeUpdates();
            
            await Parse.User.logOut();
            this.currentUser = null;
            this.showToast("Logged out successfully", "success");
            this.updateAuthUI();
            this.hideUserProfile();
        } catch (error) {
            console.error("Logout error:", error);
            this.showToast("Logout failed. Please try again.", "error");
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
        const settingsBtn = document.getElementById('settingsBtn');
        
        if (this.currentUser) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            settingsBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            signupBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            settingsBtn.style.display = 'block';
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
            this.showToast("Please log in to create a post", "error");
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
        this.showToast(`Entering ${zone} zone...`, "success");
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
                document.getElementById('exploreSection').style.display = 'none';
                document.getElementById('notificationsSection').style.display = 'none';
                document.getElementById('messagesSection').style.display = 'none';
                break;
            case 'search':
                document.getElementById('userProfile').style.display = 'none';
                document.querySelector('.content-feed').style.display = 'none';
                document.getElementById('exploreSection').style.display = 'block';
                document.getElementById('notificationsSection').style.display = 'none';
                document.getElementById('messagesSection').style.display = 'none';
                this.showToast("Explore feature coming soon!", "info");
                break;
            case 'notifications':
                document.getElementById('userProfile').style.display = 'none';
                document.querySelector('.content-feed').style.display = 'none';
                document.getElementById('exploreSection').style.display = 'none';
                document.getElementById('notificationsSection').style.display = 'block';
                document.getElementById('messagesSection').style.display = 'none';
                this.loadNotifications();
                break;
            case 'messages':
                document.getElementById('userProfile').style.display = 'none';
                document.querySelector('.content-feed').style.display = 'none';
                document.getElementById('exploreSection').style.display = 'none';
                document.getElementById('notificationsSection').style.display = 'none';
                document.getElementById('messagesSection').style.display = 'block';
                this.loadMessages();
                break;
            case 'profile':
                if (this.currentUser) {
                    this.loadUserProfile();
                    document.getElementById('userProfile').style.display = 'block';
                    document.querySelector('.content-feed').style.display = 'none';
                    document.getElementById('exploreSection').style.display = 'none';
                    document.getElementById('notificationsSection').style.display = 'none';
                    document.getElementById('messagesSection').style.display = 'none';
                } else {
                    this.showToast("Please log in to view your profile", "error");
                    this.showAuthModal('login');
                }
                break;
            default:
                this.showToast(`Navigating to ${zone}...`, "success");
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
            
            // Set avatar if available
            const avatarUrl = this.currentUser.get('avatar') ? this.currentUser.get('avatar').url() : 'default-avatar.png';
            document.getElementById('userAvatar').src = avatarUrl;
            
            // Load user's posts
            await this.loadUserPosts();
            
        } catch (error) {
            console.error("Error loading user profile:", error);
            this.showToast("Error loading profile. Please try again.", "error");
        }
    }

    async loadUserPosts() {
        if (!this.currentUser) return;
        
        try {
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            query.equalTo('author', this.currentUser);
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
            const postEl = this.createPostElement(post, this.currentUser);
            postsContainer.appendChild(postEl);
        });
        
        this.attachPostEventListeners();
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
            query.equalTo('author', this.currentUser);
            const postCount = await query.count();
            
            this.currentUser.set('postCount', postCount);
            await this.currentUser.save();
            
            document.getElementById('postCount').textContent = postCount;
        } catch (error) {
            console.error("Error updating post count:", error);
        }
    }

    hasUserLiked(post) {
        // This would check if the current user has liked the post
        // For now, return false as we don't have this data structure
        return false;
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
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            const post = await query.get(postId);
            
            if (isLiked) {
                // Unlike the post
                post.increment('likesCount', -1);
                // Remove user from likes array (if implemented)
            } else {
                // Like the post
                post.increment('likesCount', 1);
                // Add user to likes array (if implemented)
            }
            
            await post.save();
            
            // Update UI
            const likeCountSpan = e.currentTarget.querySelector('span');
            const likeIcon = e.currentTarget.querySelector('i');
            
            if (isLiked) {
                likeCountSpan.textContent = parseInt(likeCountSpan.textContent) - 1;
                likeIcon.className = 'far fa-heart';
                e.currentTarget.setAttribute('data-liked', 'false');
            } else {
                likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;
                likeIcon.className = 'fas fa-heart';
                e.currentTarget.setAttribute('data-liked', 'true');
            }
            
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
        const commentsContainer = document.getElementById(`comments-${postId}`);
        
        // Toggle comments visibility
        if (commentsContainer.style.display === 'none') {
            commentsContainer.style.display = 'block';
            await this.loadComments(postId);
        } else {
            commentsContainer.style.display = 'none';
        }
    }

    async loadComments(postId) {
        try {
            const Comment = Parse.Object.extend('Comment');
            const query = new Parse.Query(Comment);
            query.equalTo('post', { __type: 'Pointer', className: 'Post', objectId: postId });
            query.include('author');
            query.ascending('createdAt');
            
            const comments = await query.find();
            
            const commentsContainer = document.getElementById(`comments-${postId}`);
            commentsContainer.innerHTML = '';
            
            if (comments.length === 0) {
                commentsContainer.innerHTML = '<p>No comments yet.</p>';
                return;
            }
            
            comments.forEach(comment => {
                const commentEl = document.createElement('div');
                commentEl.className = 'comment';
                
                const author = comment.get('author');
                commentEl.innerHTML = `
                    <div class="comment-header">
                        <img src="${author.get('avatar') ? author.get('avatar').url() : 'default-avatar.png'}" alt="Avatar" class="comment-avatar">
                        <div class="comment-user-info">
                            <div class="comment-username">${author.get('username')}</div>
                            <div class="comment-time">${this.formatTime(comment.createdAt)}</div>
                        </div>
                    </div>
                    <div class="comment-content">
                        ${comment.get('content')}
                    </div>
                `;
                
                commentsContainer.appendChild(commentEl);
            });
            
            // Add comment form
            const commentForm = document.createElement('div');
            commentForm.className = 'comment-form';
            commentForm.innerHTML = `
                <textarea placeholder="Add a comment..." rows="1"></textarea>
                <button class="btn btn-primary">Post</button>
            `;
            
            commentForm.querySelector('button').addEventListener('click', async () => {
                const content = commentForm.querySelector('textarea').value;
                if (content.trim()) {
                    await this.createComment(postId, content);
                    commentForm.querySelector('textarea').value = '';
                    await this.loadComments(postId);
                }
            });
            
            commentsContainer.appendChild(commentForm);
            
        } catch (error) {
            console.error("Error loading comments:", error);
        }
    }

    async createComment(postId, content) {
        try {
            const Comment = Parse.Object.extend('Comment');
            const comment = new Comment();
            
            comment.set('content', content);
            comment.set('author', this.currentUser);
            comment.set('post', { __type: 'Pointer', className: 'Post', objectId: postId });
            comment.set('likesCount', 0);
            
            await comment.save();
            
            // Update post comment count
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            const post = await query.get(postId);
            post.increment('commentsCount', 1);
            await post.save();
            
            // Update UI
            const commentBtn = document.querySelector(`.comment-btn[data-id="${postId}"]`);
            const commentCountSpan = commentBtn.querySelector('span');
            commentCountSpan.textContent = parseInt(commentCountSpan.textContent) + 1;
            
        } catch (error) {
            console.error("Error creating comment:", error);
            this.showToast("Error posting comment. Please try again.", "error");
        }
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
                this.copyToClipboard(`${window.location.origin}/post/${postId}`);
                this.showToast("Post link copied to clipboard!", "success");
            });
        } else {
            this.copyToClipboard(`${window.location.origin}/post/${postId}`);
            this.showToast("Post link copied to clipboard!", "success");
        }
    }

    copyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }

    showSettings() {
        this.showToast("Settings feature coming soon!", "info");
    }

    showLearnMore() {
        this.showToast("VibeLink 0372® - Where the World Vibe Starts!", "info");
    }

    showEditProfileModal() {
        this.showToast("Edit profile feature coming soon!", "info");
    }

    editAvatar() {
        this.showToast("Avatar editing feature coming soon!", "info");
    }

    showEmojiPicker() {
        this.showToast("Emoji picker feature coming soon!", "info");
    }

    addHashtag() {
        const contentTextarea = document.getElementById('postContent');
        contentTextarea.value += ' #';
        contentTextarea.focus();
    }

    handleImagePreview(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        preview.style.display = 'block';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => {
            preview.style.display = 'none';
            document.getElementById('postImage').value = '';
        });
        
        preview.appendChild(img);
        preview.appendChild(removeBtn);
    }

    async loadNotifications() {
        if (!this.currentUser) return;
        
        try {
            const Notification = Parse.Object.extend('VibeNotification');
            const query = new Parse.Query(Notification);
            query.equalTo('recipient', this.currentUser);
            query.descending('createdAt');
            query.limit(20);
            
            const notifications = await query.find();
            this.renderNotifications(notifications);
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    }

    renderNotifications(notifications) {
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationsList.innerHTML = '<p>No notifications yet.</p>';
            return;
        }
        
        notifications.forEach(notification => {
            const notificationEl = document.createElement('div');
            notificationEl.className = 'notification-item';
            notificationEl.innerHTML = `
                <div class="notification-content">${notification.get('message')}</div>
                <div class="notification-time">${this.formatTime(notification.createdAt)}</div>
            `;
            notificationsList.appendChild(notificationEl);
        });
    }

    async loadMessages() {
        if (!this.currentUser) return;
        
        try {
            const Message = Parse.Object.extend('Message');
            const query = new Parse.Query(Message);
            query.equalTo('receiver', this.currentUser);
            query.include('sender');
            query.descending('createdAt');
            query.limit(20);
            
            const messages = await query.find();
            this.renderMessages(messages);
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    }

    renderMessages(messages) {
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<p>No messages yet.</p>';
            return;
        }
        
        messages.forEach(message => {
            const sender = message.get('sender');
            const messageEl = document.createElement('div');
            messageEl.className = 'message-item';
            messageEl.innerHTML = `
                <img src="${sender.get('avatar') ? sender.get('avatar').url() : 'default-avatar.png'}" alt="Avatar" class="message-avatar">
                <div class="message-content">
                    <div class="message-sender">${sender.get('username')}</div>
                    <div class="message-text">${message.get('content')}</div>
                    <div class="message-time">${this.formatTime(message.createdAt)}</div>
                </div>
            `;
            messagesList.appendChild(messageEl);
        });
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
        
        // Remove toast after 5 seconds
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

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            document.getElementById('offlineIndicator').style.display = 'none';
            this.showToast("You're back online", "success");
        });
        
        window.addEventListener('offline', () => {
            document.getElementById('offlineIndicator').style.display = 'block';
            this.showToast("You're offline. Some features may not work.", "error");
        });
        
        // Initial check
        if (!navigator.onLine) {
            document.getElementById('offlineIndicator').style.display = 'block';
        }
    }

    subscribeToRealTimeUpdates() {
        // Subscribe to new posts
        const postQuery = new Parse.Query('Post');
        postQuery.subscribe().then(subscription => {
            this.subscriptions.set('posts', subscription);
            
            subscription.on('create', (post) => {
                this.showToast("New post available!", "info");
                // Add new post to feed
                this.prependPostToFeed(post);
            });
        }).catch(error => {
            console.error("Error subscribing to posts:", error);
        });
        
        // Subscribe to notifications
        const notificationQuery = new Parse.Query('VibeNotification');
        notificationQuery.equalTo('recipient', this.currentUser);
        notificationQuery.subscribe().then(subscription => {
            this.subscriptions.set('notifications', subscription);
            
            subscription.on('create', (notification) => {
                this.showToast(notification.get('message'), "info");
                // Update notification badge
                this.updateNotificationBadge();
            });
        }).catch(error => {
            console.error("Error subscribing to notifications:", error);
        });
    }

    unsubscribeFromRealTimeUpdates() {
        this.subscriptions.forEach((subscription, key) => {
            subscription.unsubscribe();
        });
        this.subscriptions.clear();
    }

    prependPostToFeed(post) {
        const postsContainer = document.getElementById('postsContainer');
        const author = post.get('author');
        
        // If we don't have the author data, fetch it
        if (typeof author.fetch === 'function') {
            author.fetch().then(() => {
                const postEl = this.createPostElement(post, author);
                postsContainer.insertBefore(postEl, postsContainer.firstChild);
                this.attachPostEventListeners();
            });
        } else {
            const postEl = this.createPostElement(post, author);
            postsContainer.insertBefore(postEl, postsContainer.firstChild);
            this.attachPostEventListeners();
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        let count = parseInt(badge.textContent) || 0;
        count++;
        badge.textContent = count;
        badge.style.display = 'block';
    }

    handleInfiniteScroll() {
        const scrollPosition = window.scrollY;
        const documentHeight = document.body.scrollHeight;
        const windowHeight = window.innerHeight;
        
        // Load more posts when user is near the bottom
        if (scrollPosition + windowHeight >= documentHeight - 500) {
            this.loadMorePosts();
        }
    }

    async loadMorePosts() {
        // Prevent multiple simultaneous requests
        if (this.loadingMore) return;
        
        this.loadingMore = true;
        document.getElementById('loadingMorePosts').style.display = 'block';
        
        try {
            const Post = Parse.Object.extend('Post');
            const query = new Parse.Query(Post);
            query.include('author');
            query.descending('createdAt');
            
            // Get the last post currently displayed
            const posts = document.querySelectorAll('.post');
            if (posts.length > 0) {
                const lastPostId = posts[posts.length - 1].dataset.id;
                const lastPost = await query.get(lastPostId);
                query.lessThan('createdAt', lastPost.get('createdAt'));
            }
            
            query.limit(10);
            const newPosts = await query.find();
            
            if (newPosts.length > 0) {
                this.appendPosts(newPosts);
            }
        } catch (error) {
            console.error("Error loading more posts:", error);
        } finally {
            this.loadingMore = false;
            document.getElementById('loadingMorePosts').style.display = 'none';
        }
    }

    appendPosts(posts) {
        const postsContainer = document.getElementById('postsContainer');
        
        posts.forEach(post => {
            const author = post.get('author');
            const postEl = this.createPostElement(post, author);
            postsContainer.appendChild(postEl);
        });
        
        this.attachPostEventListeners();
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
                    this.showToast(
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