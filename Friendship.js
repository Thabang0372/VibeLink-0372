class Friendship {
    static getSchema() {
        return {
            className: 'Friendship',
            fields: {
                requester: { type: 'Pointer', targetClass: '_User', required: true },
                recipient: { type: 'Pointer', targetClass: '_User', required: true },
                status: { type: 'String', default: 'pending' },
                createdAt: { type: 'Date' },
                updatedAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Friendship');
    }
}

export default Friendship;