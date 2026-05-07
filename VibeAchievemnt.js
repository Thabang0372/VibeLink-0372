class VibeAchievement {
    static getSchema() {
        return {
            className: 'VibeAchievement',
            fields: {
                user: { type: 'Pointer', targetClass: '_User', required: true },
                achievement: { type: 'String', required: true },
                unlockedAt: { type: 'Date', required: true },
                gameSession: { type: 'Pointer', targetClass: 'VibeGameSession' }
            }
        };
    }
    static createParseClass() {
        return Parse.Object.extend('VibeAchievement');
    }
}
window.VibeAchievement = VibeAchievement;