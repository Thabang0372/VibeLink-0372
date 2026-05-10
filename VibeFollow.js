class VibeFollow {
    static getSchema() {
        return {
            className: 'VibeFollow',
            fields: {
                follower: { type: 'Pointer', targetClass: '_User', required: true },
                following: { type: 'Pointer', targetClass: '_User', required: true },
                followedAt: { type: 'Date', required: true }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeFollow');
    }
}
window.VibeFollow = VibeFollow;