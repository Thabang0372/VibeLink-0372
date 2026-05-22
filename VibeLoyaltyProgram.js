class VibeLoyaltyProgram {
    static getSchema() {
        return {
            className: 'VibeLoyaltyProgram',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                points: { type: 'Number', default: 0 },
                level: { type: 'String', default: 'bronze' },
                rewardsRedeemed: { type: 'Array', default: [] }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeLoyaltyProgram');
    }
}
window.VibeLoyaltyProgram = VibeLoyaltyProgram;