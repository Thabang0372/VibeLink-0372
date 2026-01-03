class VibeGallery {
    static getSchema() {
        return {
            className: 'VibeGallery',
            fields: {
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                albumTitle: { type: 'String', required: true },
                mediaFiles: { type: 'Array', default: [] },
                tags: { type: 'Array', default: [] },
                isPublic: { type: 'Boolean', default: true },
                createdAt: { type: 'Date' },
                coverImage: { type: 'File' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeGallery');
    }
}

export default VibeGallery;