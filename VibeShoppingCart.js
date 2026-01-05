class VibeShoppingCart {
    static getSchema() {
        return {
            className: 'VibeShoppingCart',
            fields: {
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                items: { type: 'Array', default: [] },
                totalPrice: { type: 'Number', default: 0 },
                currency: { type: 'String', default: 'VIBE' },
                status: { type: 'String', default: 'active' },
                createdAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeShoppingCart');
    }
}

export default VibeShoppingCart;