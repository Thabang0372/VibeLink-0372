class VibeKnowledgeArticle {
    static getSchema() {
        return {
            className: 'VibeKnowledgeArticle',
            fields: {
                title: { type: 'String', required: true },
                content: { type: 'String', required: true },
                category: { type: 'String', required: true },
                tags: { type: 'Array', default: [] },
                keywords: { type: 'Array', default: [] },
                excerpt: { type: 'String' },
                helpfulCount: { type: 'Number', default: 0 },
                isPublished: { type: 'Boolean', default: false },
                author: { type: 'Pointer', targetClass: '_User' },
                lastUpdated: { type: 'Date' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeKnowledgeArticle');
    }
}
window.VibeKnowledgeArticle = VibeKnowledgeArticle;