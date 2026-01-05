class VibeSecureChat {
    static getSchema() {
        return {
            className: 'VibeSecureChat',
            fields: {
                sender: { type: 'Pointer', targetClass: '_User', required: true },
                receiver: { type: 'Pointer', targetClass: '_User', required: true },
                encryptedPayload: { type: 'String' },
                encryptionLevel: { type: 'String', default: 'high' },
                verificationStatus: { type: 'Boolean', default: false },
                killSwitchEnabled: { type: 'Boolean', default: false },
                chatKey: { type: 'String' },
                createdAt: { type: 'Date' },
                expiresAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeSecureChat');
    }
}

export default VibeSecureChat;