class ARService {
    constructor(app) { this.app = app; }

    async createExperience(data) {
        const AR = Parse.Object.extend('VibeARExperience');
        const exp = new AR();
        exp.set('creator', this.app.currentUser);
        exp.set('experienceType', data.type);
        if (data.mediaFile) {
            const file = new Parse.File('ar.jpg', data.mediaFile);
            await file.save();
            exp.set('mediaFile', file);
        }
        exp.set('interactiveObjects', data.interactiveObjects || []);
        exp.set('filters', data.filters || []);
        await exp.save();
        showNotification('AR experience created');
        await this.loadExperiences();
    }

    async loadExperiences() {
        const q = new Parse.Query('VibeARExperience').include('creator').descending('createdAt');
        const exps = await q.find();
        const container = document.getElementById('ar-list');
        if (container) container.innerHTML = exps.map(e => `<div class="card"><h4>${e.get('experienceType')}</h4><p>By ${e.get('creator').get('username')}</p><button onclick="alert('AR viewer coming')">View</button></div>`).join('');
    }
}

window.ARService = ARService;