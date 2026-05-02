// ==================== VibeLink 0372® Cloud Code ====================

Parse.Cloud.beforeSave('Post', (request) => {
    const post = request.object;
    if (!post.existed()) {
        post.set('engagementScore', 10);
        post.set('viewCount', 0);
        post.set('likeCount', 0);
        post.set('commentCount', 0);
        post.set('shareCount', 0);
    }
});

Parse.Cloud.afterSave('Like', async (request) => {
    const like = request.object;
    const post = like.get('post');
    if (post) {
        await post.fetch({ useMasterKey: true });
        post.increment('likeCount');
        updateEngagementScore(post);
        await post.save(null, { useMasterKey: true });
    }
});

Parse.Cloud.afterSave('Comment', async (request) => {
    const comment = request.object;
    const post = comment.get('post');
    if (post) {
        await post.fetch({ useMasterKey: true });
        post.increment('commentCount');
        updateEngagementScore(post);
        await post.save(null, { useMasterKey: true });
    }
});

function updateEngagementScore(post) {
    const likes = post.get('likeCount') || 0;
    const comments = post.get('commentCount') || 0;
    const shares = post.get('shareCount') || 0;
    const views = post.get('viewCount') || 0;
    const engagement = (likes * 3) + (comments * 5) + (shares * 10) + (views * 0.1);
    const hoursSinceCreation = (Date.now() - post.createdAt) / 3600000;
    const recencyBoost = 1 / (1 + hoursSinceCreation / 24);
    post.set('engagementScore', engagement * recencyBoost);
}

Parse.Cloud.define('getPersonalizedFeed', async (request) => {
    const user = request.user;
    const limit = request.params.limit || 20;
    
    const interactions = await new Parse.Query('VibeAnalytics')
        .equalTo('user', user)
        .descending('createdAt')
        .limit(50)
        .find({ useMasterKey: true });
    
    const tagScores = {};
    interactions.forEach(i => {
        const tags = i.get('tags') || [];
        tags.forEach(tag => { tagScores[tag] = (tagScores[tag] || 0) + 1; });
    });
    
    const posts = await new Parse.Query('Post')
        .greaterThan('engagementScore', 5)
        .descending('engagementScore')
        .limit(limit * 2)
        .include('author')
        .find({ useMasterKey: true });
    
    posts.forEach(post => {
        let boost = 1.0;
        const postTags = post.get('tags') || [];
        postTags.forEach(tag => { boost += (tagScores[tag] || 0) * 0.2; });
        post.personalizedScore = post.get('engagementScore') * boost;
    });
    
    return posts.sort((a, b) => b.personalizedScore - a.personalizedScore).slice(0, limit);
});

Parse.Cloud.beforeSave('VibeKeyBundle', async (request) => {
    const bundle = request.object;
    if (!bundle.existed()) {
        const query = new Parse.Query('VibeKeyBundle');
        query.equalTo('user', bundle.get('user'));
        const existing = await query.first({ useMasterKey: true });
        if (existing) throw new Error('User already has a key bundle');
    }
});