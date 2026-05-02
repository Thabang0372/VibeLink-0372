class DiscoveryModel {
    static getSchema() {
        return {
            className: 'Discovery',
            fields: {
                tag: { type: 'String' },
                trendScore: { type: 'Number', default: 0 },
                aiTopicCluster: { type: 'Object', default: {} },
                recommendedUsers: { type: 'Array', default: [] },
                recommendedPosts: { type: 'Array', default: [] },
                category: { type: 'String' },
                region: { type: 'String' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('Discovery');
    }
}
window.DiscoveryModel = DiscoveryModel;