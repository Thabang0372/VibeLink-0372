class GamingService {
    constructor(app) {
        this.app = app;
        this.gameInstances = new Map();
        this.leaderboardCache = new Map();
    }

    async createGameSession(gameData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const session = new VibeGameSession();
        
        session.set('host', this.app.currentUser);
        session.set('gameType', gameData.gameType);
        session.set('title', gameData.title);
        session.set('description', gameData.description);
        session.set('maxPlayers', gameData.maxPlayers || 4);
        session.set('currentPlayers', [this.app.currentUser]);
        session.set('isPrivate', gameData.isPrivate || false);
        session.set('password', gameData.password || '');
        session.set('status', 'waiting'); // waiting, active, completed, cancelled
        session.set('settings', gameData.settings || {});
        session.set('invitedUsers', gameData.invitedUsers || []);
        session.set('startedAt', null);
        session.set('endedAt', null);

        await session.save();
        
        // Create game chat
        const chatRoom = await this.app.services.chat.createChatRoom(
            `Game: ${gameData.title}`,
            true,
            [this.app.currentUser]
        );
        
        session.set('chatRoom', chatRoom);
        await session.save();

        this.app.showSuccess('Game session created! 🎮');
        return session;
    }

    async joinGameSession(sessionId, password = '') {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const query = new Parse.Query(VibeGameSession);
        const session = await query.get(sessionId);
        
        if (session.get('status') !== 'waiting') {
            throw new Error('Game session is not accepting players');
        }

        if (session.get('isPrivate') && session.get('password') !== password) {
            throw new Error('Invalid password');
        }

        const currentPlayers = session.get('currentPlayers') || [];
        const maxPlayers = session.get('maxPlayers');
        
        if (currentPlayers.length >= maxPlayers) {
            throw new Error('Game session is full');
        }

        // Check if already joined
        if (currentPlayers.some(player => player.id === this.app.currentUser.id)) {
            throw new Error('Already joined this game session');
        }

        currentPlayers.push(this.app.currentUser);
        session.set('currentPlayers', currentPlayers);
        await session.save();

        // Add to game chat
        const chatRoom = session.get('chatRoom');
        if (chatRoom) {
            await this.app.services.chat.addToChatRoom(chatRoom.id, this.app.currentUser.id);
        }

        // Notify other players
        this.app.services.realtime.broadcastUpdate('player_joined_game', {
            sessionId: sessionId,
            player: this.app.currentUser.get('username'),
            playerCount: currentPlayers.length
        });

        this.app.showSuccess('Joined game session! 🎯');
        return session;
    }

    async startGameSession(sessionId) {
        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const query = new Parse.Query(VibeGameSession);
        const session = await query.get(sessionId);
        
        if (session.get('host').id !== this.app.currentUser.id) {
            throw new Error('Only the host can start the game');
        }

        const currentPlayers = session.get('currentPlayers') || [];
        if (currentPlayers.length < 2) {
            throw new Error('Need at least 2 players to start');
        }

        session.set('status', 'active');
        session.set('startedAt', new Date());
        await session.save();

        // Initialize game state
        await this.initializeGameState(session);

        // Notify players
        this.app.services.realtime.broadcastUpdate('game_started', {
            sessionId: sessionId,
            gameType: session.get('gameType'),
            host: this.app.currentUser.get('username')
        });

        this.app.showSuccess('Game started! Let the games begin! 🚀');
        return session;
    }

    async initializeGameState(session) {
        const VibeGameState = this.app.services.parse.getClass('VibeGameState');
        const gameState = new VibeGameState();
        
        gameState.set('session', session);
        gameState.set('gameType', session.get('gameType'));
        gameState.set('currentTurn', 0);
        gameState.set('players', session.get('currentPlayers').map((player, index) => ({
            player: player,
            score: 0,
            position: index,
            status: 'active',
            resources: this.getInitialResources(session.get('gameType'))
        })));
        gameState.set('boardState', this.initializeBoard(session.get('gameType')));
        gameState.set('history', []);
        gameState.set('currentPhase', 'setup');
        gameState.set('createdAt', new Date());

        await gameState.save();
        session.set('gameState', gameState);
        await session.save();

        return gameState;
    }

    getInitialResources(gameType) {
        const resources = {
            'trivia': { points: 0, lives: 3, streak: 0 },
            'puzzle': { moves: 0, time: 600, hints: 3 },
            'strategy': { gold: 100, wood: 50, food: 75 },
            'card': { deck: [], hand: [], discard: [] },
            'casino': { chips: 1000, bets: [] }
        };
        return resources[gameType] || {};
    }

    initializeBoard(gameType) {
        const boards = {
            'trivia': {
                categories: ['Science', 'History', 'Entertainment', 'Sports'],
                questions: [],
                currentCategory: 0
            },
            'puzzle': {
                grid: this.generatePuzzleGrid(),
                solution: [],
                difficulty: 'medium'
            },
            'strategy': {
                map: this.generateStrategyMap(),
                territories: [],
                resources: []
            },
            'card': {
                deck: this.generateCardDeck(),
                discardPile: [],
                currentSuit: null
            }
        };
        return boards[gameType] || {};
    }

    async submitGameAction(sessionId, action) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const sessionQuery = new Parse.Query(VibeGameSession);
        const session = await sessionQuery.get(sessionId);
        
        if (session.get('status') !== 'active') {
            throw new Error('Game is not active');
        }

        const gameState = session.get('gameState');
        if (!gameState) {
            throw new Error('Game state not found');
        }

        // Validate action
        const validation = await this.validateGameAction(session, gameState, action);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Process action
        const updatedState = await this.processGameAction(gameState, action);
        
        // Update game state
        gameState.set('boardState', updatedState.boardState);
        gameState.set('players', updatedState.players);
        gameState.set('currentTurn', updatedState.currentTurn);
        gameState.set('currentPhase', updatedState.currentPhase);
        
        // Add to history
        const history = gameState.get('history') || [];
        history.push({
            player: this.app.currentUser.id,
            action: action,
            timestamp: new Date(),
            result: updatedState.result
        });
        gameState.set('history', history);
        
        await gameState.save();

        // Check for game end
        if (updatedState.gameEnded) {
            await this.endGameSession(sessionId, updatedState.winner);
        }

        // Broadcast update
        this.app.services.realtime.broadcastUpdate('game_action', {
            sessionId: sessionId,
            player: this.app.currentUser.get('username'),
            action: action.type,
            result: updatedState.result
        });

        return updatedState;
    }

    async validateGameAction(session, gameState, action) {
        const currentPlayer = gameState.get('players')[gameState.get('currentTurn')];
        
        if (currentPlayer.player.id !== this.app.currentUser.id) {
            return { valid: false, error: 'Not your turn' };
        }

        // Game-specific validation
        switch (session.get('gameType')) {
            case 'trivia':
                return this.validateTriviaAction(gameState, action);
            case 'puzzle':
                return this.validatePuzzleAction(gameState, action);
            case 'strategy':
                return this.validateStrategyAction(gameState, action);
            case 'card':
                return this.validateCardAction(gameState, action);
            default:
                return { valid: true };
        }
    }

    async processGameAction(gameState, action) {
        const players = gameState.get('players');
        const boardState = gameState.get('boardState');
        let currentTurn = gameState.get('currentTurn');
        let currentPhase = gameState.get('currentPhase');
        let gameEnded = false;
        let winner = null;
        let result = {};

        switch (action.type) {
            case 'answer_question':
                const isCorrect = this.checkTriviaAnswer(action.questionId, action.answer);
                if (isCorrect) {
                    players[currentTurn].score += 100;
                    players[currentTurn].resources.streak += 1;
                    result = { correct: true, points: 100, streak: players[currentTurn].resources.streak };
                } else {
                    players[currentTurn].resources.lives -= 1;
                    players[currentTurn].resources.streak = 0;
                    result = { correct: false, lives: players[currentTurn].resources.lives };
                }
                break;

            case 'move_piece':
                const moveValid = this.validatePuzzleMove(boardState, action.from, action.to);
                if (moveValid) {
                    this.executePuzzleMove(boardState, action.from, action.to);
                    players[currentTurn].resources.moves += 1;
                    result = { valid: true, moves: players[currentTurn].resources.moves };
                    
                    if (this.checkPuzzleComplete(boardState)) {
                        gameEnded = true;
                        winner = players[currentTurn];
                    }
                } else {
                    result = { valid: false, message: 'Invalid move' };
                }
                break;

            case 'place_bet':
                const betResult = this.processBet(action.amount, action.type);
                players[currentTurn].resources.chips += betResult.winnings - action.amount;
                result = { 
                    bet: action.amount, 
                    winnings: betResult.winnings,
                    outcome: betResult.outcome 
                };
                break;

            default:
                result = { processed: true };
        }

        // Move to next turn
        if (!gameEnded) {
            currentTurn = (currentTurn + 1) % players.length;
        }

        return {
            players,
            boardState,
            currentTurn,
            currentPhase,
            gameEnded,
            winner,
            result
        };
    }

    async endGameSession(sessionId, winner = null) {
        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const query = new Parse.Query(VibeGameSession);
        const session = await query.get(sessionId);
        
        session.set('status', 'completed');
        session.set('endedAt', new Date());
        session.set('winner', winner);

        await session.save();

        // Award points and achievements
        if (winner) {
            await this.awardGameRewards(session, winner);
        }

        // Update leaderboards
        await this.updateLeaderboards(session);

        // Notify players
        this.app.services.realtime.broadcastUpdate('game_ended', {
            sessionId: sessionId,
            winner: winner ? winner.player.get('username') : null,
            finalScores: session.get('gameState').get('players').map(p => ({
                player: p.player.get('username'),
                score: p.score
            }))
        });

        this.app.showSuccess('Game completed! 🏆');
        return session;
    }

    async awardGameRewards(session, winner) {
        const baseReward = 50;
        const bonusReward = winner.score * 0.1;
        const totalReward = Math.floor(baseReward + bonusReward);

        // Award VIBE tokens to winner
        await this.app.services.wallet.addLoyaltyPoints(totalReward, 'game_victory');

        // Award participation points to all players
        const players = session.get('currentPlayers') || [];
        for (const player of players) {
            if (player.id !== winner.player.id) {
                await this.app.services.wallet.addLoyaltyPoints(10, 'game_participation');
            }
        }

        // Unlock achievements
        await this.unlockAchievements(session, winner);

        // Update game statistics
        await this.updatePlayerStats(session, winner);
    }

    async unlockAchievements(session, winner) {
        const VibeAchievement = this.app.services.parse.getClass('VibeAchievement');
        
        // Check for various achievements
        const achievements = await this.checkEligibleAchievements(session, winner);
        
        for (const achievement of achievements) {
            const userAchievement = new VibeAchievement();
            userAchievement.set('user', winner.player);
            userAchievement.set('achievement', achievement);
            userAchievement.set('unlockedAt', new Date());
            userAchievement.set('gameSession', session);
            
            await userAchievement.save();

            // Notify user
            await this.app.services.notifications.createNotification(
                winner.player.id,
                'achievement_unlocked',
                `Achievement Unlocked: ${achievement.get('name')}!`
            );
        }
    }

    async updateLeaderboards(session) {
        const gameType = session.get('gameType');
        const players = session.get('gameState').get('players');
        
        for (const player of players) {
            await this.updatePlayerLeaderboard(
                player.player.id,
                gameType,
                player.score,
                session.id
            );
        }
        
        // Clear cache
        this.leaderboardCache.delete(gameType);
    }

    async updatePlayerLeaderboard(userId, gameType, score, sessionId) {
        const VibeLeaderboard = this.app.services.parse.getClass('VibeLeaderboard');
        const query = new Parse.Query(VibeLeaderboard);
        query.equalTo('user', this.app.services.parse.createPointer('_User', userId));
        query.equalTo('gameType', gameType);
        
        let leaderboardEntry = await query.first();
        
        if (!leaderboardEntry) {
            leaderboardEntry = new VibeLeaderboard();
            leaderboardEntry.set('user', this.app.services.parse.createPointer('_User', userId));
            leaderboardEntry.set('gameType', gameType);
            leaderboardEntry.set('totalScore', 0);
            leaderboardEntry.set('gamesPlayed', 0);
            leaderboardEntry.set('gamesWon', 0);
        }

        leaderboardEntry.set('totalScore', leaderboardEntry.get('totalScore') + score);
        leaderboardEntry.set('gamesPlayed', leaderboardEntry.get('gamesPlayed') + 1);
        
        if (score > 0) {
            leaderboardEntry.set('gamesWon', leaderboardEntry.get('gamesWon') + 1);
        }
        
        leaderboardEntry.set('lastPlayed', new Date());
        leaderboardEntry.set('bestScore', Math.max(leaderboardEntry.get('bestScore') || 0, score));
        
        await leaderboardEntry.save();
        return leaderboardEntry;
    }

    async getLeaderboard(gameType, timeRange = 'all-time', limit = 100) {
        const cacheKey = `${gameType}_${timeRange}_${limit}`;
        
        if (this.leaderboardCache.has(cacheKey)) {
            return this.leaderboardCache.get(cacheKey);
        }

        const VibeLeaderboard = this.app.services.parse.getClass('VibeLeaderboard');
        const query = new Parse.Query(VibeLeaderboard);
        
        query.equalTo('gameType', gameType);
        query.include('user');
        
        // Apply time range filter
        if (timeRange !== 'all-time') {
            const dateFilter = this.getDateRangeFilter(timeRange);
            query.greaterThan('lastPlayed', dateFilter);
        }
        
        query.descending('totalScore');
        query.limit(limit);

        const leaderboard = await query.find();
        
        const formattedLeaderboard = leaderboard.map((entry, index) => ({
            rank: index + 1,
            user: entry.get('user').get('username'),
            score: entry.get('totalScore'),
            gamesPlayed: entry.get('gamesPlayed'),
            gamesWon: entry.get('gamesWon'),
            bestScore: entry.get('bestScore'),
            lastPlayed: entry.get('lastPlayed')
        }));

        this.leaderboardCache.set(cacheKey, formattedLeaderboard);
        setTimeout(() => {
            this.leaderboardCache.delete(cacheKey);
        }, 5 * 60 * 1000); // Cache for 5 minutes

        return formattedLeaderboard;
    }

    getDateRangeFilter(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case 'daily':
                return new Date(now.setDate(now.getDate() - 1));
            case 'weekly':
                return new Date(now.setDate(now.getDate() - 7));
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() - 1));
            case 'yearly':
                return new Date(now.setFullYear(now.getFullYear() - 1));
            default:
                return new Date(0); // Beginning of time
        }
    }

    async getAvailableGames() {
        return [
            {
                id: 'trivia',
                name: 'Vibe Trivia',
                description: 'Test your knowledge across various categories',
                minPlayers: 2,
                maxPlayers: 8,
                estimatedTime: '15-30 minutes',
                difficulty: 'Easy',
                categories: ['Science', 'History', 'Entertainment', 'Sports'],
                rewards: { win: 50, participation: 10 }
            },
            {
                id: 'puzzle',
                name: 'Mind Puzzles',
                description: 'Challenge your problem-solving skills',
                minPlayers: 1,
                maxPlayers: 4,
                estimatedTime: '10-20 minutes',
                difficulty: 'Medium',
                categories: ['Logic', 'Math', 'Patterns'],
                rewards: { win: 75, participation: 15 }
            },
            {
                id: 'strategy',
                name: 'Strategy Battle',
                description: 'Outsmart your opponents in tactical warfare',
                minPlayers: 2,
                maxPlayers: 4,
                estimatedTime: '30-60 minutes',
                difficulty: 'Hard',
                categories: ['War', 'Economy', 'Diplomacy'],
                rewards: { win: 100, participation: 20 }
            },
            {
                id: 'card',
                name: 'Card Games',
                description: 'Classic card games with a Vibe twist',
                minPlayers: 2,
                maxPlayers: 6,
                estimatedTime: '10-30 minutes',
                difficulty: 'Easy',
                categories: ['Poker', 'Blackjack', 'Uno'],
                rewards: { win: 40, participation: 8 }
            },
            {
                id: 'casino',
                name: 'Vibe Casino',
                description: 'Test your luck in various casino games',
                minPlayers: 1,
                maxPlayers: 10,
                estimatedTime: 'Variable',
                difficulty: 'Easy',
                categories: ['Slots', 'Roulette', 'Blackjack'],
                rewards: { win: 'Variable', participation: 5 }
            }
        ];
    }

    async loadActiveGameSessions(filters = {}) {
        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const query = new Parse.Query(VibeGameSession);
        
        if (filters.gameType) {
            query.equalTo('gameType', filters.gameType);
        }
        
        if (filters.status) {
            query.equalTo('status', filters.status);
        } else {
            query.containedIn('status', ['waiting', 'active']);
        }
        
        if (filters.isPrivate !== undefined) {
            query.equalTo('isPrivate', filters.isPrivate);
        }
        
        query.include('host');
        query.include('currentPlayers');
        query.descending('createdAt');
        query.limit(filters.limit || 20);

        try {
            const sessions = await query.find();
            this.displayGameSessions(sessions);
            return sessions;
        } catch (error) {
            console.error('Error loading game sessions:', error);
            this.app.showError('Failed to load game sessions');
            return [];
        }
    }

    async getUserGameStats(userId = null) {
        const targetUserId = userId || this.app.currentUser.id;
        
        const VibeLeaderboard = this.app.services.parse.getClass('VibeLeaderboard');
        const query = new Parse.Query(VibeLeaderboard);
        query.equalTo('user', this.app.services.parse.createPointer('_User', targetUserId));
        
        const VibeAchievement = this.app.services.parse.getClass('VibeAchievement');
        const achievementQuery = new Parse.Query(VibeAchievement);
        achievementQuery.equalTo('user', this.app.services.parse.createPointer('_User', targetUserId));
        
        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const sessionQuery = new Parse.Query(VibeGameSession);
        sessionQuery.equalTo('currentPlayers', this.app.services.parse.createPointer('_User', targetUserId));

        try {
            const [leaderboards, achievements, sessions] = await Promise.all([
                query.find(),
                achievementQuery.find(),
                sessionQuery.find()
            ]);

            const totalScore = leaderboards.reduce((sum, entry) => sum + entry.get('totalScore'), 0);
            const totalGames = leaderboards.reduce((sum, entry) => sum + entry.get('gamesPlayed'), 0);
            const gamesWon = leaderboards.reduce((sum, entry) => sum + entry.get('gamesWon'), 0);
            const winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;

            return {
                totalScore,
                totalGames,
                gamesWon,
                winRate: Math.round(winRate),
                achievements: achievements.length,
                favoriteGame: this.getFavoriteGame(leaderboards),
                recentSessions: sessions.slice(0, 5).map(session => ({
                    gameType: session.get('gameType'),
                    status: session.get('status'),
                    result: session.get('winner')?.id === targetUserId ? 'won' : 'lost',
                    playedAt: session.get('endedAt') || session.get('createdAt')
                }))
            };
        } catch (error) {
            console.error('Error loading user game stats:', error);
            return {};
        }
    }

    getFavoriteGame(leaderboards) {
        if (leaderboards.length === 0) return null;
        
        return leaderboards.reduce((favorite, current) => 
            current.get('totalScore') > favorite.get('totalScore') ? current : favorite
        ).get('gameType');
    }

    displayGameSessions(sessions) {
        const container = document.getElementById('game-sessions');
        if (!container) return;

        container.innerHTML = sessions.map(session => `
            <div class="game-session-card" data-session-id="${session.id}">
                <div class="session-header">
                    <h3 class="session-title">${session.get('title')}</h3>
                    <div class="session-status ${session.get('status')}">${session.get('status')}</div>
                </div>
                <div class="session-details">
                    <p class="session-description">${session.get('description')}</p>
                    <div class="session-meta">
                        <div class="game-type">${session.get('gameType')}</div>
                        <div class="players-count">
                            ${session.get('currentPlayers')?.length || 0}/${session.get('maxPlayers')} players
                        </div>
                        <div class="session-host">Host: ${session.get('host').get('username')}</div>
                    </div>
                    ${session.get('isPrivate') ? '<div class="private-badge">Private</div>' : ''}
                </div>
                <div class="session-actions">
                    ${session.get('status') === 'waiting' ? `
                        <button onclick="vibeApp.services.gaming.joinGameSession('${session.id}')" 
                                class="btn-join" ${session.get('currentPlayers')?.some(p => p.id === this.app.currentUser?.id) ? 'disabled' : ''}>
                            ${session.get('currentPlayers')?.some(p => p.id === this.app.currentUser?.id) ? 'Already Joined' : 'Join Game'}
                        </button>
                    ` : session.get('status') === 'active' ? `
                        <button onclick="vibeApp.services.gaming.spectateGame('${session.id}')" class="btn-spectate">
                            Spectate
                        </button>
                    ` : ''}
                    ${session.get('host').id === this.app.currentUser?.id && session.get('status') === 'waiting' ? `
                        <button onclick="vibeApp.services.gaming.startGameSession('${session.id}')" class="btn-start">
                            Start Game
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async spectateGame(sessionId) {
        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const query = new Parse.Query(VibeGameSession);
        const session = await query.get(sessionId);
        
        // Add user to spectators
        const spectators = session.get('spectators') || [];
        if (!spectators.some(s => s.id === this.app.currentUser.id)) {
            spectators.push(this.app.currentUser);
            session.set('spectators', spectators);
            await session.save();
        }

        // Open game spectator view
        this.openGameSpectator(session);
        return session;
    }

    openGameSpectator(session) {
        const spectatorView = document.createElement('div');
        spectatorView.className = 'game-spectator';
        spectatorView.innerHTML = `
            <div class="spectator-overlay">
                <div class="spectator-header">
                    <h3>Spectating: ${session.get('title')}</h3>
                    <button class="close-spectator">×</button>
                </div>
                <div class="game-board" id="game-board-${session.id}">
                    <!-- Game board will be rendered here -->
                </div>
                <div class="player-list">
                    ${session.get('currentPlayers').map(player => `
                        <div class="player-info">
                            <span>${player.get('username')}</span>
                            <span class="player-score">0</span>
                        </div>
                    `).join('')}
                </div>
                <div class="game-chat" id="game-chat-${session.id}">
                    <!-- Game chat will be rendered here -->
                </div>
            </div>
        `;

        document.body.appendChild(spectatorView);
        
        // Load game state and subscribe to updates
        this.loadGameState(session.id);
        this.subscribeToGameUpdates(session.id);

        // Add close handler
        spectatorView.querySelector('.close-spectator').addEventListener('click', () => {
            document.body.removeChild(spectatorView);
            this.unsubscribeFromGameUpdates(session.id);
        });
    }

    async loadGameState(sessionId) {
        const VibeGameSession = this.app.services.parse.getClass('VibeGameSession');
        const query = new Parse.Query(VibeGameSession);
        query.include('gameState');
        const session = await query.get(sessionId);
        
        const gameState = session.get('gameState');
        if (gameState) {
            this.renderGameBoard(session, gameState);
        }
    }

    renderGameBoard(session, gameState) {
        const boardContainer = document.getElementById(`game-board-${session.id}`);
        if (!boardContainer) return;

        // Game-specific rendering
        switch (session.get('gameType')) {
            case 'trivia':
                this.renderTriviaBoard(boardContainer, gameState);
                break;
            case 'puzzle':
                this.renderPuzzleBoard(boardContainer, gameState);
                break;
            case 'strategy':
                this.renderStrategyBoard(boardContainer, gameState);
                break;
            default:
                boardContainer.innerHTML = `<p>Game in progress: ${session.get('gameType')}</p>`;
        }
    }

    subscribeToGameUpdates(sessionId) {
        // Subscribe to real-time updates for this game
        this.app.services.realtime.subscribe(`game_${sessionId}`, (update) => {
            this.handleGameUpdate(sessionId, update);
        });
    }

    unsubscribeFromGameUpdates(sessionId) {
        this.app.services.realtime.unsubscribe(`game_${sessionId}`);
    }

    handleGameUpdate(sessionId, update) {
        switch (update.type) {
            case 'game_action':
                this.updateGameBoard(sessionId, update.data);
                break;
            case 'player_joined_game':
                this.updatePlayerList(sessionId, update.data);
                break;
            case 'game_ended':
                this.showGameResults(sessionId, update.data);
                break;
        }
    }

    async createTournament(tournamentData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeTournament = this.app.services.parse.getClass('VibeTournament');
        const tournament = new VibeTournament();
        
        tournament.set('organizer', this.app.currentUser);
        tournament.set('title', tournamentData.title);
        tournament.set('description', tournamentData.description);
        tournament.set('gameType', tournamentData.gameType);
        tournament.set('format', tournamentData.format); // single-elimination, double-elimination, round-robin
        tournament.set('maxParticipants', tournamentData.maxParticipants);
        tournament.set('entryFee', tournamentData.entryFee || 0);
        tournament.set('prizePool', tournamentData.prizePool || 0);
        tournament.set('startDate', new Date(tournamentData.startDate));
        tournament.set('endDate', new Date(tournamentData.endDate));
        tournament.set('rules', tournamentData.rules || []);
        tournament.set('participants', []);
        tournament.set('brackets', {});
        tournament.set('status', 'registration'); // registration, active, completed, cancelled

        await tournament.save();
        
        this.app.showSuccess('Tournament created successfully! 🏆');
        return tournament;
    }

    async joinTournament(tournamentId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeTournament = this.app.services.parse.getClass('VibeTournament');
        const query = new Parse.Query(VibeTournament);
        const tournament = await query.get(tournamentId);
        
        if (tournament.get('status') !== 'registration') {
            throw new Error('Tournament registration is closed');
        }

        const participants = tournament.get('participants') || [];
        const maxParticipants = tournament.get('maxParticipants');
        
        if (participants.length >= maxParticipants) {
            throw new Error('Tournament is full');
        }

        // Process entry fee
        const entryFee = tournament.get('entryFee');
        if (entryFee > 0) {
            const userWallet = await this.app.services.wallet.getUserWallet();
            if (userWallet.get('balance') < entryFee) {
                throw new Error('Insufficient balance for entry fee');
            }

            await this.app.services.wallet.createWalletTransaction({
                type: 'debit',
                amount: entryFee,
                wallet: userWallet,
                description: `Tournament entry: ${tournament.get('title')}`
            });

            // Add to prize pool
            tournament.set('prizePool', tournament.get('prizePool') + entryFee);
        }

        participants.push({
            user: this.app.currentUser,
            joinedAt: new Date(),
            status: 'active'
        });

        tournament.set('participants', participants);
        await tournament.save();

        this.app.showSuccess('Successfully joined the tournament! 🎯');
        return tournament;
    }

    async getTournamentLeaderboard(tournamentId) {
        const VibeTournament = this.app.services.parse.getClass('VibeTournament');
        const query = new Parse.Query(VibeTournament);
        const tournament = await query.get(tournamentId);
        
        const brackets = tournament.get('brackets') || {};
        const participants = tournament.get('participants') || [];
        
        // Calculate standings based on tournament progress
        const standings = participants.map(participant => {
            const playerStats = this.calculateTournamentStats(brackets, participant.user.id);
            return {
                user: participant.user,
                wins: playerStats.wins,
                losses: playerStats.losses,
                points: playerStats.points,
                position: playerStats.position
            };
        }).sort((a, b) => b.points - a.points);

        return standings;
    }

    calculateTournamentStats(brackets, userId) {
        // Calculate player statistics from tournament brackets
        let wins = 0;
        let losses = 0;
        let points = 0;

        // This would be more sophisticated based on tournament format
        Object.values(brackets).forEach(match => {
            if (match.player1 === userId) {
                if (match.winner === userId) {
                    wins++;
                    points += match.points || 10;
                } else if (match.winner && match.winner !== userId) {
                    losses++;
                }
            } else if (match.player2 === userId) {
                if (match.winner === userId) {
                    wins++;
                    points += match.points || 10;
                } else if (match.winner && match.winner !== userId) {
                    losses++;
                }
            }
        });

        return { wins, losses, points };
    }
}

export default GamingService;