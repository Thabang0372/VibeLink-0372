class VibeQA {
    static getSchema() {
        return {
            className: 'VibeQA',
            fields: {
                question: { type: 'String', required: true },
                asker: { type: 'Pointer', targetClass: '_User', required: true },
                answers: { type: 'Relation', targetClass: 'VibeQAAnswer' },
                topic: { type: 'String' },
                tags: { type: 'Array', default: [] },
                views: { type: 'Number', default: 0 },
                votes: { type: 'Number', default: 0 },
                createdAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeQA');
    }
}

export default VibeQA;