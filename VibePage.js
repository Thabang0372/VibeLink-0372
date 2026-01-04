class VibePage {
    static getSchema() {
        return {
            className: 'VibePage',
            fields: {
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                pageType: { type: 'String', required: true },
                bio: { type: 'String' },
                analytics: { type: 'Object', default: {} },
                followers: { type: 'Relation', targetClass: '_User' },
                monetizationEnabled: { type: 'Boolean', default: false },
                subscriptions: { type: 'Relation', targetClass: '_User' },
                coverImage: { type: 'File' },
                verified: { type: 'Boolean', default: false }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibePage');
    }
}

export default VibePage;