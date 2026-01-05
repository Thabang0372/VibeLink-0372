class WalletTransaction {
    static getSchema() {
        return {
            className: 'WalletTransaction',
            fields: {
                type: { type: 'String', required: true },
                amount: { type: 'Number', required: true },
                status: { type: 'String', default: 'pending' },
                reference: { type: 'String', required: true },
                timestamp: { type: 'Date', required: true },
                wallet: { type: 'Pointer', targetClass: 'VibeWallet', required: true },
                description: { type: 'String' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('WalletTransaction');
    }
}

export default WalletTransaction;