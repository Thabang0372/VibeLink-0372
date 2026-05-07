class RealtimeManager {
    constructor(app) { this.app = app; this.subscriptions = new Map(); }

    async initialize() {
        try {
            const Post = Parse.Object.extend('Post');
            const postSub = await new Parse.Query(Post).subscribe();
            postSub.on('create', post => this.app.services.posts?.handleNewPost?.(post));
            this.subscriptions.set('posts', postSub);

            const Message = Parse.Object.extend('Message');
            const msgSub = await new Parse.Query(Message).subscribe();
            msgSub.on('create', msg => this.app.services.chat?.handleNewMessage?.(msg));
            this.subscriptions.set('messages', msgSub);

            console.log('✅ LiveQuery subscriptions active');
        } catch(e) { console.error('Realtime init failed', e); }
    }

    broadcastUpdate(type, data) {
        console.log('Broadcast:', type, data);
    }

    unsubscribeAll() {
        this.subscriptions.forEach((sub, key) => { sub.unsubscribe(); console.log(`Unsubscribed: ${key}`); });
        this.subscriptions.clear();
    }
}

window.RealtimeManager = RealtimeManager;