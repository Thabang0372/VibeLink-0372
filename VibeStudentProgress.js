class VibeStudentProgress {
    static getSchema() {
        return {
            className: 'VibeStudentProgress',
            fields: {
                student: { type: 'Pointer', targetClass: '_User', required: true },
                course: { type: 'Pointer', targetClass: 'VibeCourse', required: true },
                completedModules: { type: 'Array', default: [] },
                currentModule: { type: 'Number', default: 0 },
                progressPercentage: { type: 'Number', default: 0 },
                quizScores: { type: 'Object', default: {} },
                timeSpent: { type: 'Number', default: 0 },
                lastAccessed: { type: 'Date' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeStudentProgress');
    }
}
window.VibeStudentProgress = VibeStudentProgress;