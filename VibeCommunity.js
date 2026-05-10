class VibeCommunityModel {
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
window.VibeCommunityModel = VibeCommunityModel;