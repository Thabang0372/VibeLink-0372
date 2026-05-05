class DiscoveryService {
    constructor(app) { this.app = app; }

    async loadRecommendations() {
        const q = new Parse.Query('Post').descending('createdAt').limit(20).include('author');
        const posts = await q.find();
        const container = document.getElementById('recommendations-grid');
        if (container) container.innerHTML = posts.map(p => `<div class="card"><h4>${p.get('author').get('username')}</h4><p>${p.get('content')}</p></div>`).join('');
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
        if (container) container.innerHTML = challenges.map(c => `<div class="card"><h4>${c.get('title')}</h4><button onclick="alert('Join challenge')">Join</button></div>`).join('');
    }

    async joinChallenge(id) {
        const c = await new Parse.Query('VibeChallenge').get(id);
        c.addUnique('participants', this.app.currentUser);
        await c.save();
        showNotification('Joined challenge');
    }
}
window.DiscoveryService = DiscoveryService;