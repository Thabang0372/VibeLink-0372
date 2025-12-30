class MarketplaceItem {
    static getSchema() {
        return {
            className: 'MarketplaceItem',
            fields: {
                seller: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String' },
                price: { type: 'Number', required: true },
                currency: { type: 'String', default: 'VIBE' },
                category: { type: 'String', required: true },
                barterOption: { type: 'Boolean', default: false },
                status: { type: 'String', default: 'available' },
                orderChat: { type: 'Relation', targetClass: 'Message' },
                images: { type: 'Array', default: [] },
                condition: { type: 'String', default: 'new' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('MarketplaceItem');
    }
}

export default MarketplaceItem;