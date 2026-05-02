class AIService {
    constructor(app) { this.app = app; }

    async trackUserBehavior(action, data) {
        const AI = Parse.Object.extend('AI');
        const query = new Parse.Query(AI);
        query.equalTo('user', this.app.currentUser);
        let aiRecord = await query.first();
        if (!aiRecord) {
            aiRecord = new AI();
            aiRecord.set('user', this.app.currentUser);
            aiRecord.set('aiData', {});
            aiRecord.set('preferences', {});
            aiRecord.set('learningPattern', {});
        }
        const learningPattern = aiRecord.get('learningPattern') || {};
        learningPattern[action] = learningPattern[action] || { count: 0, lastPerformed: new Date() };
        learningPattern[action].count++;
        learningPattern[action].lastPerformed = new Date();
        aiRecord.set('learningPattern', learningPattern);
        await aiRecord.save();
        await this.trackAnalytics(action, data);
    }

    async trackAnalytics(actionType, data) {
        const VibeAnalytics = Parse.Object.extend('VibeAnalytics');
        const analytics = new VibeAnalytics();
        analytics.set('user', this.app.currentUser);
        analytics.set('actionType', actionType);
        analytics.set('reach', data.reach || 1);
        analytics.set('engagement', data.engagement || 1);
        analytics.set('locationData', data.location || null);
        analytics.set('boostLevel', data.boostLevel || 0);
        analytics.set('adConsent', data.adConsent !== false);
        analytics.set('date', new Date());
        if (data.post) {
            analytics.set('post', { __type: 'Pointer', className: 'Post', objectId: data.post });
        }
        await analytics.save();
    }

    async getAISuggestions(context) {
        const userPattern = await this.getUserPattern();
        return this.generateSuggestions(userPattern, context);
    }

    async getUserPattern() {
        const AI = Parse.Object.extend('AI');
        const query = new Parse.Query(AI);
        query.equalTo('user', this.app.currentUser);
        const aiRecord = await query.first();
        return aiRecord ? aiRecord.get('learningPattern') : {};
    }

    generateSuggestions(userPattern, context) {
        return {
            content: this.suggestContent(userPattern),
            connections: this.suggestConnections(userPattern),
            groups: this.suggestGroups(userPattern, context),
            events: this.suggestEvents(userPattern),
            challenges: this.suggestChallenges(userPattern)
        };
    }

    suggestContent(userPattern) {
        const interests = Object.keys(userPattern).sort((a, b) => 
            userPattern[b].count - userPattern[a].count
        ).slice(0, 5);
        return { tags: interests, topics: this.generateTopics(interests), trending: [] };
    }

    suggestConnections(userPattern) {
        const frequentInteractions = Object.entries(userPattern)
            .filter(([key]) => key.startsWith('interaction_'))
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);
        return frequentInteractions.map(([key]) => key.replace('interaction_', ''));
    }

    suggestGroups(userPattern, context) {
        return this.findMatchingGroups(this.extractInterests(userPattern), context?.location);
    }

    suggestEvents(userPattern) {
        return this.findRelevantEvents(this.extractPreferences(userPattern));
    }

    suggestChallenges(userPattern) {
        return this.recommendChallenges(this.calculateActivityLevel(userPattern));
    }

    extractInterests(userPattern) {
        return Object.entries(userPattern)
            .filter(([key]) => !key.startsWith('interaction_'))
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 8)
            .map(([key]) => key);
    }

    extractPreferences(userPattern) {
        const prefs = {};
        Object.entries(userPattern).forEach(([key, value]) => {
            if (value.count > 5) prefs[key] = value.count;
        });
        return prefs;
    }

    calculateActivityLevel(userPattern) {
        const total = Object.values(userPattern).reduce((sum, p) => sum + p.count, 0);
        const days = Math.floor((new Date() - this.app.currentUser.createdAt) / 86400000) || 1;
        return total / days;
    }

    generateTopics(interests) {
        const map = {
            'technology': ['AI', 'Programming', 'Gadgets'],
            'sports': ['Football', 'Fitness'],
            'music': ['Concerts', 'New Releases'],
            'gaming': ['Esports', 'Streaming']
        };
        return interests.flatMap(i => map[i] || [i]);
    }

    async findMatchingGroups(interests, location) {
        const q = new Parse.Query('VibeCircle');
        if (interests.length) q.containsAll('tags', interests.slice(0, 3));
        q.descending('engagementScore').limit(5);
        try { return await q.find(); } catch(e) { return []; }
    }

    async findRelevantEvents(prefs) {
        const q = new Parse.Query('VibeEvent');
        q.greaterThan('eventDate', new Date()).ascending('eventDate').limit(10);
        try { return await q.find(); } catch(e) { return []; }
    }

    async recommendChallenges(level) {
        const q = new Parse.Query('VibeChallenge');
        q.greaterThan('endDate', new Date());
        if (level > 10) q.descending('reward'); else q.ascending('difficulty');
        q.limit(5);
        try { return await q.find(); } catch(e) { return []; }
    }

    // ---- NEW: Engagement-scored personalised feed (TikTok-style) ----
    async getRankedFeed(limit = 20) {
        const posts = await new Parse.Query('Post')
            .include('author')
            .greaterThan('engagementScore', 0)
            .descending('engagementScore')
            .limit(limit * 2)
            .find();

        const userPattern = await this.getUserPattern();
        const interests = this.extractInterests(userPattern);

        posts.forEach(p => {
            let boost = 1.0;
            const tags = p.get('vibeTags') || [];
            const content = p.get('content') || '';
            interests.forEach(i => {
                if (tags.includes(i) || content.toLowerCase().includes(i.toLowerCase())) boost += 0.3;
            });
            p.personalizedScore = (p.get('engagementScore') || 0) * boost;
        });

        return posts.sort((a, b) => b.personalizedScore - a.personalizedScore).slice(0, limit);
    }
}

window.AIService = AIService;