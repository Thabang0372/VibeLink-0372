class VibeCertificate {
    static getSchema() {
        return {
            className: 'VibeCertificate',
            fields: {
                student: { type: 'Pointer', targetClass: '_User', required: true },
                course: { type: 'Pointer', targetClass: 'VibeCourse', required: true },
                courseTitle: { type: 'String' },
                instructor: { type: 'Pointer', targetClass: '_User' },
                completionDate: { type: 'Date' },
                certificateId: { type: 'String' },
                verificationUrl: { type: 'String' }
            }
        };
    }
    static createParseClass() { return Parse.Object.extend('VibeCertificate'); }
}
window.VibeCertificate = VibeCertificate;