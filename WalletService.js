class WalletService {
    constructor(app) {
        this.app = app;
    }

    async initializeUserData() {
        await this.ensureWalletExists();
        await this.ensureLoyaltyProgramExists();
    }

    async ensureWalletExists() {
        const VibeWallet = this.app.services.parse.getClass('VibeWallet');
        const query = new Parse.Query(VibeWallet);
        query.equalTo('owner', this.app.currentUser);
        
        let wallet = await query.first();
        if (!wallet) {
            wallet = new VibeWallet();
            wallet.set('owner', this.app.currentUser);
            wallet.set('balance', 1000.00);
            wallet.set('currency', 'VIBE');
            wallet.set('aiTips', []);
            wallet.set('budgetPlan', {});
            await wallet.save();
            console.log('✅ New wallet created for user');
        }
        return wallet;
    }

    async ensureLoyaltyProgramExists() {
        const VibeLoyaltyProgram = this.app.services.parse.getClass('VibeLoyaltyProgram');
        const query = new Parse.Query(VibeLoyaltyProgram);
        query.equalTo('user', this.app.currentUser);
        
        let loyalty = await query.first();
        if (!loyalty) {
            loyalty = new VibeLoyaltyProgram();
            loyalty.set('user', this.app.currentUser);
            loyalty.set('points', 0);
            loyalty.set('level', 'bronze');
            loyalty.set('rewardsRedeemed', []);
            await loyalty.save();
            console.log('✅ Loyalty program initialized');
        }
        return loyalty;
    }

    async getWalletBalance() {
        const wallet = await this.getUserWallet();
        return wallet ? wallet.get('balance') : 0;
    }

    async getUserWallet() {
        const VibeWallet = this.app.services.parse.getClass('VibeWallet');
        const query = new Parse.Query(VibeWallet);
        query.equalTo('owner', this.app.currentUser);
        return await query.first();
    }

    async sendTip(creatorId, amount, message = '', currency = 'VIBE') {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeTips = this.app.services.parse.getClass('VibeTips');
        
        const senderWallet = await this.getUserWallet();
        if (senderWallet.get('balance') < amount) {
            throw new Error('Insufficient balance');
        }

        const tip = new VibeTips();
        tip.set('sender', this.app.currentUser);
        tip.set('creator', this.app.services.parse.createPointer('_User', creatorId));
        tip.set('amount', amount);
        tip.set('currency', currency);
        tip.set('message', message);
        
        await tip.save();
        
        await this.createWalletTransaction({
            type: 'debit',
            amount: amount,
            wallet: senderWallet,
            description: `Tip to user ${creatorId}`
        });

        const creatorWallet = await this.getUserWallet(creatorId);
        if (creatorWallet) {
            await this.createWalletTransaction({
                type: 'credit',
                amount: amount,
                wallet: creatorWallet,
                description: `Tip from ${this.app.currentUser.get('username')}`
            });
        }

        await this.addLoyaltyPoints(10, 'sending_tip');

        await this.app.services.notifications.createNotification(
            creatorId,
            'tip_received',
            `You received a ${amount} ${currency} tip from ${this.app.currentUser.get('username')}`
        );

        this.app.showSuccess(`Tip sent successfully! 💎`);
        return tip;
    }

    async createWalletTransaction(transactionData) {
        const WalletTransaction = this.app.services.parse.getClass('WalletTransaction');
        const transaction = new WalletTransaction();
        
        transaction.set('type', transactionData.type);
        transaction.set('amount', transactionData.amount);
        transaction.set('status', 'completed');
        transaction.set('reference', this.generateTransactionId());
        transaction.set('timestamp', new Date());
        transaction.set('wallet', transactionData.wallet);
        transaction.set('description', transactionData.description);

        await transaction.save();
        
        const walletQuery = new Parse.Query('VibeWallet');
        const wallet = await walletQuery.get(transactionData.wallet.id);
        
        if (transactionData.type === 'credit') {
            wallet.increment('balance', transactionData.amount);
        } else {
            wallet.increment('balance', -transactionData.amount);
        }
        
        await wallet.save();

        return transaction;
    }

    async addLoyaltyPoints(points, reason) {
        const VibeLoyaltyProgram = this.app.services.parse.getClass('VibeLoyaltyProgram');
        
        let loyalty = await this.getUserLoyaltyProgram();
        if (!loyalty) {
            loyalty = await this.ensureLoyaltyProgramExists();
        }

        loyalty.increment('points', points);
        
        const newPoints = loyalty.get('points') + points;
        if (newPoints >= 1000) loyalty.set('level', 'platinum');
        else if (newPoints >= 500) loyalty.set('level', 'gold');
        else if (newPoints >= 100) loyalty.set('level', 'silver');
        
        await loyalty.save();

        await this.app.services.notifications.createNotification(
            this.app.currentUser.id,
            'loyalty_points',
            `You earned ${points} loyalty points for ${reason}`
        );

        return loyalty;
    }

    async getUserLoyaltyProgram() {
        const VibeLoyaltyProgram = this.app.services.parse.getClass('VibeLoyaltyProgram');
        const query = new Parse.Query(VibeLoyaltyProgram);
        query.equalTo('user', this.app.currentUser);
        return await query.first();
    }

    async getTransactionHistory(limit = 50) {
        const WalletTransaction = this.app.services.parse.getClass('WalletTransaction');
        const query = new Parse.Query(WalletTransaction);
        
        const userWallet = await this.getUserWallet();
        query.equalTo('wallet', userWallet);
        
        query.descending('timestamp');
        query.limit(limit);
        query.include('wallet');

        try {
            return await query.find();
        } catch (error) {
            console.error('Error loading transaction history:', error);
            return [];
        }
    }

    async transferFunds(toUserId, amount, description = '') {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const senderWallet = await this.getUserWallet();
        if (senderWallet.get('balance') < amount) {
            throw new Error('Insufficient balance');
        }

        const receiverWallet = await this.getUserWallet(toUserId);
        if (!receiverWallet) {
            throw new Error('Recipient wallet not found');
        }

        await this.createWalletTransaction({
            type: 'debit',
            amount: amount,
            wallet: senderWallet,
            description: `Transfer to ${toUserId}: ${description}`
        });

        await this.createWalletTransaction({
            type: 'credit',
            amount: amount,
            wallet: receiverWallet,
            description: `Transfer from ${this.app.currentUser.get('username')}: ${description}`
        });

        await this.app.services.notifications.createNotification(
            toUserId,
            'funds_received',
            `You received ${amount} VIBE from ${this.app.currentUser.get('username')}`
        );

        this.app.showSuccess(`Transfer completed successfully!`);
    }

    async requestPayment(fromUserId, amount, description = '') {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        await this.app.services.notifications.createNotification(
            fromUserId,
            'payment_request',
            `${this.app.currentUser.get('username')} requested ${amount} VIBE: ${description}`
        );

        this.app.showSuccess('Payment request sent!');
    }

    async getWalletStats() {
        const wallet = await this.getUserWallet();
        const transactions = await this.getTransactionHistory(100);
        
        const stats = {
            currentBalance: wallet.get('balance'),
            totalTransactions: transactions.length,
            totalReceived: 0,
            totalSent: 0,
            monthlyActivity: this.calculateMonthlyActivity(transactions),
            frequentContacts: this.analyzeFrequentContacts(transactions)
        };

        transactions.forEach(transaction => {
            if (transaction.get('type') === 'credit') {
                stats.totalReceived += transaction.get('amount');
            } else {
                stats.totalSent += transaction.get('amount');
            }
        });

        return stats;
    }

    calculateMonthlyActivity(transactions) {
        const monthlyData = {};
        
        transactions.forEach(transaction => {
            const month = new Date(transaction.get('timestamp')).toISOString().slice(0, 7);
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        });

        return monthlyData;
    }

    analyzeFrequentContacts(transactions) {
        const contactMap = {};
        
        transactions.forEach(transaction => {
            const description = transaction.get('description') || '';
            const contact = this.extractContactFromDescription(description);
            
            if (contact) {
                contactMap[contact] = (contactMap[contact] || 0) + 1;
            }
        });

        return Object.entries(contactMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([contact, count]) => ({ contact, count }));
    }

    extractContactFromDescription(description) {
        const patterns = [
            /from (.+?):/,
            /to (.+?):/,
            /Tip from (.+)/,
            /Transfer from (.+?)/
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }

    generateTransactionId() {
        return 'TX_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async getPendingOfflineActions() {
        return JSON.parse(localStorage.getItem('offlineWalletActions') || '[]');
    }

    async removePendingAction(actionId) {
        const actions = JSON.parse(localStorage.getItem('offlineWalletActions') || '[]');
        const filteredActions = actions.filter(action => action.id !== actionId);
        localStorage.setItem('offlineWalletActions', JSON.stringify(filteredActions));
    }

    async displayWalletInfo() {
        const wallet = await this.getUserWallet();
        const loyalty = await this.getUserLoyaltyProgram();
        const transactions = await this.getTransactionHistory(10);

        const walletContainer = document.getElementById('wallet-info');
        if (!walletContainer) return;

        walletContainer.innerHTML = `
            <div class="wallet-card">
                <div class="wallet-balance">
                    <h3>Your Balance</h3>
                    <div class="balance-amount">${wallet.get('balance')} ${wallet.get('currency')}</div>
                </div>
                <div class="loyalty-info">
                    <div class="loyalty-level">${loyalty.get('level')} Level</div>
                    <div class="loyalty-points">${loyalty.get('points')} Points</div>
                </div>
            </div>
            <div class="recent-transactions">
                <h4>Recent Transactions</h4>
                ${transactions.map(transaction => `
                    <div class="transaction-item">
                        <div class="transaction-details">
                            <div class="transaction-description">${transaction.get('description')}</div>
                            <div class="transaction-time">${this.formatTime(transaction.get('timestamp'))}</div>
                        </div>
                        <div class="transaction-amount ${transaction.get('type')}">
                            ${transaction.get('type') === 'credit' ? '+' : '-'}${transaction.get('amount')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatTime(date) {
        return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
    }
}

export default WalletService;