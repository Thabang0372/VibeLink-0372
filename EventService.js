class EventService {
    constructor(app) { this.app = app; }

    async createEvent(data) {
        const Event = Parse.Object.extend('VibeEvent');
        const e = new Event();
        e.set('host', this.app.currentUser);
        e.set('title', data.title);
        e.set('description', data.description);
        e.set('eventDate', new Date(data.date));
        e.set('location', data.location);
        e.set('ticketsAvailable', data.tickets);
        e.set('price', data.price || 0);
        await e.save();
        showNotification('Event created');
        await this.loadEvents();
    }

    async loadEvents() {
        const q = new Parse.Query('VibeEvent').greaterThan('eventDate', new Date()).include('host').ascending('eventDate');
        const events = await q.find();
        const container = document.getElementById('events-list');
        if (container) {
            container.innerHTML = events.map(e => `<div class="card"><h4>${e.get('title')}</h4><p>${e.get('description')}</p><button data-id="${e.id}" class="rsvp-btn">RSVP</button></div>`).join('');
            container.querySelectorAll('.rsvp-btn').forEach(b => b.onclick = () => this.rsvp(b.dataset.id));
        }
    }

    async rsvp(eventId) {
        const e = await new Parse.Query('VibeEvent').get(eventId);
        e.addUnique('attendees', this.app.currentUser);
        await e.save();
        showNotification('RSVP confirmed');
    }

    async startLiveStream(title) {
        const Stream = Parse.Object.extend('VibeLiveStream');
        const s = new Stream();
        s.set('host', this.app.currentUser);
        s.set('title', title);
        s.set('isLive', true);
        s.set('startedAt', new Date());
        await s.save();
        showNotification('Live stream started');
        await this.loadLiveStreams();
    }

    async loadLiveStreams() {
        const q = new Parse.Query('VibeLiveStream').equalTo('isLive', true).include('host');
        const streams = await q.find();
        const container = document.getElementById('live-streams-list');
        if (container) container.innerHTML = streams.map(s => `<div class="card"><h4>${s.get('title')}</h4><button onclick="alert('Watch stream ${s.id}')">Watch</button></div>`).join('');
    }
}
window.EventService = EventService;