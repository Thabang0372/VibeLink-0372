class Like {
    static getSchema() {
        return {
            className: 'Like',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                post: { type: 'Pointer', targetClass: 'Post', required: true },
                type: { type: 'String', default: 'like' },
                reaction: { type: 'String', default: '❤️' },
                createdAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Like');
    }
}

export default Like;