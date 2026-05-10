class VibeCommunityPostModel {
    static getSchema() {
        return {
            className: 'VibeCommunityPost',
            fields: {
                community: { type: 'Pointer', targetClass: 'VibeCommunity', required: true },
                author: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                content: { type: 'String', required: true },
                type: { type: 'String', default: 'discussion' },
                tags: { type: 'Array', default: [] },
                reactions: { type: 'Array', default: [] },
                comments: { type: 'Array', default: [] },
                views: { type: 'Number', default: 0 },
                isPinned: { type: 'Boolean', default: false },
                isLocked: { type: 'Boolean', default: false },
                media: { type: 'Array', default: [] }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeCommunityPost');
    }
}
window.VibeCommunityPostModel = VibeCommunityPostModel;