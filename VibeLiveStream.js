class VibeLiveStream {
    static getSchema() {
        return {
            className: 'VibeLiveStream',
            fields: {
                host: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                category: { type: 'String' },
                streamKey: { type: 'String' },
                viewers: { type: 'Array', default: [] },
                isLive: { type: 'Boolean', default: false },
                replayURL: { type: 'String' },
                type: { type: 'String', default: 'video' },
                thumbnail: { type: 'File' },
                startedAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeLiveStream');
    }
}

export default VibeLiveStream;