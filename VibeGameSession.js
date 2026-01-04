// src/gaming/VibeGameSession.js
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

// src/gaming/VibeGameState.js
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
                currentPhase: { type: 'String', default: 'setup' },
                createdAt: { type: 'Date' }
            }
        };
    }

    static createParseClass() {
        return Parse.Object.extend('VibeGameState');
    }
}

// src/gaming/VibeLeaderboard.js
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

// src/gaming/VibeAchievement.js
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

// src/gaming/VibeTournament.js
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