class VibePremiumCircle {
    static getSchema() {
        return {
            className: 'VibePremiumCircle',
            fields: {
                name: { type: 'String', required: true },
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                subscriptionPrice: { type: 'Number', required: true },
                members: { type: 'Relation', targetClass: '_User' },
                moderators: { type: 'Relation', targetClass: '_User' },
                accessLevel: { type: 'String', default: 'premium' },
                content: { type: 'Relation', targetClass: 'Post' },
                createdAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibePremiumCircle');
    }
}

export default VibePremiumCircle;