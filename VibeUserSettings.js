class VibeUserSettings {
    static getSchema() {
        return {
            className: 'VibeUserSettings',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                privacy: { type: 'Object', default: {} },
                notifications: { type: 'Object', default: {} },
                appearance: { type: 'Object', default: {} },
                content: { type: 'Object', default: {} },
                security: { type: 'Object', default: {} },
                legacyData: { type: 'Object', default: {} },
                arPreferences: { type: 'Object', default: {} },
                qaPreferences: { type: 'Object', default: {} },
                connectedAccounts: { type: 'Object', default: {} },
                parentalControls: { type: 'Object', default: {} }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeUserSettings');
    }
}
window.VibeUserSettings = VibeUserSettings;