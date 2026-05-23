class VibeTournament {
    static getSchema() {
        return {
            className: 'VibeTournament',
            fields: {
                organizer: { type: 'Pointer', targetClass: '_User', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String' },
                gameType: { type: 'String', required: true },
                format: { type: 'String', required: true },
                maxParticipants: { type: 'Number', required: true },
                entryFee: { type: 'Number', default: 0 },
                prizePool: { type: 'Number', default: 0 },
                startDate: { type: 'Date', required: true },
                endDate: { type: 'Date', required: true },
                rules: { type: 'Array', default: [] },
                participants: { type: 'Array', default: [] },
                brackets: { type: 'Object', default: {} },
                status: { type: 'String', default: 'registration' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeTournament');
    }
}
window.VibeTournament = VibeTournament;