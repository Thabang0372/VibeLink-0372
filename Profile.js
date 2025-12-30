class Profile {
    static getSchema() {
        return {
            className: 'Profile',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                avatar: { type: 'File' },
                nftBadges: { type: 'Array', default: [] },
                achievements: { type: 'Array', default: [] },
                bio: { type: 'String' },
                skills: { type: 'Array', default: [] },
                interests: { type: 'Array', default: [] },
                customSkin: { type: 'String' },
                layoutStyle: { type: 'String' },
                verified: { type: 'Boolean', default: false },
                followers: { type: 'Relation', targetClass: '_User' },
                following: { type: 'Relation', targetClass: '_User' },
                location: { type: 'GeoPoint' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Profile');
    }
}

export default Profile;