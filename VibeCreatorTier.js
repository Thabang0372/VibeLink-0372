class VibeCreatorTierModel {
    static getSchema() {
        return {
            className: 'VibeCreatorTier',
            fields: {
                community: { type: 'Pointer', targetClass: 'VibeCommunity', required: true },
                name: { type: 'String', required: true },
                description: { type: 'String' },
                price: { type: 'Number', default: 0 },
                currency: { type: 'String', default: 'VIBE' },
                benefits: { type: 'Array', default: [] },
                maxMembers: { type: 'Number' },
                isActive: { type: 'Boolean', default: true },
                subscribers: { type: 'Array', default: [] }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeCreatorTier');
    }
}
window.VibeCreatorTierModel = VibeCreatorTierModel;