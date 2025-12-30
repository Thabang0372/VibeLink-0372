class Legacy {
    static getSchema() {
        return {
            className: 'Legacy',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                backupData: { type: 'Object', default: {} },
                exportDate: { type: 'Date' },
                deviceLinked: { type: 'Array', default: [] },
                aiPersonalization: { type: 'Object', default: {} },
                migrationVersion: { type: 'String' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Legacy');
    }
}

export default Legacy;