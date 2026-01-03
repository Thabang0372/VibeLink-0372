class VibeAnalytics {
    static getSchema() {
        return {
            className: 'VibeAnalytics',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                post: { type: 'Pointer', targetClass: 'Post' },
                reach: { type: 'Number', default: 0 },
                engagement: { type: 'Number', default: 0 },
                locationData: { type: 'Object', default: {} },
                boostLevel: { type: 'Number', default: 0 },
                adConsent: { type: 'Boolean', default: true },
                actionType: { type: 'String' },
                date: { type: 'Date', required: true }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeAnalytics');
    }
}

export default VibeAnalytics;