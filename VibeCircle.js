class VibeCircle {
    static getSchema() {
        return {
            className: 'VibeCircle',
            fields: {
                name: { type: 'String', required: true },
                description: { type: 'String' },
                tags: { type: 'Array', default: [] },
                moderators: { type: 'Relation', targetClass: '_User' },
                members: { type: 'Relation', targetClass: '_User' },
                engagementScore: { type: 'Number', default: 0 },
                isPrivate: { type: 'Boolean', default: false }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeCircle');
    }
}
window.VibeCircle = VibeCircle;