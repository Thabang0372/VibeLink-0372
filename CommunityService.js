class CommunityService {
    constructor(app) {
        this.app = app;
        this.communityCache = new Map();
    }

    async createCommunity(communityData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeCommunity = this.app.services.parse.getClass('VibeCommunity');
        const community = new VibeCommunity();
        
        community.set('name', communityData.name);
        community.set('description', communityData.description);
        community.set('category', communityData.category);
        community.set('privacy', communityData.privacy || 'public'); // public, private, hidden
        community.set('owner', this.app.currentUser);
        community.set('admins', [this.app.currentUser]);
        community.set('moderators', []);
        community.set('members', [this.app.currentUser]);
        community.set('rules', communityData.rules || []);
        community.set('tags', communityData.tags || []);
        community.set('coverImage', communityData.coverImage);
        community.set('icon', communityData.icon);
        community.set('memberCount', 1);
        community.set('postCount', 0);
        community.set('isActive', true);
        community.set('verificationLevel', communityData.verificationLevel || 'none'); // none, basic, strict
        community.set('location', communityData.location);
        community.set('language', communityData.language || 'en');

        await community.save();
        
        // Create community chat rooms
        await this.createCommunityChatRooms(community.id);
        
        // Create welcome post
        await this.createWelcomePost(community.id);

        this.app.showSuccess('Community created successfully! 🎉');
        return community;
    }

    async createCommunityChatRooms(communityId) {
        const community = await this.getCommunity(communityId);
        const chatRooms = [
            { name: 'General', description: 'General community discussion', isPublic: true },
            { name: 'Announcements', description: 'Community announcements', isPublic: true },
            { name: 'Help & Support', description: 'Get help from community members', isPublic: true }
        ];

        for (const roomData of chatRooms) {
            const chatRoom = await this.app.services.chat.createChatRoom(
                `${community.get('name')} - ${roomData.name}`,
                roomData.isPublic,
                community.get('members')
            );
            
            await this.addCommunityChatRoom(communityId, chatRoom, roomData);
        }
    }

    async createWelcomePost(communityId) {
        const community = await this.getCommunity(communityId);
        const VibeCommunityPost = this.app.services.parse.getClass('VibeCommunityPost');
        const post = new VibeCommunityPost();
        
        post.set('community', community);
        post.set('author', this.app.currentUser);
        post.set('title', `Welcome to ${community.get('name')}!`);
        post.set('content', `Welcome to our new community! Let's build something amazing together. Feel free to introduce yourself and explore what we have to offer.`);
        post.set('type', 'announcement');
        post.set('isPinned', true);
        post.set('tags', ['welcome', 'introduction']);
        post.set('reactions', []);
        post.set('comments', []);
        post.set('views', 0);

        await post.save();
        return post;
    }

    async joinCommunity(communityId, applicationMessage = '') {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const community = await this.getCommunity(communityId);
        
        if (community.get('members').some(member => member.id === this.app.currentUser.id)) {
            throw new Error('Already a member of this community');
        }

        const privacy = community.get('privacy');
        const verificationLevel = community.get('verificationLevel');

        if (privacy === 'public') {
            // Auto-join public communities
            await this.addMemberToCommunity(communityId, this.app.currentUser.id, 'member');
        } else if (privacy === 'private') {
            // Create membership request for private communities
            await this.createMembershipRequest(communityId, applicationMessage);
        } else {
            throw new Error('This community is not accepting new members');
        }

        // Handle verification requirements
        if (verificationLevel !== 'none') {
            await this.handleVerificationRequirements(communityId, verificationLevel);
        }

        this.app.showSuccess(
            privacy === 'public' 
                ? 'Joined community successfully! 👥' 
                : 'Membership request submitted! 📝'
        );

        return community;
    }

    async createMembershipRequest(communityId, message) {
        const VibeMembershipRequest = this.app.services.parse.getClass('VibeMembershipRequest');
        const request = new VibeMembershipRequest();
        
        request.set('community', this.app.services.parse.createPointer('VibeCommunity', communityId));
        request.set('user', this.app.currentUser);
        request.set('message', message);
        request.set('status', 'pending'); // pending, approved, rejected
        request.set('requestedAt', new Date());
        request.set('reviewedAt', null);
        request.set('reviewedBy', null);

        await request.save();

        // Notify community admins
        const community = await this.getCommunity(communityId);
        const admins = community.get('admins');
        
        for (const admin of admins) {
            await this.app.services.notifications.createNotification(
                admin.id,
                'membership_request',
                `${this.app.currentUser.get('username')} requested to join ${community.get('name')}`
            );
        }

        return request;
    }

    async approveMembershipRequest(requestId) {
        const VibeMembershipRequest = this.app.services.parse.getClass('VibeMembershipRequest');
        const query = new Parse.Query(VibeMembershipRequest);
        query.include('community');
        query.include('user');
        const request = await query.get(requestId);

        const community = request.get('community');
        
        // Check if user has admin permissions
        if (!this.hasCommunityPermission(community.id, 'manage_members')) {
            throw new Error('Insufficient permissions to approve membership requests');
        }

        request.set('status', 'approved');
        request.set('reviewedAt', new Date());
        request.set('reviewedBy', this.app.currentUser);
        await request.save();

        // Add user to community
        await this.addMemberToCommunity(community.id, request.get('user').id, 'member');

        // Notify user
        await this.app.services.notifications.createNotification(
            request.get('user').id,
            'membership_approved',
            `Your membership request for ${community.get('name')} has been approved!`
        );

        this.app.showSuccess('Membership request approved!');
        return request;
    }

    async addMemberToCommunity(communityId, userId, role = 'member') {
        const community = await this.getCommunity(communityId);
        const members = community.get('members') || [];
        const userPointer = this.app.services.parse.createPointer('_User', userId);

        // Add to members list
        if (!members.some(member => member.id === userId)) {
            members.push(userPointer);
            community.set('members', members);
            community.set('memberCount', members.length);
        }

        // Add to role-specific list
        if (role === 'admin') {
            const admins = community.get('admins') || [];
            if (!admins.some(admin => admin.id === userId)) {
                admins.push(userPointer);
                community.set('admins', admins);
            }
        } else if (role === 'moderator') {
            const moderators = community.get('moderators') || [];
            if (!moderators.some(mod => mod.id === userId)) {
                moderators.push(userPointer);
                community.set('moderators', moderators);
            }
        }

        await community.save();

        // Add to community chat rooms
        await this.addUserToCommunityChats(communityId, userId);

        return community;
    }

    async createCommunityPost(communityId, postData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const community = await this.getCommunity(communityId);
        
        // Check if user is member
        if (!this.isCommunityMember(communityId)) {
            throw new Error('You must be a member to post in this community');
        }

        const VibeCommunityPost = this.app.services.parse.getClass('VibeCommunityPost');
        const post = new VibeCommunityPost();
        
        post.set('community', community);
        post.set('author', this.app.currentUser);
        post.set('title', postData.title);
        post.set('content', postData.content);
        post.set('type', postData.type || 'discussion'); // discussion, question, announcement, event
        post.set('tags', postData.tags || []);
        post.set('reactions', []);
        post.set('comments', []);
        post.set('views', 0);
        post.set('isPinned', false);
        post.set('isLocked', false);
        post.set('media', postData.media || []);

        await post.save();

        // Update community post count
        community.set('postCount', community.get('postCount') + 1);
        await community.save();

        // Notify community members
        await this.notifyCommunityMembers(communityId, 'new_post', {
            postId: post.id,
            author: this.app.currentUser.get('username'),
            title: postData.title
        });

        this.app.showSuccess('Post created successfully! 📝');
        return post;
    }

    async reactToCommunityPost(postId, reactionType) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeCommunityPost = this.app.services.parse.getClass('VibeCommunityPost');
        const query = new Parse.Query(VibeCommunityPost);
        const post = await query.get(postId);
        
        const reactions = post.get('reactions') || [];
        
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
        
        post.set('reactions', filteredReactions);
        await post.save();

        // Notify post author
        if (post.get('author').id !== this.app.currentUser.id) {
            await this.app.services.notifications.createNotification(
                post.get('author').id,
                'post_reaction',
                `${this.app.currentUser.get('username')} reacted to your post in ${post.get('community').get('name')}`
            );
        }

        return post;
    }

    async commentOnCommunityPost(postId, comment) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeCommunityPost = this.app.services.parse.getClass('VibeCommunityPost');
        const query = new Parse.Query(VibeCommunityPost);
        const post = await query.get(postId);
        
        const comments = post.get('comments') || [];
        
        const newComment = {
            user: this.app.currentUser,
            comment: comment,
            commentedAt: new Date(),
            likes: [],
            replies: []
        };
        
        comments.push(newComment);
        post.set('comments', comments);
        await post.save();

        // Notify post author and mentioned users
        await this.handleCommentNotifications(post, comment);

        return post;
    }

    async createCommunityEvent(communityId, eventData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const community = await this.getCommunity(communityId);
        
        if (!this.hasCommunityPermission(communityId, 'create_events')) {
            throw new Error('Insufficient permissions to create community events');
        }

        // Create event through EventService
        const event = await this.app.services.events.createVibeEvent({
            ...eventData,
            isCommunityEvent: true,
            community: community
        });

        // Link event to community
        const communityEvents = community.get('events') || [];
        communityEvents.push(event);
        community.set('events', communityEvents);
        await community.save();

        // Notify community members
        await this.notifyCommunityMembers(communityId, 'new_event', {
            eventId: event.id,
            title: eventData.title,
            date: eventData.date
        });

        return event;
    }

    async createCreatorTier(communityId, tierData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const community = await this.getCommunity(communityId);
        
        if (community.get('owner').id !== this.app.currentUser.id) {
            throw new Error('Only community owner can create creator tiers');
        }

        const VibeCreatorTier = this.app.services.parse.getClass('VibeCreatorTier');
        const tier = new VibeCreatorTier();
        
        tier.set('community', community);
        tier.set('name', tierData.name);
        tier.set('description', tierData.description);
        tier.set('price', tierData.price);
        tier.set('currency', tierData.currency || 'VIBE');
        tier.set('benefits', tierData.benefits || []);
        tier.set('maxMembers', tierData.maxMembers || null);
        tier.set('isActive', true);
        tier.set('subscribers', []);

        await tier.save();

        this.app.showSuccess('Creator tier created successfully! 💎');
        return tier;
    }

    async subscribeToCreatorTier(tierId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeCreatorTier = this.app.services.parse.getClass('VibeCreatorTier');
        const query = new Parse.Query(VibeCreatorTier);
        query.include('community');
        const tier = await query.get(tierId);
        
        const community = tier.get('community');
        const subscribers = tier.get('subscribers') || [];
        const maxMembers = tier.get('maxMembers');

        // Check if tier is full
        if (maxMembers && subscribers.length >= maxMembers) {
            throw new Error('This tier is currently full');
        }

        // Check if already subscribed
        if (subscribers.some(sub => sub.user.id === this.app.currentUser.id)) {
            throw new Error('Already subscribed to this tier');
        }

        // Process payment
        const price = tier.get('price');
        if (price > 0) {
            const userWallet = await this.app.services.wallet.getUserWallet();
            const creatorWallet = await this.app.services.wallet.getUserWallet(community.get('owner').id);

            if (userWallet.get('balance') < price) {
                throw new Error('Insufficient balance for subscription');
            }

            // Transfer to creator
            await this.app.services.wallet.createWalletTransaction({
                type: 'credit',
                amount: price,
                wallet: creatorWallet,
                description: `Creator tier subscription: ${tier.get('name')}`
            });

            // Deduct from subscriber
            await this.app.services.wallet.createWalletTransaction({
                type: 'debit',
                amount: price,
                wallet: userWallet,
                description: `Subscription to ${tier.get('name')}`
            });
        }

        // Add subscriber
        subscribers.push({
            user: this.app.currentUser,
            subscribedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });

        tier.set('subscribers', subscribers);
        await tier.save();

        this.app.showSuccess('Subscribed to creator tier successfully! ✨');
        return tier;
    }

    async loadCommunityPosts(communityId, filters = {}) {
        const VibeCommunityPost = this.app.services.parse.getClass('VibeCommunityPost');
        const query = new Parse.Query(VibeCommunityPost);
        
        query.equalTo('community', this.app.services.parse.createPointer('VibeCommunity', communityId));
        
        if (filters.type) {
            query.equalTo('type', filters.type);
        }
        
        if (filters.author) {
            query.equalTo('author', this.app.services.parse.createPointer('_User', filters.author));
        }
        
        if (filters.tags && filters.tags.length > 0) {
            query.containsAll('tags', filters.tags);
        }
        
        if (filters.pinned) {
            query.equalTo('isPinned', true);
        }
        
        query.include('author');
        query.include('community');
        query.descending('createdAt');
        query.limit(filters.limit || 20);

        try {
            const posts = await query.find();
            this.displayCommunityPosts(posts);
            return posts;
        } catch (error) {
            console.error('Error loading community posts:', error);
            return [];
        }
    }

    async loadPopularCommunities(limit = 20) {
        const cacheKey = `popular_communities_${limit}`;
        
        if (this.communityCache.has(cacheKey)) {
            return this.communityCache.get(cacheKey);
        }

        const VibeCommunity = this.app.services.parse.getClass('VibeCommunity');
        const query = new Parse.Query(VibeCommunity);
        
        query.equalTo('privacy', 'public');
        query.equalTo('isActive', true);
        query.greaterThan('memberCount', 10); // Only communities with more than 10 members
        query.descending('memberCount');
        query.include('owner');
        query.limit(limit);

        try {
            const communities = await query.find();
            this.displayCommunities(communities);
            
            this.communityCache.set(cacheKey, communities);
            setTimeout(() => {
                this.communityCache.delete(cacheKey);
            }, 10 * 60 * 1000); // Cache for 10 minutes

            return communities;
        } catch (error) {
            console.error('Error loading popular communities:', error);
            return [];
        }
    }

    async searchCommunities(searchParams) {
        const VibeCommunity = this.app.services.parse.getClass('VibeCommunity');
        const query = new Parse.Query(VibeCommunity);
        
        if (searchParams.query) {
            const searchFields = ['name', 'description', 'tags'];
            const orQueries = searchFields.map(field => {
                const fieldQuery = new Parse.Query(VibeCommunity);
                fieldQuery.contains(field, searchParams.query);
                return fieldQuery;
            });
            query._orQuery(orQueries);
        }
        
        if (searchParams.category) {
            query.equalTo('category', searchParams.category);
        }
        
        if (searchParams.privacy) {
            query.equalTo('privacy', searchParams.privacy);
        }
        
        if (searchParams.location) {
            query.near('location', searchParams.location);
        }
        
        if (searchParams.language) {
            query.equalTo('language', searchParams.language);
        }
        
        query.equalTo('isActive', true);
        query.include('owner');
        query.descending('memberCount');
        query.limit(searchParams.limit || 50);

        try {
            return await query.find();
        } catch (error) {
            console.error('Error searching communities:', error);
            return [];
        }
    }

    async getCommunityAnalytics(communityId) {
        const community = await this.getCommunity(communityId);
        
        if (!this.hasCommunityPermission(communityId, 'view_analytics')) {
            throw new Error('Insufficient permissions to view analytics');
        }

        const [posts, members, events, revenue] = await Promise.all([
            this.getCommunityPostsStats(communityId),
            this.getCommunityMembersStats(communityId),
            this.getCommunityEventsStats(communityId),
            this.getCommunityRevenue(communityId)
        ]);

        return {
            memberGrowth: this.calculateMemberGrowth(community),
            engagementRate: this.calculateEngagementRate(posts, members.total),
            topPosts: posts.topPosts,
            activeMembers: members.activeMembers,
            upcomingEvents: events.upcoming,
            totalRevenue: revenue.total,
            tierSubscriptions: revenue.subscriptions
        };
    }

    async getCommunityPostsStats(communityId) {
        const VibeCommunityPost = this.app.services.parse.getClass('VibeCommunityPost');
        const query = new Parse.Query(VibeCommunityPost);
        query.equalTo('community', this.app.services.parse.createPointer('VibeCommunity', communityId));
        query.greaterThan('createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days
        
        const posts = await query.find();
        
        const topPosts = posts
            .sort((a, b) => {
                const aEngagement = (a.get('reactions')?.length || 0) + (a.get('comments')?.length || 0);
                const bEngagement = (b.get('reactions')?.length || 0) + (b.get('comments')?.length || 0);
                return bEngagement - aEngagement;
            })
            .slice(0, 5);

        return {
            total: posts.length,
            topPosts: topPosts.map(post => ({
                id: post.id,
                title: post.get('title'),
                engagement: (post.get('reactions')?.length || 0) + (post.get('comments')?.length || 0)
            }))
        };
    }

    displayCommunityPosts(posts) {
        const container = document.getElementById('community-posts');
        if (!container) return;

        container.innerHTML = posts.map(post => `
            <div class="community-post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.get('author').get('profilePicture')?.url() || '/assets/default-avatar.jpg'}" 
                         alt="${post.get('author').get('username')}" class="post-author-avatar">
                    <div class="post-author-info">
                        <div class="post-author">${post.get('author').get('username')}</div>
                        <div class="post-date">${new Date(post.get('createdAt')).toLocaleDateString()}</div>
                    </div>
                    ${post.get('isPinned') ? '<span class="pinned-badge">📌 Pinned</span>' : ''}
                    ${post.get('type') === 'announcement' ? '<span class="announcement-badge">📢 Announcement</span>' : ''}
                </div>
                <div class="post-content">
                    <h3 class="post-title">${post.get('title')}</h3>
                    <p class="post-text">${post.get('content')}</p>
                    ${post.get('media')?.length > 0 ? `
                        <div class="post-media">
                            ${post.get('media').map(media => `
                                <img src="${media.url()}" alt="Post media" class="post-image">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="post-stats">
                    <span class="reactions">${post.get('reactions')?.length || 0} reactions</span>
                    <span class="comments">${post.get('comments')?.length || 0} comments</span>
                    <span class="views">${post.get('views') || 0} views</span>
                </div>
                <div class="post-actions">
                    <button onclick="vibeApp.services.community.reactToCommunityPost('${post.id}', 'like')" class="btn-react">
                        ❤️ Like
                    </button>
                    <button onclick="this.showCommentDialog('${post.id}')" class="btn-comment">💬 Comment</button>
                    <button onclick="vibeApp.services.community.sharePost('${post.id}')" class="btn-share">🔗 Share</button>
                </div>
                <div class="post-comments">
                    ${post.get('comments')?.slice(0, 3).map(comment => `
                        <div class="post-comment">
                            <strong>${comment.user.get('username')}:</strong>
                            <span>${comment.comment}</span>
                        </div>
                    `).join('')}
                    ${post.get('comments')?.length > 3 ? `
                        <div class="show-more-comments">Show ${post.get('comments').length - 3} more comments...</div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    displayCommunities(communities) {
        const container = document.getElementById('communities-grid');
        if (!container) return;

        container.innerHTML = communities.map(community => `
            <div class="community-card" data-community-id="${community.id}">
                <div class="community-cover">
                    <img src="${community.get('coverImage')?.url() || '/assets/default-community.jpg'}" 
                         alt="${community.get('name')}">
                </div>
                <div class="community-content">
                    <div class="community-icon">
                        <img src="${community.get('icon')?.url() || '/assets/default-community-icon.png'}" 
                             alt="${community.get('name')} icon">
                    </div>
                    <div class="community-info">
                        <h3 class="community-name">${community.get('name')}</h3>
                        <p class="community-description">${community.get('description')}</p>
                        <div class="community-meta">
                            <span class="member-count">${community.get('memberCount')} members</span>
                            <span class="post-count">${community.get('postCount')} posts</span>
                            <span class="community-category">${community.get('category')}</span>
                        </div>
                        <div class="community-tags">
                            ${community.get('tags')?.slice(0, 3).map(tag => `
                                <span class="community-tag">#${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="community-actions">
                    ${this.isCommunityMember(community.id) ? `
                        <button onclick="vibeApp.services.community.leaveCommunity('${community.id}')" class="btn-leave">
                            Leave Community
                        </button>
                    ` : `
                        <button onclick="vibeApp.services.community.joinCommunity('${community.id}')" class="btn-join">
                            Join Community
                        </button>
                    `}
                </div>
            </div>
        `).join('');
    }

    // Utility Methods
    async getCommunity(communityId) {
        const VibeCommunity = this.app.services.parse.getClass('VibeCommunity');
        const query = new Parse.Query(VibeCommunity);
        return await query.get(communityId);
    }

    isCommunityMember(communityId) {
        // This would check if current user is a member
        // Simplified for demo
        return Math.random() > 0.5;
    }

    hasCommunityPermission(communityId, permission) {
        // Check if user has specific permission in community
        const permissions = {
            'manage_members': ['owner', 'admin'],
            'create_events': ['owner', 'admin', 'moderator'],
            'view_analytics': ['owner', 'admin'],
            'manage_posts': ['owner', 'admin', 'moderator']
        };

        // This would check user's role in community
        // Simplified for demo
        return true;
    }

    async notifyCommunityMembers(communityId, type, data) {
        const community = await this.getCommunity(communityId);
        const members = community.get('members') || [];
        
        for (const member of members) {
            if (member.id !== this.app.currentUser.id) {
                await this.app.services.notifications.createNotification(
                    member.id,
                    `community_${type}`,
                    this.formatCommunityNotification(type, data)
                );
            }
        }
    }

    formatCommunityNotification(type, data) {
        const messages = {
            'new_post': `${data.author} posted in the community: ${data.title}`,
            'new_event': `New community event: ${data.title} on ${new Date(data.date).toLocaleDateString()}`,
            'membership_approved': `Welcome to the community! Your membership has been approved.`
        };
        
        return messages[type] || 'Community notification';
    }

    calculateMemberGrowth(community) {
        // This would calculate growth based on historical data
        // Simplified for demo
        return {
            weekly: Math.floor(Math.random() * 50),
            monthly: Math.floor(Math.random() * 200),
            total: community.get('memberCount')
        };
    }

    calculateEngagementRate(posts, totalMembers) {
        if (totalMembers === 0) return 0;
        
        const totalEngagement = posts.total * 0.3; // Simplified calculation
        return (totalEngagement / totalMembers) * 100;
    }

    async getCommunityMembersStats(communityId) {
        const community = await this.getCommunity(communityId);
        const members = community.get('members') || [];
        
        // Simplified active members calculation
        const activeMembers = Math.floor(members.length * 0.7);
        
        return {
            total: members.length,
            activeMembers: activeMembers,
            newThisWeek: Math.floor(members.length * 0.1)
        };
    }

    async getCommunityEventsStats(communityId) {
        const community = await this.getCommunity(communityId);
        const events = community.get('events') || [];
        
        const upcoming = events.filter(event => 
            new Date(event.get('eventDate')) > new Date()
        ).slice(0, 5);

        return {
            total: events.length,
            upcoming: upcoming,
            past: events.length - upcoming.length
        };
    }

    async getCommunityRevenue(communityId) {
        const VibeCreatorTier = this.app.services.parse.getClass('VibeCreatorTier');
        const query = new Parse.Query(VibeCreatorTier);
        query.equalTo('community', this.app.services.parse.createPointer('VibeCommunity', communityId));
        
        const tiers = await query.find();
        let totalRevenue = 0;
        let totalSubscriptions = 0;

        for (const tier of tiers) {
            const subscribers = tier.get('subscribers') || [];
            totalRevenue += subscribers.length * tier.get('price');
            totalSubscriptions += subscribers.length;
        }

        return {
            total: totalRevenue,
            subscriptions: totalSubscriptions,
            tiers: tiers.length
        };
    }

    async handleVerificationRequirements(communityId, level) {
        const requirements = {
            'basic': ['email_verified'],
            'strict': ['email_verified', 'phone_verified', 'identity_verified']
        };

        const userVerifications = await this.getUserVerifications();
        const required = requirements[level] || [];

        for (const requirement of required) {
            if (!userVerifications.includes(requirement)) {
                await this.promptVerification(requirement);
            }
        }
    }

    async getUserVerifications() {
        // Get user's verification status
        // Simplified for demo
        return ['email_verified'];
    }

    async promptVerification(verificationType) {
        this.app.showInfo(`This community requires ${verificationType} verification. Please complete verification in your settings.`);
    }

    async addUserToCommunityChats(communityId, userId) {
        const community = await this.getCommunity(communityId);
        const chatRooms = community.get('chatRooms') || [];
        
        for (const chatRoom of chatRooms) {
            if (chatRoom.isPublic) {
                await this.app.services.chat.addToChatRoom(chatRoom.id, userId);
            }
        }
    }

    async addCommunityChatRoom(communityId, chatRoom, roomData) {
        const community = await this.getCommunity(communityId);
        const chatRooms = community.get('chatRooms') || [];
        
        chatRooms.push({
            id: chatRoom.id,
            name: roomData.name,
            description: roomData.description,
            isPublic: roomData.isPublic
        });
        
        community.set('chatRooms', chatRooms);
        await community.save();
    }
}

export default CommunityService;