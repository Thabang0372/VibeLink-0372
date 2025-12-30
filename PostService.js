class PostService {
    constructor(app) {
        this.app = app;
    }

    async createPost(content, media = [], options = {}) {
        if (!content.trim()) throw new Error('Post content cannot be empty');
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const Post = this.app.services.parse.getClass('Post');
        const post = new Post();
        
        const encryptedContent = await this.app.services.encryption.encrypt(content);

        post.set('author', this.app.currentUser);
        post.set('content', encryptedContent);
        post.set('media', media);
        post.set('vibeTags', this.extractTags(content));
        post.set('aiSuggestions', {});
        post.set('milestones', []);
        post.set('pinned', false);
        post.set('visibility', options.visibility || 'public');
        post.set('reactions', {});
        post.set('shares', 0);
        post.set('commentCount', 0);
        post.set('location', options.location || null);

        await post.save();
        
        await this.app.services.ai.trackPostAnalytics(post.id, 'create');
        
        this.app.showSuccess('Post created successfully! 🎉');
        await this.loadFeedPosts();
        
        return post;
    }

    async commentOnPost(postId, commentText) {
        if (!this.app.currentUser) throw new Error('Please login to comment');
        if (!commentText.trim()) throw new Error('Comment cannot be empty');

        const Comment = this.app.services.parse.getClass('Comment');
        const comment = new Comment();
        
        const encryptedContent = await this.app.services.encryption.encrypt(commentText);

        comment.set('author', this.app.currentUser);
        comment.set('content', encryptedContent);
        comment.set('post', this.app.services.parse.createPointer('Post', postId));
        comment.set('likes', 0);
        comment.set('parentComment', null);

        await comment.save();
        
        await this.incrementPostCommentCount(postId);
        
        this.app.services.realtime.broadcastUpdate('comment', {
            postId: postId,
            commentId: comment.id,
            author: this.app.currentUser.get('username'),
            timestamp: new Date()
        });

        await this.app.services.ai.trackPostAnalytics(postId, 'comment');

        this.app.showSuccess('Comment added successfully! 💬');
        await this.loadFeedPosts();
        
        return comment;
    }

    async likePost(postId, reactionType = 'like') {
        if (!this.app.currentUser) throw new Error('Please login to react');

        const Like = this.app.services.parse.getClass('Like');
        const query = new Parse.Query(Like);
        query.equalTo('user', this.app.currentUser);
        query.equalTo('post', this.app.services.parse.createPointer('Post', postId));
        
        const existingLike = await query.first();
        
        if (existingLike) {
            existingLike.set('reaction', reactionType);
            await existingLike.save();
        } else {
            const like = new Like();
            like.set('user', this.app.currentUser);
            like.set('post', this.app.services.parse.createPointer('Post', postId));
            like.set('type', 'reaction');
            like.set('reaction', reactionType);
            await like.save();
            
            await this.updatePostReactions(postId, reactionType);
        }
        
        this.app.services.realtime.broadcastUpdate('reaction', {
            postId: postId,
            reactionType: reactionType,
            user: this.app.currentUser.get('username')
        });

        await this.app.services.ai.trackPostAnalytics(postId, 'reaction');

        this.app.showSuccess(`Reacted with ${reactionType}! ❤️`);
        await this.loadFeedPosts();
        
        return { success: true, reaction: reactionType };
    }

    async sharePost(postId) {
        if (!this.app.currentUser) throw new Error('Please login to share');

        try {
            const Post = this.app.services.parse.getClass('Post');
            const query = new Parse.Query(Post);
            const originalPost = await query.get(postId);
            
            const sharedPost = new Post();
            sharedPost.set('author', this.app.currentUser);
            sharedPost.set('content', await this.app.services.encryption.encrypt(
                `🔁 Shared: ${(await this.app.services.encryption.decrypt(originalPost.get('content'))).substring(0, 100)}...`
            ));
            sharedPost.set('originalPost', originalPost);
            sharedPost.set('isShare', true);
            sharedPost.set('shares', 0);
            sharedPost.set('vibeTags', ['share']);
            
            await sharedPost.save();
            
            originalPost.increment('shares');
            await originalPost.save();
            
            this.app.services.realtime.broadcastUpdate('share', {
                originalPostId: postId,
                sharedPostId: sharedPost.id,
                sharer: this.app.currentUser.get('username')
            });

            await this.app.services.ai.trackPostAnalytics(postId, 'share');

            this.app.showSuccess('Post shared successfully! 🔄');
            await this.loadFeedPosts();
            
            return sharedPost;
            
        } catch (error) {
            this.app.showError('Failed to share post: ' + error.message);
            throw error;
        }
    }

    async updatePostReactions(postId, reactionType) {
        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        const post = await query.get(postId);
        
        const currentReactions = post.get('reactions') || {};
        currentReactions[reactionType] = (currentReactions[reactionType] || 0) + 1;
        post.set('reactions', currentReactions);
        await post.save();
    }

    async incrementPostCommentCount(postId) {
        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        const post = await query.get(postId);
        post.increment('commentCount');
        await post.save();
    }

    async loadFeedPosts(limit = 20) {
        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        query.include('author');
        query.descending('createdAt');
        query.limit(limit);

        try {
            const posts = await query.find();
            
            for (const post of posts) {
                try {
                    const decryptedContent = await this.app.services.encryption.decrypt(post.get('content'));
                    post.set('decryptedContent', decryptedContent);
                } catch (error) {
                    console.error('Failed to decrypt post content:', error);
                    post.set('decryptedContent', '[Encrypted content]');
                }
            }
            
            this.displayPosts(posts);
            return posts;
        } catch (error) {
            console.error('Error loading posts:', error);
            this.app.showError('Failed to load posts');
            return [];
        }
    }

    async loadUserPosts(userId, limit = 20) {
        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        query.equalTo('author', this.app.services.parse.createPointer('_User', userId));
        query.include('author');
        query.descending('createdAt');
        query.limit(limit);

        try {
            const posts = await query.find();
            
            for (const post of posts) {
                try {
                    const decryptedContent = await this.app.services.encryption.decrypt(post.get('content'));
                    post.set('decryptedContent', decryptedContent);
                } catch (error) {
                    post.set('decryptedContent', '[Encrypted content]');
                }
            }
            
            return posts;
        } catch (error) {
            console.error('Error loading user posts:', error);
            return [];
        }
    }

    async deletePost(postId) {
        if (!this.app.currentUser) throw new Error('Please login to delete post');

        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        query.equalTo('author', this.app.currentUser);
        
        const post = await query.get(postId);
        if (!post) throw new Error('Post not found or not authorized');

        await post.destroy();
        this.app.showSuccess('Post deleted successfully');
        await this.loadFeedPosts();
    }

    async pinPost(postId) {
        if (!this.app.currentUser) throw new Error('Please login to pin post');

        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        query.equalTo('author', this.app.currentUser);
        
        const post = await query.get(postId);
        if (!post) throw new Error('Post not found or not authorized');

        post.set('pinned', true);
        await post.save();
        
        this.app.showSuccess('Post pinned to profile');
        return post;
    }

    extractTags(content) {
        const tags = content.match(/#[\w]+/g) || [];
        return tags.map(tag => tag.substring(1));
    }

    displayPosts(posts) {
        const postsContainer = document.getElementById('feed-posts');
        if (!postsContainer) return;

        postsContainer.innerHTML = posts.map(post => `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.get('author').get('avatar') || '/assets/default-avatar.png'}" 
                         alt="${post.get('author').get('username')}" class="post-avatar">
                    <div class="post-user-info">
                        <strong>${post.get('author').get('username')}</strong>
                        <span class="post-time">${this.formatTime(post.get('createdAt'))}</span>
                    </div>
                    ${post.get('pinned') ? '<span class="pinned-badge">📌 Pinned</span>' : ''}
                </div>
                <div class="post-content">
                    ${post.get('decryptedContent')}
                </div>
                ${post.get('media') && post.get('media').length > 0 ? `
                    <div class="post-media">
                        ${post.get('media').map(media => `
                            <img src="${media.url}" alt="Post media" class="post-media-image">
                        `).join('')}
                    </div>
                ` : ''}
                ${post.get('vibeTags') && post.get('vibeTags').length > 0 ? `
                    <div class="post-tags">
                        ${post.get('vibeTags').map(tag => `
                            <span class="post-tag">#${tag}</span>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="post-stats">
                    <span>${post.get('reactions') ? Object.values(post.get('reactions')).reduce((a, b) => a + b, 0) : 0} reactions</span>
                    <span>${post.get('commentCount') || 0} comments</span>
                    <span>${post.get('shares') || 0} shares</span>
                </div>
                <div class="post-actions">
                    <button onclick="vibeApp.services.posts.likePost('${post.id}')" class="btn-like">
                        ❤️ ${post.get('reactions')?.like || 0}
                    </button>
                    <button onclick="vibeApp.services.posts.commentOnPost('${post.id}')" class="btn-comment">
                        💬 ${post.get('commentCount') || 0}
                    </button>
                    <button onclick="vibeApp.services.posts.sharePost('${post.id}')" class="btn-share">
                        🔄 ${post.get('shares') || 0}
                    </button>
                    ${post.get('author').id === this.app.currentUser?.id ? `
                        <button onclick="vibeApp.services.posts.deletePost('${post.id}')" class="btn-delete">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    formatTime(date) {
        const now = new Date();
        const postDate = new Date(date);
        const diffMs = now - postDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return postDate.toLocaleDateString();
    }

    // Real-time event handlers
    handleNewPost(post) {
        this.app.showNotification(`New post from ${post.get('author').get('username')}`);
        this.loadFeedPosts();
    }

    handleNewComment(comment) {
        const postId = comment.get('post').id;
        this.app.showNotification(`New comment on your post`);
        this.loadPostComments(postId);
    }

    handleUpdatedPost(post) {
        this.updatePostInUI(post);
    }

    async loadPostComments(postId) {
        const Comment = this.app.services.parse.getClass('Comment');
        const query = new Parse.Query(Comment);
        query.equalTo('post', this.app.services.parse.createPointer('Post', postId));
        query.include('author');
        query.ascending('createdAt');
        
        try {
            const comments = await query.find();
            this.displayComments(comments, postId);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    displayComments(comments, postId) {
        const commentsContainer = document.getElementById(`comments-${postId}`);
        if (!commentsContainer) return;

        commentsContainer.innerHTML = comments.map(comment => `
            <div class="comment-card">
                <div class="comment-header">
                    <img src="${comment.get('author').get('avatar') || '/assets/default-avatar.png'}" 
                         alt="${comment.get('author').get('username')}" class="comment-avatar">
                    <strong>${comment.get('author').get('username')}</strong>
                    <span class="comment-time">${this.formatTime(comment.get('createdAt'))}</span>
                </div>
                <div class="comment-content">
                    ${comment.get('content')}
                </div>
                <div class="comment-actions">
                    <button onclick="vibeApp.services.posts.likeComment('${comment.id}')" class="btn-like">
                        ❤️ ${comment.get('likes') || 0}
                    </button>
                </div>
            </div>
        `).join('');
    }

    async likeComment(commentId) {
        if (!this.app.currentUser) throw new Error('Please login to like comment');

        const Comment = this.app.services.parse.getClass('Comment');
        const query = new Parse.Query(Comment);
        const comment = await query.get(commentId);
        
        comment.increment('likes');
        await comment.save();
        
        this.app.showSuccess('Comment liked!');
        this.loadPostComments(comment.get('post').id);
    }

    updatePostInUI(post) {
        const postElement = document.querySelector(`[data-post-id="${post.id}"]`);
        if (postElement) {
            const reactionsCount = post.get('reactions') ? 
                Object.values(post.get('reactions')).reduce((a, b) => a + b, 0) : 0;
            
            const likeBtn = postElement.querySelector('.btn-like');
            const commentBtn = postElement.querySelector('.btn-comment');
            const shareBtn = postElement.querySelector('.btn-share');
            
            if (likeBtn) likeBtn.innerHTML = `❤️ ${reactionsCount}`;
            if (commentBtn) commentBtn.innerHTML = `💬 ${post.get('commentCount') || 0}`;
            if (shareBtn) shareBtn.innerHTML = `🔄 ${post.get('shares') || 0}`;
        }
    }

    async searchPosts(query, filters = {}) {
        const Post = this.app.services.parse.getClass('Post');
        const searchQuery = new Parse.Query(Post);
        
        if (query) {
            searchQuery.contains('content', query);
        }
        
        if (filters.tags && filters.tags.length > 0) {
            searchQuery.containsAll('vibeTags', filters.tags);
        }
        
        if (filters.author) {
            searchQuery.equalTo('author', this.app.services.parse.createPointer('_User', filters.author));
        }
        
        if (filters.dateRange) {
            searchQuery.greaterThanOrEqualTo('createdAt', new Date(filters.dateRange.start));
            searchQuery.lessThanOrEqualTo('createdAt', new Date(filters.dateRange.end));
        }
        
        searchQuery.include('author');
        searchQuery.descending('createdAt');
        searchQuery.limit(filters.limit || 50);

        try {
            const results = await searchQuery.find();
            
            for (const post of results) {
                try {
                    const decryptedContent = await this.app.services.encryption.decrypt(post.get('content'));
                    post.set('decryptedContent', decryptedContent);
                } catch (error) {
                    post.set('decryptedContent', '[Encrypted content]');
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error searching posts:', error);
            return [];
        }
    }

    async getPostAnalytics(postId) {
        return await this.app.services.ai.analyzePostEngagement(postId);
    }

    async generatePostInsights(postId) {
        const analytics = await this.getPostAnalytics(postId);
        const post = await this.getPostById(postId);
        
        return {
            performance: analytics,
            recommendations: this.generatePostRecommendations(analytics),
            comparisons: await this.compareWithSimilarPosts(post),
            growthOpportunities: this.identifyGrowthOpportunities(analytics)
        };
    }

    async getPostById(postId) {
        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        query.include('author');
        return await query.get(postId);
    }

    generatePostRecommendations(analytics) {
        const recommendations = [];
        
        if (analytics.engagementRate < 0.05) {
            recommendations.push('Try posting at different times to reach more of your audience');
        }
        
        if (analytics.totalReach < 100) {
            recommendations.push('Consider using relevant hashtags to increase visibility');
        }
        
        return recommendations;
    }

    async compareWithSimilarPosts(post) {
        const similarTags = post.get('vibeTags') || [];
        if (similarTags.length === 0) return {};

        const Post = this.app.services.parse.getClass('Post');
        const query = new Parse.Query(Post);
        query.containsAll('vibeTags', similarTags.slice(0, 3));
        query.notEqualTo('objectId', post.id);
        query.limit(5);
        
        try {
            const similarPosts = await query.find();
            return this.analyzeSimilarPostPerformance(similarPosts);
        } catch (error) {
            console.error('Error comparing with similar posts:', error);
            return {};
        }
    }

    analyzeSimilarPostPerformance(posts) {
        const totalReactions = posts.reduce((sum, post) => 
            sum + (post.get('reactions') ? Object.values(post.get('reactions')).reduce((a, b) => a + b, 0) : 0), 0
        );
        
        const totalComments = posts.reduce((sum, post) => sum + (post.get('commentCount') || 0), 0);
        const totalShares = posts.reduce((sum, post) => sum + (post.get('shares') || 0), 0);
        
        return {
            avgReactions: Math.floor(totalReactions / posts.length),
            avgComments: Math.floor(totalComments / posts.length),
            avgShares: Math.floor(totalShares / posts.length),
            sampleSize: posts.length
        };
    }

    identifyGrowthOpportunities(analytics) {
        const opportunities = [];
        
        if (analytics.engagementRate > 0.1) {
            opportunities.push('High engagement rate - consider boosting this content type');
        }
        
        if (analytics.totalReach > 500) {
            opportunities.push('Good reach - leverage this for audience growth');
        }
        
        return opportunities;
    }
}

export default PostService;