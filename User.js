class UserModel {
    static getSchema() {
        return {
            className: '_User',
            fields: {
                username: { type: 'String', required: true },
                email: { type: 'String', required: true },
                password: { type: 'String', required: true },
                avatar: { type: 'File' },
                bio: { type: 'String' },
                emailVerified: { type: 'Boolean', default: false }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('_User');
    }
}
window.UserModel = UserModel;