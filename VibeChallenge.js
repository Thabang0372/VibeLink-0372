class VibeChallenge {
    static getSchema() {
        return {
            className: 'VibeChallenge',
            fields: {
                title: { type: 'String', required: true },
                description: { type: 'String' },
                mediaTemplate: { type: 'File' },
                startDate: { type: 'Date' },
                endDate: { type: 'Date' },
                participants: { type: 'Relation', targetClass: '_User' },
                reward: { type: 'Number', default: 0 },
                trendScore: { type: 'Number', default: 0 }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeChallenge');
    }
}
window.VibeChallenge = VibeChallenge;