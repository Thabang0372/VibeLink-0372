class VibeLiveTutoring {
    static getSchema() {
        return {
            className: 'VibeLiveTutoring',
            fields: {
                tutor: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                subject: { type: 'String', required: true },
                description: { type: 'String' },
                pricePerHour: { type: 'Number', default: 0 },
                maxStudents: { type: 'Number', default: 10 },
                students: { type: 'Array', default: [] },
                isLive: { type: 'Boolean', default: false },
                whiteboardData: { type: 'Object', default: {} },
                resources: { type: 'Array', default: [] },
                chatRoom: { type: 'Pointer', targetClass: 'Message' },
                scheduledStart: { type: 'Date' },
                actualStart: { type: 'Date' },
                actualEnd: { type: 'Date' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeLiveTutoring');
    }
}
window.VibeLiveTutoring = VibeLiveTutoring;