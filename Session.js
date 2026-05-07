class SessionModel {
    static getSchema() {
        return {
            className: '_Session',
            fields: {
                sessionToken: { type: 'String', required: true },
                user: { type: 'Pointer', targetClass: '_User', required: true },
                expiresAt: { type: 'Date' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('_Session');
    }
}
window.SessionModel = SessionModel;