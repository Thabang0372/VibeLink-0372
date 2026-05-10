class VibeCourseRating {
    static getSchema() {
        return {
            className: 'VibeCourseRating',
            fields: {
                student: { type: 'Pointer', targetClass: '_User', required: true },
                course: { type: 'Pointer', targetClass: 'VibeCourse', required: true },
                rating: { type: 'Number', default: 0 },
                review: { type: 'String' },
                helpful: { type: 'Number', default: 0 },
                verified: { type: 'Boolean', default: false }
            }
        };
    }
    static createParseClass() { return Parse.Object.extend('VibeCourseRating'); }
}
window.VibeCourseRating = VibeCourseRating;