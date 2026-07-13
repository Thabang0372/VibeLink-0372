class AuthService {
    constructor(app) { this.app = app; }

    async checkAuthentication() {
        try {
            this.app.currentUser = Parse.User.current();
            if (this.app.currentUser) {
                this.app.showMainSection();
                this.app.hideAuthSection();
                await this.app.loadInitialData();
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

    // ========== FIXED: email-first login ==========
    async handleLogin(e) {
        if (e) e.preventDefault();
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
        }
        try {
            const query = new Parse.Query(Parse.User);
            query.equalTo('email', email);
            const foundUser = await query.first({ useMasterKey: false });
            if (!foundUser) {
                showNotification('No account found with that email', 'error');
                return;
            }
            const user = await Parse.User.logIn(foundUser.get('username'), password);
            await this.handleSuccessfulLogin(user);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async handleSignup(e) { /* unchanged */ }
    async handleSuccessfulLogin(user) { /* unchanged */ }
    async handleLogout() { /* unchanged */ }
}

window.AuthService = AuthService;