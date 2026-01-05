// src/settings/VibeUserSettings.js
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

// src/settings/VibeQuestion.js
class VibeQuestion {
    static getSchema() {
        return {
            className: 'VibeQuestion',
            fields: {
                author: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String', required: true },
                category: { type: 'String', required: true },
                tags: { type: 'Array', default: [] },
                priority: { type: 'String', default: 'normal' },
                status: { type: 'String', default: 'open' },
                answers: { type: 'Array', default: [] },
                upvotes: { type: 'Number', default: 0 },
                views: { type: 'Number', default: 0 },
                isAnonymous: { type: 'Boolean', default: false }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeQuestion');
    }
}

// src/settings/VibeKnowledgeArticle.js
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