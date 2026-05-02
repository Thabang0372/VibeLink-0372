class CommentModel {
    static getSchema() {
        return {
            className: 'Comment',
            fields: {
                author: { type: 'Pointer', targetClass: '_User', required: true },
                content: { type: 'String', required: true },
                post: { type: 'Pointer', targetClass: 'Post', required: true },
                likes: { type: 'Number', default: 0 },
                parentComment: { type: 'Pointer', targetClass: 'Comment' }
            }
        };
    }
    static createParseClass() { return Parse.Object.extend('Comment'); }
}
window.CommentModel = CommentModel;