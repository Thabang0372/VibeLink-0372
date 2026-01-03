class SettingsService {
    constructor(app) {
        this.app = app;
        this.userSettings = new Map();
        this.legacyData = new Map();
    }

    async getUserSettings() {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeUserSettings = this.app.services.parse.getClass('VibeUserSettings');
        const query = new Parse.Query(VibeUserSettings);
        query.equalTo('user', this.app.currentUser);
        
        let settings = await query.first();
        
        if (!settings) {
            settings = await this.createDefaultSettings();
        }

        this.userSettings.set(this.app.currentUser.id, settings);
        return this.formatSettings(settings);
    }

    async createDefaultSettings() {
        const VibeUserSettings = this.app.services.parse.getClass('VibeUserSettings');
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

        await settings.save();
        return settings;
    }

    async updateUserSettings(settingsData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const settings = await this.getUserSettingsObject();
        
        // Update specific setting categories
        if (settingsData.privacy) {
            settings.set('privacy', {
                ...settings.get('privacy'),
                ...settingsData.privacy
            });
        }
        
        if (settingsData.notifications) {
            settings.set('notifications', {
                ...settings.get('notifications'),
                ...settingsData.notifications
            });
        }
        
        if (settingsData.appearance) {
            settings.set('appearance', {
                ...settings.get('appearance'),
                ...settingsData.appearance
            });
        }
        
        if (settingsData.content) {
            settings.set('content', {
                ...settings.get('content'),
                ...settingsData.content
            });
        }
        
        if (settingsData.security) {
            settings.set('security', {
                ...settings.get('security'),
                ...settingsData.security
            });
        }

        await settings.save();
        
        // Update cache
        this.userSettings.set(this.app.currentUser.id, settings);
        
        this.app.showSuccess('Settings updated successfully! ⚙️');
        return this.formatSettings(settings);
    }

    async updatePrivacySettings(privacySettings) {
        const settings = await this.getUserSettingsObject();
        settings.set('privacy', {
            ...settings.get('privacy'),
            ...privacySettings
        });
        
        await settings.save();
        this.app.showSuccess('Privacy settings updated! 🔒');
        return this.formatSettings(settings);
    }

    async updateNotificationSettings(notificationSettings) {
        const settings = await this.getUserSettingsObject();
        settings.set('notifications', {
            ...settings.get('notifications'),
            ...notificationSettings
        });
        
        await settings.save();
        this.app.showSuccess('Notification settings updated! 🔔');
        return this.formatSettings(settings);
    }

    async updateAppearanceSettings(appearanceSettings) {
        const settings = await this.getUserSettingsObject();
        settings.set('appearance', {
            ...settings.get('appearance'),
            ...appearanceSettings
        });
        
        await settings.save();
        
        // Apply theme immediately
        this.applyTheme(appearanceSettings.theme);
        
        this.app.showSuccess('Appearance settings updated! 🎨');
        return this.formatSettings(settings);
    }

    applyTheme(theme) {
        const html = document.documentElement;
        
        // Remove existing theme classes
        html.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Apply new theme
        if (theme === 'auto') {
            html.classList.add('theme-auto');
            this.applySystemTheme();
        } else {
            html.classList.add(`theme-${theme}`);
        }

        // Save to localStorage for persistence
        localStorage.setItem('vibelink-theme', theme);
    }

    applySystemTheme() {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('theme-dark', isDarkMode);
        document.documentElement.classList.toggle('theme-light', !isDarkMode);
    }

    async exportUserData() {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        this.app.showLoading('Preparing your data export...');

        try {
            const userData = await this.collectUserData();
            const exportFile = await this.createExportFile(userData);
            
            this.downloadFile(exportFile, `vibelink-data-export-${new Date().toISOString().split('T')[0]}.json`);
            
            this.app.showSuccess('Data export completed! Your file is downloading. 📥');
            return exportFile;
        } catch (error) {
            console.error('Error exporting user data:', error);
            this.app.showError('Failed to export user data');
            throw error;
        }
    }

    async collectUserData() {
        const [
            profileData,
            posts,
            events,
            messages,
            transactions,
            achievements
        ] = await Promise.all([
            this.app.services.profile.getUserProfile(),
            this.getUserPosts(),
            this.getUserEvents(),
            this.getUserMessages(),
            this.getUserTransactions(),
            this.getUserAchievements()
        ]);

        return {
            exportDate: new Date().toISOString(),
            user: {
                profile: profileData,
                stats: await this.app.services.profile.getUserStats()
            },
            content: {
                posts: posts,
                events: events,
                messages: this.sanitizeMessages(messages)
            },
            financial: {
                transactions: transactions,
                wallet: await this.app.services.wallet.getUserWallet()
            },
            social: {
                followers: await this.app.services.profile.loadFollowers(),
                following: await this.app.services.profile.loadFollowing(),
                communities: await this.getUserCommunities()
            },
            gaming: {
                achievements: achievements,
                stats: await this.app.services.gaming.getUserGameStats()
            },
            learning: {
                courses: await this.app.services.learning.loadMyCourses(),
                progress: await this.getLearningProgress()
            }
        };
    }

    async createExportFile(data) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        return blob;
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async importLegacyData(legacyData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        this.app.showLoading('Importing legacy data...');

        try {
            const validation = this.validateLegacyData(legacyData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const importResults = await this.processLegacyImport(legacyData);
            
            // Update settings with import metadata
            const settings = await this.getUserSettingsObject();
            const currentLegacyData = settings.get('legacyData') || {};
            
            settings.set('legacyData', {
                ...currentLegacyData,
                lastImport: new Date(),
                importStats: importResults
            });
            
            await settings.save();

            this.app.showSuccess('Legacy data imported successfully! 🔄');
            return importResults;
        } catch (error) {
            console.error('Error importing legacy data:', error);
            this.app.showError('Failed to import legacy data');
            throw error;
        }
    }

    async processLegacyImport(legacyData) {
        const results = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        // Import contacts
        if (legacyData.contacts) {
            const contactResults = await this.importLegacyContacts(legacyData.contacts);
            results.imported += contactResults.imported;
            results.skipped += contactResults.skipped;
            results.errors.push(...contactResults.errors);
        }

        // Import events
        if (legacyData.events) {
            const eventResults = await this.importLegacyEvents(legacyData.events);
            results.imported += eventResults.imported;
            results.skipped += eventResults.skipped;
            results.errors.push(...eventResults.errors);
        }

        // Import content
        if (legacyData.content) {
            const contentResults = await this.importLegacyContent(legacyData.content);
            results.imported += contentResults.imported;
            results.skipped += contentResults.skipped;
            results.errors.push(...contentResults.errors);
        }

        return results;
    }

    async configureARPreferences(arSettings) {
        const settings = await this.getUserSettingsObject();
        settings.set('arPreferences', {
            ...settings.get('arPreferences'),
            ...arSettings
        });
        
        await settings.save();
        
        this.app.showSuccess('AR preferences updated! 🕶️');
        return this.formatSettings(settings);
    }

    async configureQAPreferences(qaSettings) {
        const settings = await this.getUserSettingsObject();
        settings.set('qaPreferences', {
            ...settings.get('qaPreferences'),
            ...qaSettings
        });
        
        await settings.save();
        
        this.app.showSuccess('Q&A preferences updated! ❓');
        return this.formatSettings(settings);
    }

    async submitQuestion(questionData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeQuestion = this.app.services.parse.getClass('VibeQuestion');
        const question = new VibeQuestion();
        
        question.set('author', this.app.currentUser);
        question.set('title', questionData.title);
        question.set('description', questionData.description);
        question.set('category', questionData.category);
        question.set('tags', questionData.tags || []);
        question.set('priority', questionData.priority || 'normal'); // low, normal, high, urgent
        question.set('status', 'open'); // open, answered, closed
        question.set('answers', []);
        question.set('upvotes', 0);
        question.set('views', 0);
        question.set('isAnonymous', questionData.isAnonymous || false);

        await question.save();

        // Notify support team based on priority
        await this.notifySupportTeam(question);

        this.app.showSuccess('Question submitted successfully! We will get back to you soon. 📝');
        return question;
    }

    async answerQuestion(questionId, answerData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeQuestion = this.app.services.parse.getClass('VibeQuestion');
        const query = new Parse.Query(VibeQuestion);
        const question = await query.get(questionId);
        
        const answers = question.get('answers') || [];
        
        const newAnswer = {
            author: this.app.currentUser,
            answer: answerData.answer,
            answeredAt: new Date(),
            isOfficial: answerData.isOfficial || false,
            upvotes: 0,
            isAccepted: false
        };
        
        answers.push(newAnswer);
        question.set('answers', answers);
        question.set('status', 'answered');
        
        await question.save();

        // Notify question author
        if (question.get('author').id !== this.app.currentUser.id) {
            await this.app.services.notifications.createNotification(
                question.get('author').id,
                'question_answered',
                `Your question "${question.get('title')}" has been answered`
            );
        }

        this.app.showSuccess('Answer submitted successfully! 💡');
        return question;
    }

    async searchKnowledgeBase(query, filters = {}) {
        const VibeKnowledgeArticle = this.app.services.parse.getClass('VibeKnowledgeArticle');
        const searchQuery = new Parse.Query(VibeKnowledgeArticle);
        
        if (query) {
            const searchFields = ['title', 'content', 'keywords'];
            const orQueries = searchFields.map(field => {
                const fieldQuery = new Parse.Query(VibeKnowledgeArticle);
                fieldQuery.contains(field, query);
                return fieldQuery;
            });
            searchQuery._orQuery(orQueries);
        }
        
        if (filters.category) {
            searchQuery.equalTo('category', filters.category);
        }
        
        if (filters.tags && filters.tags.length > 0) {
            searchQuery.containsAll('tags', filters.tags);
        }
        
        searchQuery.equalTo('isPublished', true);
        searchQuery.descending('helpfulCount');
        searchQuery.limit(filters.limit || 20);

        try {
            const articles = await searchQuery.find();
            this.displayKnowledgeArticles(articles);
            return articles;
        } catch (error) {
            console.error('Error searching knowledge base:', error);
            return [];
        }
    }

    async manageConnectedAccounts(accountData) {
        const settings = await this.getUserSettingsObject();
        const connectedAccounts = settings.get('connectedAccounts') || {};
        
        connectedAccounts[accountData.provider] = {
            connected: accountData.connected,
            lastSynced: accountData.connected ? new Date() : null,
            permissions: accountData.permissions || []
        };
        
        settings.set('connectedAccounts', connectedAccounts);
        await settings.save();

        const action = accountData.connected ? 'connected' : 'disconnected';
        this.app.showSuccess(`${accountData.provider} account ${action} successfully! 🔗`);
        return this.formatSettings(settings);
    }

    async setParentalControls(controls) {
        const settings = await this.getUserSettingsObject();
        settings.set('parentalControls', {
            ...settings.get('parentalControls'),
            ...controls,
            lastUpdated: new Date()
        });
        
        await settings.save();
        
        this.app.showSuccess('Parental controls updated! 👨‍👩‍👧‍👦');
        return this.formatSettings(settings);
    }

    async getSystemStatus() {
        const statusChecks = await Promise.allSettled([
            this.checkAPIConnection(),
            this.checkDatabaseConnection(),
            this.checkFileStorage(),
            this.checkRealtimeService(),
            this.checkExternalServices()
        ]);

        const services = [
            { name: 'API Server', status: statusChecks[0].status === 'fulfilled' },
            { name: 'Database', status: statusChecks[1].status === 'fulfilled' },
            { name: 'File Storage', status: statusChecks[2].status === 'fulfilled' },
            { name: 'Realtime Service', status: statusChecks[3].status === 'fulfilled' },
            { name: 'External Services', status: statusChecks[4].status === 'fulfilled' }
        ];

        const allServicesOperational = services.every(service => service.status);
        
        return {
            services,
            overallStatus: allServicesOperational ? 'operational' : 'degraded',
            lastChecked: new Date(),
            message: allServicesOperational 
                ? 'All systems operational' 
                : 'Some services are experiencing issues'
        };
    }

    async clearCache() {
        // Clear various caches
        this.userSettings.clear();
        this.legacyData.clear();
        
        // Clear localStorage
        const keysToKeep = ['vibelink-theme', 'vibelink-language'];
        const keys = Object.keys(localStorage);
        
        for (const key of keys) {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        }

        // Clear sessionStorage
        sessionStorage.clear();

        this.app.showSuccess('Cache cleared successfully! 🧹');
        return true;
    }

    async deleteAccount() {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const confirmation = confirm(
            'Are you sure you want to delete your account? This action cannot be undone. ' +
            'All your data will be permanently deleted.'
        );

        if (!confirmation) {
            return false;
        }

        this.app.showLoading('Deleting your account...');

        try {
            // Anonymize user data (GDPR compliance)
            await this.anonymizeUserData();
            
            // Delete user account
            await this.app.currentUser.destroy();
            
            // Clear local data
            localStorage.clear();
            sessionStorage.clear();
            
            this.app.showSuccess('Account deleted successfully. Thank you for using VibeLink! 👋');
            return true;
        } catch (error) {
            console.error('Error deleting account:', error);
            this.app.showError('Failed to delete account');
            throw error;
        }
    }

    // Helper Methods
    async getUserSettingsObject() {
        if (this.userSettings.has(this.app.currentUser.id)) {
            return this.userSettings.get(this.app.currentUser.id);
        }

        const VibeUserSettings = this.app.services.parse.getClass('VibeUserSettings');
        const query = new Parse.Query(VibeUserSettings);
        query.equalTo('user', this.app.currentUser);
        
        const settings = await query.first();
        if (!settings) {
            return await this.createDefaultSettings();
        }

        this.userSettings.set(this.app.currentUser.id, settings);
        return settings;
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

    getDefaultPrivacySettings() {
        return {
            profileVisibility: 'public', // public, friends, private
            showOnlineStatus: true,
            allowMessagesFrom: 'everyone', // everyone, friends, nobody
            showActivity: true,
            dataSharing: {
                analytics: true,
                personalizedAds: false,
                thirdParty: false
            },
            searchVisibility: true
        };
    }

    getDefaultNotificationSettings() {
        return {
            pushNotifications: {
                messages: true,
                likes: true,
                comments: true,
                events: true,
                announcements: true
            },
            emailNotifications: {
                digest: true,
                security: true,
                promotions: false
            },
            inAppNotifications: {
                sounds: true,
                banners: true
            },
            quietHours: {
                enabled: false,
                start: '22:00',
                end: '08:00'
            }
        };
    }

    getDefaultAppearanceSettings() {
        return {
            theme: 'auto', // light, dark, auto
            fontSize: 'medium', // small, medium, large
            reduceMotion: false,
            highContrast: false,
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    getDefaultContentSettings() {
        return {
            safeSearch: true,
            autoPlayMedia: false,
            dataSaver: false,
            downloadQuality: 'auto', // low, medium, high, auto
            contentFilters: []
        };
    }

    getDefaultSecuritySettings() {
        return {
            twoFactorAuth: false,
            loginAlerts: true,
            sessionTimeout: 30, // minutes
            trustedDevices: [],
            passwordLastChanged: new Date()
        };
    }

    getDefaultARPreferences() {
        return {
            enabled: true,
            quality: 'medium', // low, medium, high
            animations: true,
            interactiveElements: true,
            privacy: {
                faceTracking: false,
                location: true,
                camera: true
            }
        };
    }

    getDefaultQAPreferences() {
        return {
            autoSuggest: true,
            communityAnswers: true,
            expertVerification: true,
            notificationFrequency: 'immediate', // immediate, daily, weekly
            preferredCategories: []
        };
    }

    displayKnowledgeArticles(articles) {
        const container = document.getElementById('knowledge-base');
        if (!container) return;

        container.innerHTML = articles.map(article => `
            <div class="knowledge-article" data-article-id="${article.id}">
                <h3 class="article-title">${article.get('title')}</h3>
                <div class="article-meta">
                    <span class="article-category">${article.get('category')}</span>
                    <span class="article-helpful">${article.get('helpfulCount') || 0} found helpful</span>
                    <span class="article-updated">Updated ${new Date(article.get('updatedAt')).toLocaleDateString()}</span>
                </div>
                <p class="article-excerpt">${article.get('excerpt') || article.get('content').substring(0, 200)}...</p>
                <div class="article-actions">
                    <button onclick="vibeApp.services.settings.viewArticle('${article.id}')" class="btn-read">
                        Read Article
                    </button>
                    <button onclick="vibeApp.services.settings.markHelpful('${article.id}')" class="btn-helpful">
                        Helpful 👍
                    </button>
                </div>
            </div>
        `).join('');
    }

    // These would be implemented based on specific data structures
    async getUserPosts() { return []; }
    async getUserEvents() { return []; }
    async getUserMessages() { return []; }
    async getUserTransactions() { return []; }
    async getUserAchievements() { return []; }
    async getUserCommunities() { return []; }
    async getLearningProgress() { return []; }
    async importLegacyContacts() { return { imported: 0, skipped: 0, errors: [] }; }
    async importLegacyEvents() { return { imported: 0, skipped: 0, errors: [] }; }
    async importLegacyContent() { return { imported: 0, skipped: 0, errors: [] }; }
    async anonymizeUserData() { return true; }
    async checkAPIConnection() { return true; }
    async checkDatabaseConnection() { return true; }
    async checkFileStorage() { return true; }
    async checkRealtimeService() { return true; }
    async checkExternalServices() { return true; }
    async notifySupportTeam() { return true; }
    validateLegacyData() { return { valid: true }; }
    sanitizeMessages() { return []; }
}

export default SettingsService;