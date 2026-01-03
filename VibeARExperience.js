class VibeARExperience {
    static getSchema() {
        return {
            className: 'VibeARExperience',
            fields: {
                creator: { type: 'Pointer', targetClass: '_User', required: true },
                experienceType: { type: 'String', required: true },
                mediaFile: { type: 'File' },
                interactiveObjects: { type: 'Array', default: [] },
                filters: { type: 'Array', default: [] },
                usageStats: { type: 'Object', default: {} },
                createdAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeARExperience');
    }
}

export default VibeARExperience;