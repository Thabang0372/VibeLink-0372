class SettingsService {
    constructor(app) {
        this.app = app;
    }

    // ---------- Core Settings CRUD ----------
    async getUserSettings() {
        if (!this.app.currentUser) throw new Error('User must be logged in');
        const VibeUserSettings = Parse.Object.extend('VibeUserSettings');
        const query = new Parse.Query(VibeUserSettings);
        query.equalTo('user', this.app.currentUser);
        let settings = await query.first();
        if (!settings) settings = await this.createDefaultSettings();
        return this.formatSettings(settings);
    }

    async createDefaultSettings() {
        const VibeUserSettings = Parse.Object.extend('VibeUserSettings');
        const settings = new VibeUserSettings();
        settings.set('user', this.app.currentUser);
        settings.set('privacy', this.getDefaultPrivacySettings());
        settings.set('notifications', this.getDefaultNotificationSettings());
        settings.set('appearance', this.getDefaultAppearanceSettings());
        settings.set('content', this.getDefaultContentSettings());
        settings.set('security', this.getDefaultSecuritySettings());
        settings.set('legacyData', {});
        settings.set('arPreferences', this.getDefaultARPreferences());
        settings.set('qaPreferences', this.getDefaultQAPreferences());
        settings.set('connectedAccounts', {});
        settings.set('parentalControls', {});
        await settings.save();
        return settings;
    }

    async getUserSettingsObject() {
        const VibeUserSettings = Parse.Object.extend('VibeUserSettings');
        const query = new Parse.Query(VibeUserSettings);
        query.equalTo('user', this.app.currentUser);
        const settings = await query.first();
        return settings || await this.createDefaultSettings();
    }

    formatSettings(settings) {
        return {
            privacy: settings.get('privacy'),
            notifications: settings.get('notifications'),
            appearance: settings.get('appearance'),
            content: settings.get('content'),
            security: settings.get('security'),
            legacyData: settings.get('legacyData') || {},
            arPreferences: settings.get('arPreferences') || {},
            qaPreferences: settings.get('qaPreferences') || {},
            connectedAccounts: settings.get('connectedAccounts') || {},
            parentalControls: settings.get('parentalControls') || {}
        };
    }

    async updateUserSettings(settingsData) {
        const settings = await this.getUserSettingsObject();
        ['privacy','notifications','appearance','content','security'].forEach(key => {
            if (settingsData[key]) settings.set(key, { ...settings.get(key), ...settingsData[key] });
        });
        await settings.save();
        showNotification('Settings updated! ⚙️');
        return this.formatSettings(settings);
    }

    // ---------- Privacy ----------
    async updatePrivacySettings(privacySettings) {
        return this.updateUserSettings({ privacy: privacySettings });
    }

    // ---------- Notifications ----------
    async updateNotificationSettings(notificationSettings) {
        return this.updateUserSettings({ notifications: notificationSettings });
    }

    // ---------- Appearance ----------
    async updateAppearanceSettings(appearanceSettings) {
        const settings = await this.getUserSettingsObject();
        settings.set('appearance', { ...settings.get('appearance'), ...appearanceSettings });
        await settings.save();
        if (appearanceSettings.theme) this.applyTheme(appearanceSettings.theme);
        showNotification('Appearance updated! 🎨');
        return this.formatSettings(settings);
    }

    applyTheme(theme) {
        localStorage.setItem('vibelink-theme', theme);
        document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    }

    // ---------- Content ----------
    async updateContentSettings(contentData) {
        return this.updateUserSettings({ content: contentData });
    }

    // ---------- Security ----------
    async updateSecuritySettings(securityData) {
        return this.updateUserSettings({ security: securityData });
    }

    // ---------- Connected Accounts ----------
    async manageConnectedAccounts(accountData) {
        const settings = await this.getUserSettingsObject();
        const connected = settings.get('connectedAccounts') || {};
        connected[accountData.provider] = {
            connected: accountData.connected,
            lastSynced: accountData.connected ? new Date() : null,
            permissions: accountData.permissions || []
        };
        settings.set('connectedAccounts', connected);
        await settings.save();
        const action = accountData.connected ? 'connected' : 'disconnected';
        showNotification(`${accountData.provider} account ${action} successfully! 🔗`);
        return this.formatSettings(settings);
    }

    // ---------- Parental Controls ----------
    async setParentalControls(controls) {
        const settings = await this.getUserSettingsObject();
        settings.set('parentalControls', {
            ...settings.get('parentalControls'),
            ...controls,
            lastUpdated: new Date()
        });
        await settings.save();
        showNotification('Parental controls updated! 👨‍👩‍👧‍👦');
        return this.formatSettings(settings);
    }

    // ---------- Data Export ----------
    async exportUserData() {
        if (!this.app.currentUser) throw new Error('User must be logged in');
        showNotification('Preparing your data export...');
        try {
            const userData = await this.collectUserData();
            const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vibelink-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('Data exported successfully! 📥');
        } catch (error) {
            console.error(error);
            showNotification('Export failed', 'error');
        }
    }

    async collectUserData() {
        const posts = await new Parse.Query('Post').equalTo('author', this.app.currentUser).find();
        const events = await new Parse.Query('VibeEvent').equalTo('host', this.app.currentUser).find();
        const wallet = await this.app.services.wallet?.getUserWallet();
        const loyalty = await this.app.services.wallet?.getUserLoyaltyProgram();
        const courses = await this.app.services.learning?.loadMyCourses() || [];

        return {
            exportDate: new Date().toISOString(),
            user: {
                username: this.app.currentUser.get('username'),
                email: this.app.currentUser.get('email'),
                bio: this.app.currentUser.get('bio'),
                profile: await this.app.services.profile?.getUserProfile()
            },
            content: {
                posts: posts.map(p => p.toJSON()),
                events: events.map(e => e.toJSON())
            },
            finances: {
                wallet: wallet ? { balance: wallet.get('balance') } : null,
                loyalty: loyalty ? { points: loyalty.get('points'), level: loyalty.get('level') } : null
            },
            learning: courses
        };
    }

    // ---------- Import Legacy Data ----------
    async importLegacyData(legacyData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');
        try {
            let imported = 0;
            if (legacyData.posts) {
                for (const p of legacyData.posts) {
                    await this.app.services.posts.createPost(p.content);
                    imported++;
                }
            }
            showNotification(`Imported ${imported} items.`);
        } catch (error) {
            showNotification('Import failed', 'error');
        }
    }

    // ---------- Knowledge Base ----------
    async searchKnowledgeBase(query, filters = {}) {
        const VibeKnowledgeArticle = Parse.Object.extend('VibeKnowledgeArticle');
        const q = new Parse.Query(VibeKnowledgeArticle);
        if (query) {
            q.contains('title', query);
        }
        q.equalTo('isPublished', true);
        q.descending('helpfulCount');
        q.limit(filters.limit || 20);
        return await q.find();
    }

    // ---------- Q&A / Support ----------
    async submitQuestion(questionData) {
        const VibeQuestion = Parse.Object.extend('VibeQuestion');
        const q = new VibeQuestion();
        q.set('author', this.app.currentUser);
        q.set('title', questionData.title);
        q.set('description', questionData.description);
        q.set('category', questionData.category);
        q.set('tags', questionData.tags || []);
        q.set('status', 'open');
        q.set('answers', []);
        await q.save();
        showNotification('Question submitted! 📝');
        return q;
    }

    async answerQuestion(questionId, answerText) {
        const VibeQuestion = Parse.Object.extend('VibeQuestion');
        const question = await new Parse.Query(VibeQuestion).get(questionId);
        const answers = question.get('answers') || [];
        answers.push({
            author: this.app.currentUser.id,
            answer: answerText,
            answeredAt: new Date(),
            upvotes: 0
        });
        question.set('answers', answers);
        question.set('status', 'answered');
        await question.save();
        showNotification('Answer posted! 💡');
        return question;
    }

    // ---------- Account Deletion ----------
    async deleteAccount() {
        if (!confirm('Delete your entire account? This cannot be undone!')) return;
        try {
            // Delete all user data (simplified)
            const posts = await new Parse.Query('Post').equalTo('author', this.app.currentUser).find();
            await Parse.Object.destroyAll(posts);
            await this.app.currentUser.destroy();
            await Parse.User.logOut();
            localStorage.clear();
            location.reload();
        } catch (error) {
            showNotification('Account deletion failed', 'error');
        }
    }

    // ---------- System Status ----------
    async getSystemStatus() {
        return {
            overallStatus: 'operational',
            lastChecked: new Date(),
            message: 'All systems operational'
        };
    }

    async clearCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(k => { if (!k.startsWith('vibelink-')) localStorage.removeItem(k); });
        showNotification('Cache cleared! 🧹');
    }

    // ---------- Default values ----------
    getDefaultPrivacySettings() {
        return {
            profileVisibility: 'public',
            showOnlineStatus: true,
            allowMessagesFrom: 'everyone',
            showActivity: true,
            searchVisibility: true
        };
    }
    getDefaultNotificationSettings() {
        return {
            pushNotifications: { messages: true, likes: true, comments: true, events: true },
            emailNotifications: { digest: true, security: true },
            inAppNotifications: { sounds: true, banners: true }
        };
    }
    getDefaultAppearanceSettings() {
        return { theme: 'auto', fontSize: 'medium', reduceMotion: false, highContrast: false, language: 'en' };
    }
    getDefaultContentSettings() {
        return { safeSearch: true, autoPlayMedia: false, dataSaver: false };
    }
    getDefaultSecuritySettings() {
        return { twoFactorAuth: false, loginAlerts: true, sessionTimeout: 30 };
    }
    getDefaultARPreferences() { return { enabled: true, quality: 'medium' }; }
    getDefaultQAPreferences() { return { autoSuggest: true, communityAnswers: true }; }
}

window.SettingsService = SettingsService;