class VibeTips {
    static getSchema() {
        return {
            className: 'VibeTips',
            fields: {
                sender: { type: 'Pointer', targetClass: '_User', required: true },
                creator: { type: 'Pointer', targetClass: '_User', required: true },
                amount: { type: 'Number', required: true },
                currency: { type: 'String', default: 'VIBE' },
                message: { type: 'String' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeTips');
    }
}
window.VibeTips = VibeTips;