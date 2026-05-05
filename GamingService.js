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
        const q = new Parse.Query('VibeGameSession').containedIn('status', ['waiting','active']).include('host');
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
        t.set('status','registration');
        await t.save();
        showNotification('Tournament created');
    }
}
window.GamingService = GamingService;