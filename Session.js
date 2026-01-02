class Session {
    static getSchema() {
        return {
            className: '_Session',
            fields: {
                sessionToken: { type: 'String', required: true },
                user: { type: 'Pointer', targetClass: '_User', required: true },
                createdAt: { type: 'Date' },
                updatedAt: { type: 'Date' },
                expiresAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('_Session');
    }
}

export default Session;