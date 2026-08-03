// ============================================
// VibeLink 0372® - Complete Integrated Script
// Fully aligned with your existing index.html
// ============================================

// -------------------- Parse Initialization --------------------
Parse.initialize("HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA", "ZdoLxgHVvjHTpc0MdAlL5y3idTdbHdmpQ556bDSU");
Parse.serverURL = 'https://vibelink0372.b4a.io';

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
    setTimeout(() => n.style.display = 'none', 3000);
}

function formatTime(date) {
    return new Date(date).toLocaleString();
}

function displayNameOf(user) {
    if (!user) return 'Unknown';
    if (typeof user === 'string') return user;
    return user.get('username') || user.username || 'Unknown';
}

// ==================== SECURITY (Encryption) ====================
class VibeSecurity {
    constructor() {
        this.masterKey = null;
        this.initialized = false;
        this.initializeSecurity();
    }
    async initializeSecurity() {
        try {
            if (!window.crypto || !window.crypto.subtle) throw new Error('Web Crypto API not supported');
            const stored = localStorage.getItem('vibe_master_key');
            if (stored) {
                this.masterKey = await this.importKey(this.base64ToArrayBuffer(stored), 'AES-GCM', ['encrypt', 'decrypt']);
            } else {
                this.masterKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
                const exported = await crypto.subtle.exportKey('raw', this.masterKey);
                localStorage.setItem('vibe_master_key', this.arrayBufferToBase64(exported));
            }
            this.initialized = true;
            console.log('🔒 VibeSecurity initialized');
        } catch (e) { console.error('Security init failed', e); }
    }
    async encrypt(data, key = this.masterKey) {
        const enc = new TextEncoder().encode(JSON.stringify(data));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
        return { iv: this.arrayBufferToBase64(iv), data: this.arrayBufferToBase64(encrypted) };
    }
    async decrypt(payload, key = this.masterKey) {
        const iv = this.base64ToArrayBuffer(payload.iv);
        const data = this.base64ToArrayBuffer(payload.data);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return JSON.parse(new TextDecoder().decode(decrypted));
    }
    async generateKey() {
        return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    }
    async exportKey(key) { return crypto.subtle.exportKey('raw', key); }
    async importKey(keyData, algorithm, usages) {
        return crypto.subtle.importKey('raw', keyData, { name: algorithm, length: 256 }, true, usages);
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
        try {
            const query = new Parse.Query(Parse.User);
            query.equalTo('email', email);
            const found = await query.first({ useMasterKey: false });
            if (!found) return showNotification('No account with that email', 'error');
            const user = await Parse.User.logIn(found.get('username'), password);
            await this.handleSuccessfulLogin(user);
            showNotification('Login successful!');
        } catch (err) { showNotification(err.message, 'error'); }
    }
    async handleSignup(e) {
        e.preventDefault();
        const username = document.getElementById('signupUsername')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const bio = document.getElementById('signupBio')?.value;
        if (!username || !email || !password) return showNotification('Fill all fields', 'error');
        const user = new Parse.User();
        user.set('username', username);
        user.set('email', email);
        user.set('password', password);
        user.set('bio', bio || '');
        try {
            await user.signUp();
            await this.handleSuccessfulLogin(user);
            showNotification('Account created!');
        } catch (err) { showNotification(err.message, 'error'); }
    }
    async handleSuccessfulLogin(user) {
        this.app.currentUser = user;
        this.app.showMainSection();
        this.app.hideAuthSection();
        await this.app.services.wallet.ensureWalletExists();
        await this.app.services.profile.ensureProfileExists();
        await this.app.loadInitialData();
    }
    async handleLogout() {
        await Parse.User.logOut();
        this.app.currentUser = null;
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
        document.getElementById('profile-username-display').innerText = this.app.currentUser.get('username');
        document.getElementById('profile-bio-display').innerText = this.app.currentUser.get('bio') || 'No bio';
        const stats = await this.getUserStats();
        document.getElementById('profile-posts-count').innerText = `${stats.posts} posts`;
        document.getElementById('profile-followers-count').innerText = `${stats.followers} followers`;
        document.getElementById('profile-following-count').innerText = `${stats.following} following`;
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
    async loadUserPosts() {
        const posts = await new Parse.Query('Post').equalTo('author', this.app.currentUser).descending('createdAt').find();
        const container = document.getElementById('user-posts-grid');
        if (container) {
            container.innerHTML = posts.map(p => `<div class="card"><p>${p.get('content')}</p><small>${formatTime(p.createdAt)}</small></div>`).join('');
        }
    }
    async loadUserStories() {
        const stories = await new Parse.Query('VibeStory').equalTo('author', this.app.currentUser).greaterThan('expiresAt', new Date()).find();
        const container = document.getElementById('stories-container');
        if (container) {
            container.innerHTML = stories.map(s => `<div class="story-item" onclick="window.vibeApp.services.profile.viewStory('${s.id}')"><div class="story-avatar"><img src="${s.get('media')?.url() || 'assets/default-avatar.png'}"></div><span>${s.get('content')}</span></div>`).join('');
        }
    }
    async viewStory(storyId) {
        const story = await new Parse.Query('VibeStory').get(storyId);
        document.getElementById('story-viewer').classList.remove('hidden');
        document.getElementById('story-username').innerText = story.get('author').get('username');
        document.getElementById('story-content').innerHTML = story.get('media') ? `<img src="${story.get('media').url()}" style="max-width:100%">` : `<p>${story.get('content')}</p>`;
    }
    async loadUserGallery() {
        const items = await new Parse.Query('VibeGallery').equalTo('owner', this.app.currentUser).find();
        const container = document.getElementById('user-gallery-grid');
        if (container) {
            container.innerHTML = items.map(i => `<div class="gallery-item"><img src="${i.get('file').url()}"><p>${i.get('caption')}</p></div>`).join('');
        }
    }
    async uploadToGallery(file, caption) {
        const item = new Parse.Object('VibeGallery');
        const ext = file.name.split('.').pop() || 'jpg';
        const pf = new Parse.File('gallery.' + ext, file);
        await pf.save();
        item.set('owner', this.app.currentUser);
        item.set('file', pf);
        item.set('caption', caption);
        item.set('type', file.type.startsWith('image/') ? 'image' : 'video');
        await item.save();
        showNotification('Added to gallery');
        await this.loadUserGallery();
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
        const q = new Parse.Query('VibeFollow');
        q.equalTo('follower', this.app.currentUser);
        q.equalTo('following', { __type: 'Pointer', className: '_User', objectId: userId });
        const f = await q.first();
        if (f) await f.destroy();
        showNotification('Unfollowed');
    }
}

// ==================== POST SERVICE ====================
class PostService {
    constructor(app) { this.app = app; }
    async createPost(content) {
        const Post = Parse.Object.extend('Post');
        const p = new Post();
        const encrypted = await window.vibeSecurity.encrypt(content);
        p.set('content', JSON.stringify(encrypted));
        p.set('author', this.app.currentUser);
        p.set('likesCount', 0);
        p.set('commentCount', 0);
        p.set('shareCount', 0);
        await p.save();
        showNotification('Post created');
        await this.loadFeed();
    }
    async loadFeed() {
        const q = new Parse.Query('Post').include('author').descending('createdAt').limit(20);
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
        this.displayPosts(posts);
    }
    async loadFeedPosts() { await this.loadFeed(); }
    async loadUserPosts(userId) {
        const q = new Parse.Query('Post').equalTo('author', { __type: 'Pointer', className: '_User', objectId: userId }).descending('createdAt').limit(20);
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
        const Like = Parse.Object.extend('Like');
        const q = new Parse.Query(Like).equalTo('user', this.app.currentUser).equalTo('post', { __type: 'Pointer', className: 'Post', objectId: postId });
        const existing = await q.first();
        const post = await new Parse.Query('Post').get(postId);
        if (existing) {
            await existing.destroy();
            post.increment('likesCount', -1);
        } else {
            const like = new Like();
            like.set('user', this.app.currentUser);
            like.set('post', { __type: 'Pointer', className: 'Post', objectId: postId });
            await like.save();
            post.increment('likesCount', 1);
        }
        await post.save();
        await this.loadFeed();
    }
    async commentOnPost(postId, text) {
        const Comment = Parse.Object.extend('Comment');
        const c = new Comment();
        c.set('content', text);
        c.set('author', this.app.currentUser);
        c.set('post', { __type: 'Pointer', className: 'Post', objectId: postId });
        await c.save();
        const post = await new Parse.Query('Post').get(postId);
        post.increment('commentCount');
        await post.save();
        showNotification('Comment added');
        await this.loadFeed();
    }
    async deletePost(postId) {
        if (!confirm('Delete?')) return;
        const post = await new Parse.Query('Post').get(postId);
        if (post.get('author').id !== this.app.currentUser.id) {
            showNotification('Not your post', 'error');
            return;
        }
        await post.destroy();
        showNotification('Deleted');
        await this.loadFeed();
    }
    async sharePost(postId) {
        const post = await new Parse.Query('Post').get(postId);
        post.increment('shareCount');
        await post.save();
        showNotification('Shared');
        await this.loadFeed();
    }
    displayPosts(posts) {
        const container = document.getElementById('home-feed') || document.getElementById('feed-posts');
        if (!container) return;
        container.innerHTML = posts.map(p => {
            const avatar = p.get('author').get('avatar');
            let avatarSrc = 'assets/default-avatar.png';
            if (avatar) {
                if (typeof avatar === 'string') avatarSrc = avatar;
                else if (avatar.url) avatarSrc = avatar.url();
            }
            return `<div class="post">
                <div class="post-header">
                    <img src="${avatarSrc}" class="post-avatar">
                    <span class="post-author">${displayNameOf(p.get('author'))}</span>
                    <span class="post-time">${formatTime(p.createdAt)}</span>
                </div>
                <div class="post-content">${p.get('decryptedContent')}</div>
                <div class="post-actions">
                    <button class="post-action like-btn" data-id="${p.id}"><i class="far fa-heart"></i> ${p.get('likesCount')||0}</button>
                    <button class="post-action comment-btn" data-id="${p.id}"><i class="far fa-comment"></i> ${p.get('commentCount')||0}</button>
                    <button class="post-action share-btn" data-id="${p.id}"><i class="fas fa-share"></i></button>
                    ${p.get('author').id === this.app.currentUser.id ? `<button class="post-action delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>`;
        }).join('');
        container.querySelectorAll('.like-btn').forEach(b => b.onclick = () => this.likePost(b.dataset.id));
        container.querySelectorAll('.comment-btn').forEach(b => b.onclick = () => {
            const txt = prompt('Comment:');
            if (txt) this.commentOnPost(b.dataset.id, txt);
        });
        container.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => this.deletePost(b.dataset.id));
        container.querySelectorAll('.share-btn').forEach(b => b.onclick = () => this.sharePost(b.dataset.id));
    }
}

// ==================== CHAT SERVICE ====================
class ChatService {
    constructor(app) { this.app = app; this.activeRoom = null; this.subscription = null; }
    async loadChatRooms() {
        const q = new Parse.Query('VibeChatRoom').containedIn('members', [this.app.currentUser]);
        const rooms = await q.find();
        const container = document.getElementById('chat-rooms-list');
        if (!container) return;
        if (rooms.length === 0) { container.innerHTML = '<p>No chat rooms yet.</p>'; return; }
        container.innerHTML = rooms.map(r => `<div class="chat-room" data-id="${r.id}"><strong>${r.get('name')}</strong> <small>${r.get('isGroup') ? 'Group' : 'Direct'}</small></div>`).join('');
        container.querySelectorAll('.chat-room').forEach(el => {
            el.onclick = () => this.openRoom(el.dataset.id);
        });
    }
    async openRoom(roomId) {
        this.activeRoom = roomId;
        const win = document.getElementById('chat-window');
        if (win) win.classList.remove('hidden');
        const titleEl = document.getElementById('chat-title');
        if (titleEl) {
            try {
                const room = await new Parse.Query('VibeChatRoom').get(roomId);
                titleEl.innerText = room.get('name');
            } catch (e) { titleEl.innerText = 'Chat'; }
        }
        await this.loadMessages(roomId);
        if (this.subscription) this.subscription.unsubscribe();
        const query = new Parse.Query('Message').equalTo('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: roomId });
        try {
            this.subscription = await query.subscribe();
            this.subscription.on('create', (msg) => {
                if (msg.get('sender').id !== this.app.currentUser.id) {
                    this.appendMessage(msg);
                    this.markAsRead(msg);
                }
            });
        } catch (e) { console.warn('LiveQuery failed', e); }
    }
    async loadMessages(roomId) {
        const q = new Parse.Query('Message').equalTo('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: roomId }).include('sender').ascending('createdAt');
        const msgs = await q.find();
        const container = document.getElementById('chat-messages') || document.getElementById('chat-messages-overlay');
        if (!container) return;
        container.innerHTML = msgs.map(m => {
            const sender = m.get('sender');
            const isSent = sender && sender.id === this.app.currentUser.id;
            let decrypted = m.get('text');
            if (m.get('encrypted')) {
                try {
                    const enc = JSON.parse(m.get('text'));
                    decrypted = '[Encrypted]';
                    window.vibeSecurity.decrypt(enc).then(d => { decrypted = d; this.updateMessageText(m.id, d); });
                } catch (e) { decrypted = '[Encrypted]'; }
            }
            return `<div class="message ${isSent ? 'sent' : 'received'}" data-id="${m.id}"><strong>${displayNameOf(sender)}</strong>: ${decrypted} <span class="message-time">${formatTime(m.createdAt)}</span></div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    }
    updateMessageText(msgId, text) {
        const el = document.querySelector(`.message[data-id="${msgId}"]`);
        if (el) {
            const parts = el.innerHTML.split('</strong>: ');
            if (parts.length === 2) {
                el.innerHTML = parts[0] + '</strong>: ' + text + ' <span class="message-time">' + parts[1].split('<span')[1];
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
        div.innerHTML = `<strong>${displayNameOf(sender)}</strong>: ${decrypted} <span class="message-time">${formatTime(msg.createdAt)}</span>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
    async markAsRead(msg) {
        if (msg.get('sender').id === this.app.currentUser.id) return;
        const readBy = msg.get('readBy') || [];
        if (!readBy.includes(this.app.currentUser.id)) {
            readBy.push(this.app.currentUser.id);
            msg.set('readBy', readBy);
            await msg.save();
        }
    }
    async sendMessage(text) {
        if (!this.activeRoom || !text.trim()) return;
        const Message = Parse.Object.extend('Message');
        const m = new Message();
        const encrypted = await window.vibeSecurity.encrypt(text);
        m.set('text', JSON.stringify(encrypted));
        m.set('sender', this.app.currentUser);
        m.set('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: this.activeRoom });
        m.set('readBy', []);
        m.set('encrypted', true);
        await m.save();
        document.getElementById('message-input').value = '';
        document.getElementById('chat-message-input').value = '';
        this.loadMessages(this.activeRoom);
    }
    async createRoom(name, members = []) {
        const Room = Parse.Object.extend('VibeChatRoom');
        const r = new Room();
        r.set('name', name);
        r.set('members', [this.app.currentUser, ...members]);
        r.set('isGroup', members.length > 0);
        await r.save();
        showNotification('Room created');
        await this.loadChatRooms();
    }
    async createAudioRoom(name) {
        const Room = Parse.Object.extend('VibeAudioRoom');
        const r = new Room();
        r.set('name', name);
        r.set('host', this.app.currentUser);
        r.set('members', [this.app.currentUser]);
        r.set('startedAt', new Date());
        await r.save();
        showNotification('Audio room created');
    }
    async createSecureChat(receiverId) {
        const Secure = Parse.Object.extend('VibeSecureChat');
        const s = new Secure();
        s.set('sender', this.app.currentUser);
        s.set('receiver', { __type: 'Pointer', className: '_User', objectId: receiverId });
        s.set('encryptionLevel', 'high');
        await s.save();
        showNotification('Secure chat initiated');
    }
}

// ==================== WALLET SERVICE ====================
class WalletService {
    constructor(app) { this.app = app; }
    async ensureWalletExists() {
        const Wallet = Parse.Object.extend('VibeWallet');
        let w = await new Parse.Query(Wallet).equalTo('owner', this.app.currentUser).first();
        if (!w) {
            w = new Wallet();
            w.set('owner', this.app.currentUser);
            w.set('balance', 1000);
            w.set('currency', 'VIBE');
            await w.save();
        }
        return w;
    }
    async ensureLoyaltyProgramExists() {
        const Loyalty = Parse.Object.extend('VibeLoyaltyProgram');
        let l = await new Parse.Query(Loyalty).equalTo('user', this.app.currentUser).first();
        if (!l) {
            l = new Loyalty();
            l.set('user', this.app.currentUser);
            l.set('points', 0);
            l.set('level', 'Bronze');
            await l.save();
        }
        return l;
    }
    async getBalance() {
        const w = await this.ensureWalletExists();
        return w.get('balance');
    }
    async addFunds(amount) {
        const w = await this.ensureWalletExists();
        w.increment('balance', amount);
        await w.save();
        const tx = new Parse.Object('WalletTransaction');
        tx.set('wallet', w);
        tx.set('type', 'credit');
        tx.set('amount', amount);
        tx.set('description', 'Added funds');
        tx.set('status', 'completed');
        tx.set('reference', 'TX_' + Date.now());
        tx.set('timestamp', new Date());
        await tx.save();
        showNotification(`Added ${amount} VIBE`);
        await this.displayWalletInfo();
    }
    async sendMoney(toUserId, amount) {
        const from = await this.ensureWalletExists();
        if (from.get('balance') < amount) throw new Error('Insufficient funds');
        const to = await new Parse.Query('VibeWallet').equalTo('owner', { __type: 'Pointer', className: '_User', objectId: toUserId }).first();
        if (!to) throw new Error('Recipient wallet not found');
        from.increment('balance', -amount);
        to.increment('balance', amount);
        await Parse.Object.saveAll([from, to]);
        const tx1 = new Parse.Object('WalletTransaction');
        tx1.set('wallet', from);
        tx1.set('type', 'debit');
        tx1.set('amount', amount);
        tx1.set('description', `Sent to ${toUserId}`);
        tx1.set('status', 'completed');
        tx1.set('reference', 'TX_' + Date.now());
        tx1.set('timestamp', new Date());
        await tx1.save();
        const tx2 = new Parse.Object('WalletTransaction');
        tx2.set('wallet', to);
        tx2.set('type', 'credit');
        tx2.set('amount', amount);
        tx2.set('description', `Received from ${this.app.currentUser.id}`);
        tx2.set('status', 'completed');
        tx2.set('reference', 'TX_' + Date.now() + 'r');
        tx2.set('timestamp', new Date());
        await tx2.save();
        showNotification(`Sent ${amount} VIBE`);
        await this.displayWalletInfo();
    }
    async sendTip(creatorId, amount, message) {
        const from = await this.ensureWalletExists();
        if (from.get('balance') < amount) throw new Error('Insufficient funds');
        const to = await new Parse.Query('VibeWallet').equalTo('owner', { __type: 'Pointer', className: '_User', objectId: creatorId }).first();
        if (!to) throw new Error('Creator wallet not found');
        from.increment('balance', -amount);
        to.increment('balance', amount);
        await Parse.Object.saveAll([from, to]);
        const tip = new Parse.Object('VibeTips');
        tip.set('sender', this.app.currentUser);
        tip.set('creator', { __type: 'Pointer', className: '_User', objectId: creatorId });
        tip.set('amount', amount);
        tip.set('message', message || '');
        await tip.save();
        await this.addLoyaltyPoints(10);
        showNotification('Tip sent');
        await this.displayWalletInfo();
    }
    async addLoyaltyPoints(points) {
        const l = await this.ensureLoyaltyProgramExists();
        l.increment('points', points);
        const total = l.get('points');
        if (total >= 1000) l.set('level', 'Platinum');
        else if (total >= 500) l.set('level', 'Gold');
        else if (total >= 100) l.set('level', 'Silver');
        await l.save();
    }
    async getTransactionHistory() {
        const w = await this.ensureWalletExists();
        return await new Parse.Query('WalletTransaction').equalTo('wallet', w).descending('createdAt').limit(20).find();
    }
    async displayWalletInfo() {
        const balance = await this.getBalance();
        document.getElementById('wallet-balance-display').innerText = balance;
        document.getElementById('wallet-balance').innerText = balance;
        const loyalty = await this.ensureLoyaltyProgramExists();
        document.getElementById('loyalty-points-display').innerText = loyalty.get('points');
        document.getElementById('loyalty-level-display').innerText = loyalty.get('level');
        const txns = await this.getTransactionHistory();
        document.getElementById('transactions-list').innerHTML = txns.map(t => `<div>${t.get('description')}: ${t.get('amount')} VIBE</div>`).join('');
        document.getElementById('transactions-list-wallet').innerHTML = document.getElementById('transactions-list').innerHTML;
    }
    async checkoutCart() {
        showNotification('Checkout coming soon (payment integration)');
    }
}

// ==================== COMMUNITY SERVICE ====================
class CommunityService {
    constructor(app) { this.app = app; }
    async createCommunity(data) {
        const Comm = Parse.Object.extend('VibeCommunity');
        const c = new Comm();
        c.set('name', data.name);
        c.set('description', data.description || '');
        c.set('owner', this.app.currentUser);
        c.set('members', [this.app.currentUser]);
        c.set('privacy', data.privacy || 'public');
        c.set('memberCount', 1);
        c.set('postCount', 0);
        c.set('category', data.category || 'General');
        await c.save();
        showNotification('Community created');
        await this.loadCommunities();
    }
    async loadCommunities() {
        const q = new Parse.Query('VibeCommunity').include('owner').descending('memberCount');
        const comms = await q.find();
        const container = document.getElementById('communities-grid');
        if (container) {
            container.innerHTML = comms.map(c => `<div class="card"><h4>${c.get('name')}</h4><p>${c.get('description') || ''}</p><button data-id="${c.id}" class="view-community-btn">View</button></div>`).join('');
            container.querySelectorAll('.view-community-btn').forEach(b => b.onclick = () => this.viewCommunity(b.dataset.id));
        }
    }
    async viewCommunity(id) {
        const c = await new Parse.Query('VibeCommunity').get(id);
        document.getElementById('communities-grid').classList.add('hidden');
        const view = document.getElementById('selected-community-view');
        view.classList.remove('hidden');
        document.getElementById('community-name').innerText = c.get('name');
        const posts = await new Parse.Query('Post').equalTo('community', c).include('author').descending('createdAt').find();
        let html = `<p><strong>Description:</strong> ${c.get('description') || 'No description'}</p>`;
        html += `<p><strong>Members:</strong> ${c.get('members').length}</p>`;
        html += `<button id="post-in-community-btn" class="vibe-button" style="margin:10px 0;">Post in Community</button>`;
        html += `<div id="community-posts-container">`;
        if (posts.length) {
            html += posts.map(p => `<div class="post"><strong>${displayNameOf(p.get('author'))}</strong>: ${p.get('content')}</div>`).join('');
        } else {
            html += '<p>No posts yet.</p>';
        }
        html += `</div>`;
        document.getElementById('community-posts').innerHTML = html;
        document.getElementById('post-in-community-btn').onclick = async () => {
            const content = prompt('Share something:');
            if (content) {
                await this.app.services.posts.createPost(content);
                showNotification('Posted in community');
                await this.viewCommunity(id);
            }
        };
        document.getElementById('back-to-communities').onclick = () => {
            view.classList.add('hidden');
            document.getElementById('communities-grid').classList.remove('hidden');
        };
    }
    async joinCommunity(id) {
        const c = await new Parse.Query('VibeCommunity').get(id);
        c.addUnique('members', this.app.currentUser);
        c.set('memberCount', c.get('members').length);
        await c.save();
        showNotification('Joined community');
    }
    loadPopularCommunities() { return this.loadCommunities(); }
}

// ==================== EVENT SERVICE ====================
class EventService {
    constructor(app) { this.app = app; }
    async createEvent(data) {
        const Event = Parse.Object.extend('VibeEvent');
        const e = new Event();
        e.set('host', this.app.currentUser);
        e.set('title', data.title);
        e.set('description', data.description);
        e.set('eventDate', new Date(data.date));
        e.set('location', data.location || 'Online');
        e.set('ticketsAvailable', data.tickets || 100);
        e.set('price', data.price || 0);
        await e.save();
        showNotification('Event created');
        await this.loadEvents();
    }
    async loadEvents() {
        const q = new Parse.Query('VibeEvent').greaterThan('eventDate', new Date()).include('host').ascending('eventDate');
        const events = await q.find();
        const container = document.getElementById('events-list');
        if (container) {
            container.innerHTML = events.map(e => `<div class="card"><h4>${e.get('title')}</h4><p>${e.get('description')}</p><button data-id="${e.id}" class="rsvp-btn">RSVP</button></div>`).join('');
            container.querySelectorAll('.rsvp-btn').forEach(b => b.onclick = () => this.rsvp(b.dataset.id));
        }
    }
    async rsvp(eventId) {
        const e = await new Parse.Query('VibeEvent').get(eventId);
        e.addUnique('attendees', this.app.currentUser);
        await e.save();
        showNotification('RSVP confirmed');
    }
    async startLiveStream(title) {
        const Stream = Parse.Object.extend('VibeLiveStream');
        const s = new Stream();
        s.set('host', this.app.currentUser);
        s.set('title', title);
        s.set('isLive', true);
        s.set('startedAt', new Date());
        await s.save();
        showNotification('Live stream started');
        await this.loadLiveStreams();
    }
    async loadLiveStreams() {
        const q = new Parse.Query('VibeLiveStream').equalTo('isLive', true).include('host');
        const streams = await q.find();
        const container = document.getElementById('live-streams-list');
        if (container) {
            container.innerHTML = streams.map(s => `<div class="card"><h4>${s.get('title')}</h4><button onclick="alert('Watch stream ${s.id}')">Watch</button></div>`).join('');
        }
    }
}

// ==================== MARKETPLACE SERVICE ====================
class MarketplaceService {
    constructor(app) { this.app = app; }
    async createItem(data) {
        const Item = Parse.Object.extend('MarketplaceItem');
        const i = new Item();
        i.set('seller', this.app.currentUser);
        i.set('title', data.title);
        i.set('description', data.description);
        i.set('price', data.price);
        i.set('currency', 'VIBE');
        i.set('status', 'available');
        await i.save();
        showNotification('Item listed');
        await this.loadItems();
    }
    async loadItems() {
        const items = await new Parse.Query('MarketplaceItem').equalTo('status', 'available').include('seller').descending('createdAt').find();
        const container = document.getElementById('marketplace-items');
        if (container) {
            container.innerHTML = items.map(i => `<div class="card"><h4>${i.get('title')}</h4><p>${i.get('price')} VIBE</p><button onclick="window.vibeApp.services.marketplace.addToCart('${i.id}')">Add to Cart</button></div>`).join('');
        }
    }
    async addToCart(itemId) {
        let cart = await new Parse.Query('VibeShoppingCart').equalTo('owner', this.app.currentUser).equalTo('status', 'active').first();
        if (!cart) {
            cart = new Parse.Object('VibeShoppingCart');
            cart.set('owner', this.app.currentUser);
            cart.set('items', []);
            cart.set('status', 'active');
        }
        const items = cart.get('items') || [];
        const existing = items.find(i => i.itemId === itemId);
        if (existing) existing.quantity++;
        else items.push({ itemId, quantity: 1 });
        cart.set('items', items);
        await cart.save();
        showNotification('Added to cart');
    }
    async createGig(data) {
        const Gig = Parse.Object.extend('VibeGig');
        const g = new Gig();
        g.set('poster', this.app.currentUser);
        g.set('skillNeeded', data.skill);
        g.set('description', data.desc);
        g.set('payment', data.payment);
        g.set('status', 'open');
        await g.save();
        showNotification('Gig posted');
        await this.loadGigs();
    }
    async loadGigs() {
        const gigs = await new Parse.Query('VibeGig').equalTo('status', 'open').include('poster').find();
        const container = document.getElementById('vibe-gigs');
        if (container) {
            container.innerHTML = gigs.map(g => `<div class="card"><h4>${g.get('skillNeeded')}</h4><p>${g.get('payment')} VIBE</p><button onclick="window.vibeApp.services.marketplace.applyToGig('${g.id}')">Apply</button></div>`).join('');
        }
    }
    async applyToGig(gigId) {
        const gig = await new Parse.Query('VibeGig').get(gigId);
        gig.addUnique('applicants', this.app.currentUser);
        await gig.save();
        showNotification('Applied');
    }
}

// ==================== LEARNING SERVICE ====================
class LearningService {
    constructor(app) { this.app = app; }
    async createCourse(data) {
        const Course = Parse.Object.extend('VibeCourse');
        const c = new Course();
        c.set('instructor', this.app.currentUser);
        c.set('title', data.title);
        c.set('description', data.description);
        c.set('price', data.price || 0);
        c.set('modules', []);
        await c.save();
        showNotification('Course created');
        await this.loadCourses();
    }
    async loadCourses() {
        const q = new Parse.Query('VibeCourse').include('instructor');
        const courses = await q.find();
        const container = document.getElementById('courses-list');
        if (container) {
            container.innerHTML = courses.map(c => `<div class="card"><h4>${c.get('title')}</h4><p>${c.get('price')} VIBE</p><button data-id="${c.id}" class="enroll-btn">Enroll</button></div>`).join('');
            container.querySelectorAll('.enroll-btn').forEach(b => b.onclick = () => this.enroll(b.dataset.id));
        }
    }
    async enroll(courseId) {
        const c = await new Parse.Query('VibeCourse').get(courseId);
        c.addUnique('enrolledStudents', this.app.currentUser);
        await c.save();
        showNotification('Enrolled');
    }
    async createQuiz(data) {
        const Quiz = Parse.Object.extend('VibeQuiz');
        const q = new Quiz();
        q.set('title', data.title);
        q.set('questions', data.questions);
        q.set('course', { __type: 'Pointer', className: 'VibeCourse', objectId: data.courseId });
        await q.save();
        showNotification('Quiz created');
    }
    async loadLiveTutoringSessions() {
        return [];
    }
}

// ==================== GAMING SERVICE ====================
class GamingService {
    constructor(app) { this.app = app; }
    async createSession(data) {
        const Session = Parse.Object.extend('VibeGameSession');
        const s = new Session();
        s.set('host', this.app.currentUser);
        s.set('gameType', data.gameType);
        s.set('title', data.title);
        s.set('maxPlayers', data.maxPlayers || 4);
        s.set('currentPlayers', [this.app.currentUser]);
        s.set('status', 'waiting');
        await s.save();
        showNotification('Game session created');
        await this.loadSessions();
    }
    async loadSessions() {
        const q = new Parse.Query('VibeGameSession').containedIn('status', ['waiting', 'active']).include('host');
        const sessions = await q.find();
        const container = document.getElementById('game-sessions-list');
        if (container) {
            container.innerHTML = sessions.map(s => `<div class="card"><h4>${s.get('title')}</h4><p>${s.get('currentPlayers').length}/${s.get('maxPlayers')}</p><button data-id="${s.id}" class="join-session-btn">Join</button></div>`).join('');
            container.querySelectorAll('.join-session-btn').forEach(b => b.onclick = () => this.joinSession(b.dataset.id));
        }
    }
    async joinSession(sessionId) {
        const s = await new Parse.Query('VibeGameSession').get(sessionId);
        if (s.get('currentPlayers').length >= s.get('maxPlayers')) throw new Error('Session full');
        s.addUnique('currentPlayers', this.app.currentUser);
        await s.save();
        showNotification('Joined game');
        await this.loadSessions();
    }
    async createTournament(data) {
        const Tournament = Parse.Object.extend('VibeTournament');
        const t = new Tournament();
        t.set('organizer', this.app.currentUser);
        t.set('title', data.title);
        t.set('gameType', data.gameType);
        t.set('maxParticipants', data.max);
        t.set('status', 'registration');
        await t.save();
        showNotification('Tournament created');
    }
    async loadActiveGameSessions() { return this.loadSessions(); }
}

// ==================== DISCOVERY SERVICE ====================
class DiscoveryService {
    constructor(app) { this.app = app; }
    async loadRecommendations() {
        const q = new Parse.Query('Post').descending('createdAt').limit(20).include('author');
        const posts = await q.find();
        const container = document.getElementById('recommendations-grid');
        if (container) {
            container.innerHTML = posts.map(p => `<div class="card"><h4>${displayNameOf(p.get('author'))}</h4><p>${p.get('content')}</p></div>`).join('');
        }
    }
    async search(query) {
        const q = new Parse.Query('Post').contains('content', query).limit(20);
        return await q.find();
    }
    async loadTrendingTags() {
        const container = document.getElementById('trending-tags');
        if (container) container.innerHTML = '<span>#VibeLink</span> <span>#Africa</span> <span>#Tech</span>';
    }
    async loadChallenges() {
        const q = new Parse.Query('VibeChallenge').greaterThan('endDate', new Date());
        const challenges = await q.find();
        const container = document.getElementById('challenges-list');
        if (container) {
            container.innerHTML = challenges.map(c => `<div class="card"><h4>${c.get('title')}</h4><button onclick="window.vibeApp.services.discovery.joinChallenge('${c.id}')">Join</button></div>`).join('');
        }
    }
    async joinChallenge(id) {
        const c = await new Parse.Query('VibeChallenge').get(id);
        c.addUnique('participants', this.app.currentUser);
        await c.save();
        showNotification('Joined challenge');
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
        if (!this.app.currentUser) throw new Error('Not logged in');
        const Settings = Parse.Object.extend('VibeUserSettings');
        let s = await new Parse.Query(Settings).equalTo('user', this.app.currentUser).first();
        if (!s) {
            s = new Settings();
            s.set('user', this.app.currentUser);
            s.set('privacy', { profileVisibility: 'public' });
            s.set('notifications', { push: true });
            s.set('appearance', { theme: 'auto' });
            await s.save();
        }
        return s;
    }
    async displaySettings() {
        const s = await this.getUserSettings();
        const container = document.getElementById('user-settings-container');
        if (container) {
            container.innerHTML = `<div class="card"><h4>Settings</h4><pre>${JSON.stringify(s.toJSON(), null, 2)}</pre></div>`;
        } else {
            showNotification('Settings loaded (no container found)', 'warning');
        }
    }
    async exportUserData() {
        showNotification('Exporting user data... (JSON)');
        const data = { user: this.app.currentUser.toJSON(), timestamp: new Date() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vibelink-export.json';
        a.click();
        showNotification('Data exported');
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
        const AR = Parse.Object.extend('VibeARExperience');
        const exp = new AR();
        exp.set('creator', this.app.currentUser);
        exp.set('experienceType', data.type);
        exp.set('interactiveObjects', data.interactiveObjects || []);
        exp.set('filters', data.filters || []);
        await exp.save();
        showNotification('AR experience created');
        await this.loadExperiences();
    }
    async loadExperiences() {
        const q = new Parse.Query('VibeARExperience').include('creator').descending('createdAt');
        const exps = await q.find();
        const container = document.getElementById('ar-list');
        if (container) {
            container.innerHTML = exps.map(e => `<div class="card"><h4>${e.get('experienceType')}</h4><p>By ${displayNameOf(e.get('creator'))}</p><button onclick="alert('AR viewer coming')">View</button></div>`).join('');
        }
    }
}

// ==================== QA SERVICE ====================
class QAService {
    constructor(app) { this.app = app; }
    async askQuestion(data) {
        const QA = Parse.Object.extend('VibeQuestion');
        const q = new QA();
        q.set('author', this.app.currentUser);
        q.set('title', data.question);
        q.set('description', data.question);
        q.set('category', data.topic || 'General');
        q.set('tags', []);
        q.set('status', 'open');
        await q.save();
        showNotification('Question asked');
        await this.loadQuestions();
    }
    async loadQuestions() {
        const q = new Parse.Query('VibeQuestion').include('author').descending('createdAt').limit(20);
        const questions = await q.find();
        const container = document.getElementById('qa-list');
        if (container) {
            container.innerHTML = questions.map(q => `<div class="card"><h4>${q.get('title')}</h4><p>${q.get('description')}</p></div>`).join('');
        }
    }
}

// ==================== REALTIME MANAGER ====================
class RealtimeManager {
    constructor(app) { this.app = app; this.subscriptions = new Map(); }
    async initialize() {
        try {
            const Post = Parse.Object.extend('Post');
            const postSub = await new Parse.Query(Post).subscribe();
            postSub.on('create', post => this.app.services.posts?.loadFeed());
            this.subscriptions.set('posts', postSub);
            console.log('✅ LiveQuery subscriptions active');
        } catch (e) {
            console.warn('Realtime disabled', e);
        }
    }
    broadcastUpdate(type, data) {
        console.log('Broadcast:', type, data);
    }
    unsubscribeAll() {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions.clear();
    }
    async reconnect() {
        await this.initialize();
    }
}

// ==================== AI SERVICE ====================
class AIService {
    constructor(app) { this.app = app; }
    async trackUserBehavior(action, data) {
        const AI = Parse.Object.extend('AI');
        const q = new Parse.Query(AI).equalTo('user', this.app.currentUser);
        let ai = await q.first();
        if (!ai) {
            ai = new AI();
            ai.set('user', this.app.currentUser);
            ai.set('aiData', {});
            ai.set('preferences', {});
            ai.set('learningPattern', {});
        }
        const lp = ai.get('learningPattern') || {};
        lp[action] = lp[action] || { count: 0, lastPerformed: new Date() };
        lp[action].count++;
        lp[action].lastPerformed = new Date();
        ai.set('learningPattern', lp);
        await ai.save();
        await this.trackAnalytics(action, data);
    }
    async trackAnalytics(actionType, data) {
        const VibeAnalytics = Parse.Object.extend('VibeAnalytics');
        const a = new VibeAnalytics();
        a.set('user', this.app.currentUser);
        a.set('actionType', actionType);
        a.set('reach', data.reach || 1);
        a.set('engagement', data.engagement || 1);
        a.set('date', new Date());
        await a.save();
    }
    async getAISuggestions(context) {
        return { content: [], connections: [], groups: [], events: [], challenges: [] };
    }
}

// ==================== NOTIFICATION SERVICE ====================
class NotificationService {
    constructor(app) { this.app = app; }
    async createNotification(userId, type, message) {
        const Notification = Parse.Object.extend('Notification');
        const n = new Notification();
        n.set('user', { __type: 'Pointer', className: '_User', objectId: userId });
        n.set('type', type);
        n.set('message', message);
        n.set('read', false);
        await n.save();
        return n;
    }
    async markAsRead(notifId) {
        const n = await new Parse.Query('Notification').get(notifId);
        n.set('read', true);
        await n.save();
    }
    async getUserNotifications(userId, limit = 20) {
        const q = new Parse.Query('Notification').equalTo('user', { __type: 'Pointer', className: '_User', objectId: userId }).descending('createdAt').limit(limit);
        return await q.find();
    }
    async notifyFollowers(message) {
        const followers = await new Parse.Query('VibeFollow').equalTo('following', this.app.currentUser).include('follower').find();
        for (let f of followers) {
            await this.createNotification(f.get('follower').id, 'follower_update', message);
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
            document.getElementById('chat-window')?.classList.add('hidden');
            if (this.services.chat.subscription) this.services.chat.subscription.unsubscribe();
        });
        document.getElementById('close-story')?.addEventListener('click', () => document.getElementById('story-viewer').classList.add('hidden'));
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
                document.getElementById(`profile-${tab.dataset.tab}-tab`)?.classList.add('active');
                if (tab.dataset.tab === 'wallet') this.services.wallet.displayWalletInfo();
            });
        });
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const input = this.closest('.password-wrapper').querySelector('input');
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
        document.getElementById('show-signup')?.addEventListener('click', e => {
            e.preventDefault();
            document.getElementById('login-form').classList.remove('active');
            document.getElementById('signup-form').classList.add('active');
        });
        document.getElementById('show-login')?.addEventListener('click', e => {
            e.preventDefault();
            document.getElementById('signup-form').classList.remove('active');
            document.getElementById('login-form').classList.add('active');
        });
        document.getElementById('logout-menu-btn')?.addEventListener('click', () => this.services.auth.handleLogout());
    }
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
    hideMainSection() {
        document.getElementById('main-section').classList.remove('active');
    }
}

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', () => {
    window.vibeApp = new VibeLink0372();
    window.vibeApp.initializeApp();
});