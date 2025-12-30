class ProfileService {
    constructor(app) {
        this.app = app;
    }

    async getUserProfile(userId = null) {
        const targetUserId = userId || this.app.currentUser.id;
        const User = this.app.services.parse.getClass('_User');
        const query = new Parse.Query(User);
        
        try {
            const user = await query.get(targetUserId);
            return this.formatUserProfile(user);
        } catch (error) {
            console.error('Error loading user profile:', error);
            throw new Error('Failed to load user profile');
        }
    }

    async updateUserProfile(profileData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const user = this.app.currentUser;
        
        // Update basic profile fields
        if (profileData.username) user.set('username', profileData.username);
        if (profileData.email) user.set('email', profileData.email);
        if (profileData.bio) user.set('bio', profileData.bio);
        if (profileData.location) user.set('location', profileData.location);
        if (profileData.website) user.set('website', profileData.website);
        
        // Update social links
        if (profileData.socialLinks) {
            user.set('socialLinks', profileData.socialLinks);
        }
        
        // Update profile completion
        user.set('profileCompleted', this.calculateProfileCompletion(user));
        
        await user.save();
        
        this.app.showSuccess('Profile updated successfully! ✨');
        return this.formatUserProfile(user);
    }

    async uploadProfilePicture(file) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const parseFile = new Parse.File('profile-picture.jpg', file);
        await parseFile.save();
        
        this.app.currentUser.set('profilePicture', parseFile);
        await this.app.currentUser.save();
        
        this.app.showSuccess('Profile picture updated! 📸');
        return parseFile;
    }

    async uploadCoverPhoto(file) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const parseFile = new Parse.File('cover-photo.jpg', file);
        await parseFile.save();
        
        this.app.currentUser.set('coverPhoto', parseFile);
        await this.app.currentUser.save();
        
        this.app.showSuccess('Cover photo updated! 🖼️');
        return parseFile;
    }

    async createStory(storyData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeStory = this.app.services.parse.getClass('VibeStory');
        const story = new VibeStory();
        
        story.set('author', this.app.currentUser);
        story.set('content', storyData.content);
        story.set('media', storyData.media || null);
        story.set('type', storyData.type || 'text'); // text, image, video
        story.set('backgroundColor', storyData.backgroundColor || '#667eea');
        story.set('textColor', storyData.textColor || '#ffffff');
        story.set('expiresAt', new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours
        story.set('views', []);
        story.set('reactions', []);
        story.set('isActive', true);

        await story.save();
        
        // Notify followers about new story
        await this.app.services.notifications.notifyFollowers(
            `${this.app.currentUser.get('username')} posted a new story`
        );

        this.app.showSuccess('Story posted! It will expire in 24 hours. 📖');
        return story;
    }

    async viewStory(storyId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeStory = this.app.services.parse.getClass('VibeStory');
        const query = new Parse.Query(VibeStory);
        const story = await query.get(storyId);
        
        const views = story.get('views') || [];
        
        // Check if already viewed
        if (!views.some(view => view.viewer.id === this.app.currentUser.id)) {
            views.push({
                viewer: this.app.currentUser,
                viewedAt: new Date()
            });
            story.set('views', views);
            await story.save();
        }

        return story;
    }

    async reactToStory(storyId, reactionType) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeStory = this.app.services.parse.getClass('VibeStory');
        const query = new Parse.Query(VibeStory);
        const story = await query.get(storyId);
        
        const reactions = story.get('reactions') || [];
        
        // Remove existing reaction from same user
        const filteredReactions = reactions.filter(
            reaction => reaction.user.id !== this.app.currentUser.id
        );
        
        // Add new reaction
        filteredReactions.push({
            user: this.app.currentUser,
            type: reactionType,
            reactedAt: new Date()
        });
        
        story.set('reactions', filteredReactions);
        await story.save();

        // Notify story author
        if (story.get('author').id !== this.app.currentUser.id) {
            await this.app.services.notifications.createNotification(
                story.get('author').id,
                'story_reaction',
                `${this.app.currentUser.get('username')} reacted to your story`
            );
        }

        return story;
    }

    async uploadToGallery(file, caption = '') {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGallery = this.app.services.parse.getClass('VibeGallery');
        const galleryItem = new VibeGallery();
        
        const parseFile = new Parse.File('gallery-item.jpg', file);
        await parseFile.save();
        
        galleryItem.set('owner', this.app.currentUser);
        galleryItem.set('file', parseFile);
        galleryItem.set('caption', caption);
        galleryItem.set('type', this.getFileType(file.type));
        galleryItem.set('likes', []);
        galleryItem.set('comments', []);
        galleryItem.set('tags', []);
        galleryItem.set('isPublic', true);

        await galleryItem.save();
        
        this.app.showSuccess('Added to your gallery! 🎨');
        return galleryItem;
    }

    async likeGalleryItem(itemId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGallery = this.app.services.parse.getClass('VibeGallery');
        const query = new Parse.Query(VibeGallery);
        const item = await query.get(itemId);
        
        const likes = item.get('likes') || [];
        
        // Check if already liked
        if (likes.some(like => like.user.id === this.app.currentUser.id)) {
            // Unlike
            item.set('likes', likes.filter(like => like.user.id !== this.app.currentUser.id));
        } else {
            // Like
            likes.push({
                user: this.app.currentUser,
                likedAt: new Date()
            });
            item.set('likes', likes);
            
            // Notify owner
            if (item.get('owner').id !== this.app.currentUser.id) {
                await this.app.services.notifications.createNotification(
                    item.get('owner').id,
                    'gallery_like',
                    `${this.app.currentUser.get('username')} liked your gallery item`
                );
            }
        }

        await item.save();
        return item;
    }

    async commentOnGalleryItem(itemId, comment) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGallery = this.app.services.parse.getClass('VibeGallery');
        const query = new Parse.Query(VibeGallery);
        const item = await query.get(itemId);
        
        const comments = item.get('comments') || [];
        
        comments.push({
            user: this.app.currentUser,
            comment: comment,
            commentedAt: new Date(),
            likes: []
        });
        
        item.set('comments', comments);
        await item.save();

        // Notify owner
        if (item.get('owner').id !== this.app.currentUser.id) {
            await this.app.services.notifications.createNotification(
                item.get('owner').id,
                'gallery_comment',
                `${this.app.currentUser.get('username')} commented on your gallery item`
            );
        }

        return item;
    }

    async followUser(userId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeFollow = this.app.services.parse.getClass('VibeFollow');
        
        // Check if already following
        const existingFollow = await this.getFollowRelationship(userId);
        if (existingFollow) {
            throw new Error('Already following this user');
        }

        const follow = new VibeFollow();
        follow.set('follower', this.app.currentUser);
        follow.set('following', this.app.services.parse.createPointer('_User', userId));
        follow.set('followedAt', new Date());
        
        await follow.save();

        // Notify the user being followed
        await this.app.services.notifications.createNotification(
            userId,
            'new_follower',
            `${this.app.currentUser.get('username')} started following you`
        );

        // Add loyalty points
        await this.app.services.wallet.addLoyaltyPoints(2, 'social_follow');

        this.app.showSuccess('User followed successfully! 👥');
        return follow;
    }

    async unfollowUser(userId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const follow = await this.getFollowRelationship(userId);
        if (follow) {
            await follow.destroy();
            this.app.showSuccess('User unfollowed');
        }
        
        return true;
    }

    async getFollowRelationship(userId) {
        const VibeFollow = this.app.services.parse.getClass('VibeFollow');
        const query = new Parse.Query(VibeFollow);
        query.equalTo('follower', this.app.currentUser);
        query.equalTo('following', this.app.services.parse.createPointer('_User', userId));
        
        return await query.first();
    }

    async getUserStats(userId = null) {
        const targetUserId = userId || this.app.currentUser.id;
        
        const [
            followersCount,
            followingCount,
            storiesCount,
            galleryItemsCount,
            eventsHosted,
            streamsHosted
        ] = await Promise.all([
            this.getFollowersCount(targetUserId),
            this.getFollowingCount(targetUserId),
            this.getStoriesCount(targetUserId),
            this.getGalleryItemsCount(targetUserId),
            this.getEventsHostedCount(targetUserId),
            this.getStreamsHostedCount(targetUserId)
        ]);

        return {
            followers: followersCount,
            following: followingCount,
            stories: storiesCount,
            galleryItems: galleryItemsCount,
            eventsHosted: eventsHosted,
            streamsHosted: streamsHosted,
            engagementRate: this.calculateEngagementRate(targetUserId)
        };
    }

    async getFollowersCount(userId) {
        const VibeFollow = this.app.services.parse.getClass('VibeFollow');
        const query = new Parse.Query(VibeFollow);
        query.equalTo('following', this.app.services.parse.createPointer('_User', userId));
        
        return await query.count();
    }

    async getFollowingCount(userId) {
        const VibeFollow = this.app.services.parse.getClass('VibeFollow');
        const query = new Parse.Query(VibeFollow);
        query.equalTo('follower', this.app.services.parse.createPointer('_User', userId));
        
        return await query.count();
    }

    async getStoriesCount(userId) {
        const VibeStory = this.app.services.parse.getClass('VibeStory');
        const query = new Parse.Query(VibeStory);
        query.equalTo('author', this.app.services.parse.createPointer('_User', userId));
        query.greaterThan('expiresAt', new Date());
        
        return await query.count();
    }

    async getGalleryItemsCount(userId) {
        const VibeGallery = this.app.services.parse.getClass('VibeGallery');
        const query = new Parse.Query(VibeGallery);
        query.equalTo('owner', this.app.services.parse.createPointer('_User', userId));
        
        return await query.count();
    }

    async getEventsHostedCount(userId) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        query.equalTo('host', this.app.services.parse.createPointer('_User', userId));
        
        return await query.count();
    }

    async getStreamsHostedCount(userId) {
        const VibeLiveStream = this.app.services.parse.getClass('VibeLiveStream');
        const query = new Parse.Query(VibeLiveStream);
        query.equalTo('host', this.app.services.parse.createPointer('_User', userId));
        
        return await query.count();
    }

    calculateEngagementRate(userId) {
        // This would calculate based on likes, comments, shares, etc.
        // Simplified for demo
        return Math.random() * 100;
    }

    async loadUserStories(userId = null) {
        const targetUserId = userId || this.app.currentUser.id;
        const VibeStory = this.app.services.parse.getClass('VibeStory');
        const query = new Parse.Query(VibeStory);
        
        query.equalTo('author', this.app.services.parse.createPointer('_User', targetUserId));
        query.greaterThan('expiresAt', new Date());
        query.equalTo('isActive', true);
        query.include('author');
        query.descending('createdAt');
        query.limit(50);

        try {
            const stories = await query.find();
            this.displayStories(stories);
            return stories;
        } catch (error) {
            console.error('Error loading stories:', error);
            return [];
        }
    }

    async loadUserGallery(userId = null, filters = {}) {
        const targetUserId = userId || this.app.currentUser.id;
        const VibeGallery = this.app.services.parse.getClass('VibeGallery');
        const query = new Parse.Query(VibeGallery);
        
        query.equalTo('owner', this.app.services.parse.createPointer('_User', targetUserId));
        
        if (filters.type) {
            query.equalTo('type', filters.type);
        }
        
        if (filters.tags && filters.tags.length > 0) {
            query.containsAll('tags', filters.tags);
        }
        
        query.include('owner');
        query.descending('createdAt');
        query.limit(filters.limit || 30);

        try {
            const galleryItems = await query.find();
            this.displayGallery(galleryItems);
            return galleryItems;
        } catch (error) {
            console.error('Error loading gallery:', error);
            return [];
        }
    }

    async loadFollowers(userId = null) {
        const targetUserId = userId || this.app.currentUser.id;
        const VibeFollow = this.app.services.parse.getClass('VibeFollow');
        const query = new Parse.Query(VibeFollow);
        
        query.equalTo('following', this.app.services.parse.createPointer('_User', targetUserId));
        query.include('follower');
        query.descending('followedAt');
        query.limit(100);

        try {
            const followers = await query.find();
            return followers.map(follow => follow.get('follower'));
        } catch (error) {
            console.error('Error loading followers:', error);
            return [];
        }
    }

    async loadFollowing(userId = null) {
        const targetUserId = userId || this.app.currentUser.id;
        const VibeFollow = this.app.services.parse.getClass('VibeFollow');
        const query = new Parse.Query(VibeFollow);
        
        query.equalTo('follower', this.app.services.parse.createPointer('_User', targetUserId));
        query.include('following');
        query.descending('followedAt');
        query.limit(100);

        try {
            const following = await query.find();
            return following.map(follow => follow.get('following'));
        } catch (error) {
            console.error('Error loading following:', error);
            return [];
        }
    }

    displayStories(stories) {
        const container = document.getElementById('stories-container');
        if (!container) return;

        // Group stories by user
        const storiesByUser = {};
        stories.forEach(story => {
            const userId = story.get('author').id;
            if (!storiesByUser[userId]) {
                storiesByUser[userId] = {
                    user: story.get('author'),
                    stories: []
                };
            }
            storiesByUser[userId].stories.push(story);
        });

        container.innerHTML = Object.values(storiesByUser).map(userStories => `
            <div class="story-user" data-user-id="${userStories.user.id}">
                <div class="story-avatar">
                    <img src="${userStories.user.get('profilePicture')?.url() || '/assets/default-avatar.jpg'}" 
                         alt="${userStories.user.get('username')}">
                    ${userStories.stories.some(story => 
                        !story.get('views')?.some(view => view.viewer.id === this.app.currentUser.id)
                    ) ? '<div class="unseen-indicator"></div>' : ''}
                </div>
                <div class="story-username">${userStories.user.get('username')}</div>
            </div>
        `).join('');

        // Add click handlers for stories
        container.querySelectorAll('.story-user').forEach(element => {
            element.addEventListener('click', () => {
                this.openStoryViewer(userStories.stories);
            });
        });
    }

    displayGallery(galleryItems) {
        const container = document.getElementById('gallery-grid');
        if (!container) return;

        container.innerHTML = galleryItems.map(item => `
            <div class="gallery-item" data-item-id="${item.id}">
                <div class="gallery-media">
                    ${item.get('type') === 'image' ? `
                        <img src="${item.get('file').url()}" alt="${item.get('caption')}">
                    ` : item.get('type') === 'video' ? `
                        <video src="${item.get('file').url()}"></video>
                    ` : `
                        <div class="file-placeholder">File</div>
                    `}
                </div>
                <div class="gallery-overlay">
                    <div class="gallery-stats">
                        <span class="likes">${item.get('likes')?.length || 0} ❤️</span>
                        <span class="comments">${item.get('comments')?.length || 0} 💬</span>
                    </div>
                    <p class="gallery-caption">${item.get('caption')}</p>
                </div>
                <div class="gallery-actions">
                    <button onclick="vibeApp.services.profile.likeGalleryItem('${item.id}')" class="btn-like">
                        ${item.get('likes')?.some(like => like.user.id === this.app.currentUser?.id) ? 'Unlike' : 'Like'}
                    </button>
                    <button onclick="this.showCommentDialog('${item.id}')" class="btn-comment">Comment</button>
                </div>
            </div>
        `).join('');
    }

    async openStoryViewer(stories) {
        // Implementation for story viewer
        const viewer = document.createElement('div');
        viewer.className = 'story-viewer';
        viewer.innerHTML = `
            <div class="story-viewer-content">
                <div class="story-header">
                    <img src="${stories[0].get('author').get('profilePicture')?.url() || '/assets/default-avatar.jpg'}" 
                         alt="${stories[0].get('author').get('username')}">
                    <span>${stories[0].get('author').get('username')}</span>
                    <button class="close-viewer">×</button>
                </div>
                <div class="story-progress">
                    ${stories.map((_, index) => `
                        <div class="progress-bar">
                            <div class="progress-fill" data-story-index="${index}"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="story-content">
                    ${stories[0].get('type') === 'text' ? `
                        <div class="text-story" style="background-color: ${stories[0].get('backgroundColor')}; color: ${stories[0].get('textColor')}">
                            ${stories[0].get('content')}
                        </div>
                    ` : stories[0].get('type') === 'image' ? `
                        <img src="${stories[0].get('media').url()}" alt="Story image">
                    ` : `
                        <video src="${stories[0].get('media').url()}" autoplay controls></video>
                    `}
                </div>
                <div class="story-reactions">
                    <button onclick="vibeApp.services.profile.reactToStory('${stories[0].id}', 'like')">❤️</button>
                    <button onclick="vibeApp.services.profile.reactToStory('${stories[0].id}', 'love')">😍</button>
                    <button onclick="vibeApp.services.profile.reactToStory('${stories[0].id}', 'laugh')">😂</button>
                </div>
            </div>
        `;

        document.body.appendChild(viewer);
        
        // Mark as viewed
        await this.viewStory(stories[0].id);

        // Add close handler
        viewer.querySelector('.close-viewer').addEventListener('click', () => {
            document.body.removeChild(viewer);
        });
    }

    calculateProfileCompletion(user) {
        let completion = 0;
        const fields = [
            'username', 'email', 'profilePicture', 'coverPhoto', 
            'bio', 'location', 'website', 'socialLinks'
        ];

        fields.forEach(field => {
            if (user.get(field)) completion += 100 / fields.length;
        });

        return Math.round(completion);
    }

    getFileType(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'file';
    }

    formatUserProfile(user) {
        return {
            id: user.id,
            username: user.get('username'),
            email: user.get('email'),
            bio: user.get('bio'),
            location: user.get('location'),
            website: user.get('website'),
            profilePicture: user.get('profilePicture'),
            coverPhoto: user.get('coverPhoto'),
            socialLinks: user.get('socialLinks') || {},
            profileCompleted: user.get('profileCompleted') || 0,
            createdAt: user.get('createdAt'),
            isVerified: user.get('isVerified') || false,
            isOnline: user.get('isOnline') || false,
            lastSeen: user.get('lastSeen')
        };
    }

    async searchUsers(query, filters = {}) {
        const User = this.app.services.parse.getClass('_User');
        const queryObj = new Parse.Query(User);
        
        if (query) {
            queryObj.contains('username', query);
        }
        
        if (filters.location) {
            queryObj.equalTo('location', filters.location);
        }
        
        if (filters.verified) {
            queryObj.equalTo('isVerified', true);
        }
        
        queryObj.limit(filters.limit || 20);

        try {
            const users = await queryObj.find();
            return users.map(user => this.formatUserProfile(user));
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    async updateSocialLinks(links) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        this.app.currentUser.set('socialLinks', links);
        await this.app.currentUser.save();
        
        this.app.showSuccess('Social links updated! 🔗');
        return this.formatUserProfile(this.app.currentUser);
    }

    async setOnlineStatus(isOnline = true) {
        if (!this.app.currentUser) return;

        this.app.currentUser.set('isOnline', isOnline);
        this.app.currentUser.set('lastSeen', new Date());
        await this.app.currentUser.save();
    }

    async verifyUser(verificationData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeVerification = this.app.services.parse.getClass('VibeVerification');
        const verification = new VibeVerification();
        
        verification.set('user', this.app.currentUser);
        verification.set('type', verificationData.type); // identity, email, phone
        verification.set('status', 'pending');
        verification.set('submittedData', verificationData.data);
        verification.set('submittedAt', new Date());

        await verification.save();

        this.app.showSuccess('Verification submitted! We will review your application. ✅');
        return verification;
    }

    async getMutualConnections(userId) {
        const [userFollowers, userFollowing] = await Promise.all([
            this.loadFollowers(userId),
            this.loadFollowing(userId)
        ]);

        const currentUserFollowers = await this.loadFollowers();
        const currentUserFollowing = await this.loadFollowing();

        const mutualFollowers = userFollowers.filter(follower =>
            currentUserFollowers.some(f => f.id === follower.id)
        );

        const mutualFollowing = userFollowing.filter(following =>
            currentUserFollowing.some(f => f.id === following.id)
        );

        return {
            mutualFollowers: mutualFollowers.length,
            mutualFollowing: mutualFollowing.length,
            connections: [...new Set([...mutualFollowers, ...mutualFollowing])]
        };
    }
}

export default ProfileService;