class VibeThreadPost {
    static getSchema() {
        return {
            className: 'VibeThreadPost',
            fields: {
                author: { type: 'Pointer', targetClass: '_User', required: true },
                content: { type: 'String', required: true },
                parentPost: { type: 'Pointer', targetClass: 'VibeThreadPost' },
                media: { type: 'Array', default: [] },
                tags: { type: 'Array', default: [] },
                reactions: { type: 'Object', default: {} },
                shares: { type: 'Number', default: 0 },
                createdAt: { type: 'Date' },
                updatedAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeThreadPost');
    }
}

export default VibeThreadPost;