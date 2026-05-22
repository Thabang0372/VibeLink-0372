class VibeQuestion {
    static getSchema() {
        return {
            className: 'VibeQuestion',
            fields: {
                author: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String', required: true },
                category: { type: 'String', required: true },
                tags: { type: 'Array', default: [] },
                priority: { type: 'String', default: 'normal' },
                status: { type: 'String', default: 'open' },
                answers: { type: 'Array', default: [] },
                upvotes: { type: 'Number', default: 0 },
                views: { type: 'Number', default: 0 },
                isAnonymous: { type: 'Boolean', default: false }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeQuestion');
    }
}
window.VibeQuestion = VibeQuestion;