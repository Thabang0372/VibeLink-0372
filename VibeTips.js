class VibeTips {
    static getSchema() {
        return {
            className: 'VibeTips',
            fields: {
                sender: { type: 'Pointer', targetClass: '_User', required: true },
                creator: { type: 'Pointer', targetClass: '_User', required: true },
                amount: { type: 'Number', required: true },
                currency: { type: 'String', default: 'VIBE' },
                message: { type: 'String' },
                createdAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeTips');
    }
}

export default VibeTips;