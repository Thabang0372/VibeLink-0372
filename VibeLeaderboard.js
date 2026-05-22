class VibeLeaderboard {
    static getSchema() {
        return {
            className: 'VibeLeaderboard',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                gameType: { type: 'String', required: true },
                totalScore: { type: 'Number', default: 0 },
                gamesPlayed: { type: 'Number', default: 0 },
                gamesWon: { type: 'Number', default: 0 },
                bestScore: { type: 'Number', default: 0 },
                lastPlayed: { type: 'Date' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeLeaderboard');
    }
}
window.VibeLeaderboard = VibeLeaderboard;