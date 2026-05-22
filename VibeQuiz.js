class VibeQuiz {
    static getSchema() {
        return {
            className: 'VibeQuiz',
            fields: {
                title: { type: 'String', required: true },
                description: { type: 'String' },
                questions: { type: 'Array', required: true },
                timeLimit: { type: 'Number' },
                passingScore: { type: 'Number', default: 70 },
                maxAttempts: { type: 'Number', default: 3 },
                course: { type: 'Pointer', targetClass: 'VibeCourse' },
                tags: { type: 'Array', default: [] }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeQuiz');
    }
}
window.VibeQuiz = VibeQuiz;