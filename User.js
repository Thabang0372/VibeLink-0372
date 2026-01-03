class User {
    static getSchema() {
        return {
            className: '_User',
            fields: {
                username: { type: 'String', required: true },
                email: { type: 'String', required: true },
                password: { type: 'String', required: true },
                avatar: { type: 'File' },
                bio: { type: 'String' },
                createdAt: { type: 'Date' },
                updatedAt: { type: 'Date' },
                emailVerified: { type: 'Boolean', default: false }
            }
        };
    }
}

export default User;