class Notification {
    static getSchema() {
        return {
            className: 'Notification',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                type: { type: 'String' },
                message: { type: 'String' },
                read: { type: 'Boolean', default: false },
                relatedObject: { type: 'Pointer' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('Notification');
    }
}
window.Notification = Notification;