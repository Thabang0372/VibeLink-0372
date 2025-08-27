// Parse initialization with provided keys
Parse.initialize("8fYdKoHo6nrYd3gZw2acyPlb9mWKQbb8BBOQRCse", "xSatMs4hrQbw0PcGzXO1j8s76qoX3uUqfhfl59MQ");
Parse.serverURL = 'https://parseapi.back4app.com/';

// DOM elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const feed = document.getElementById('feed');
const feedLoading = document.getElementById('feed-loading');

// Show notification function
function showNotification(message, type = 'success') {
    const icon = notification.querySelector('i');
    
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else {
        icon.className = 'fas fa-exclamation-circle';
    }
    
    notificationMessage.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.className = 'notification hidden';
    }, 3000);
}

// Form toggle functions
function showLoginForm() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    forgotPasswordForm.classList.add('hidden');
}

function showRegisterForm() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    forgotPasswordForm.classList.add('hidden');
}

function showForgotPassword() {
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    forgotPasswordForm.classList.remove('hidden');
}

// Auth functions
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        // Try to log in with Parse
        const user = await Parse.User.logIn(username, password);
        showNotification(`Welcome back, ${user.get('username')}!`, 'success');
        
        // Switch to app view
        setTimeout(() => {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            loadFeed();
        }, 1000);
    } catch (error) {
        showNotification('Login failed. Please check your credentials.', 'error');
        console.error('Login error:', error);
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (!username || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    try {
        // Create new Parse user
        const user = new Parse.User();
        user.set('username', username);
        user.set('email', email);
        user.set('password', password);
        
        await user.signUp();
        showNotification('Account created successfully!', 'success');
        
        // Switch to login form
        setTimeout(() => {
            showLoginForm();
        }, 1000);
    } catch (error) {
        showNotification('Registration failed. Please try again.', 'error');
        console.error('Registration error:', error);
    }
}

async function resetPassword() {
    const email = document.getElementById('reset-email').value;
    
    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }
    
    try {
        // Request password reset
        await Parse.User.requestPasswordReset(email);
        showNotification('Password reset link sent to your email', 'success');
        
        // Switch to login form
        setTimeout(() => {
            showLoginForm();
        }, 1000);
    } catch (error) {
        showNotification('Password reset failed. Please check your email.', 'error');
        console.error('Password reset error:', error);
    }
}

function socialLogin(provider) {
    showNotification(`Logging in with ${provider}...`);
    
    // In a real app, you would implement OAuth flow for the selected provider
    setTimeout(() => {
        showNotification(`${provider} login is not implemented in this demo`, 'error');
    }, 1000);
}

// Post functions
async function createPost() {
    const content = document.getElementById('post-content').value;
    
    if (!content) {
        showNotification('Please write something first', 'error');
        return;
    }
    
    try {
        // Create a new Post object
        const Post = Parse.Object.extend('Post');
        const post = new Post();
        
        // Set the content and author
        post.set('content', content);
        post.set('author', Parse.User.current());
        
        // Save the post
        await post.save();
        
        // Add to feed
        addPostToFeed({
            id: post.id,
            user: Parse.User.current().get('username'),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(Parse.User.current().get('username'))}&background=667eea`,
            content: content,
            time: 'Just now',
            likes: 0,
            comments: 0
        });
        
        // Clear textarea
        document.getElementById('post-content').value = '';
        
        showNotification('Posted successfully!');
    } catch (error) {
        showNotification('Failed to create post. Please try again.', 'error');
        console.error('Post creation error:', error);
    }
}

function addPostToFeed(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.innerHTML = `
        <div class="post-header">
            <img src="${post.avatar}" alt="${post.user}" class="post-avatar">
            <div>
                <span class="post-user">${post.user}</span>
                <span class="post-time">${post.time}</span>
            </div>
        </div>
        <div class="post-content">
            ${post.content}
        </div>
        <div class="post-footer">
            <button class="post-action">
                <i class="far fa-heart"></i>
                <span>${post.likes}</span>
            </button>
            <button class="post-action">
                <i class="far fa-comment"></i>
                <span>${post.comments}</span>
            </button>
            <button class="post-action">
                <i class="far fa-share-square"></i>
                <span>Share</span>
            </button>
        </div>
    `;
    
    feed.insertBefore(postElement, feed.firstChild);
}

async function loadFeed() {
    // Show loading spinner
    feedLoading.classList.remove('hidden');
    
    try {
        // Clear existing posts
        feed.innerHTML = '';
        
        // Query posts from Parse
        const Post = Parse.Object.extend('Post');
        const query = new Parse.Query(Post);
        query.include('author');
        query.descending('createdAt');
        query.limit(20);
        
        const results = await query.find();
        
        // Hide loading spinner
        feedLoading.classList.add('hidden');
        
        if (results.length === 0) {
            // Show message if no posts
            feed.innerHTML = `
                <div class="post">
                    <div class="post-content" style="text-align: center; padding: 30px;">
                        <i class="fas fa-feather-alt" style="font-size: 40px; color: #ccc; margin-bottom: 15px;"></i>
                        <p>No vibes yet. Be the first to post!</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Add posts to feed
        results.forEach(post => {
            const author = post.get('author');
            addPostToFeed({
                id: post.id,
                user: author.get('username'),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(author.get('username'))}&background=667eea`,
                content: post.get('content'),
                time: formatTime(post.createdAt),
                likes: post.get('likes') || 0,
                comments: post.get('comments') || 0
            });
        });
    } catch (error) {
        // Hide loading spinner
        feedLoading.classList.add('hidden');
        
        // Show error message
        feed.innerHTML = `
            <div class="post">
                <div class="post-content" style="text-align: center; padding: 30px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #ff6b6b; margin-bottom: 15px;"></i>
                    <p>Failed to load vibes. Please try again later.</p>
                </div>
            </div>
        `;
        console.error('Feed loading error:', error);
    }
}

function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
        return `${Math.floor(diff / 3600000)}h ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Check if user is already logged in
function checkCurrentUser() {
    const currentUser = Parse.User.current();
    
    if (currentUser) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loadFeed();
    } else {
        showLoginForm();
    }
}

// Initialize the app
checkCurrentUser();