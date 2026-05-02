class AuthService {
    constructor(app) { this.app = app; }

    async checkAuthentication() {
        try {
            this.app.currentUser = Parse.User.current();
            if (this.app.currentUser) {
                this.app.showMainSection();
                this.app.hideAuthSection();
                await this.app.loadInitialData();   // ✅ FIX – loads all data on session resume
            } else {
                this.app.showAuthSection();
                this.app.hideMainSection();
            }
            return this.app.currentUser;
        } catch (error) {
            this.app.showAuthSection();
            return null;
        }
    }

    async handleLogin(e) {
        if (e) e.preventDefault();
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
        }
        try {
            const user = await Parse.User.logIn(email, password);
            await this.handleSuccessfulLogin(user);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async handleSignup(e) {
        if (e) e.preventDefault();
        const username = document.getElementById('signupUsername')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const bio = document.getElementById('signupBio')?.value;
        if (!username || !email || !password) {
            showNotification('Please fill all required fields', 'error');
            return;
        }
        const user = new Parse.User();
        user.set('username', username);
        user.set('email', email);
        user.set('password', password);
        user.set('bio', bio || '');
        try {
            await user.signUp();
            await this.handleSuccessfulLogin(user);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async handleSuccessfulLogin(user) {
        this.app.currentUser = user;
        this.app.showMainSection();
        this.app.hideAuthSection();

        if (this.app.services.wallet) {
            await this.app.services.wallet.ensureWalletExists();
            await this.app.services.wallet.ensureLoyaltyProgramExists();
        }
        if (this.app.services.profile) {
            await this.app.services.profile.ensureProfileExists();
        }

        await this.app.loadInitialData();
        showNotification('Welcome to VibeLink 0372! 🚀');
    }

    async handleLogout() {
        await Parse.User.logOut();
        this.app.currentUser = null;
        this.app.showAuthSection();
        this.app.hideMainSection();
        window.location.reload();
    }
}

window.AuthService = AuthService;