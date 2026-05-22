class VibeGameState {
    static getSchema() {
        return {
            className: 'VibeGameState',
            fields: {
                session: { type: 'Pointer', targetClass: 'VibeGameSession', required: true },
                gameType: { type: 'String', required: true },
                currentTurn: { type: 'Number', default: 0 },
                players: { type: 'Array', default: [] },
                boardState: { type: 'Object', default: {} },
                history: { type: 'Array', default: [] },
                currentPhase: { type: 'String', default: 'setup' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeGameState');
    }
}
window.VibeGameState = VibeGameState;