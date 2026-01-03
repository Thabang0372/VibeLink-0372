// src/community/VibeCommunity.js
class VibeCommunity {
    static getSchema() {
        return {
            className: 'VibeCommunity',
            fields: {
                name: { type: 'String', required: true },
                description: { type: 'String' },
                category: { type: 'String', required: true },
                privacy: { type: 'String', default: 'public' },
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                admins: { type: 'Array', default: [] },
                moderators: { type: 'Array', default: [] },
                members: { type: 'Array', default: [] },
                rules: { type: 'Array', default: [] },
                tags: { type: 'Array', default: [] },
                coverImage: { type: 'File' },
                icon: { type: 'File' },
                memberCount: { type: 'Number', default: 0 },
                postCount: { type: 'Number', default: 0 },
                isActive: { type: 'Boolean', default: true },
                verificationLevel: { type: 'String', default: 'none' },
                location: { type: 'GeoPoint' },
                language: { type: 'String', default: 'en' },
                chatRooms: { type: 'Array', default: [] },
                events: { type: 'Array', default: [] }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeCommunity');
    }
}

// src/community/VibeCommunityPost.js
class VibeCommunityPost {
    static getSchema() {
        return {
            className: 'VibeCommunityPost',
            fields: {
                community: { type: 'Pointer', targetClass: 'VibeCommunity', required: true },
                author: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                content: { type: 'String', required: true },
                type: { type: 'String', default: 'discussion' },
                tags: { type: 'Array', default: [] },
                reactions: { type: 'Array', default: [] },
                comments: { type: 'Array', default: [] },
                views: { type: 'Number', default: 0 },
                isPinned: { type: 'Boolean', default: false },
                isLocked: { type: 'Boolean', default: false },
                media: { type: 'Array', default: [] }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeCommunityPost');
    }
}

// src/community/VibeMembershipRequest.js
class VibeMembershipRequest {
    static getSchema() {
        return {
            className: 'VibeMembershipRequest',
            fields: {
                community: { type: 'Pointer', targetClass: 'VibeCommunity', required: true },
                user: { type: 'Pointer', targetClass: '_User', required: true },
                message: { type: 'String' },
                status: { type: 'String', default: 'pending' },
                requestedAt: { type: 'Date', required: true },
                reviewedAt: { type: 'Date' },
                reviewedBy: { type: 'Pointer', targetClass: '_User' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeMembershipRequest');
    }
}

// src/community/VibeCreatorTier.js
class VibeCreatorTier {
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