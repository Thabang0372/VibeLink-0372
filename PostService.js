class PostService {
    constructor(app) {
        this.app = app;
        this.encryption = new EncryptionService();
    }

    async createPost(content, media = null) {
        const Post = Parse.Object.extend('Post');
        const p = new Post();
        p.set('content', content);
        p.set('author', this.app.currentUser);
        p.set('likesCount', 0);
        p.set('commentCount', 0);
        p.set('shareCount', 0);
        if (media) {
            const file = new Parse.File('media.jpg', media);
            await file.save();
            p.set('media', [file]);
        }
        await p.save();
        showNotification('Post created');
        await this.loadFeed();
    }

    async loadFeed() {
        const q = new Parse.Query('Post').include('author').descending('createdAt').limit(20);
        const posts = await q.find();
        for (let p of posts) {
            const raw = p.get('content');
            if (typeof raw === 'string' && raw.startsWith('{') && raw.includes('"iv"')) {
                try {
                    const payload = JSON.parse(raw);
                    const dec = await this.encryption.decrypt(payload);
                    p.set('decryptedContent', dec);
                } catch (e) {
                    p.set('decryptedContent', '[Encrypted]');
                }
            } else {
                p.set('decryptedContent', raw || '');
            }
        }
        this.displayPosts(posts);
    }

    // Alias for the "Feed" tab
    async loadFeedPosts() {
        await this.loadFeed();
    }

    async loadUserPosts(userId) {
        const q = new Parse.Query('Post').equalTo('author', { __type: 'Pointer', className: '_User', objectId: userId }).descending('createdAt').limit(20);
        const posts = await q.find();
        for (let p of posts) {
            const raw = p.get('content');
            if (typeof raw === 'string' && raw.startsWith('{') && raw.includes('"iv"')) {
                try {
                    const dec = await this.encryption.decrypt(JSON.parse(raw));
                    p.set('decryptedContent', dec);
                } catch (e) { p.set('decryptedContent', '[Encrypted]'); }
            } else {
                p.set('decryptedContent', raw || '');
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
        if (!confirm('Delete this post permanently?')) return;
        const post = await new Parse.Query('Post').get(postId);
        if (post.get('author').id !== this.app.currentUser.id) {
            showNotification('You can only delete your own posts', 'error');
            return;
        }
        await post.destroy();
        showNotification('Post deleted');
        await this.loadFeed();
    }

    async sharePost(postId) {
        const post = await new Parse.Query('Post').get(postId);
        const url = `${window.location.origin}?post=${postId}`;
        if (navigator.share) {
            await navigator.share({ title: `Post by ${post.get('author').get('username')}`, text: post.get('decryptedContent'), url });
        } else {
            await navigator.clipboard.writeText(url);
            showNotification('Link copied');
        }
        post.increment('shareCount');
        await post.save();
    }

    displayPosts(posts) {
        const container = document.getElementById('home-feed') || document.getElementById('feed-posts');
        if (!container) return;
        container.innerHTML = posts.map(p => `
            <div class="post">
                <div class="post-header">
                    <img src="${p.get('author').get('avatar')?.url() || 'assets/default-avatar.png'}" class="post-avatar">
                    <span class="post-author">${p.get('author').get('username')}</span>
                    <span class="post-time">${formatTime(p.createdAt)}</span>
                </div>
                <div class="post-content">${p.get('decryptedContent')}</div>
                ${p.get('media')?.length ? `<img src="${p.get('media')[0].url()}" class="post-media">` : ''}
                <div class="post-actions">
                    <button class="post-action like-btn" data-id="${p.id}"><i class="far fa-heart"></i> ${p.get('likesCount')||0}</button>
                    <button class="post-action comment-btn" data-id="${p.id}"><i class="far fa-comment"></i> ${p.get('commentCount')||0}</button>
                    <button class="post-action share-btn" data-id="${p.id}"><i class="fas fa-share"></i></button>
                    ${p.get('author').id === this.app.currentUser.id ? `<button class="post-action delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `).join('');
        container.querySelectorAll('.like-btn').forEach(b => b.onclick = () => this.likePost(b.dataset.id));
        container.querySelectorAll('.comment-btn').forEach(b => b.onclick = () => { const txt = prompt('Comment:'); if(txt) this.commentOnPost(b.dataset.id, txt); });
        container.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => this.deletePost(b.dataset.id));
        container.querySelectorAll('.share-btn').forEach(b => b.onclick = () => this.sharePost(b.dataset.id));
    }
}
window.PostService = PostService;