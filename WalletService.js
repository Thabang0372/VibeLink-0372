class WalletService {
    constructor(app) { this.app = app; }

    async ensureWalletExists() {
        try {
            return await Parse.Cloud.run('ensureWallet', { userId: this.app.currentUser.id });
        } catch (e) {
            console.warn('Wallet ensure failed', e);
            return null;
        }
    }

    async ensureLoyaltyProgramExists() {
        try {
            return await Parse.Cloud.run('ensureLoyalty', { userId: this.app.currentUser.id });
        } catch (e) {
            console.warn('Loyalty ensure failed', e);
            return null;
        }
    }

    async getBalance() {
        try {
            const res = await Parse.Cloud.run('getBalance', { userId: this.app.currentUser.id });
            return res.balance;
        } catch (e) {
            return 0;
        }
    }

    async addFunds(amount) {
        if (!navigator.onLine) {
            window.offlineQueue.add({ type: 'addFunds', data: { amount } });
            return showNotification('Funds request queued', 'warning');
        }
        showLoading();
        try {
            await Parse.Cloud.run('addFunds', { amount, userId: this.app.currentUser.id });
            showNotification(`Added ${amount} VIBE`);
            hideLoading();
            await this.displayWalletInfo();
        } catch (err) {
            hideLoading();
            showNotification(err.message, 'error');
        }
    }

    async sendMoney(toUserId, amount) {
        if (!navigator.onLine) {
            window.offlineQueue.add({ type: 'sendMoney', data: { toUserId, amount } });
            return showNotification('Transfer queued', 'warning');
        }
        showLoading();
        try {
            await Parse.Cloud.run('sendMoney', { toUserId, amount, userId: this.app.currentUser.id });
            showNotification(`Sent ${amount} VIBE`);
            hideLoading();
            await this.displayWalletInfo();
        } catch (err) {
            hideLoading();
            showNotification(err.message, 'error');
        }
    }

    async sendTip(creatorId, amount, message) {
        if (!navigator.onLine) {
            window.offlineQueue.add({ type: 'sendTip', data: { creatorId, amount, message } });
            return showNotification('Tip queued', 'warning');
        }
        showLoading();
        try {
            await Parse.Cloud.run('sendTip', { creatorId, amount, message, userId: this.app.currentUser.id });
            showNotification('Tip sent');
            hideLoading();
            await this.displayWalletInfo();
        } catch (err) {
            hideLoading();
            showNotification(err.message, 'error');
        }
    }

    async addLoyaltyPoints(points) {
        try {
            await Parse.Cloud.run('addLoyaltyPoints', { points, userId: this.app.currentUser.id });
        } catch (e) {
            console.warn('Failed to add loyalty points', e);
        }
    }

    async getTransactionHistory() {
        try {
            return await Parse.Cloud.run('getTransactions', { userId: this.app.currentUser.id });
        } catch (e) {
            return [];
        }
    }

    async displayWalletInfo() {
        try {
            const balance = await this.getBalance();
            document.getElementById('wallet-balance-display').textContent = balance;
            document.getElementById('wallet-balance').textContent = balance;
            const loyalty = await Parse.Cloud.run('getLoyalty', { userId: this.app.currentUser.id });
            document.getElementById('loyalty-points-display').textContent = loyalty.points;
            document.getElementById('loyalty-level-display').textContent = loyalty.level;
            const txns = await this.getTransactionHistory();
            const list = document.getElementById('transactions-list');
            if (list) list.innerHTML = txns.map(t => `<div>${t.description}: ${t.amount} VIBE</div>`).join('');
            const list2 = document.getElementById('transactions-list-wallet');
            if (list2) list2.innerHTML = txns.map(t => `<div>${t.description}: ${t.amount} VIBE</div>`).join('');
        } catch (err) {
            showNotification('Failed to load wallet', 'error');
        }
    }

    async checkoutCart() {
        showNotification('Checkout coming soon');
    }

    // NEW: Export transactions as CSV
    async exportTransactions() {
        const txns = await this.getTransactionHistory();
        if (!txns.length) {
            showNotification('No transactions to export', 'warning');
            return;
        }
        let csv = 'Date,Description,Type,Amount\n';
        txns.forEach(t => {
            csv += `${new Date(t.createdAt).toISOString()},${t.description},${t.type},${t.amount}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vibelink-transactions.csv';
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Transactions exported');
    }
}

window.WalletService = WalletService;