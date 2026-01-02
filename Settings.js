class Settings {
    static getSchema() {
        return {
            className: 'Settings',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                theme: { type: 'String', default: 'light' },
                layout: { type: 'String', default: 'default' },
                aiSuggestions: { type: 'Boolean', default: true },
                lowDataMode: { type: 'Boolean', default: false },
                privacyControls: { type: 'Object', default: {} },
                culturalMode: { type: 'String', default: 'global' },
                notifications: { type: 'Object', default: {} },
                language: { type: 'String', default: 'en' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Settings');
    }
}

export default Settings;