class NotificationService {
    constructor(app) { this.app = app; }

    async createNotification(userId, type, message, relatedObject = null) {
        const Notification = Parse.Object.extend('Notification');
        const n = new Notification();
        n.set('user', { __type: 'Pointer', className: '_User', objectId: userId });
        n.set('type', type);
        n.set('message', message);
        n.set('read', false);
        if (relatedObject) n.set('relatedObject', relatedObject);
        await n.save();
        return n;
    }

    async markAsRead(notificationId) {
        const n = await new Parse.Query('Notification').get(notificationId);
        n.set('read', true);
        await n.save();
    }

    async getUserNotifications(userId, limit = 20) {
        const q = new Parse.Query('Notification');
        q.equalTo('user', { __type:'Pointer', className:'_User', objectId: userId });
        q.descending('createdAt');
        q.limit(limit);
        return await q.find();
    }
}

window.NotificationService = NotificationService;