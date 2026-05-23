class VibeTutoringPayment {
    static getSchema() {
        return {
            className: 'VibeTutoringPayment',
            fields: {
                student: { type: 'Pointer', targetClass: '_User', required: true },
                session: { type: 'Pointer', targetClass: 'VibeLiveTutoring', required: true },
                amount: { type: 'Number', required: true },
                status: { type: 'String', default: 'reserved' },
                reservedAt: { type: 'Date' },
                completedAt: { type: 'Date' }
            }
        };
    }
    static createParseClass() { return Parse.Object.extend('VibeTutoringPayment'); }
}
window.VibeTutoringPayment = VibeTutoringPayment;