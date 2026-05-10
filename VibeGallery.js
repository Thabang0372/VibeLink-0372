class VibeGallery {
    static getSchema() {
        return {
            className: 'VibeGallery',
            fields: {
                owner: { type: 'Pointer', targetClass: '_User', required: true },
                file: { type: 'File' },
                caption: { type: 'String' },
                type: { type: 'String', default: 'image' },
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
window.VibeGallery = VibeGallery;