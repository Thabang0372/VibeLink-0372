class WalletService {
    constructor(app) { this.app = app; }

    async ensureWalletExists() {
        const Wallet = Parse.Object.extend('VibeWallet');
        let w = await new Parse.Query(Wallet).equalTo('owner', this.app.currentUser).first();
        if (!w) { w = new Wallet(); w.set('owner', this.app.currentUser); w.set('balance', 100); await w.save(); }
        return w;
    }

    async ensureLoyaltyProgramExists() {
        const Loyalty = Parse.Object.extend('VibeLoyaltyProgram');
        let l = await new Parse.Query(Loyalty).equalTo('user', this.app.currentUser).first();
        if (!l) { l = new Loyalty(); l.set('user', this.app.currentUser); l.set('points', 0); l.set('level', 'Bronze'); await l.save(); }
        return l;
    }

    async getBalance() { const w = await this.ensureWalletExists(); return w.get('balance'); }

    async addFunds(amount) {
        const w = await this.ensureWalletExists();
        w.increment('balance', amount);
        await w.save();
        const tx = new Parse.Object('WalletTransaction');
        tx.set('wallet', w); tx.set('type', 'credit'); tx.set('amount', amount); tx.set('description', 'Added funds');
        await tx.save();
        showNotification(`Added ${amount} VIBE`);
        await this.displayWalletInfo();
    }

    async sendMoney(toUserId, amount) {
        const from = await this.ensureWalletExists();
        if (from.get('balance') < amount) throw new Error('Insufficient funds');
        const to = await new Parse.Query('VibeWallet').equalTo('owner', { __type: 'Pointer', className: '_User', objectId: toUserId }).first();
        if (!to) throw new Error('Recipient wallet not found');
        from.increment('balance', -amount);
        to.increment('balance', amount);
        await Parse.Object.saveAll([from, to]);
        const tx1 = new Parse.Object('WalletTransaction');
        tx1.set('wallet', from); tx1.set('type','debit'); tx1.set('amount',-amount); tx1.set('description',`Sent to ${toUserId}`);
        await tx1.save();
        const tx2 = new Parse.Object('WalletTransaction');
        tx2.set('wallet', to); tx2.set('type','credit'); tx2.set('amount',amount); tx2.set('description',`Received from ${this.app.currentUser.id}`);
        await tx2.save();
        showNotification(`Sent ${amount} VIBE`);
        await this.displayWalletInfo();
    }

    async sendTip(creatorId, amount, message) {
        const from = await this.ensureWalletExists();
        if (from.get('balance') < amount) throw new Error('Insufficient funds');
        const to = await new Parse.Query('VibeWallet').equalTo('owner', { __type: 'Pointer', className: '_User', objectId: creatorId }).first();
        if (!to) throw new Error('Creator wallet not found');
        from.increment('balance', -amount);
        to.increment('balance', amount);
        await Parse.Object.saveAll([from, to]);
        const tip = new Parse.Object('VibeTips');
        tip.set('sender', this.app.currentUser); tip.set('creator', { __type: 'Pointer', className: '_User', objectId: creatorId }); tip.set('amount', amount); tip.set('message', message);
        await tip.save();
        await this.addLoyaltyPoints(10);
        showNotification('Tip sent');
        await this.displayWalletInfo();
    }

    async addLoyaltyPoints(points) {
        const l = await this.ensureLoyaltyProgramExists();
        l.increment('points', points);
        const total = l.get('points');
        if (total >= 1000) l.set('level','Platinum');
        else if (total >= 500) l.set('level','Gold');
        else if (total >= 100) l.set('level','Silver');
        await l.save();
    }

    async getTransactionHistory() {
        const w = await this.ensureWalletExists();
        return await new Parse.Query('WalletTransaction').equalTo('wallet', w).descending('createdAt').limit(20).find();
    }

    async displayWalletInfo() {
        const balance = await this.getBalance();
        document.getElementById('wallet-balance-display').innerText = balance;
        document.getElementById('wallet-balance').innerText = balance;
        const loyalty = await this.ensureLoyaltyProgramExists();
        document.getElementById('loyalty-points-display').innerText = loyalty.get('points');
        document.getElementById('loyalty-level-display').innerText = loyalty.get('level');
        const txns = await this.getTransactionHistory();
        document.getElementById('transactions-list').innerHTML = txns.map(t => `<div>${t.get('description')}: ${t.get('amount')} VIBE</div>`).join('');
    }

    // NEW: Export transactions as CSV (WeChat-style)
    async exportTransactions() {
        const txns = await this.getTransactionHistory();
        let csv = 'Date,Description,Type,Amount\n';
        txns.forEach(t => {
            csv += `${t.createdAt},${t.get('description')},${t.get('type')},${t.get('amount')}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vibelink-transactions.csv'; a.click();
        showNotification('Transactions exported');
    }
}

window.WalletService = WalletService;