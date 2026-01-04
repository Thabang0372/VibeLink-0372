class VibeLearn {
    static getSchema() {
        return {
            className: 'VibeLearn',
            fields: {
                creator: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String' },
                contentURL: { type: 'String' },
                quizArray: { type: 'Array', default: [] },
                liveTutorEnabled: { type: 'Boolean', default: false },
                participants: { type: 'Relation', targetClass: '_User' },
                difficulty: { type: 'String', default: 'beginner' },
                duration: { type: 'Number', default: 0 }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeLearn');
    }
}

export default VibeLearn;