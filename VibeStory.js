class VibeStory {
    static getSchema() {
        return {
            className: 'VibeStory',
            fields: {
                author: { type: 'Pointer', targetClass: '_User', required: true },
                content: { type: 'String' },
                media: { type: 'File' },
                type: { type: 'String', default: 'text' },
                backgroundColor: { type: 'String', default: '#667eea' },
                textColor: { type: 'String', default: '#ffffff' },
                expiresAt: { type: 'Date', required: true },
                views: { type: 'Array', default: [] },
                reactions: { type: 'Array', default: [] },
                isActive: { type: 'Boolean', default: true }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeStory');
    }
}
window.VibeStory = VibeStory;