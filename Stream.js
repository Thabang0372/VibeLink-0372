class Stream {
    static getSchema() {
        return {
            className: 'Stream',
            fields: {
                streamName: { type: 'String', required: true },
                host: { type: 'Pointer', targetClass: '_User', required: true },
                viewers: { type: 'Array', default: [] },
                isLive: { type: 'Boolean', default: false },
                thumbnail: { type: 'File' },
                category: { type: 'String' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('Stream');
    }
}

export default Stream;