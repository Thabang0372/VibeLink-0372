class AuthService {
    constructor(app) {
        this.app = app;
    }

    async checkAuthentication() {
        try {
            this.app.currentUser = Parse.User.current();
            
            if (this.app.currentUser) {
                this.app.showMainSection();
                this.app.hideAuthSection();
                console.log('✅ User authenticated:', this.app.currentUser.get('username'));
            } else {
                this.app.showAuthSection();
                this.app.hideMainSection();
            }
            
            return this.app.currentUser;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.app.showAuthSection();
            return null;
        }
    }

    async handleLogin(e) {
        if (e) e.preventDefault();
        
        const username = document.getElementById('loginUsername')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!username || !password) {
            this.app.showError('Please enter both username and password');
            return;
        }

        try {
            const user = await Parse.User.logIn(username, password);
            await this.handleSuccessfulLogin(user);
            this.app.showSuccess('Login successful! 🎉');
        } catch (error) {
            this.app.showError('Login failed: ' + error.message);
        }
    }

    async handleSignup(e) {
        if (e) e.preventDefault();
        
        const username = document.getElementById('signupUsername')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const bio = document.getElementById('signupBio')?.value;

        if (!username || !email || !password) {
            this.app.showError('Please fill all required fields');
            return;
        }

        const user = new Parse.User();
        user.set('username', username);
        user.set('email', email);
        user.set('password', password);
        user.set('bio', bio || '');
        user.set('emailVerified', false);

        try {
            const newUser = await user.signUp();
            await this.handleSuccessfulLogin(newUser);
            this.app.showSuccess('Account created successfully! 🎉');
        } catch (error) {
            this.app.showError('Signup failed: ' + error.message);
        }
    }

    async handleSuccessfulLogin(user) {
        this.app.currentUser = user;
        this.app.showMainSection();
        this.app.hideAuthSection();

        // Initialize user-specific data
        await this.app.services.wallet.initializeUserData();
        await this.app.services.profile.ensureProfileExists();
        
        // Load user data
        await this.app.loadInitialData();
    }

    async handleLogout() {
        try {
            await Parse.User.logOut();
            this.app.currentUser = null;
            this.app.showAuthSection();
            this.app.hideMainSection();
            this.app.showSuccess('Logged out successfully');
        } catch (error) {
            this.app.showError('Logout error: ' + error.message);
        }
    }

    getCurrentUser() {
        return this.app.currentUser;
    }

    isAuthenticated() {
        return this.app.currentUser !== null;
    }
}

export default AuthService;