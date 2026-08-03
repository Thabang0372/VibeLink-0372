// ============================================
// VibeLink 0372® - Production Script v2.0
// All audit issues resolved
// ============================================

// -------------------- Parse SDK Load with Timeout --------------------
(function loadParseSDK() {
    let retries = 0;
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 300;

    function checkParse() {
        if (typeof Parse !== 'undefined') {
            startApp();
            return;
        }
        retries++;
        if (retries > MAX_RETRIES) {
            document.getElementById('app-loading')?.remove();
            document.body.innerHTML = `
                <div style="text-align:center;padding:2rem;color:#FF5A1F;">
                    <h1>⚠️ VibeLink 0372</h1>
                    <p>Failed to load required SDK. Please check your internet connection and refresh.</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
            console.error('❌ Parse SDK failed to load after', MAX_RETRIES, 'attempts.');
            return;
        }
        setTimeout(checkParse, RETRY_DELAY);
    }
    checkParse();
})();

// -------------------- Start App --------------------
function startApp() {
    // -------------------- Parse Initialization --------------------
    Parse.initialize("HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA", "ZdoLxgHVvjHTpc0MdAlL5y3idTdbHdmpQ556bDSU");
    Parse.serverURL = 'https://vibelink0372.b4a.io';

    // -------------------- DOMPurify (XSS Protection) --------------------
    // Load from CDN if not already present
    if (typeof DOMPurify === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js';
        script.onload = () => console.log('✅ DOMPurify loaded');
        document.head.appendChild(script);
    }
    const sanitize = (text) => {
        if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(text);
        // Fallback: escape HTML
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // -------------------- Global Helpers --------------------
    function showNotification(msg, type = 'success') {
        let n = document.getElementById('notification');
        if (!n) {
            n = document.createElement('div');
            n.id = 'notification';
            n.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;background:#FF5A1F;color:#fff;padding:12px;border-radius:30px;text-align:center;z-index:9999;display:none;';
            document.body.appendChild(n);
        }
        n.textContent = msg;
        n.style.background = type === 'error' ? '#FF5A1F' : type === 'warning' ? '#FFD733' : '#009966';
        n.style.color = type === 'warning' ? '#0D0D0D' : '#fff';
        n.style.display = 'block';
        clearTimeout(n._timeout);
        n._timeout = setTimeout(() => n.style.display = 'none', 3000);
    }

    function formatTime(date) {
        return new Date(date).toLocaleString();
    }

    function displayNameOf(user) {
        if (!user) return 'Unknown';
        if (typeof user === 'string') return user;
        return user.get('displayName') || user.get('username') || 'User';
    }

    let loadingOverlay = null;
    function showLoading() {
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;';
            loadingOverlay.innerHTML = '<div style="background:#1a1a2e;padding:2rem;border-radius:16px;border:1px solid #00E6E6;"><div class="spinner" style="border:4px solid rgba(0,230,230,0.3);border-top-color:#00E6E6;border-radius:50%;width:48px;height:48px;animation:spin 1s linear infinite;margin:0 auto 1rem;"></div><p>Loading...</p></div>';
            document.body.appendChild(loadingOverlay);
            // Inject keyframe if not present
            if (!document.getElementById('spinner-keyframes')) {
                const style = document.createElement('style');
                style.id = 'spinner-keyframes';
                style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }
        }
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    // -------------------- Error Manager --------------------
    const ErrorManager = {
        async handle(error, context = '') {
            console.error(`❌ ${context}:`, error);
            let message = error.message || 'Something went wrong.';
            if (error.code === 209) message = 'Session expired. Please login again.';
            else if (error.code === 206) message = 'You do not have permission.';
            else if (error.message.includes('network')) message = 'Network error. Please check your connection.';
            showNotification(message, 'error');
            // Log to server (if available)
            try {
                await Parse.Cloud.run('logError', { error: message, context, stack: error.stack });
            } catch (e) { /* ignore */ }
            return { message, error };
        }
    };

    // -------------------- Offline Queue --------------------
    class OfflineQueue {
        constructor() {
            this.queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
            this.syncing = false;
            window.addEventListener('online', () => this.sync());
        }
        add(action) {
            action.id = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            action.timestamp = Date.now();
            this.queue.push(action);
            localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
            if (navigator.onLine) this.sync();
        }
        async sync() {
            if (this.syncing || this.queue.length === 0 || !navigator.onLine) return;
            this.syncing = true;
            showNotification(`Syncing ${this.queue.length} offline actions...`, 'info');
            const failed = [];
            for (const action of this.queue) {
                try {
                    if (action.type === 'post') {
                        await Parse.Cloud.run('createPost', { content: action.data });
                    } else if (action.type === 'like') {
                        await Parse.Cloud.run('toggleLike', { postId: action.data.postId });
                    } else if (action.type === 'comment') {
                        await Parse.Cloud.run('addComment', { postId: action.data.postId, text: action.data.text });
                    } else if (action.type === 'message') {
                        await Parse.Cloud.run('sendMessage', { roomId: action.data.roomId, text: action.data.text });
                    } else {
                        throw new Error('Unknown action type');
                    }
                } catch (e) {
                    failed.push(action);
                }
            }
            this.queue = failed;
            localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
            this.syncing = false;
            if (failed.length === 0) {
                showNotification('All offline actions synced! ✅');
            } else {
                showNotification(`${failed.length} actions failed to sync. Will retry later.`, 'warning');
            }
        }
    }
    const offlineQueue = new OfflineQueue();

    // ==================== SECURITY (Password-Derived Key) ====================
    // No master key stored. Key derived from password using PBKDF2 on login.
    class VibeSecurity {
        constructor() {
            this.encryptionKey = null;
            this.initialized = false;
            this.ready = new Promise(resolve => { this._resolveReady = resolve; });
        }
        async deriveKey(password, salt = 'vibelink-salt-0372') {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
            return crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        }
        async setPassword(password) {
            this.encryptionKey = await this.deriveKey(password);
            this.initialized = true;
            this._resolveReady();
        }
        async encrypt(data) {
            await this.ready;
            const enc = new TextEncoder().encode(JSON.stringify(data));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.encryptionKey, enc);
            return { iv: this.arrayBufferToBase64(iv), data: this.arrayBufferToBase64(encrypted) };
        }
        async decrypt(payload) {
            await this.ready;
            const iv = this.base64ToArrayBuffer(payload.iv);
            const data = this.base64ToArrayBuffer(payload.data);
            const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.encryptionKey, data);
            return JSON.parse(new TextDecoder().decode(decrypted));
        }
        arrayBufferToBase64(buffer) {
            const bytes = new Uint8Array(buffer);
            let bin = '';
            for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
            return btoa(bin);
        }
        base64ToArrayBuffer(base64) {
            const bin = atob(base64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return bytes.buffer;
        }
    }
    window.vibeSecurity = new VibeSecurity();

    // ==================== AUTH SERVICE ====================
    class AuthService {
        constructor(app) { this.app = app; }
        async checkAuthentication() {
            try {
                this.app.currentUser = Parse.User.current();
                if (this.app.currentUser) {
                    // Derive encryption key from password (stored in session)
                    const password = sessionStorage.getItem('vibe_password');
                    if (password) {
                        await window.vibeSecurity.setPassword(password);
                        sessionStorage.removeItem('vibe_password');
                    }
                    this.app.showMainSection();
                    this.app.hideAuthSection();
                    await this.app.loadInitialData();
                } else {
                    this.app.showAuthSection();
                    this.app.hideMainSection();
                }
                return this.app.currentUser;
            } catch (e) {
                this.app.showAuthSection();
                return null;
            }
        }
        async handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            if (!email || !password) return showNotification('Enter email and password', 'error');
            showLoading();
            try {
                // Find user by email (username is unique ID)
                const q = new Parse.Query(Parse.User);
                q.equalTo('email', email);
                const user = await q.first({ useMasterKey: false });
                if (!user) throw new Error('No account found with that email.');
                // Log in with username (which is the unique ID)
                const loggedUser = await Parse.User.logIn(user.get('username'), password);
                // Set encryption key
                await window.vibeSecurity.setPassword(password);
                this.app.currentUser = loggedUser;
                this.app.showMainSection();
                this.app.hideAuthSection();
                await this.app.services.wallet.ensureWalletExists();
                await this.app.services.profile.ensureProfileExists();
                await this.app.loadInitialData();
                showNotification('Login successful!');
                hideLoading();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Login');
            }
        }
        async handleSignup(e) {
            e.preventDefault();
            const displayName = document.getElementById('signupUsername')?.value;
            const email = document.getElementById('signupEmail')?.value;
            const password = document.getElementById('signupPassword')?.value;
            const bio = document.getElementById('signupBio')?.value;
            if (!displayName || !email || !password) return showNotification('Fill all fields', 'error');
            showLoading();
            try {
                const user = new Parse.User();
                const uniqueId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                user.set('username', uniqueId);
                user.set('email', email);
                user.set('password', password);
                user.set('displayName', displayName);
                user.set('bio', bio || '');
                user.set('emailVerified', false);
                await user.signUp();
                // Send verification email (Cloud Code)
                await Parse.Cloud.run('sendVerificationEmail', { userId: user.id });
                await window.vibeSecurity.setPassword(password);
                this.app.currentUser = user;
                this.app.showMainSection();
                this.app.hideAuthSection();
                await this.app.services.wallet.ensureWalletExists();
                await this.app.services.profile.ensureProfileExists();
                await this.app.loadInitialData();
                showNotification('Account created! Please verify your email.');
                hideLoading();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Signup');
            }
        }
        async handleSuccessfulLogin(user) { /* handled above */ }
        async handleLogout() {
            await Parse.User.logOut();
            this.app.currentUser = null;
            window.vibeSecurity.encryptionKey = null;
            window.vibeSecurity.initialized = false;
            this.app.showAuthSection();
            this.app.hideMainSection();
            showNotification('Logged out');
        }
    }

    // ==================== PROFILE SERVICE ====================
    class ProfileService {
        constructor(app) { this.app = app; }
        async ensureProfileExists() {
            const Profile = Parse.Object.extend('Profile');
            let p = await new Parse.Query(Profile).equalTo('user', this.app.currentUser).first();
            if (!p) {
                p = new Profile();
                p.set('user', this.app.currentUser);
                p.set('avatar', 'assets/default-avatar.png');
                p.set('bio', this.app.currentUser.get('bio') || 'Welcome!');
                p.set('nftBadges', []);
                p.set('achievements', []);
                p.set('verified', false);
                await p.save();
            }
            return p;
        }
        async loadProfileData() {
            if (!this.app.currentUser) return;
            const user = this.app.currentUser;
            document.getElementById('profile-username-display').textContent = user.get('displayName') || user.get('username');
            document.getElementById('profile-bio-display').textContent = user.get('bio') || 'No bio';
            const stats = await this.getUserStats();
            document.getElementById('profile-posts-count').textContent = `${stats.posts} posts`;
            document.getElementById('profile-followers-count').textContent = `${stats.followers} followers`;
            document.getElementById('profile-following-count').textContent = `${stats.following} following`;
            await this.loadUserPosts();
            await this.loadUserStories();
            await this.loadUserGallery();
        }
        async getUserStats(userId = null) {
            const target = userId ? { __type: 'Pointer', className: '_User', objectId: userId } : this.app.currentUser;
            const posts = await new Parse.Query('Post').equalTo('author', target).count();
            const followers = await new Parse.Query('VibeFollow').equalTo('following', target).count();
            const following = await new Parse.Query('VibeFollow').equalTo('follower', target).count();
            return { posts, followers, following };
        }
        async loadUserPosts(skip = 0, limit = 10) {
            const q = new Parse.Query('Post')
                .equalTo('author', this.app.currentUser)
                .include('author')
                .descending('createdAt')
                .skip(skip)
                .limit(limit);
            const posts = await q.find();
            const container = document.getElementById('user-posts-grid');
            if (container) {
                const html = posts.map(p => `<div class="card"><p>${sanitize(p.get('content'))}</p><small>${formatTime(p.createdAt)}</small></div>`).join('');
                if (skip === 0) container.innerHTML = html;
                else container.innerHTML += html;
                if (posts.length === limit) {
                    const more = document.createElement('button');
                    more.textContent = 'Load More';
                    more.className = 'vibe-button';
                    more.onclick = () => this.loadUserPosts(skip + limit, limit);
                    container.appendChild(more);
                }
            }
            return posts;
        }
        async loadUserStories() {
            const stories = await new Parse.Query('VibeStory')
                .equalTo('author', this.app.currentUser)
                .greaterThan('expiresAt', new Date())
                .include('author')
                .find();
            const container = document.getElementById('stories-container');
            if (container) {
                container.innerHTML = stories.map(s => `<div class="story-item" onclick="window.vibeApp.services.profile.viewStory('${s.id}')"><div class="story-avatar"><img src="${s.get('media')?.url() || 'assets/default-avatar.png'}"></div><span>${sanitize(s.get('content'))}</span></div>`).join('');
            }
        }
        async viewStory(storyId) {
            const story = await new Parse.Query('VibeStory').include('author').get(storyId);
            document.getElementById('story-viewer').classList.remove('hidden');
            document.getElementById('story-username').textContent = story.get('author').get('displayName') || story.get('author').get('username');
            document.getElementById('story-content').innerHTML = story.get('media') ? `<img src="${story.get('media').url()}" style="max-width:100%">` : `<p>${sanitize(story.get('content'))}</p>`;
        }
        async loadUserGallery() {
            const items = await new Parse.Query('VibeGallery').equalTo('owner', this.app.currentUser).find();
            const container = document.getElementById('user-gallery-grid');
            if (container) {
                container.innerHTML = items.map(i => `<div class="gallery-item"><img src="${i.get('file').url()}"><p>${sanitize(i.get('caption'))}</p></div>`).join('');
            }
        }
        async uploadToGallery(file, caption) {
            const item = new Parse.Object('VibeGallery');
            // Compress image
            const compressed = await this.compressImage(file, 800, 800);
            const pf = new Parse.File('gallery.' + (file.name.split('.').pop() || 'jpg'), compressed);
            await pf.save();
            item.set('owner', this.app.currentUser);
            item.set('file', pf);
            item.set('caption', caption);
            item.set('type', file.type.startsWith('image/') ? 'image' : 'video');
            await item.save();
            showNotification('Added to gallery');
            await this.loadUserGallery();
        }
        compressImage(file, maxWidth, maxHeight) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        if (w > maxWidth) { h = h * (maxWidth / w); w = maxWidth; }
                        if (h > maxHeight) { w = w * (maxHeight / h); h = maxHeight; }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        async followUser(userId) {
            const Follow = Parse.Object.extend('VibeFollow');
            const f = new Follow();
            f.set('follower', this.app.currentUser);
            f.set('following', { __type: 'Pointer', className: '_User', objectId: userId });
            f.set('followedAt', new Date());
            await f.save();
            showNotification('Followed user');
        }
        async unfollowUser(userId) {
            const q = new Parse.Query('VibeFollow')
                .equalTo('follower', this.app.currentUser)
                .equalTo('following', { __type: 'Pointer', className: '_User', objectId: userId });
            const f = await q.first();
            if (f) await f.destroy();
            showNotification('Unfollowed');
        }
    }

    // ==================== POST SERVICE ====================
    class PostService {
        constructor(app) { this.app = app; this.skip = 0; this.limit = 10; this.loadingMore = false; }
        async createPost(content, community = null) {
            if (!content.trim()) return showNotification('Content cannot be empty', 'error');
            showLoading();
            try {
                // If offline, queue
                if (!navigator.onLine) {
                    offlineQueue.add({ type: 'post', data: { content, community: community ? community.id : null } });
                    showNotification('Post queued for offline sync', 'warning');
                    hideLoading();
                    return;
                }
                // Use Cloud Code for post creation
                const result = await Parse.Cloud.run('createPost', {
                    content,
                    communityId: community ? community.id : null,
                    userId: this.app.currentUser.id
                });
                showNotification('Post created!');
                hideLoading();
                this.skip = 0;
                await this.loadFeed();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Post');
            }
        }
        async loadFeed(append = false) {
            if (this.loadingMore) return;
            this.loadingMore = true;
            try {
                const q = new Parse.Query('Post')
                    .include('author')
                    .descending('createdAt')
                    .skip(append ? this.skip : 0)
                    .limit(this.limit);
                const posts = await q.find();
                for (let p of posts) {
                    try {
                        const enc = JSON.parse(p.get('content'));
                        const dec = await window.vibeSecurity.decrypt(enc);
                        p.set('decryptedContent', dec);
                    } catch (e) {
                        p.set('decryptedContent', '[Encrypted]');
                    }
                }
                this.displayPosts(posts, append);
                this.skip += posts.length;
                this.loadingMore = false;
                return posts;
            } catch (err) {
                this.loadingMore = false;
                ErrorManager.handle(err, 'Load Feed');
                return [];
            }
        }
        async loadFeedPosts() { this.skip = 0; await this.loadFeed(); }
        async loadUserPosts(userId, skip = 0, limit = 10) {
            const q = new Parse.Query('Post')
                .equalTo('author', { __type: 'Pointer', className: '_User', objectId: userId })
                .include('author')
                .descending('createdAt')
                .skip(skip)
                .limit(limit);
            const posts = await q.find();
            for (let p of posts) {
                try {
                    const enc = JSON.parse(p.get('content'));
                    const dec = await window.vibeSecurity.decrypt(enc);
                    p.set('decryptedContent', dec);
                } catch (e) {
                    p.set('decryptedContent', '[Encrypted]');
                }
            }
            return posts;
        }
        async likePost(postId) {
            if (!navigator.onLine) {
                offlineQueue.add({ type: 'like', data: { postId } });
                return showNotification('Like queued for sync', 'warning');
            }
            try {
                await Parse.Cloud.run('toggleLike', { postId, userId: this.app.currentUser.id });
                await this.loadFeed();
            } catch (err) {
                ErrorManager.handle(err, 'Like Post');
            }
        }
        async commentOnPost(postId, text) {
            if (!text.trim()) return showNotification('Comment cannot be empty', 'error');
            if (!navigator.onLine) {
                offlineQueue.add({ type: 'comment', data: { postId, text } });
                return showNotification('Comment queued for sync', 'warning');
            }
            showLoading();
            try {
                await Parse.Cloud.run('addComment', { postId, text, userId: this.app.currentUser.id });
                showNotification('Comment added');
                hideLoading();
                await this.loadFeed();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Add Comment');
            }
        }
        async deletePost(postId) {
            if (!confirm('Delete this post?')) return;
            showLoading();
            try {
                await Parse.Cloud.run('deletePost', { postId, userId: this.app.currentUser.id });
                showNotification('Deleted');
                hideLoading();
                this.skip = 0;
                await this.loadFeed();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Delete Post');
            }
        }
        async sharePost(postId) {
            try {
                await Parse.Cloud.run('sharePost', { postId, userId: this.app.currentUser.id });
                showNotification('Shared');
                await this.loadFeed();
            } catch (err) {
                ErrorManager.handle(err, 'Share Post');
            }
        }
        displayPosts(posts, append = false) {
            const container = document.getElementById('home-feed') || document.getElementById('feed-posts');
            if (!container) return;
            const html = posts.map(p => {
                const avatar = p.get('author').get('avatar');
                let avatarSrc = 'assets/default-avatar.png';
                if (avatar) {
                    if (typeof avatar === 'string') avatarSrc = avatar;
                    else if (avatar.url) avatarSrc = avatar.url();
                }
                const authorName = displayNameOf(p.get('author'));
                const content = p.get('decryptedContent') || '';
                const likes = p.get('likesCount') || 0;
                const comments = p.get('commentCount') || 0;
                const isOwn = p.get('author').id === this.app.currentUser.id;
                return `<div class="post">
                    <div class="post-header">
                        <img src="${avatarSrc}" class="post-avatar" alt="">
                        <span class="post-author">${sanitize(authorName)}</span>
                        <span class="post-time">${formatTime(p.createdAt)}</span>
                    </div>
                    <div class="post-content">${sanitize(content)}</div>
                    <div class="post-actions">
                        <button class="post-action like-btn" data-id="${p.id}"><i class="far fa-heart"></i> ${likes}</button>
                        <button class="post-action comment-btn" data-id="${p.id}"><i class="far fa-comment"></i> ${comments}</button>
                        <button class="post-action share-btn" data-id="${p.id}"><i class="fas fa-share"></i></button>
                        ${isOwn ? `<button class="post-action delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
            }).join('');
            if (append) container.innerHTML += html;
            else container.innerHTML = html;
            // Re-bind events
            container.querySelectorAll('.like-btn').forEach(b => b.onclick = () => this.likePost(b.dataset.id));
            container.querySelectorAll('.comment-btn').forEach(b => b.onclick = () => {
                const txt = prompt('Your comment:');
                if (txt) this.commentOnPost(b.dataset.id, txt);
            });
            container.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => this.deletePost(b.dataset.id));
            container.querySelectorAll('.share-btn').forEach(b => b.onclick = () => this.sharePost(b.dataset.id));
            // Load more button
            if (posts.length === this.limit) {
                const more = document.createElement('button');
                more.textContent = 'Load More';
                more.className = 'vibe-button';
                more.style.margin = '1rem auto';
                more.onclick = () => this.loadFeed(true);
                container.appendChild(more);
            }
        }
    }

    // ==================== CHAT SERVICE (with polling and proper cleanup) ====================
    class ChatService {
        constructor(app) {
            this.app = app;
            this.activeRoom = null;
            this.subscription = null;
            this.pollInterval = null;
            this.roomPollIntervals = new Map();
        }
        async loadChatRooms() {
            const q = new Parse.Query('VibeChatRoom')
                .containedIn('members', [this.app.currentUser])
                .include('lastMessage')
                .descending('updatedAt');
            const rooms = await q.find();
            const container = document.getElementById('chat-rooms-list');
            if (!container) return;
            if (rooms.length === 0) { container.innerHTML = '<p>No chat rooms yet.</p>'; return; }
            container.innerHTML = rooms.map(r => `<div class="chat-room" data-id="${r.id}"><strong>${sanitize(r.get('name'))}</strong> <small>${r.get('isGroup') ? 'Group' : 'Direct'}</small></div>`).join('');
            container.querySelectorAll('.chat-room').forEach(el => {
                el.onclick = () => this.openRoom(el.dataset.id);
            });
        }
        async openRoom(roomId) {
            // Clear any existing polling for this room
            if (this.roomPollIntervals.has(roomId)) {
                clearInterval(this.roomPollIntervals.get(roomId));
                this.roomPollIntervals.delete(roomId);
            }
            this.activeRoom = roomId;
            const win = document.getElementById('chat-window');
            if (win) win.classList.remove('hidden');
            const titleEl = document.getElementById('chat-title');
            if (titleEl) {
                try {
                    const room = await new Parse.Query('VibeChatRoom').get(roomId);
                    titleEl.textContent = room.get('name');
                } catch (e) { titleEl.textContent = 'Chat'; }
            }
            await this.loadMessages(roomId);
            // LiveQuery subscribe
            if (this.subscription) {
                this.subscription.unsubscribe();
                this.subscription = null;
            }
            const query = new Parse.Query('Message')
                .equalTo('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: roomId });
            try {
                this.subscription = await query.subscribe();
                this.subscription.on('create', (msg) => {
                    if (msg.get('sender').id !== this.app.currentUser.id) {
                        this.appendMessage(msg);
                        this.markAsRead(msg);
                    }
                });
            } catch (e) {
                console.warn('LiveQuery failed, using polling fallback', e);
                // Poll every 3 seconds
                const interval = setInterval(() => this.loadMessages(roomId), 3000);
                this.roomPollIntervals.set(roomId, interval);
            }
        }
        async loadMessages(roomId) {
            const q = new Parse.Query('Message')
                .equalTo('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: roomId })
                .include('sender')
                .ascending('createdAt');
            const msgs = await q.find();
            const container = document.getElementById('chat-messages') || document.getElementById('chat-messages-overlay');
            if (!container) return;
            // Only update if messages changed (avoid flicker)
            const currentIds = Array.from(container.querySelectorAll('.message')).map(el => el.dataset.id);
            const newIds = msgs.map(m => m.id);
            if (currentIds.join(',') === newIds.join(',')) return;
            container.innerHTML = msgs.map(m => {
                const sender = m.get('sender');
                const isSent = sender && sender.id === this.app.currentUser.id;
                let decrypted = m.get('text');
                if (m.get('encrypted')) {
                    try {
                        const enc = JSON.parse(m.get('text'));
                        decrypted = '[Encrypted]';
                        window.vibeSecurity.decrypt(enc).then(d => {
                            decrypted = d;
                            this.updateMessageText(m.id, d);
                        });
                    } catch (e) { decrypted = '[Encrypted]'; }
                }
                return `<div class="message ${isSent ? 'sent' : 'received'}" data-id="${m.id}"><strong>${sanitize(displayNameOf(sender))}</strong>: ${sanitize(decrypted)} <span class="message-time">${formatTime(m.createdAt)}</span></div>`;
            }).join('');
            container.scrollTop = container.scrollHeight;
        }
        updateMessageText(msgId, text) {
            const el = document.querySelector(`.message[data-id="${msgId}"]`);
            if (el) {
                const parts = el.innerHTML.split('</strong>: ');
                if (parts.length === 2) {
                    el.innerHTML = parts[0] + '</strong>: ' + sanitize(text) + ' <span class="message-time">' + parts[1].split('<span')[1];
                }
            }
        }
        appendMessage(msg) {
            const container = document.getElementById('chat-messages') || document.getElementById('chat-messages-overlay');
            if (!container) return;
            const sender = msg.get('sender');
            const isSent = sender && sender.id === this.app.currentUser.id;
            let decrypted = msg.get('text');
            if (msg.get('encrypted')) {
                try {
                    const enc = JSON.parse(msg.get('text'));
                    window.vibeSecurity.decrypt(enc).then(d => { decrypted = d; this.updateMessageText(msg.id, d); });
                    decrypted = '[Decrypting...]';
                } catch (e) { decrypted = '[Encrypted]'; }
            }
            const div = document.createElement('div');
            div.className = `message ${isSent ? 'sent' : 'received'}`;
            div.dataset.id = msg.id;
            div.innerHTML = `<strong>${sanitize(displayNameOf(sender))}</strong>: ${sanitize(decrypted)} <span class="message-time">${formatTime(msg.createdAt)}</span>`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
        async markAsRead(msg) {
            if (msg.get('sender').id === this.app.currentUser.id) return;
            try {
                await Parse.Cloud.run('markMessageRead', { messageId: msg.id, userId: this.app.currentUser.id });
            } catch (e) { /* ignore */ }
        }
        async sendMessage(text) {
            if (!this.activeRoom || !text.trim()) return;
            if (!navigator.onLine) {
                offlineQueue.add({ type: 'message', data: { roomId: this.activeRoom, text } });
                return showNotification('Message queued for sync', 'warning');
            }
            try {
                await Parse.Cloud.run('sendMessage', { roomId: this.activeRoom, text, userId: this.app.currentUser.id });
                document.getElementById('message-input').value = '';
                document.getElementById('chat-message-input').value = '';
                await this.loadMessages(this.activeRoom);
            } catch (err) {
                ErrorManager.handle(err, 'Send Message');
            }
        }
        async createRoom(name, members = []) {
            try {
                const result = await Parse.Cloud.run('createChatRoom', { name, memberIds: members.map(m => m.id), userId: this.app.currentUser.id });
                showNotification('Room created');
                await this.loadChatRooms();
            } catch (err) {
                ErrorManager.handle(err, 'Create Room');
            }
        }
        async createAudioRoom(name) {
            try {
                await Parse.Cloud.run('createAudioRoom', { name, userId: this.app.currentUser.id });
                showNotification('Audio room created');
            } catch (err) {
                ErrorManager.handle(err, 'Create Audio Room');
            }
        }
        async createSecureChat(receiverId) {
            try {
                await Parse.Cloud.run('createSecureChat', { receiverId, userId: this.app.currentUser.id });
                showNotification('Secure chat initiated');
            } catch (err) {
                ErrorManager.handle(err, 'Secure Chat');
            }
        }
        cleanup() {
            if (this.subscription) {
                this.subscription.unsubscribe();
                this.subscription = null;
            }
            this.roomPollIntervals.forEach((interval) => clearInterval(interval));
            this.roomPollIntervals.clear();
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        }
    }

    // ==================== WALLET SERVICE (Cloud Code only) ====================
    class WalletService {
        constructor(app) { this.app = app; }
        async ensureWalletExists() {
            try {
                return await Parse.Cloud.run('ensureWallet', { userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Ensure Wallet');
                return null;
            }
        }
        async ensureLoyaltyProgramExists() {
            try {
                return await Parse.Cloud.run('ensureLoyalty', { userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Ensure Loyalty');
                return null;
            }
        }
        async getBalance() {
            try {
                const result = await Parse.Cloud.run('getBalance', { userId: this.app.currentUser.id });
                return result.balance;
            } catch (err) {
                ErrorManager.handle(err, 'Get Balance');
                return 0;
            }
        }
        async addFunds(amount) {
            if (!navigator.onLine) {
                offlineQueue.add({ type: 'addFunds', data: { amount } });
                return showNotification('Funds request queued for sync', 'warning');
            }
            showLoading();
            try {
                await Parse.Cloud.run('addFunds', { amount, userId: this.app.currentUser.id });
                showNotification(`Added ${amount} VIBE`);
                hideLoading();
                await this.displayWalletInfo();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Add Funds');
            }
        }
        async sendMoney(toUserId, amount) {
            if (!navigator.onLine) {
                offlineQueue.add({ type: 'sendMoney', data: { toUserId, amount } });
                return showNotification('Transfer queued for sync', 'warning');
            }
            showLoading();
            try {
                await Parse.Cloud.run('sendMoney', { toUserId, amount, userId: this.app.currentUser.id });
                showNotification(`Sent ${amount} VIBE`);
                hideLoading();
                await this.displayWalletInfo();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Send Money');
            }
        }
        async sendTip(creatorId, amount, message) {
            if (!navigator.onLine) {
                offlineQueue.add({ type: 'sendTip', data: { creatorId, amount, message } });
                return showNotification('Tip queued for sync', 'warning');
            }
            showLoading();
            try {
                await Parse.Cloud.run('sendTip', { creatorId, amount, message, userId: this.app.currentUser.id });
                showNotification('Tip sent');
                hideLoading();
                await this.displayWalletInfo();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Send Tip');
            }
        }
        async addLoyaltyPoints(points) {
            try {
                await Parse.Cloud.run('addLoyaltyPoints', { points, userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Add Loyalty Points');
            }
        }
        async getTransactionHistory() {
            try {
                return await Parse.Cloud.run('getTransactions', { userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Get Transactions');
                return [];
            }
        }
        async displayWalletInfo() {
            try {
                const balance = await this.getBalance();
                const balEl = document.getElementById('wallet-balance-display');
                if (balEl) balEl.textContent = balance;
                const balEl2 = document.getElementById('wallet-balance');
                if (balEl2) balEl2.textContent = balance;
                const loyalty = await Parse.Cloud.run('getLoyalty', { userId: this.app.currentUser.id });
                const ptsEl = document.getElementById('loyalty-points-display');
                if (ptsEl) ptsEl.textContent = loyalty.points;
                const lvlEl = document.getElementById('loyalty-level-display');
                if (lvlEl) lvlEl.textContent = loyalty.level;
                const txns = await this.getTransactionHistory();
                const txList = document.getElementById('transactions-list');
                if (txList) {
                    txList.innerHTML = txns.map(t => `<div>${sanitize(t.description)}: ${t.amount} VIBE</div>`).join('');
                }
                const txList2 = document.getElementById('transactions-list-wallet');
                if (txList2) {
                    txList2.innerHTML = txns.map(t => `<div>${sanitize(t.description)}: ${t.amount} VIBE</div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Display Wallet');
            }
        }
        async checkoutCart() {
            showNotification('Checkout coming soon (payment integration)');
        }
    }

    // ==================== COMMUNITY SERVICE ====================
    class CommunityService {
        constructor(app) { this.app = app; }
        async createCommunity(data) {
            showLoading();
            try {
                await Parse.Cloud.run('createCommunity', { name: data.name, description: data.description, privacy: data.privacy || 'public', userId: this.app.currentUser.id });
                showNotification('Community created');
                hideLoading();
                await this.loadCommunities();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Community');
            }
        }
        async loadCommunities() {
            try {
                const comms = await Parse.Cloud.run('getCommunities', { userId: this.app.currentUser.id });
                const container = document.getElementById('communities-grid');
                if (container) {
                    container.innerHTML = comms.map(c => `<div class="card"><h4>${sanitize(c.name)}</h4><p>${sanitize(c.description || '')}</p><button data-id="${c.id}" class="view-community-btn">View</button></div>`).join('');
                    container.querySelectorAll('.view-community-btn').forEach(b => b.onclick = () => this.viewCommunity(b.dataset.id));
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Communities');
            }
        }
        async viewCommunity(id) {
            try {
                const c = await Parse.Cloud.run('getCommunity', { communityId: id, userId: this.app.currentUser.id });
                const grid = document.getElementById('communities-grid');
                if (grid) grid.classList.add('hidden');
                const view = document.getElementById('selected-community-view');
                if (view) view.classList.remove('hidden');
                const nameEl = document.getElementById('community-name');
                if (nameEl) nameEl.textContent = c.name;
                const posts = await Parse.Cloud.run('getCommunityPosts', { communityId: id, userId: this.app.currentUser.id });
                let html = `<p><strong>Description:</strong> ${sanitize(c.description || 'No description')}</p>`;
                html += `<p><strong>Members:</strong> ${c.memberCount}</p>`;
                html += `<button id="post-in-community-btn" class="vibe-button" style="margin:10px 0;">Post in Community</button>`;
                html += `<div id="community-posts-container">`;
                if (posts.length) {
                    html += posts.map(p => `<div class="post"><strong>${sanitize(p.author.displayName || p.author.username)}</strong>: ${sanitize(p.content)}</div>`).join('');
                } else {
                    html += '<p>No posts yet.</p>';
                }
                html += `</div>`;
                const postsContainer = document.getElementById('community-posts');
                if (postsContainer) postsContainer.innerHTML = html;
                const postBtn = document.getElementById('post-in-community-btn');
                if (postBtn) {
                    postBtn.onclick = async () => {
                        const content = prompt('Share something:');
                        if (content) {
                            await this.app.services.posts.createPost(content, { id });
                            await this.viewCommunity(id);
                        }
                    };
                }
                const backBtn = document.getElementById('back-to-communities');
                if (backBtn) {
                    backBtn.onclick = () => {
                        if (view) view.classList.add('hidden');
                        if (grid) grid.classList.remove('hidden');
                    };
                }
            } catch (err) {
                ErrorManager.handle(err, 'View Community');
            }
        }
        async joinCommunity(id) {
            try {
                await Parse.Cloud.run('joinCommunity', { communityId: id, userId: this.app.currentUser.id });
                showNotification('Joined community');
            } catch (err) {
                ErrorManager.handle(err, 'Join Community');
            }
        }
        loadPopularCommunities() { return this.loadCommunities(); }
    }

    // ==================== EVENT SERVICE ====================
    class EventService {
        constructor(app) { this.app = app; }
        async createEvent(data) {
            showLoading();
            try {
                await Parse.Cloud.run('createEvent', { title: data.title, description: data.description, date: data.date, location: data.location || 'Online', tickets: data.tickets || 100, price: data.price || 0, userId: this.app.currentUser.id });
                showNotification('Event created');
                hideLoading();
                await this.loadEvents();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Event');
            }
        }
        async loadEvents() {
            try {
                const events = await Parse.Cloud.run('getEvents', { userId: this.app.currentUser.id });
                const container = document.getElementById('events-list');
                if (container) {
                    container.innerHTML = events.map(e => `<div class="card"><h4>${sanitize(e.title)}</h4><p>${sanitize(e.description)}</p><button data-id="${e.id}" class="rsvp-btn">RSVP</button></div>`).join('');
                    container.querySelectorAll('.rsvp-btn').forEach(b => b.onclick = () => this.rsvp(b.dataset.id));
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Events');
            }
        }
        async rsvp(eventId) {
            try {
                await Parse.Cloud.run('rsvpEvent', { eventId, userId: this.app.currentUser.id });
                showNotification('RSVP confirmed');
            } catch (err) {
                ErrorManager.handle(err, 'RSVP');
            }
        }
        async startLiveStream(title) {
            try {
                await Parse.Cloud.run('startStream', { title, userId: this.app.currentUser.id });
                showNotification('Live stream started');
                await this.loadLiveStreams();
            } catch (err) {
                ErrorManager.handle(err, 'Start Stream');
            }
        }
        async loadLiveStreams() {
            try {
                const streams = await Parse.Cloud.run('getLiveStreams', { userId: this.app.currentUser.id });
                const container = document.getElementById('live-streams-list');
                if (container) {
                    container.innerHTML = streams.map(s => `<div class="card"><h4>${sanitize(s.title)}</h4><button onclick="alert('Watch stream ${s.id}')">Watch</button></div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Streams');
            }
        }
    }

    // ==================== MARKETPLACE SERVICE ====================
    class MarketplaceService {
        constructor(app) { this.app = app; }
        async createItem(data) {
            showLoading();
            try {
                await Parse.Cloud.run('createItem', { title: data.title, description: data.description, price: data.price, userId: this.app.currentUser.id });
                showNotification('Item listed');
                hideLoading();
                await this.loadItems();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Item');
            }
        }
        async loadItems() {
            try {
                const items = await Parse.Cloud.run('getItems', { userId: this.app.currentUser.id });
                const container = document.getElementById('marketplace-items');
                if (container) {
                    container.innerHTML = items.map(i => `<div class="card"><h4>${sanitize(i.title)}</h4><p>${i.price} VIBE</p><button onclick="window.vibeApp.services.marketplace.addToCart('${i.id}')">Add to Cart</button></div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Items');
            }
        }
        async addToCart(itemId) {
            try {
                await Parse.Cloud.run('addToCart', { itemId, userId: this.app.currentUser.id });
                showNotification('Added to cart');
            } catch (err) {
                ErrorManager.handle(err, 'Add to Cart');
            }
        }
        async createGig(data) {
            showLoading();
            try {
                await Parse.Cloud.run('createGig', { skill: data.skill, description: data.desc, payment: data.payment, userId: this.app.currentUser.id });
                showNotification('Gig posted');
                hideLoading();
                await this.loadGigs();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Gig');
            }
        }
        async loadGigs() {
            try {
                const gigs = await Parse.Cloud.run('getGigs', { userId: this.app.currentUser.id });
                const container = document.getElementById('vibe-gigs');
                if (container) {
                    container.innerHTML = gigs.map(g => `<div class="card"><h4>${sanitize(g.skillNeeded)}</h4><p>${g.payment} VIBE</p><button onclick="window.vibeApp.services.marketplace.applyToGig('${g.id}')">Apply</button></div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Gigs');
            }
        }
        async applyToGig(gigId) {
            try {
                await Parse.Cloud.run('applyToGig', { gigId, userId: this.app.currentUser.id });
                showNotification('Applied');
            } catch (err) {
                ErrorManager.handle(err, 'Apply to Gig');
            }
        }
    }

    // ==================== LEARNING SERVICE ====================
    class LearningService {
        constructor(app) { this.app = app; }
        async createCourse(data) {
            showLoading();
            try {
                await Parse.Cloud.run('createCourse', { title: data.title, description: data.description, price: data.price || 0, userId: this.app.currentUser.id });
                showNotification('Course created');
                hideLoading();
                await this.loadCourses();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Course');
            }
        }
        async loadCourses() {
            try {
                const courses = await Parse.Cloud.run('getCourses', { userId: this.app.currentUser.id });
                const container = document.getElementById('courses-list');
                if (container) {
                    container.innerHTML = courses.map(c => `<div class="card"><h4>${sanitize(c.title)}</h4><p>${c.price} VIBE</p><button data-id="${c.id}" class="enroll-btn">Enroll</button></div>`).join('');
                    container.querySelectorAll('.enroll-btn').forEach(b => b.onclick = () => this.enroll(b.dataset.id));
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Courses');
            }
        }
        async enroll(courseId) {
            try {
                await Parse.Cloud.run('enrollCourse', { courseId, userId: this.app.currentUser.id });
                showNotification('Enrolled');
            } catch (err) {
                ErrorManager.handle(err, 'Enroll');
            }
        }
        async createQuiz(data) {
            showLoading();
            try {
                await Parse.Cloud.run('createQuiz', { title: data.title, questions: data.questions, courseId: data.courseId, userId: this.app.currentUser.id });
                showNotification('Quiz created');
                hideLoading();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Quiz');
            }
        }
        async loadLiveTutoringSessions() { return []; }
    }

    // ==================== GAMING SERVICE ====================
    class GamingService {
        constructor(app) { this.app = app; }
        async createSession(data) {
            showLoading();
            try {
                await Parse.Cloud.run('createGameSession', { title: data.title, gameType: data.gameType, maxPlayers: data.maxPlayers || 4, userId: this.app.currentUser.id });
                showNotification('Game session created');
                hideLoading();
                await this.loadSessions();
            } catch (err) {
                hideLoading();
                ErrorManager.handle(err, 'Create Game Session');
            }
        }
        async loadSessions() {
            try {
                const sessions = await Parse.Cloud.run('getGameSessions', { userId: this.app.currentUser.id });
                const container = document.getElementById('game-sessions-list');
                if (container) {
                    container.innerHTML = sessions.map(s => `<div class="card"><h4>${sanitize(s.title)}</h4><p>${s.currentPlayers}/${s.maxPlayers}</p><button data-id="${s.id}" class="join-session-btn">Join</button></div>`).join('');
                    container.querySelectorAll('.join-session-btn').forEach(b => b.onclick = () => this.joinSession(b.dataset.id));
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Game Sessions');
            }
        }
        async joinSession(sessionId) {
            try {
                await Parse.Cloud.run('joinGameSession', { sessionId, userId: this.app.currentUser.id });
                showNotification('Joined game');
                await this.loadSessions();
            } catch (err) {
                ErrorManager.handle(err, 'Join Game Session');
            }
        }
        async createTournament(data) {
            try {
                await Parse.Cloud.run('createTournament', { title: data.title, gameType: data.gameType, maxParticipants: data.max, userId: this.app.currentUser.id });
                showNotification('Tournament created');
            } catch (err) {
                ErrorManager.handle(err, 'Create Tournament');
            }
        }
        async loadActiveGameSessions() { return this.loadSessions(); }
    }

    // ==================== DISCOVERY SERVICE ====================
    class DiscoveryService {
        constructor(app) { this.app = app; }
        async loadRecommendations() {
            try {
                const posts = await Parse.Cloud.run('getRecommendations', { userId: this.app.currentUser.id });
                const container = document.getElementById('recommendations-grid');
                if (container) {
                    container.innerHTML = posts.map(p => `<div class="card"><h4>${sanitize(p.author.displayName || p.author.username)}</h4><p>${sanitize(p.content)}</p></div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Recommendations');
            }
        }
        async search(query) {
            try {
                return await Parse.Cloud.run('searchContent', { query, userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Search');
                return [];
            }
        }
        async loadTrendingTags() {
            const container = document.getElementById('trending-tags');
            if (container) container.innerHTML = '<span>#VibeLink</span> <span>#Africa</span> <span>#Tech</span>';
        }
        async loadChallenges() {
            try {
                const challenges = await Parse.Cloud.run('getChallenges', { userId: this.app.currentUser.id });
                const container = document.getElementById('challenges-list');
                if (container) {
                    container.innerHTML = challenges.map(c => `<div class="card"><h4>${sanitize(c.title)}</h4><button onclick="window.vibeApp.services.discovery.joinChallenge('${c.id}')">Join</button></div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Challenges');
            }
        }
        async joinChallenge(id) {
            try {
                await Parse.Cloud.run('joinChallenge', { challengeId: id, userId: this.app.currentUser.id });
                showNotification('Joined challenge');
            } catch (err) {
                ErrorManager.handle(err, 'Join Challenge');
            }
        }
        async getDailyDiscovery() {
            return {
                featured: [],
                trending: await this.loadRecommendations(),
                recommendations: [],
                challenges: [],
                liveNow: { streams: [], tutoring: [], events: [] },
                communities: []
            };
        }
    }

    // ==================== SETTINGS SERVICE ====================
    class SettingsService {
        constructor(app) { this.app = app; }
        async getUserSettings() {
            try {
                return await Parse.Cloud.run('getUserSettings', { userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Get Settings');
                return { privacy: {}, notifications: {}, appearance: {} };
            }
        }
        async displaySettings() {
            const s = await this.getUserSettings();
            const container = document.getElementById('user-settings-container');
            if (container) {
                container.innerHTML = `<div class="card"><h4>Settings</h4><pre>${JSON.stringify(s, null, 2)}</pre></div>`;
            } else {
                showNotification('Settings loaded (no container found)', 'warning');
            }
        }
        async exportUserData() {
            showNotification('Exporting user data... (JSON)');
            try {
                const data = await Parse.Cloud.run('exportUserData', { userId: this.app.currentUser.id });
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vibelink-export.json';
                a.click();
                showNotification('Data exported');
            } catch (err) {
                ErrorManager.handle(err, 'Export Data');
            }
        }
        async clearCache() {
            localStorage.clear();
            showNotification('Cache cleared');
        }
    }

    // ==================== AR SERVICE ====================
    class ARService {
        constructor(app) { this.app = app; }
        async createExperience(data) {
            try {
                await Parse.Cloud.run('createARExperience', { type: data.type, interactiveObjects: data.interactiveObjects || [], filters: data.filters || [], userId: this.app.currentUser.id });
                showNotification('AR experience created');
                await this.loadExperiences();
            } catch (err) {
                ErrorManager.handle(err, 'Create AR');
            }
        }
        async loadExperiences() {
            try {
                const exps = await Parse.Cloud.run('getARExperiences', { userId: this.app.currentUser.id });
                const container = document.getElementById('ar-list');
                if (container) {
                    container.innerHTML = exps.map(e => `<div class="card"><h4>${sanitize(e.experienceType)}</h4><p>By ${sanitize(e.creator.displayName || e.creator.username)}</p><button onclick="alert('AR viewer coming')">View</button></div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load AR');
            }
        }
    }

    // ==================== QA SERVICE ====================
    class QAService {
        constructor(app) { this.app = app; }
        async askQuestion(data) {
            try {
                await Parse.Cloud.run('askQuestion', { question: data.question, topic: data.topic || 'General', userId: this.app.currentUser.id });
                showNotification('Question asked');
                await this.loadQuestions();
            } catch (err) {
                ErrorManager.handle(err, 'Ask Question');
            }
        }
        async loadQuestions() {
            try {
                const questions = await Parse.Cloud.run('getQuestions', { userId: this.app.currentUser.id });
                const container = document.getElementById('qa-list');
                if (container) {
                    container.innerHTML = questions.map(q => `<div class="card"><h4>${sanitize(q.title)}</h4><p>${sanitize(q.description)}</p></div>`).join('');
                }
            } catch (err) {
                ErrorManager.handle(err, 'Load Questions');
            }
        }
    }

    // ==================== REALTIME MANAGER ====================
    class RealtimeManager {
        constructor(app) {
            this.app = app;
            this.subscriptions = new Map();
            this.pollIntervals = new Map();
        }
        async initialize() {
            try {
                const Post = Parse.Object.extend('Post');
                const postSub = await new Parse.Query(Post).subscribe();
                postSub.on('create', () => this.app.services.posts?.loadFeed());
                this.subscriptions.set('posts', postSub);
                console.log('✅ LiveQuery subscriptions active');
            } catch (e) {
                console.warn('LiveQuery failed, using polling fallback', e);
                const interval = setInterval(() => this.app.services.posts?.loadFeed(), 10000);
                this.pollIntervals.set('posts', interval);
            }
        }
        broadcastUpdate(type, data) {
            console.log('Broadcast:', type, data);
        }
        unsubscribeAll() {
            this.subscriptions.forEach((sub) => sub.unsubscribe());
            this.subscriptions.clear();
            this.pollIntervals.forEach((interval) => clearInterval(interval));
            this.pollIntervals.clear();
        }
        async reconnect() {
            await this.initialize();
        }
    }

    // ==================== AI SERVICE ====================
    class AIService {
        constructor(app) { this.app = app; }
        async trackUserBehavior(action, data) {
            try {
                await Parse.Cloud.run('trackBehavior', { action, data, userId: this.app.currentUser.id });
            } catch (err) {
                // Non-critical, log silently
                console.warn('AI tracking failed', err);
            }
        }
        async trackAnalytics(actionType, data) { /* handled by Cloud Code */ }
        async getAISuggestions(context) {
            try {
                return await Parse.Cloud.run('getAISuggestions', { context, userId: this.app.currentUser.id });
            } catch (err) {
                return { content: [], connections: [], groups: [], events: [], challenges: [] };
            }
        }
    }

    // ==================== NOTIFICATION SERVICE ====================
    class NotificationService {
        constructor(app) { this.app = app; }
        async createNotification(userId, type, message) {
            try {
                await Parse.Cloud.run('createNotification', { userId, type, message, senderId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Create Notification');
            }
        }
        async markAsRead(notifId) {
            try {
                await Parse.Cloud.run('markNotificationRead', { notificationId: notifId, userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Mark Read');
            }
        }
        async getUserNotifications(limit = 20) {
            try {
                return await Parse.Cloud.run('getNotifications', { limit, userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Get Notifications');
                return [];
            }
        }
        async notifyFollowers(message) {
            try {
                await Parse.Cloud.run('notifyFollowers', { message, userId: this.app.currentUser.id });
            } catch (err) {
                ErrorManager.handle(err, 'Notify Followers');
            }
        }
    }

    // ==================== MAIN APPLICATION ====================
    class VibeLink0372 {
        constructor() {
            this.currentUser = null;
            this.offlineMode = false;
            this.services = {};
            this.initServices();
            this.setupEventListeners();
        }
        initServices() {
            this.services.auth = new AuthService(this);
            this.services.profile = new ProfileService(this);
            this.services.posts = new PostService(this);
            this.services.chat = new ChatService(this);
            this.services.wallet = new WalletService(this);
            this.services.communities = new CommunityService(this);
            this.services.events = new EventService(this);
            this.services.marketplace = new MarketplaceService(this);
            this.services.learning = new LearningService(this);
            this.services.gaming = new GamingService(this);
            this.services.discovery = new DiscoveryService(this);
            this.services.settings = new SettingsService(this);
            this.services.ar = new ARService(this);
            this.services.qa = new QAService(this);
            this.services.ai = new AIService(this);
            this.services.notifications = new NotificationService(this);
            this.services.realtime = new RealtimeManager(this);
            this.services.encryption = window.vibeSecurity;
        }
        async initializeApp() {
            try {
                await this.services.auth.checkAuthentication();
                await this.services.realtime.initialize();
                this.setupNavigation();
                // Register service worker for push
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/service-worker.js')
                        .then(() => console.log('✅ SW registered'))
                        .catch(err => console.warn('SW registration failed', err));
                }
                console.log('✅ VibeLink 0372 ready');
            } catch (err) {
                console.error('Init failed:', err);
                this.offlineMode = true;
                showNotification('Running in offline mode', 'warning');
            }
        }
        async loadInitialData() {
            await Promise.all([
                this.services.wallet.ensureWalletExists(),
                this.services.profile.ensureProfileExists(),
                this.services.posts.loadFeed(),
                this.services.chat.loadChatRooms(),
                this.services.events.loadEvents(),
                this.services.marketplace.loadItems(),
                this.services.gaming.loadSessions(),
                this.services.communities.loadCommunities(),
                this.services.discovery.loadRecommendations()
            ]);
        }
        setupNavigation() {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = link.dataset.section;
                    if (section) this.switchSection(section);
                });
            });
            document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const section = item.dataset.page || item.dataset.section;
                    if (section) this.switchSection(section);
                });
            });
        }
        switchSection(sectionId) {
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(sectionId + '-section');
            if (target) target.classList.add('active');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector(`.nav-link[data-section="${sectionId}"]`)?.classList.add('active');
            const loaders = {
                home: () => this.services.posts.loadFeed(),
                feed: () => this.services.posts.loadFeed(),
                profile: () => this.services.profile.loadProfileData(),
                communities: () => this.services.communities.loadCommunities(),
                events: () => this.services.events.loadEvents(),
                discovery: () => this.services.discovery.loadRecommendations(),
                chat: () => this.services.chat.loadChatRooms(),
                wallet: () => this.services.wallet.displayWalletInfo(),
                marketplace: () => { this.services.marketplace.loadItems(); this.services.marketplace.loadGigs(); },
                learning: () => this.services.learning.loadCourses(),
                gaming: () => this.services.gaming.loadSessions(),
                settings: () => this.services.settings.displaySettings(),
                ar: () => this.services.ar.loadExperiences(),
                qa: () => this.services.qa.loadQuestions()
            };
            if (loaders[sectionId]) loaders[sectionId]();
        }
        setupEventListeners() {
            document.getElementById('loginForm')?.addEventListener('submit', (e) => this.services.auth.handleLogin(e));
            document.getElementById('signupForm')?.addEventListener('submit', (e) => this.services.auth.handleSignup(e));
            document.getElementById('logout-btn')?.addEventListener('click', () => this.services.auth.handleLogout());
            document.getElementById('home-post-btn')?.addEventListener('click', () => {
                const input = document.getElementById('home-post-input');
                if (input && input.value) this.services.posts.createPost(input.value).then(() => input.value = '');
            });
            document.getElementById('feed-create-post')?.addEventListener('click', () => {
                const input = document.getElementById('feed-post-content');
                if (input && input.value) this.services.posts.createPost(input.value).then(() => input.value = '');
            });
            document.getElementById('floating-create-btn')?.addEventListener('click', () => {
                const txt = prompt("What's on your mind?");
                if (txt) this.services.posts.createPost(txt);
            });
            document.getElementById('send-message')?.addEventListener('click', () => {
                const input = document.getElementById('message-input');
                if (input && input.value) this.services.chat.sendMessage(input.value).then(() => input.value = '');
            });
            document.getElementById('send-chat-message')?.addEventListener('click', () => {
                const input = document.getElementById('chat-message-input');
                if (input && input.value) this.services.chat.sendMessage(input.value).then(() => input.value = '');
            });
            document.getElementById('create-chat-room')?.addEventListener('click', () => {
                const name = prompt('Room name:');
                if (name) this.services.chat.createRoom(name);
            });
            document.getElementById('create-audio-room')?.addEventListener('click', () => {
                const name = prompt('Audio room name:');
                if (name) this.services.chat.createAudioRoom(name);
            });
            document.getElementById('create-secure-chat')?.addEventListener('click', () => {
                const id = prompt('User ID:');
                if (id) this.services.chat.createSecureChat(id);
            });
            document.getElementById('add-funds-btn')?.addEventListener('click', () => {
                const amt = parseFloat(prompt('Amount:'));
                if (amt) this.services.wallet.addFunds(amt);
            });
            document.getElementById('add-funds-btn-wallet')?.addEventListener('click', () => {
                const amt = parseFloat(prompt('Amount:'));
                if (amt) this.services.wallet.addFunds(amt);
            });
            document.getElementById('send-money-btn')?.addEventListener('click', () => {
                const id = prompt('Recipient ID:');
                const amt = parseFloat(prompt('Amount:'));
                if (id && amt) this.services.wallet.sendMoney(id, amt);
            });
            document.getElementById('send-money-btn-wallet')?.addEventListener('click', () => {
                const id = prompt('Recipient ID:');
                const amt = parseFloat(prompt('Amount:'));
                if (id && amt) this.services.wallet.sendMoney(id, amt);
            });
            document.getElementById('send-tip-btn')?.addEventListener('click', () => {
                const id = prompt('Creator ID:');
                const amt = parseFloat(prompt('Amount:'));
                const msg = prompt('Message:');
                if (id && amt) this.services.wallet.sendTip(id, amt, msg);
            });
            document.getElementById('send-tip-btn-wallet')?.addEventListener('click', () => {
                const id = prompt('Creator ID:');
                const amt = parseFloat(prompt('Amount:'));
                const msg = prompt('Message:');
                if (id && amt) this.services.wallet.sendTip(id, amt, msg);
            });
            document.getElementById('checkout-cart')?.addEventListener('click', () => this.services.wallet.checkoutCart());
            document.getElementById('create-community-btn')?.addEventListener('click', () => {
                const name = prompt('Community name:');
                const desc = prompt('Description:');
                if (name) this.services.communities.createCommunity({ name, description: desc });
            });
            document.getElementById('create-event-btn')?.addEventListener('click', () => {
                const title = prompt('Event title:');
                const desc = prompt('Description:');
                const date = prompt('Date (YYYY-MM-DD HH:MM):');
                const tickets = parseInt(prompt('Tickets:')) || 0;
                if (title && date) this.services.events.createEvent({ title, description: desc, date, tickets, location: 'Online' });
            });
            document.getElementById('start-live-stream-btn')?.addEventListener('click', () => {
                const title = prompt('Stream title:');
                if (title) this.services.events.startLiveStream(title);
            });
            document.getElementById('create-listing-btn')?.addEventListener('click', () => {
                const title = prompt('Title:');
                const desc = prompt('Description:');
                const price = parseFloat(prompt('Price:'));
                if (title && price) this.services.marketplace.createItem({ title, description: desc, price });
            });
            document.getElementById('create-gig-btn')?.addEventListener('click', () => {
                const skill = prompt('Skill needed:');
                const desc = prompt('Description:');
                const payment = parseFloat(prompt('Payment:'));
                if (skill && payment) this.services.marketplace.createGig({ skill, desc, payment });
            });
            document.getElementById('create-course-btn')?.addEventListener('click', () => {
                const title = prompt('Course title:');
                const desc = prompt('Description:');
                const price = parseFloat(prompt('Price:'));
                if (title) this.services.learning.createCourse({ title, description: desc, price });
            });
            document.getElementById('create-quiz-btn')?.addEventListener('click', () => {
                const title = prompt('Quiz title:');
                const questions = prompt('Questions (JSON array):');
                if (title && questions) this.services.learning.createQuiz({ title, questions: JSON.parse(questions), courseId: null });
            });
            document.getElementById('create-game-session-btn')?.addEventListener('click', () => {
                const title = prompt('Game session title:');
                const type = prompt('Game type:');
                if (title && type) this.services.gaming.createSession({ title, gameType: type });
            });
            document.getElementById('create-tournament-btn')?.addEventListener('click', () => {
                const title = prompt('Tournament title:');
                const type = prompt('Game type:');
                const max = parseInt(prompt('Max participants:'));
                if (title && type && max) this.services.gaming.createTournament({ title, gameType: type, max });
            });
            document.getElementById('create-ar-btn')?.addEventListener('click', () => {
                const type = prompt('AR experience type:');
                if (type) this.services.ar.createExperience({ type });
            });
            document.getElementById('ask-question-btn')?.addEventListener('click', () => {
                const question = prompt('Your question:');
                const topic = prompt('Topic:');
                if (question && topic) this.services.qa.askQuestion({ question, topic });
            });
            document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
                const bio = prompt('New bio:');
                if (bio) {
                    this.currentUser.set('bio', bio);
                    this.currentUser.save().then(() => this.services.profile.loadProfileData());
                }
            });
            document.getElementById('export-data-btn')?.addEventListener('click', () => this.services.settings.exportUserData());
            document.getElementById('close-chat')?.addEventListener('click', () => {
                const win = document.getElementById('chat-window');
                if (win) win.classList.add('hidden');
                this.services.chat.cleanup();
            });
            document.getElementById('close-story')?.addEventListener('click', () => {
                const viewer = document.getElementById('story-viewer');
                if (viewer) viewer.classList.add('hidden');
            });
            document.getElementById('search-btn')?.addEventListener('click', () => {
                const query = prompt('Search:');
                if (query) this.services.discovery.search(query).then(posts => alert(`Found ${posts.length} posts`));
            });
            document.getElementById('upload-gallery-btn')?.addEventListener('click', () => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = 'image/*,video/*';
                inp.onchange = async e => {
                    const file = e.target.files[0];
                    const caption = prompt('Caption:');
                    if (file && caption) await this.services.profile.uploadToGallery(file, caption);
                };
                inp.click();
            });
            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    document.querySelectorAll('.profile-pane').forEach(p => p.classList.remove('active'));
                    const pane = document.getElementById(`profile-${tab.dataset.tab}-tab`);
                    if (pane) pane.classList.add('active');
                    if (tab.dataset.tab === 'wallet') this.services.wallet.displayWalletInfo();
                });
            });
            document.querySelectorAll('.password-toggle').forEach(btn => {
                btn.addEventListener('click', function() {
                    const wrapper = this.closest('.password-wrapper');
                    if (!wrapper) return;
                    const input = wrapper.querySelector('input');
                    if (!input) return;
                    const icon = this.querySelector('i');
                    if (input.type === 'password') {
                        input.type = 'text';
                        if (icon) icon.className = 'fas fa-eye-slash';
                    } else {
                        input.type = 'password';
                        if (icon) icon.className = 'fas fa-eye';
                    }
                });
            });
            document.getElementById('show-signup')?.addEventListener('click', e => {
                e.preventDefault();
                document.getElementById('login-form')?.classList.remove('active');
                document.getElementById('signup-form')?.classList.add('active');
            });
            document.getElementById('show-login')?.addEventListener('click', e => {
                e.preventDefault();
                document.getElementById('signup-form')?.classList.remove('active');
                document.getElementById('login-form')?.classList.add('active');
            });
            document.getElementById('logout-menu-btn')?.addEventListener('click', () => this.services.auth.handleLogout());
            // Online/offline handlers
            window.addEventListener('online', () => {
                this.offlineMode = false;
                showNotification('Back online! Syncing...', 'success');
                offlineQueue.sync();
            });
            window.addEventListener('offline', () => {
                this.offlineMode = true;
                showNotification('You are offline. Actions will be queued.', 'warning');
            });
        }
        showAuthSection() {
            const auth = document.getElementById('auth-section');
            const main = document.getElementById('main-section');
            if (auth) auth.classList.add('active');
            if (main) main.classList.remove('active');
        }
        hideAuthSection() {
            const auth = document.getElementById('auth-section');
            if (auth) auth.classList.remove('active');
        }
        showMainSection() {
            const auth = document.getElementById('auth-section');
            const main = document.getElementById('main-section');
            if (auth) auth.classList.remove('active');
            if (main) main.classList.add('active');
        }
        hideMainSection() {
            const main = document.getElementById('main-section');
            if (main) main.classList.remove('active');
        }
    }

    // ==================== INIT ====================
    window.addEventListener('DOMContentLoaded', () => {
        window.vibeApp = new VibeLink0372();
        window.vibeApp.initializeApp();
    });

} // end startApp