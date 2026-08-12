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

    async handleSignup(e) {
        if (e) e.preventDefault();
        const username = document.getElementById('signupUsername')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const bio = document.getElementById('signupBio')?.value;
        if (!username || !email || !password) {
            showNotification('Please fill all fields', 'error');
            return;
        }
        try {
            const user = new Parse.User();
            const uniqueId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            user.set('username', uniqueId);
            user.set('email', email);
            user.set('password', password);
            user.set('displayName', username);
            user.set('bio', bio || '');
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
        await this.app.loadInitialData();
        showNotification('Welcome back!');
    }

    async handleLogout() {
        await Parse.User.logOut();
        this.app.currentUser = null;
        this.app.showAuthSection();
        this.app.hideMainSection();
        showNotification('Logged out');
    }
}

window.AuthService = AuthService;