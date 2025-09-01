// Parse initialization with provided keys
Parse.initialize("8fYdKoHo6nrYd3gZw2acyPlb9mWKQbb8BBOQRCse", "xSatMs4hrQbw0PcGzXO1j8s76qoX3uUqfhfl59MQ");
Parse.serverURL = 'https://parseapi.back4app.com/';

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const showSignup = document.getElementById('showSignup');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// Show notification function
function showNotification(message, type = 'success') {
    notificationMessage.textContent = message;
    notification.className = 'notification ' + type;
    notification.classList.add('show');

    // Update icon based on type
    const icon = notification.querySelector('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Auth functions
async function login(email, password, rememberMe) {
    try {
        const user = await Parse.User.logIn(email, password);
        showNotification('Login successful!', 'success');

        // Store login session if remember me is checked    
        if (rememberMe) {    
            localStorage.setItem('rememberedUser', JSON.stringify({    
                username: user.getUsername(),    
                sessionToken: user.getSessionToken()    
            }));    
        }    
        
        // Hide login screen and show app    
        loginScreen.style.display = 'none';    
        appContainer.style.display = 'block';    
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function register(username, fullname, email, password) {
    const user = new Parse.User();
    user.set('username', username);
    user.set('password', password);
    user.set('email', email);
    user.set('fullNam', fullname); // Using 'fullNam' to match Back4App schema

    try {
        await user.signUp();
        showNotification('Registration successful! Please log in.', 'success');
        return true;
    } catch (error) {
        showNotification(error.message, 'error');
        return false;
    }
}

async function resetPassword(email) {
    try {
        await Parse.User.requestPasswordReset(email);
        showNotification('Password reset email sent!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Show signup form
function showSignupForm() {
    const signupHTML = `
        <div class="login-card" style="margin-top: 20px;">
            <div class="login-logo">
                <div>
                    <i class="fas fa-globe-americas"></i>
                    Create Account
                </div>
            </div>
            
            <form class="login-form" id="signupForm">
                <div class="input-group">
                    <label for="register-username">Username</label>
                    <input type="text" id="register-username" placeholder="Choose a username" required>
                </div>
                
                <div class="input-group">
                    <label for="register-fullname">Full Name</label>
                    <input type="text" id="register-fullname" placeholder="Enter your full name" required>
                </div>
                
                <div class="input-group">
                    <label for="register-email">Email</label>
                    <input type="email" id="register-email" placeholder="Enter your email" required>
                </div>
                
                <div class="input-group">
                    <label for="register-password">Password</label>
                    <input type="password" id="register-password" placeholder="Create a password" required>
                </div>
                
                <div class="input-group">
                    <label for="register-confirm-password">Confirm Password</label>
                    <input type="password" id="register-confirm-password" placeholder="Confirm your password" required>
                </div>
                
                <button type="submit" class="login-btn">Create Account</button>
                
                <div class="signup-link">
                    Already have an account? <a href="#" id="showLogin">Log In</a>
                </div>
            </form>
        </div>
    `;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = signupHTML;
    document.querySelector('.login-container').appendChild(tempDiv);
    
    document.getElementById('signupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const fullname = document.getElementById('register-fullname').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        register(username, fullname, email, password).then(success => {
            if (success) {
                document.querySelector('.login-container').removeChild(tempDiv);
            }
        });
    });
    
    document.getElementById('showLogin').addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('.login-container').removeChild(tempDiv);
    });
}

// Check if user is already logged in
function checkCurrentUser() {
    const currentUser = Parse.User.current();

    if (currentUser) {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'block';
    } else {
        // Check if we have a remembered user
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            const userData = JSON.parse(rememberedUser);
            Parse.User.become(userData.sessionToken)
                .then(() => {
                    loginScreen.style.display = 'none';
                    appContainer.style.display = 'block';
                })
                .catch(() => {
                    localStorage.removeItem('rememberedUser');
                });
        }
    }
}

// Initialize the app
function init() {
    // Login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember').checked;
        
        login(email, password, rememberMe);
    });
    
    // Show signup form
    showSignup.addEventListener('click', function(e) {
        e.preventDefault();
        showSignupForm();
    });
    
    // Check if user is already logged in
    checkCurrentUser();
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);