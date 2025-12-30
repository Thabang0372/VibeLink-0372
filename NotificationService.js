class NotificationService {
    constructor(app) {
        this.app = app;
    }

    async createNotification(userId, type, message, relatedObject = null) {
        const Notification = this.app.services.parse.getClass('Notification');
        const notification = new Notification();
        
        notification.set('user', this.app.services.parse.createPointer('_User', userId));
        notification.set('type', type);
        notification.set('message', message);
        notification.set('read', false);
        notification.set('createdAt', new Date());
        
        if (relatedObject) {
            notification.set('relatedObject', relatedObject);
        }

        await notification.save();
        return notification;
    }

    async markAsRead(notificationId) {
        const Notification = this.app.services.parse.getClass('Notification');
        const query = new Parse.Query(Notification);
        const notification = await query.get(notificationId);
        notification.set('read', true);
        await notification.save();
        return notification;
    }

    async getUserNotifications(userId, limit = 20) {
        const Notification = this.app.services.parse.getClass('Notification');
        const query = new Parse.Query(Notification);
        query.equalTo('user', this.app.services.parse.createPointer('_User', userId));
        query.descending('createdAt');
        query.limit(limit);
        
        return await query.find();
    }
}

export default NotificationService;