class VibeUserBehavior {
    static getSchema() {
        return {
            className: 'VibeUserBehavior',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                contentType: { type: 'String' },
                action: { type: 'String' },
                data: { type: 'Object', default: {} }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeUserBehavior');
    }
}
window.VibeUserBehavior = VibeUserBehavior;