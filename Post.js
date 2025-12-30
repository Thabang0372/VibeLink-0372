class Post {
    static getSchema() {
        return {
            className: 'Post',
            fields: {
                author: { type: 'Pointer', targetClass: '_User', required: true },
                content: { type: 'String', required: true },
                media: { type: 'Array', default: [] },
                vibeTags: { type: 'Array', default: [] },
                aiSuggestions: { type: 'Object', default: {} },
                milestones: { type: 'Array', default: [] },
                pinned: { type: 'Boolean', default: false },
                visibility: { type: 'String', default: 'public' },
                reactions: { type: 'Object', default: {} },
                shares: { type: 'Number', default: 0 },
                comments: { type: 'Relation', targetClass: 'Comment' },
                createdAt: { type: 'Date' },
                updatedAt: { type: 'Date' },
                location: { type: 'GeoPoint' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Post');
    }
}

export default Post;