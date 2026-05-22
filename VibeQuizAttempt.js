class VibeQuizAttempt {
    static getSchema() {
        return {
            className: 'VibeQuizAttempt',
            fields: {
                student: { type: 'Pointer', targetClass: '_User', required: true },
                quiz: { type: 'Pointer', targetClass: 'VibeQuiz', required: true },
                score: { type: 'Number', default: 0 },
                passed: { type: 'Boolean', default: false },
                answers: { type: 'Array', default: [] },
                results: { type: 'Array', default: [] },
                timeSpent: { type: 'Number', default: 0 },
                completedAt: { type: 'Date' }
            }
        };
    }
    static createParseClass() { return Parse.Object.extend('VibeQuizAttempt'); }
}
window.VibeQuizAttempt = VibeQuizAttempt;