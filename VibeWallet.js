class VibeWallet {
    static getSchema() {
        return {
            className: 'VibeWallet',
            fields: {
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                balance: { type: 'Number', default: 0 },
                transactions: { type: 'Relation', targetClass: 'WalletTransaction' },
                aiTips: { type: 'Array', default: [] },
                budgetPlan: { type: 'Object', default: {} },
                currency: { type: 'String', default: 'VIBE' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeWallet');
    }
}

export default VibeWallet;