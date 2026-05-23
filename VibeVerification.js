class VibeVerification {
    static getSchema() {
        return {
            className: 'VibeVerification',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                type: { type: 'String', required: true },
                status: { type: 'String', default: 'pending' },
                submittedData: { type: 'Object', default: {} },
                submittedAt: { type: 'Date', required: true },
                reviewedAt: { type: 'Date' },
                reviewedBy: { type: 'Pointer', targetClass: '_User' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeVerification');
    }
}
window.VibeVerification = VibeVerification;