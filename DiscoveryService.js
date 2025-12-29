class DiscoveryService {
    constructor(app) {
        this.app = app;
    }

    async getTrendingContent(type = 'all', limit = 20) {
        const timeRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        
        let trendingContent = [];
        
        if (type === 'all' || type === 'posts') {
            const trendingPosts = await this.getTrendingPosts(timeRange, limit);
            trendingContent = trendingContent.concat(trendingPosts);
        }
        
        if (type === 'all' || type === 'events') {
            const trendingEvents = await this.getTrendingEvents(timeRange, limit);
            trendingContent = trendingContent.concat(trendingEvents);
        }
        
        if (type === 'all' || type === 'streams') {
            const trendingStreams = await this.getTrendingStreams(timeRange, limit);
            trendingContent = trendingContent.concat(trendingStreams);
        }
        
        if (type === 'all' || type === 'courses') {
            const trendingCourses = await this.getTrendingCourses(timeRange, limit);
            trendingContent = trendingContent.concat(trendingCourses);
        }

        // Sort by engagement score
        trendingContent.sort((a, b) => b.engagementScore - a.engagementScore);
        
        return trendingContent.slice(0, limit);
    }

    async getTrendingPosts(sinceDate, limit) {
        const VibePost = this.app.services.parse.getClass('VibePost');
        const query = new Parse.Query(VibePost);
        
        query.greaterThan('createdAt', sinceDate);
        query.include('author');
        query.descending('likesCount');
        query.limit(limit);

        const posts = await query.find();
        return posts.map(post => ({
            type: 'post',
            id: post.id,
            content: post,
            engagementScore: this.calculatePostEngagement(post),
            trendingRank: this.calculateTrendingRank(post, sinceDate)
        }));
    }

    async getTrendingEvents(sinceDate, limit) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        
        query.greaterThan('createdAt', sinceDate);
        query.include('host');
        query.descending('attendees');
        query.limit(limit);

        const events = await query.find();
        return events.map(event => ({
            type: 'event',
            id: event.id,
            content: event,
            engagementScore: this.calculateEventEngagement(event),
            trendingRank: this.calculateTrendingRank(event, sinceDate)
        }));
    }

    async getPersonalizedRecommendations(limit = 10) {
        if (!this.app.currentUser) {
            return this.getTrendingContent('all', limit);
        }

        const userInterests = await this.getUserInterests();
        const userBehavior = await this.getUserBehaviorPatterns();
        
        const recommendations = await this.generateRecommendations(
            userInterests, 
            userBehavior, 
            limit
        );

        this.displayRecommendations(recommendations);
        return recommendations;
    }

    async getUserInterests() {
        // Analyze user's past interactions to determine interests
        const [likedPosts, attendedEvents, enrolledCourses] = await Promise.all([
            this.getUserLikedPosts(),
            this.getUserAttendedEvents(),
            this.getUserEnrolledCourses()
        ]);

        const interests = new Set();
        
        // Extract categories from liked posts
        likedPosts.forEach(post => {
            if (post.get('tags')) {
                post.get('tags').forEach(tag => interests.add(tag));
            }
        });
        
        // Extract categories from events
        attendedEvents.forEach(event => {
            if (event.get('category')) {
                interests.add(event.get('category'));
            }
        });
        
        // Extract categories from courses
        enrolledCourses.forEach(course => {
            interests.add(course.get('category'));
            if (course.get('tags')) {
                course.get('tags').forEach(tag => interests.add(tag));
            }
        });

        return Array.from(interests);
    }

    async getUserBehaviorPatterns() {
        const UserBehavior = this.app.services.parse.getClass('VibeUserBehavior');
        const query = new Parse.Query(UserBehavior);
        query.equalTo('user', this.app.currentUser);
        query.descending('createdAt');
        query.limit(100);

        const behaviors = await query.find();
        
        const patterns = {
            activeHours: this.calculateActiveHours(behaviors),
            preferredContentTypes: this.calculatePreferredContentTypes(behaviors),
            engagementLevel: this.calculateEngagementLevel(behaviors),
            socialConnections: await this.getSocialConnectionPatterns()
        };

        return patterns;
    }

    calculateActiveHours(behaviors) {
        const hourCounts = new Array(24).fill(0);
        
        behaviors.forEach(behavior => {
            const hour = new Date(behavior.get('createdAt')).getHours();
            hourCounts[hour]++;
        });
        
        return hourCounts;
    }

    calculatePreferredContentTypes(behaviors) {
        const typeCounts = {};
        
        behaviors.forEach(behavior => {
            const type = behavior.get('contentType');
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        return typeCounts;
    }

    async generateRecommendations(interests, behavior, limit) {
        const recommendations = [];
        
        // Content-based filtering
        for (const interest of interests.slice(0, 5)) {
            const content = await this.getContentByInterest(interest, limit / interests.length);
            recommendations.push(...content);
        }
        
        // Collaborative filtering (simplified)
        const similarUsers = await this.findSimilarUsers();
        for (const similarUser of similarUsers.slice(0, 3)) {
            const userRecs = await this.getUserLikedContent(similarUser.id);
            recommendations.push(...userRecs);
        }
        
        // Remove duplicates and sort by relevance
        const uniqueRecs = this.removeDuplicates(recommendations);
        uniqueRecs.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        return uniqueRecs.slice(0, limit);
    }

    async getContentByInterest(interest, limit) {
        const [posts, events, courses] = await Promise.all([
            this.searchPostsByTag(interest, limit),
            this.searchEventsByCategory(interest, limit),
            this.searchCoursesByCategory(interest, limit)
        ]);

        return [...posts, ...events, ...courses].map(item => ({
            ...item,
            relevanceScore: this.calculateRelevanceScore(item, interest)
        }));
    }

    async findSimilarUsers() {
        // Find users with similar interests and behavior
        const currentUserInterests = await this.getUserInterests();
        const User = this.app.services.parse.getClass('_User');
        const query = new Parse.Query(User);
        
        // This would be more sophisticated in production
        query.notEqualTo('objectId', this.app.currentUser.id);
        query.limit(10);

        const users = await query.find();
        
        // Calculate similarity scores
        const usersWithScores = await Promise.all(
            users.map(async (user) => {
                const userInterests = await this.getUserInterests(user.id);
                const similarity = this.calculateInterestSimilarity(
                    currentUserInterests, 
                    userInterests
                );
                return { user, similarity };
            })
        );

        return usersWithScores
            .filter(item => item.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .map(item => item.user);
    }

    calculateInterestSimilarity(interests1, interests2) {
        const set1 = new Set(interests1);
        const set2 = new Set(interests2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    async discoverNewUsers(limit = 15) {
        const userInterests = await this.getUserInterests();
        const following = await this.app.services.profile.loadFollowing();
        
        const User = this.app.services.parse.getClass('_User');
        const query = new Parse.Query(User);
        
        // Exclude already followed users and current user
        query.notContainedIn('objectId', [
            this.app.currentUser.id,
            ...following.map(user => user.id)
        ]);
        
        // Prioritize users with similar interests
        // This would be more sophisticated in production
        query.limit(limit * 2); // Get more to filter

        const users = await query.find();
        
        // Score users by relevance
        const scoredUsers = await Promise.all(
            users.map(async (user) => {
                const userInterests = await this.getUserInterests(user.id);
                const mutualConnections = await this.app.services.profile.getMutualConnections(user.id);
                const relevance = this.calculateUserRelevance(
                    user, 
                    userInterests, 
                    mutualConnections
                );
                
                return {
                    user: this.app.services.profile.formatUserProfile(user),
                    relevance,
                    mutualConnections: mutualConnections.mutualFollowers
                };
            })
        );

        return scoredUsers
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);
    }

    async exploreCategories() {
        const categories = await this.getPopularCategories();
        const trendingHashtags = await this.getTrendingHashtags();
        const liveContent = await this.getLiveContent();
        
        return {
            categories: categories.map(cat => ({
                ...cat,
                trending: this.isCategoryTrending(cat)
            })),
            trendingHashtags,
            liveContent,
            featuredContent: await this.getFeaturedContent()
        };
    }

    async getPopularCategories() {
        // Aggregate popular categories from all content types
        const [postCategories, eventCategories, courseCategories] = await Promise.all([
            this.aggregatePostCategories(),
            this.aggregateEventCategories(),
            this.aggregateCourseCategories()
        ]);

        // Combine and rank categories
        const allCategories = {};
        
        [...postCategories, ...eventCategories, ...courseCategories].forEach(item => {
            allCategories[item.name] = (allCategories[item.name] || 0) + item.count;
        });

        return Object.entries(allCategories)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
    }

    async getTrendingHashtags() {
        const VibePost = this.app.services.parse.getClass('VibePost');
        const query = new Parse.Query(VibePost);
        query.greaterThan('createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000));
        query.limit(1000);

        const recentPosts = await query.find();
        const hashtagCounts = {};

        recentPosts.forEach(post => {
            const tags = post.get('tags') || [];
            tags.forEach(tag => {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });
        });

        return Object.entries(hashtagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);
    }

    async getLiveContent() {
        const [liveStreams, liveTutoring, liveEvents] = await Promise.all([
            this.app.services.events.loadLiveStreams(5),
            this.app.services.learning.loadLiveTutoringSessions(5),
            this.getLiveEvents(5)
        ]);

        return {
            streams: liveStreams,
            tutoring: liveTutoring,
            events: liveEvents
        };
    }

    async getLiveEvents(limit = 5) {
        const VibeEvent = this.app.services.parse.getClass('VibeEvent');
        const query = new Parse.Query(VibeEvent);
        
        query.greaterThan('eventDate', new Date());
        query.lessThan('eventDate', new Date(Date.now() + 2 * 60 * 60 * 1000)); // Next 2 hours
        query.include('host');
        query.ascending('eventDate');
        query.limit(limit);

        return await query.find();
    }

    async joinChallenge(challengeId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeChallenge = this.app.services.parse.getClass('VibeChallenge');
        const query = new Parse.Query(VibeChallenge);
        const challenge = await query.get(challengeId);
        
        const participants = challenge.get('participants') || [];
        
        if (participants.some(p => p.user.id === this.app.currentUser.id)) {
            throw new Error('Already joined this challenge');
        }

        participants.push({
            user: this.app.currentUser,
            joinedAt: new Date(),
            progress: 0,
            completed: false
        });

        challenge.set('participants', participants);
        await challenge.save();

        await this.app.services.wallet.addLoyaltyPoints(10, 'challenge_joined');

        this.app.showSuccess('Challenge joined! Good luck! 🎯');
        return challenge;
    }

    async createChallenge(challengeData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeChallenge = this.app.services.parse.getClass('VibeChallenge');
        const challenge = new VibeChallenge();
        
        challenge.set('creator', this.app.currentUser);
        challenge.set('title', challengeData.title);
        challenge.set('description', challengeData.description);
        challenge.set('category', challengeData.category);
        challenge.set('type', challengeData.type); // daily, weekly, custom
        challenge.set('goal', challengeData.goal);
        challenge.set('duration', challengeData.duration); // in days
        challenge.set('reward', challengeData.reward || 0);
        challenge.set('participants', []);
        challenge.set('isActive', true);
        challenge.set('startDate', new Date(challengeData.startDate));
        challenge.set('endDate', new Date(challengeData.endDate));
        challenge.set('rules', challengeData.rules || []);
        challenge.set('tags', challengeData.tags || []);

        await challenge.save();
        
        this.app.showSuccess('Challenge created successfully! 🚀');
        return challenge;
    }

    async updateChallengeProgress(challengeId, progress) {
        const VibeChallenge = this.app.services.parse.getClass('VibeChallenge');
        const query = new Parse.Query(VibeChallenge);
        const challenge = await query.get(challengeId);
        
        const participants = challenge.get('participants') || [];
        const participantIndex = participants.findIndex(
            p => p.user.id === this.app.currentUser.id
        );

        if (participantIndex === -1) {
            throw new Error('Not participating in this challenge');
        }

        participants[participantIndex].progress = progress;
        
        // Check if challenge completed
        if (progress >= challenge.get('goal') && !participants[participantIndex].completed) {
            participants[participantIndex].completed = true;
            participants[participantIndex].completedAt = new Date();
            
            // Award reward
            if (challenge.get('reward') > 0) {
                await this.app.services.wallet.addLoyaltyPoints(
                    challenge.get('reward'),
                    'challenge_completed'
                );
            }

            this.app.showSuccess('Challenge completed! 🎉');
        }

        challenge.set('participants', participants);
        await challenge.save();

        return challenge;
    }

    async getDailyDiscovery() {
        const dateKey = new Date().toDateString();
        const cacheKey = `daily_discovery_${dateKey}`;
        
        // Check cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const discovery = {
            featured: await this.getFeaturedContent(),
            trending: await this.getTrendingContent('all', 10),
            recommendations: await this.getPersonalizedRecommendations(8),
            challenges: await this.getActiveChallenges(5),
            liveNow: await this.getLiveContent(),
            communities: await this.getRecommendedCommunities(5)
        };

        // Cache for 1 hour
        localStorage.setItem(cacheKey, JSON.stringify(discovery));
        setTimeout(() => {
            localStorage.removeItem(cacheKey);
        }, 60 * 60 * 1000);

        return discovery;
    }

    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendations-grid');
        if (!container) return;

        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-card" data-type="${rec.type}" data-id="${rec.id}">
                <div class="rec-content">
                    ${this.getRecommendationHTML(rec)}
                </div>
                <div class="rec-actions">
                    <button onclick="vibeApp.services.discovery.interactWithRecommendation('${rec.type}', '${rec.id}')" 
                            class="btn-interact">
                        Explore
                    </button>
                    <button onclick="vibeApp.services.discovery.dismissRecommendation('${rec.type}', '${rec.id}')" 
                            class="btn-dismiss">
                        Not Interested
                    </button>
                </div>
            </div>
        `).join('');
    }

    getRecommendationHTML(recommendation) {
        switch (recommendation.type) {
            case 'post':
                return `
                    <div class="post-rec">
                        <h4>${recommendation.content.get('title')}</h4>
                        <p>${recommendation.content.get('content').substring(0, 100)}...</p>
                        <div class="post-meta">
                            <span>By ${recommendation.content.get('author').get('username')}</span>
                            <span>${recommendation.content.get('likesCount')} likes</span>
                        </div>
                    </div>
                `;
            case 'event':
                return `
                    <div class="event-rec">
                        <h4>${recommendation.content.get('title')}</h4>
                        <p>${recommendation.content.get('description').substring(0, 100)}...</p>
                        <div class="event-meta">
                            <span>${new Date(recommendation.content.get('eventDate')).toLocaleDateString()}</span>
                            <span>${recommendation.content.get('attendees')?.length || 0} attending</span>
                        </div>
                    </div>
                `;
            case 'course':
                return `
                    <div class="course-rec">
                        <h4>${recommendation.content.get('title')}</h4>
                        <p>${recommendation.content.get('description').substring(0, 100)}...</p>
                        <div class="course-meta">
                            <span>${recommendation.content.get('level')}</span>
                            <span>${recommendation.content.get('enrolledStudents')?.length || 0} students</span>
                        </div>
                    </div>
                `;
            default:
                return '<div>Unknown content type</div>';
        }
    }

    async interactWithRecommendation(type, id) {
        // Track user interaction for better future recommendations
        await this.app.services.ai.trackUserBehavior('recommendation_interaction', {
            contentType: type,
            contentId: id,
            action: 'clicked'
        });

        // Navigate to content
        switch (type) {
            case 'post':
                this.app.router.navigate(`/post/${id}`);
                break;
            case 'event':
                this.app.router.navigate(`/event/${id}`);
                break;
            case 'course':
                this.app.router.navigate(`/course/${id}`);
                break;
            case 'stream':
                this.app.router.navigate(`/stream/${id}`);
                break;
        }
    }

    async dismissRecommendation(type, id) {
        // Track dismissal to avoid showing similar content
        await this.app.services.ai.trackUserBehavior('recommendation_dismissal', {
            contentType: type,
            contentId: id,
            reason: 'not_interested'
        });

        // Remove from UI
        const element = document.querySelector(`[data-type="${type}"][data-id="${id}"]`);
        if (element) {
            element.style.opacity = '0';
            setTimeout(() => element.remove(), 300);
        }

        this.app.showSuccess('Thanks for the feedback! We will show you less of this type of content.');
    }

    // Helper methods for content aggregation
    calculatePostEngagement(post) {
        const likes = post.get('likesCount') || 0;
        const comments = post.get('commentsCount') || 0;
        const shares = post.get('sharesCount') || 0;
        const timeDecay = this.calculateTimeDecay(post.get('createdAt'));
        
        return (likes * 1 + comments * 2 + shares * 3) * timeDecay;
    }

    calculateEventEngagement(event) {
        const attendees = event.get('attendees')?.length || 0;
        const capacity = event.get('ticketsAvailable') || 1;
        const timeUntilEvent = new Date(event.get('eventDate')).getTime() - Date.now();
        const timeFactor = timeUntilEvent > 0 ? 1 / (timeUntilEvent / (1000 * 60 * 60)) : 0.1;
        
        return (attendees / capacity) * 100 * timeFactor;
    }

    calculateTrendingRank(content, sinceDate) {
        const engagement = this.calculatePostEngagement(content);
        const timeFactor = this.calculateTimeDecay(content.get('createdAt'), sinceDate);
        return engagement * timeFactor;
    }

    calculateTimeDecay(createdAt, sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        const now = Date.now();
        const created = new Date(createdAt).getTime();
        const since = new Date(sinceDate).getTime();
        
        const halfLife = 24 * 60 * 60 * 1000; // 24 hours half-life
        const elapsed = now - created;
        return Math.exp(-elapsed * Math.log(2) / halfLife);
    }

    calculateRelevanceScore(item, interest) {
        let score = 0;
        
        if (item.type === 'post' && item.content.get('tags')?.includes(interest)) {
            score += 10;
        }
        
        if (item.type === 'event' && item.content.get('category') === interest) {
            score += 8;
        }
        
        if (item.type === 'course' && item.content.get('category') === interest) {
            score += 8;
        }
        
        // Add engagement bonus
        score += Math.log10((item.content.get('likesCount') || 0) + 1);
        
        return score;
    }

    calculateUserRelevance(user, userInterests, mutualConnections) {
        const currentUserInterests = this.getUserInterests();
        const interestSimilarity = this.calculateInterestSimilarity(
            currentUserInterests, 
            userInterests
        );
        
        const mutualBonus = mutualConnections * 5;
        const verificationBonus = user.get('isVerified') ? 10 : 0;
        
        return interestSimilarity * 100 + mutualBonus + verificationBonus;
    }

    removeDuplicates(recommendations) {
        const seen = new Set();
        return recommendations.filter(rec => {
            const key = `${rec.type}-${rec.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}

export default DiscoveryService;