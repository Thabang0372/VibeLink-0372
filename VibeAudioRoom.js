class VibeAudioRoom {
    static getSchema() {
        return {
            className: 'VibeAudioRoom',
            fields: {
                name: { type: 'String', required: true },
                host: { type: 'Pointer', targetClass: '_User', required: true },
                members: { type: 'Relation', targetClass: '_User' },
                moderators: { type: 'Relation', targetClass: '_User' },
                isPrivate: { type: 'Boolean', default: false },
                topic: { type: 'String' },
                isRecording: { type: 'Boolean', default: false },
                startedAt: { type: 'Date' },
                endedAt: { type: 'Date' },
                maxParticipants: { type: 'Number', default: 50 }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeAudioRoom');
    }
}

export default class VibeAudioRoom {
    static getSchema() {
        return {
            className: 'VibeAudioRoom',
            fields: {
                name: { type: 'String', required: true },
                host: { type: 'Pointer', targetClass: '_User', required: true },
                members: { type: 'Relation', targetClass: '_User' },
                moderators: { type: 'Relation', targetClass: '_User' },
                isPrivate: { type: 'Boolean', default: false },
                topic: { type: 'String' },
                isRecording: { type: 'Boolean', default: false },
                startedAt: { type: 'Date' },
                endedAt: { type: 'Date' },
                maxParticipants: { type: 'Number', default: 50 }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeAudioRoom');
    }
}

export default VibeAudioRoom;;