// src/profile/VibeStory.js
class VibeStory {
    static getSchema() {
        return {
            className: 'VibeStory',
            fields: {
                author: { type: 'Pointer', targetClass: '_User', required: true },
                content: { type: 'String' },
                media: { type: 'File' },
                type: { type: 'String', default: 'text' },
                backgroundColor: { type: 'String', default: '#667eea' },
                textColor: { type: 'String', default: '#ffffff' },
                expiresAt: { type: 'Date', required: true },
                views: { type: 'Array', default: [] },
                reactions: { type: 'Array', default: [] },
                isActive: { type: 'Boolean', default: true }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeStory');
    }
}

// src/profile/VibeGallery.js
class VibeGallery {
    static getSchema() {
        return {
            className: 'VibeGallery',
            fields: {
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                file: { type: 'File', required: true },
                caption: { type: 'String' },
                type: { type: 'String', required: true },
                likes: { type: 'Array', default: [] },
                comments: { type: 'Array', default: [] },
                tags: { type: 'Array', default: [] },
                isPublic: { type: 'Boolean', default: true }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeGallery');
    }
}

// src/profile/VibeFollow.js
class VibeFollow {
    static getSchema() {
        return {
            className: 'VibeFollow',
            fields: {
                follower: { type: 'Pointer', targetClass: '_User', required: true },
                following: { type: 'Pointer', targetClass: '_User', required: true },
                followedAt: { type: 'Date', required: true }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeFollow');
    }
}

// src/profile/VibeVerification.js
class VibeVerification {
    static getSchema() {
        return {
            className: 'VibeVerification',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                type: { type: 'String', required: true },
                status: { type: 'String', default: 'pending' },
                submittedData: { type: 'Object', default: {} },
                submittedAt: { type: 'Date', required: true },
                reviewedAt: { type: 'Date' },
                reviewedBy: { type: 'Pointer', targetClass: '_User' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeVerification');
    }
}