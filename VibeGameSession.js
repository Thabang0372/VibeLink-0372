class VibeGameSession {
    static getSchema() {
        return {
            className: 'VibeGameSession',
            fields: {
                host: { type: 'Pointer', targetClass: '_User', required: true },
                gameType: { type: 'String', required: true },
                title: { type: 'String', required: true },
                description: { type: 'String' },
                maxPlayers: { type: 'Number', default: 4 },
                currentPlayers: { type: 'Array', default: [] },
                spectators: { type: 'Array', default: [] },
                isPrivate: { type: 'Boolean', default: false },
                password: { type: 'String' },
                status: { type: 'String', default: 'waiting' },
                settings: { type: 'Object', default: {} },
                invitedUsers: { type: 'Array', default: [] },
                chatRoom: { type: 'Pointer', targetClass: 'Message' },
                gameState: { type: 'Pointer', targetClass: 'VibeGameState' },
                startedAt: { type: 'Date' },
                endedAt: { type: 'Date' },
                winner: { type: 'Pointer', targetClass: '_User' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeGameSession');
    }
}
window.VibeGameSession = VibeGameSession;