class VibeGame {
    static getSchema() {
        return {
            className: 'VibeGame',
            fields: {
                gameTitle: { type: 'String', required: true },
                description: { type: 'String' },
                thumbnail: { type: 'File' },
                rewards: { type: 'Array', default: [] },
                leaderboard: { type: 'Array', default: [] },
                status: { type: 'String', default: 'active' },
                players: { type: 'Relation', targetClass: '_User' },
                maxPlayers: { type: 'Number', default: 4 }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeGame');
    }
}

export default VibeGame;