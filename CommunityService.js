class CommunityService {
    constructor(app) { this.app = app; }

    async createCommunity(data) {
        const Comm = Parse.Object.extend('VibeCommunity');
        const c = new Comm();
        c.set('name', data.name);
        c.set('description', data.description);
        c.set('owner', this.app.currentUser);
        c.set('members', [this.app.currentUser]);
        c.set('privacy', data.privacy || 'public');
        c.set('memberCount', 1);
        c.set('postCount', 0);
        await c.save();
        showNotification('Community created');
        await this.loadCommunities();
    }

    async loadCommunities() {
        const q = new Parse.Query('VibeCommunity').include('owner').descending('memberCount');
        const comms = await q.find();
        const container = document.getElementById('communities-grid');
        if (container) {
            container.innerHTML = comms.map(c => `<div class="card"><h4>${c.get('name')}</h4><p>${c.get('description')}</p><button data-id="${c.id}" class="view-community-btn">View</button></div>`).join('');
            container.querySelectorAll('.view-community-btn').forEach(b => b.onclick = () => this.viewCommunity(b.dataset.id));
        }
    }

    async viewCommunity(id) {
        const c = await new Parse.Query('VibeCommunity').get(id);
        document.getElementById('communities-grid').classList.add('hidden');
        const view = document.getElementById('selected-community-view');
        view.classList.remove('hidden');
        document.getElementById('community-name').innerText = c.get('name');
        document.getElementById('community-description').innerText = c.get('description');
        // Load actual posts for this community
        const posts = await new Parse.Query('Post').equalTo('community', c).include('author').descending('createdAt').find();
        document.getElementById('community-posts').innerHTML = posts.length
            ? posts.map(p => `<div class="post"><strong>${p.get('author').get('username')}</strong>: ${p.get('content')}</div>`).join('')
            : '<p>No posts in this community yet.</p>';
        document.getElementById('community-members-list').innerHTML = c.get('members').map(m => `<div>${m.username || m.id}</div>`).join('');
        document.getElementById('back-to-communities').onclick = () => {
            view.classList.add('hidden');
            document.getElementById('communities-grid').classList.remove('hidden');
        };
        // Wire up "Post in Community" button
        document.getElementById('post-in-community').onclick = async () => {
            const content = prompt('What would you like to share?');
            if (content) {
                await this.app.services.posts.createPost(content);
                showNotification('Post published in community');
                await this.viewCommunity(id);
            }
        };
    }

    async joinCommunity(id) {
        const c = await new Parse.Query('VibeCommunity').get(id);
        c.addUnique('members', this.app.currentUser);
        c.set('memberCount', c.get('members').length);
        await c.save();
        showNotification('Joined community');
    }
}
window.CommunityService = CommunityService;