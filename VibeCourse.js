class VibeCourse {
    static getSchema() {
        return {
            className: 'VibeCourse',
            fields: {
                instructor: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String' },
                category: { type: 'String', required: true },
                price: { type: 'Number', default: 0 },
                level: { type: 'String', default: 'beginner' },
                modules: { type: 'Array', default: [] },
                enrolledStudents: { type: 'Relation', targetClass: '_User' },
                thumbnail: { type: 'File' },
                objectives: { type: 'Array', default: [] },
                requirements: { type: 'Array', default: [] },
                tags: { type: 'Array', default: [] },
                averageRating: { type: 'Number', default: 0 },
                ratingCount: { type: 'Number', default: 0 }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeCourse');
    }
}
window.VibeCourse = VibeCourse;