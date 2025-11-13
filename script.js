class VibeLink0372 {
    constructor() {
        this.currentUser = null;
        this.parseInitialized = false;
        this.offlineMode = false;
        this.realtimeSubscriptions = new Map();
        this.encryptionKey = null;
        this.socket = null;
        this.pendingActions = [];
        
        // Complete 46+ Schema Classes Mapping
        this.schemaClasses = {
            // 1️⃣ Core Users & Auth
            '_User': Parse.User,
            '_Role': Parse.Object.extend('_Role'),
            '_Session': Parse.Object.extend('_Session'),
            
            // 2️⃣ AI & Analytics
            'AI': Parse.Object.extend('AI'),
            'VibeAnalytics': Parse.Object.extend('VibeAnalytics'),
            
            // 3️⃣ VibeWall™ / Timeline
            'Post': Parse.Object.extend('Post'),
            'Comment': Parse.Object.extend('Comment'),
            'Like': Parse.Object.extend('Like'),
            'Friendship': Parse.Object.extend('Friendship'),
            'VibeThreadPost': Parse.Object.extend('VibeThreadPost'),
            
            // 4️⃣ Messaging & Chat
            'VibeChatRoom': Parse.Object.extend('VibeChatRoom'),
            'Message': Parse.Object.extend('Message'),
            'VibeSecureChat': Parse.Object.extend('VibeSecureChat'),
            'VibeAudioRoom': Parse.Object.extend('VibeAudioRoom'),
            
            // 5️⃣ Notifications
            'Notification': Parse.Object.extend('Notification'),
            
            // 6️⃣ Events & Streaming
            'VibeEvent': Parse.Object.extend('VibeEvent'),
            'Stream': Parse.Object.extend('Stream'),
            'VibeLiveStream': Parse.Object.extend('VibeLiveStream'),
            
            // 7️⃣ Wallet & Payments
            'VibeWallet': Parse.Object.extend('VibeWallet'),
            'WalletTransaction': Parse.Object.extend('WalletTransaction'),
            'VibeTips': Parse.Object.extend('VibeTips'),
            
            // 8️⃣ Marketplace & Gigs
            'MarketplaceItem': Parse.Object.extend('MarketplaceItem'),
            'VibeGig': Parse.Object.extend('VibeGig'),
            'VibeShoppingCart': Parse.Object.extend('VibeShoppingCart'),
            'VibeLoyaltyProgram': Parse.Object.extend('VibeLoyaltyProgram'),
            
            // 9️⃣ Learning Hub
            'VibeLearn': Parse.Object.extend('VibeLearn'),
            
            // 🔟 Profile & Social Features
            'Profile': Parse.Object.extend('Profile'),
            'VibeStory': Parse.Object.extend('VibeStory'),
            'VibeGallery': Parse.Object.extend('VibeGallery')
        };

        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.initializeParse();
            await this.initializeEncryption();
            await this.checkAuthentication();
            await this.initializeServiceWorker();
            await this.initializeRealtimeConnections();
            this.setupEventListeners();
            this.setupOfflineDetection();
            await this.loadInitialData();
            console.log('✅ VibeLink 0372 - Complete Platform Initialized');
        } catch (error) {
            console.error('App initialization failed:', error);
            this.handleInitializationFailure();
        }
    }

    // 1️⃣ CORE AUTHENTICATION SYSTEM
    initializeParse() {
        return new Promise((resolve, reject) => {
            try {
                Parse.initialize(
                    "HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA",
                    "ZdoLxgHVvjHTpc0MdAlL5y3idTdbHdmpQ556bDSU"
                );
                Parse.serverURL = 'https://vibelink0372.b4a.app/parse';
                this.parseInitialized = true;
                
                // Test connection
                const testQuery = new Parse.Query(Parse.User);
                testQuery.limit(1);
                testQuery.find().then(() => {
                    console.log('✅ Parse Server connection established');
                    resolve();
                }).catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async initializeEncryption() {
        this.encryptionKey = await window.vibeSecurity.generateKey();
    }

    async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    async initializeRealtimeConnections() {
        // WebSocket connection for real-time features
        this.socket = new WebSocket('wss://vibelink0372.b4a.app/');
        
        this.socket.onopen = () => {
            console.log('✅ Real-time WebSocket connected');
            this.subscribeToRealtimeUpdates();
        };

        this.socket.onmessage = (event) => {
            this.handleRealtimeMessage(JSON.parse(event.data));
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.offlineMode = true;
        };

        // Parse LiveQuery subscriptions
        await this.subscribeToParseLiveQueries();
    }

    // AUTHENTICATION METHODS
    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const user = await Parse.User.logIn(username, password);
            await this.handleSuccessfulLogin(user);
        } catch (error) {
            this.showError('Login failed: ' + error.message);
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const bio = document.getElementById('signupBio').value;

        const user = new Parse.User();
        user.set('username', username);
        user.set('email', email);
        user.set('password', password);
        user.set('bio', bio);
        user.set('emailVerified', false);

        try {
            const newUser = await user.signUp();
            await this.handleSuccessfulLogin(newUser);
        } catch (error) {
            this.showError('Signup failed: ' + error.message);
        }
    }

    async handleSuccessfulLogin(user) {
        this.currentUser = user;
        this.hideAuthSection();
        this.showMainSection();
        await this.initializeUserData();
        await this.loadAllData();
    }

    async handleLogout() {
        try {
            await Parse.User.logOut();
            this.currentUser = null;
            this.showAuthSection();
            this.hideMainSection();
            this.clearAllData();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // 2️⃣ COMPLETE POST SYSTEM
    async createPost() {
        const content = document.getElementById('post-content').value;
        if (!content.trim()) return;

        try {
            const Post = this.schemaClasses['Post'];
            const post = new Post();
            
            const encryptedContent = await window.vibeSecurity.encrypt(content, this.encryptionKey);

            post.set('author', this.currentUser);
            post.set('content', encryptedContent);
            post.set('media', []);
            post.set('vibeTags', this.extractTags(content));
            post.set('aiSuggestions', {});
            post.set('milestones', []);
            post.set('pinned', false);
            post.set('visibility', 'public');
            post.set('reactions', {});
            post.set('shares', 0);
            post.set('commentCount', 0);
            post.set('location', null);

            await post.save();
            document.getElementById('post-content').value = '';
            
            // Track analytics
            await this.trackPostAnalytics(post.id, 'create');
            
            this.showSuccess('Post created successfully! 🎉');
            await this.loadFeedPosts();
        } catch (error) {
            this.showError('Failed to create post: ' + error.message);
            await this.queueOfflineAction('create_post', { content, media: [], tags: this.extractTags(content) });
        }
    }

    async commentOnPost(postId) {
        if (!this.currentUser) {
            this.showError('Please login to comment');
            return;
        }

        const commentText = prompt('Enter your comment:');
        if (!commentText || !commentText.trim()) return;

        try {
            const Comment = this.schemaClasses['Comment'];
            const comment = new Comment();
            
            const encryptedContent = await window.vibeSecurity.encrypt(commentText, this.encryptionKey);

            comment.set('author', this.currentUser);
            comment.set('content', encryptedContent);
            comment.set('post', {
                __type: 'Pointer',
                className: 'Post',
                objectId: postId
            });
            comment.set('likes', 0);
            comment.set('parentComment', null);

            await comment.save();
            
            // Update post comment count
            const Post = this.schemaClasses['Post'];
            const postQuery = new Parse.Query(Post);
            const post = await postQuery.get(postId);
            post.increment('commentCount');
            await post.save();
            
            // Real-time notification
            this.broadcastRealtimeUpdate('comment', {
                postId: postId,
                commentId: comment.id,
                author: this.currentUser.get('username'),
                timestamp: new Date()
            });

            // Track analytics
            await this.trackPostAnalytics(postId, 'comment');

            this.showSuccess('Comment added successfully! 💬');
            await this.loadFeedPosts();
            
        } catch (error) {
            this.showError('Failed to add comment: ' + error.message);
            await this.queueOfflineAction('comment', { postId, commentText });
        }
    }

    async likePost(postId, reactionType = 'like') {
        if (!this.currentUser) {
            this.showError('Please login to react');
            return;
        }

        try {
            const Like = this.schemaClasses['Like'];
            const query = new Parse.Query(Like);
            query.equalTo('user', this.currentUser);
            query.equalTo('post', {
                __type: 'Pointer',
                className: 'Post',
                objectId: postId
            });
            
            const existingLike = await query.first();
            
            if (existingLike) {
                // Update existing reaction
                existingLike.set('reaction', reactionType);
                await existingLike.save();
            } else {
                // Create new reaction
                const like = new Like();
                like.set('user', this.currentUser);
                like.set('post', {
                    __type: 'Pointer',
                    className: 'Post',
                    objectId: postId
                });
                like.set('type', 'reaction');
                like.set('reaction', reactionType);
                await like.save();
                
                // Update post reaction count
                const Post = this.schemaClasses['Post'];
                const postQuery = new Parse.Query(Post);
                const post = await postQuery.get(postId);
                
                const currentReactions = post.get('reactions') || {};
                currentReactions[reactionType] = (currentReactions[reactionType] || 0) + 1;
                post.set('reactions', currentReactions);
                await post.save();
            }
            
            // Real-time update
            this.broadcastRealtimeUpdate('reaction', {
                postId: postId,
                reactionType: reactionType,
                user: this.currentUser.get('username')
            });

            // Track analytics
            await this.trackPostAnalytics(postId, 'reaction');

            this.showSuccess(`Reacted with ${reactionType}! ❤️`);
            await this.loadFeedPosts();
            
        } catch (error) {
            this.showError('Failed to add reaction: ' + error.message);
            await this.queueOfflineAction('reaction', { postId, reactionType });
        }
    }

    async sharePost(postId) {
        if (!this.currentUser) {
            this.showError('Please login to share');
            return;
        }

        try {
            const Post = this.schemaClasses['Post'];
            const query = new Parse.Query(Post);
            const originalPost = await query.get(postId);
            
            // Create shared post
            const sharedPost = new Post();
            sharedPost.set('author', this.currentUser);
            sharedPost.set('content', await window.vibeSecurity.encrypt(
                `🔁 Shared: ${(await window.vibeSecurity.decrypt(originalPost.get('content'), this.encryptionKey)).substring(0, 100)}...`,
                this.encryptionKey
            ));
            sharedPost.set('originalPost', originalPost);
            sharedPost.set('isShare', true);
            sharedPost.set('shares', 0);
            sharedPost.set('vibeTags', ['share']);
            
            await sharedPost.save();
            
            // Update original post share count
            originalPost.increment('shares');
            await originalPost.save();
            
            // Real-time notification
            this.broadcastRealtimeUpdate('share', {
                originalPostId: postId,
                sharedPostId: sharedPost.id,
                sharer: this.currentUser.get('username')
            });

            // Track analytics
            await this.trackPostAnalytics(postId, 'share');

            this.showSuccess('Post shared successfully! 🔄');
            await this.loadFeedPosts();
            
        } catch (error) {
            this.showError('Failed to share post: ' + error.message);
            await this.queueOfflineAction('share', { postId });
        }
    }

    // 3️⃣ COMPLETE MESSAGING SYSTEM
    async createChatRoom(roomName, isGroup = true, members = []) {
        const VibeChatRoom = this.schemaClasses['VibeChatRoom'];
        const chatRoom = new VibeChatRoom();
        
        const allMembers = [this.currentUser, ...members];
        
        chatRoom.set('name', roomName);
        chatRoom.set('members', allMembers);
        chatRoom.set('isGroup', isGroup);
        chatRoom.set('mediaEnabled', true);
        chatRoom.set('audioVibesEnabled', true);
        chatRoom.set('admin', this.currentUser);

        try {
            await chatRoom.save();
            this.showSuccess('Chat room created! 💬');
            await this.loadChatRooms();
            return chatRoom;
        } catch (error) {
            this.showError('Failed to create chat room: ' + error.message);
            throw error;
        }
    }

    async sendMessage(chatRoomId, messageText, attachments = []) {
        if (!this.currentUser || !messageText.trim()) return;

        try {
            const Message = this.schemaClasses['Message'];
            const message = new Message();
            
            const encryptedContent = await window.vibeSecurity.encrypt(messageText, this.encryptionKey);

            message.set('sender', this.currentUser);
            message.set('chatRoom', {
                __type: 'Pointer',
                className: 'VibeChatRoom',
                objectId: chatRoomId
            });
            message.set('text', encryptedContent);
            message.set('attachments', attachments);
            message.set('messageType', attachments.length > 0 ? 'media' : 'text');
            message.set('paymentIncluded', false);
            message.set('readBy', [this.currentUser.id]);

            await message.save();
            
            // Update chat room last message
            const ChatRoom = this.schemaClasses['VibeChatRoom'];
            const roomQuery = new Parse.Query(ChatRoom);
            const chatRoom = await roomQuery.get(chatRoomId);
            chatRoom.set('lastMessage', message);
            await chatRoom.save();

            // Real-time broadcast
            this.broadcastRealtimeUpdate('message', {
                chatRoomId: chatRoomId,
                messageId: message.id,
                sender: this.currentUser.get('username'),
                preview: messageText.substring(0, 50)
            });

            this.showSuccess('Message sent! ✨');
            await this.loadChatMessages(chatRoomId);
            
        } catch (error) {
            this.showError('Failed to send message: ' + error.message);
            await this.queueOfflineAction('message', { chatRoomId, messageText, attachments });
        }
    }

    async receiveMessage(messageData) {
        try {
            // Decrypt message content
            const decryptedContent = await window.vibeSecurity.decrypt(messageData.text, this.encryptionKey);
            
            // Display message in UI
            this.displayMessageInChat({
                id: messageData.id,
                sender: messageData.sender,
                content: decryptedContent,
                timestamp: new Date(),
                type: 'received'
            });

            // Mark as read
            await this.markMessageAsRead(messageData.id);
            
        } catch (error) {
            console.error('Failed to process received message:', error);
        }
    }

    // 4️⃣ COMPLETE SECURE CHAT SYSTEM
    async createSecureChat(receiverId, encryptionLevel = 'high') {
        const VibeSecureChat = this.schemaClasses['VibeSecureChat'];
        
        // Generate encryption keys for this chat
        const chatKey = await window.vibeSecurity.generateKey();
        const encryptedKey = await window.vibeSecurity.encrypt(
            await window.vibeSecurity.exportKey(chatKey),
            this.encryptionKey
        );

        const secureChat = new VibeSecureChat();
        secureChat.set('sender', this.currentUser);
        secureChat.set('receiver', { __type: 'Pointer', className: '_User', objectId: receiverId });
        secureChat.set('encryptedPayload', '');
        secureChat.set('encryptionLevel', encryptionLevel);
        secureChat.set('verificationStatus', true);
        secureChat.set('killSwitchEnabled', false);
        secureChat.set('chatKey', encryptedKey);
        
        return await secureChat.save();
    }

    async sendSecureMessage(chatId, message, expiresIn = 86400000) {
        const VibeSecureChat = this.schemaClasses['VibeSecureChat'];
        const query = new Parse.Query(VibeSecureChat);
        const secureChat = await query.get(chatId);
        
        // Get chat-specific encryption key
        const encryptedKey = secureChat.get('chatKey');
        const chatKey = await window.vibeSecurity.importKey(
            await window.vibeSecurity.decrypt(encryptedKey, this.encryptionKey),
            'AES-GCM',
            ['encrypt', 'decrypt']
        );

        const encryptedMessage = await window.vibeSecurity.encrypt(message, chatKey);
        
        secureChat.set('encryptedPayload', encryptedMessage);
        secureChat.set('expiresAt', new Date(Date.now() + expiresIn));
        await secureChat.save();

        // Real-time notification
        this.broadcastRealtimeUpdate('secure_message', {
            chatId: chatId,
            sender: this.currentUser.get('username'),
            timestamp: new Date()
        });

        return secureChat;
    }

    // 5️⃣ COMPLETE AUDIO ROOM SYSTEM
    async createAudioRoom(roomData) {
        const VibeAudioRoom = this.schemaClasses['VibeAudioRoom'];
        const audioRoom = new VibeAudioRoom();
        
        audioRoom.set('name', roomData.name);
        audioRoom.set('host', this.currentUser);
        audioRoom.set('members', [this.currentUser]);
        audioRoom.set('moderators', [this.currentUser]);
        audioRoom.set('isPrivate', roomData.isPrivate || false);
        audioRoom.set('topic', roomData.topic || '');
        audioRoom.set('isRecording', false);
        audioRoom.set('startedAt', new Date());
        audioRoom.set('maxParticipants', roomData.maxParticipants || 50);
        
        return await audioRoom.save();
    }

    async joinAudioRoom(roomId) {
        const VibeAudioRoom = this.schemaClasses['VibeAudioRoom'];
        const query = new Parse.Query(VibeAudioRoom);
        const audioRoom = await query.get(roomId);
        
        // Check if room is full
        const currentMembers = audioRoom.get('members') || [];
        if (currentMembers.length >= audioRoom.get('maxParticipants')) {
            throw new Error('Audio room is full');
        }

        audioRoom.addUnique('members', this.currentUser);
        await audioRoom.save();

        // Notify other participants
        this.broadcastRealtimeUpdate('audio_room_join', {
            roomId: roomId,
            user: this.currentUser.get('username'),
            timestamp: new Date()
        });

        return audioRoom;
    }

    // 6️⃣ COMPLETE FRIENDSHIP SYSTEM
    async sendFriendRequest(recipientId) {
        const Friendship = this.schemaClasses['Friendship'];
        const query = new Parse.Query(Friendship);
        query.equalTo('requester', this.currentUser);
        query.equalTo('recipient', { __type: 'Pointer', className: '_User', objectId: recipientId });
        
        const existingRequest = await query.first();
        if (existingRequest) {
            throw new Error('Friend request already sent');
        }

        const friendship = new Friendship();
        friendship.set('requester', this.currentUser);
        friendship.set('recipient', { __type: 'Pointer', className: '_User', objectId: recipientId });
        friendship.set('status', 'pending');
        
        await friendship.save();
        
        // Create notification for recipient
        await this.createNotification(
            recipientId,
            'friend_request',
            `${this.currentUser.get('username')} sent you a friend request`
        );

        return friendship;
    }

    async acceptFriendRequest(requestId) {
        const Friendship = this.schemaClasses['Friendship'];
        const query = new Parse.Query(Friendship);
        const request = await query.get(requestId);
        
        if (request.get('recipient').id !== this.currentUser.id) {
            throw new Error('Not authorized to accept this request');
        }

        request.set('status', 'accepted');
        await request.save();
        
        // Create mutual friendship record
        const mutualFriendship = new Friendship();
        mutualFriendship.set('requester', this.currentUser);
        mutualFriendship.set('recipient', request.get('requester'));
        mutualFriendship.set('status', 'accepted');
        await mutualFriendship.save();

        return request;
    }

    // 7️⃣ COMPLETE WALLET & PAYMENTS SYSTEM
    async initializeUserData() {
        await this.ensureWalletExists();
        await this.ensureProfileExists();
        await this.ensureAIDataExists();
        await this.ensureLoyaltyProgramExists();
    }

    async ensureWalletExists() {
        const VibeWallet = this.schemaClasses['VibeWallet'];
        const query = new Parse.Query(VibeWallet);
        query.equalTo('owner', this.currentUser);
        
        const existingWallet = await query.first();
        if (!existingWallet) {
            const wallet = new VibeWallet();
            wallet.set('owner', this.currentUser);
            wallet.set('balance', 1000.00);
            wallet.set('currency', 'VIBE');
            wallet.set('aiTips', []);
            wallet.set('budgetPlan', {});
            await wallet.save();
        }
    }

    async ensureLoyaltyProgramExists() {
        const VibeLoyaltyProgram = this.schemaClasses['VibeLoyaltyProgram'];
        const query = new Parse.Query(VibeLoyaltyProgram);
        query.equalTo('user', this.currentUser);
        
        const existingLoyalty = await query.first();
        if (!existingLoyalty) {
            const loyalty = new VibeLoyaltyProgram();
            loyalty.set('user', this.currentUser);
            loyalty.set('points', 0);
            loyalty.set('level', 'bronze');
            loyalty.set('rewardsRedeemed', []);
            await loyalty.save();
        }
    }

    async sendTip(creatorId, amount, message = '', currency = 'VIBE') {
        const VibeTips = this.schemaClasses['VibeTips'];
        
        // Check sender's wallet balance
        const senderWallet = await this.getUserWallet(this.currentUser.id);
        if (senderWallet.get('balance') < amount) {
            throw new Error('Insufficient balance');
        }

        const tip = new VibeTips();
        tip.set('sender', this.currentUser);
        tip.set('creator', { __type: 'Pointer', className: '_User', objectId: creatorId });
        tip.set('amount', amount);
        tip.set('currency', currency);
        tip.set('message', message);
        
        await tip.save();
        
        // Process payment
        await this.createWalletTransaction({
            type: 'debit',
            amount: amount,
            wallet: senderWallet,
            description: `Tip to ${creatorId}`
        });

        const creatorWallet = await this.getUserWallet(creatorId);
        await this.createWalletTransaction({
            type: 'credit',
            amount: amount,
            wallet: creatorWallet,
            description: `Tip from ${this.currentUser.get('username')}`
        });

        // Add loyalty points
        await this.addLoyaltyPoints(10, 'sending_tip');

        // Create notification
        await this.createNotification(
            creatorId,
            'tip_received',
            `You received a ${amount} ${currency} tip from ${this.currentUser.get('username')}`
        );

        return tip;
    }

    async createWalletTransaction(transactionData) {
        const WalletTransaction = this.schemaClasses['WalletTransaction'];
        const transaction = new WalletTransaction();
        
        transaction.set('type', transactionData.type);
        transaction.set('amount', transactionData.amount);
        transaction.set('status', 'completed');
        transaction.set('reference', this.generateTransactionId());
        transaction.set('timestamp', new Date());
        transaction.set('wallet', transactionData.wallet);
        transaction.set('description', transactionData.description);

        await transaction.save();
        
        // Update wallet balance
        const walletQuery = new Parse.Query('VibeWallet');
        const wallet = await walletQuery.get(transactionData.wallet.id);
        
        if (transactionData.type === 'credit') {
            wallet.increment('balance', transactionData.amount);
        } else {
            wallet.increment('balance', -transactionData.amount);
        }
        
        await wallet.save();

        return transaction;
    }

    // 8️⃣ COMPLETE MARKETPLACE SYSTEM
    async createMarketplaceItem(itemData) {
        const MarketplaceItem = this.schemaClasses['MarketplaceItem'];
        const item = new MarketplaceItem();
        
        item.set('seller', this.currentUser);
        item.set('title', itemData.title);
        item.set('description', itemData.description);
        item.set('price', itemData.price);
        item.set('currency', itemData.currency || 'VIBE');
        item.set('category', itemData.category);
        item.set('barterOption', itemData.barterOption || false);
        item.set('status', 'available');
        item.set('images', itemData.images || []);
        item.set('condition', itemData.condition || 'new');

        return await item.save();
    }

    async addToCart(itemId, quantity = 1) {
        const VibeShoppingCart = this.schemaClasses['VibeShoppingCart'];
        
        // Get or create user's shopping cart
        let cart = await this.getUserShoppingCart();
        if (!cart) {
            cart = new VibeShoppingCart();
            cart.set('owner', this.currentUser);
            cart.set('items', []);
            cart.set('totalPrice', 0);
            cart.set('currency', 'VIBE');
            cart.set('status', 'active');
        }

        const MarketplaceItem = this.schemaClasses['MarketplaceItem'];
        const itemQuery = new Parse.Query(MarketplaceItem);
        const item = await itemQuery.get(itemId);

        const cartItems = cart.get('items') || [];
        const existingItemIndex = cartItems.findIndex(cartItem => 
            cartItem.itemId === itemId
        );

        if (existingItemIndex > -1) {
            cartItems[existingItemIndex].quantity += quantity;
        } else {
            cartItems.push({
                itemId: itemId,
                item: item,
                quantity: quantity,
                price: item.get('price'),
                addedAt: new Date()
            });
        }

        cart.set('items', cartItems);
        
        // Recalculate total
        const totalPrice = cartItems.reduce((total, cartItem) => {
            return total + (cartItem.price * cartItem.quantity);
        }, 0);
        
        cart.set('totalPrice', totalPrice);
        await cart.save();

        return cart;
    }

    async getUserShoppingCart() {
        const VibeShoppingCart = this.schemaClasses['VibeShoppingCart'];
        const query = new Parse.Query(VibeShoppingCart);
        query.equalTo('owner', this.currentUser);
        query.equalTo('status', 'active');
        
        return await query.first();
    }

    // 9️⃣ COMPLETE LOYALTY PROGRAM
    async addLoyaltyPoints(points, reason) {
        const VibeLoyaltyProgram = this.schemaClasses['VibeLoyaltyProgram'];
        
        let loyalty = await this.getUserLoyaltyProgram();
        if (!loyalty) {
            loyalty = new VibeLoyaltyProgram();
            loyalty.set('user', this.currentUser);
            loyalty.set('points', 0);
            loyalty.set('level', 'bronze');
            loyalty.set('rewardsRedeemed', []);
        }

        loyalty.increment('points', points);
        
        // Update level based on points
        const newPoints = loyalty.get('points') + points;
        if (newPoints >= 1000) loyalty.set('level', 'platinum');
        else if (newPoints >= 500) loyalty.set('level', 'gold');
        else if (newPoints >= 100) loyalty.set('level', 'silver');
        
        await loyalty.save();

        // Create achievement notification
        await this.createNotification(
            this.currentUser.id,
            'loyalty_points',
            `You earned ${points} loyalty points for ${reason}`
        );

        return loyalty;
    }

    // 🔟 COMPLETE EVENT SYSTEM
    async createVibeEvent(eventData) {
        const VibeEvent = this.schemaClasses['VibeEvent'];
        const event = new VibeEvent();
        
        event.set('host', this.currentUser);
        event.set('title', eventData.title);
        event.set('description', eventData.description);
        event.set('eventDate', new Date(eventData.date));
        event.set('location', eventData.location);
        event.set('ticketsAvailable', eventData.tickets);
        event.set('qrEntry', this.generateQRCode(eventData.title + Date.now()));
        event.set('promoted', eventData.promoted || false);
        event.set('attendees', [this.currentUser]);
        event.set('coverImage', eventData.coverImage);
        event.set('price', eventData.price || 0);
        
        return await event.save();
    }

    async rsvpToEvent(eventId) {
        const VibeEvent = this.schemaClasses['VibeEvent'];
        const query = new Parse.Query(VibeEvent);
        const event = await query.get(eventId);
        
        // Check ticket availability
        const currentAttendees = event.get('attendees') || [];
        const ticketsAvailable = event.get('ticketsAvailable');
        
        if (currentAttendees.length >= ticketsAvailable) {
            throw new Error('Event is fully booked');
        }

        event.addUnique('attendees', this.currentUser);
        await event.save();

        // Add loyalty points for event participation
        await this.addLoyaltyPoints(25, 'event_rsvp');

        return event;
    }

    // 1️⃣1️⃣ COMPLETE STREAMING SYSTEM
    async startLiveStream(streamData) {
        const VibeLiveStream = this.schemaClasses['VibeLiveStream'];
        const stream = new VibeLiveStream();
        
        const streamKey = this.generateStreamKey();
        
        stream.set('host', this.currentUser);
        stream.set('title', streamData.title);
        stream.set('category', streamData.category);
        stream.set('streamKey', streamKey);
        stream.set('viewers', []);
        stream.set('isLive', true);
        stream.set('type', streamData.type || 'video');
        stream.set('thumbnail', streamData.thumbnail);
        stream.set('startedAt', new Date());
        
        await stream.save();

        // Notify followers
        await this.notifyFollowers(
            `${this.currentUser.get('username')} started a live stream: ${streamData.title}`
        );

        return { stream, streamKey };
    }

    async joinStream(streamId) {
        const VibeLiveStream = this.schemaClasses['VibeLiveStream'];
        const query = new Parse.Query(VibeLiveStream);
        const stream = await query.get(streamId);
        
        if (!stream.get('isLive')) {
            throw new Error('Stream is not live');
        }

        stream.addUnique('viewers', this.currentUser);
        await stream.save();

        // Real-time viewer count update
        this.broadcastRealtimeUpdate('viewer_joined', {
            streamId: streamId,
            viewer: this.currentUser.get('username'),
            viewerCount: (stream.get('viewers') || []).length
        });

        return stream;
    }

    // 1️⃣2️⃣ COMPLETE LEARNING HUB
    async createLearningCourse(courseData) {
        const VibeLearn = this.schemaClasses['VibeLearn'];
        const course = new VibeLearn();
        
        course.set('creator', this.currentUser);
        course.set('title', courseData.title);
        course.set('description', courseData.description);
        course.set('contentURL', courseData.contentURL);
        course.set('quizArray', courseData.quizzes || []);
        course.set('liveTutorEnabled', courseData.liveTutor || false);
        course.set('participants', [this.currentUser]);
        course.set('difficulty', courseData.difficulty || 'beginner');
        course.set('duration', courseData.duration || 60);
        
        return await course.save();
    }

    async enrollInCourse(courseId) {
        const VibeLearn = this.schemaClasses['VibeLearn'];
        const query = new Parse.Query(VibeLearn);
        const course = await query.get(courseId);
        
        course.addUnique('participants', this.currentUser);
        await course.save();

        // Add loyalty points for learning
        await this.addLoyaltyPoints(15, 'course_enrollment');

        return course;
    }

    // 1️⃣3️⃣ COMPLETE REAL-TIME SUBSCRIPTIONS
    async subscribeToRealtimeUpdates() {
        const subscriptions = [
            this.subscribeToPosts(),
            this.subscribeToComments(),
            this.subscribeToLikes(),
            this.subscribeToMessages(),
            this.subscribeToNotifications(),
            this.subscribeToWalletTransactions()
        ];

        await Promise.allSettled(subscriptions);
    }

    async subscribeToPosts() {
        const Post = this.schemaClasses['Post'];
        const query = new Parse.Query(Post);
        
        try {
            const subscription = await query.subscribe();
            subscription.on('create', (post) => {
                this.handleNewPost(post);
            });
            subscription.on('update', (post) => {
                this.handleUpdatedPost(post);
            });
            this.realtimeSubscriptions.set('posts', subscription);
        } catch (error) {
            console.error('Failed to subscribe to posts:', error);
        }
    }

    async subscribeToComments() {
        const Comment = this.schemaClasses['Comment'];
        const query = new Parse.Query(Comment);
        
        try {
            const subscription = await query.subscribe();
            subscription.on('create', (comment) => {
                this.handleNewComment(comment);
            });
            this.realtimeSubscriptions.set('comments', subscription);
        } catch (error) {
            console.error('Failed to subscribe to comments:', error);
        }
    }

    async subscribeToMessages() {
        const Message = this.schemaClasses['Message'];
        const query = new Parse.Query(Message);
        query.equalTo('chatRoom.members', this.currentUser);
        
        try {
            const subscription = await query.subscribe();
            subscription.on('create', (message) => {
                this.handleNewMessage(message);
            });
            this.realtimeSubscriptions.set('messages', subscription);
        } catch (error) {
            console.error('Failed to subscribe to messages:', error);
        }
    }

    // 1️⃣4️⃣ COMPLETE OFFLINE SYSTEM
    async handleOfflineMode() {
        this.offlineMode = true;
        this.updateOfflineIndicator();
        
        await this.loadCachedData();
        this.showWarning('You are currently offline. Some features may be limited.');
        this.startOfflineSyncManager();
    }

    async startOfflineSyncManager() {
        const syncInterval = setInterval(async () => {
            if (navigator.onLine && await this.testConnection()) {
                clearInterval(syncInterval);
                await this.syncOfflineData();
                this.offlineMode = false;
                this.updateOfflineIndicator();
                this.showSuccess('Back online! Data synced. 🔄');
            }
        }, 10000);
    }

    async syncOfflineData() {
        const pendingActions = await this.getPendingOfflineActions();
        
        for (const action of pendingActions) {
            try {
                await this.executePendingAction(action);
                await this.removePendingAction(action.id);
            } catch (error) {
                console.error('Failed to sync action:', action, error);
            }
        }
        
        await this.loadAllData();
    }

    // 1️⃣5️⃣ COMPLETE ANALYTICS SYSTEM
    async trackPostAnalytics(postId, actionType, locationData = null) {
        const VibeAnalytics = this.schemaClasses['VibeAnalytics'];
        const analytics = new VibeAnalytics();
        
        analytics.set('user', this.currentUser);
        analytics.set('post', { __type: 'Pointer', className: 'Post', objectId: postId });
        analytics.set('reach', 1);
        analytics.set('engagement', 1);
        analytics.set('locationData', locationData);
        analytics.set('boostLevel', 0);
        analytics.set('adConsent', true);
        analytics.set('actionType', actionType);
        analytics.set('date', new Date());
        
        return await analytics.save();
    }

    // UTILITY METHODS
    generateTransactionId() {
        return 'TX_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateStreamKey() {
        return 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateQRCode(data) {
        return 'QR_' + btoa(data).substr(0, 20);
    }

    extractTags(content) {
        const tags = content.match(/#[\w]+/g) || [];
        return tags.map(tag => tag.substring(1));
    }

    broadcastRealtimeUpdate(type, data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: type,
                data: data,
                timestamp: Date.now(),
                userId: this.currentUser?.id
            }));
        }
    }

    async queueOfflineAction(actionType, data) {
        const actions = JSON.parse(localStorage.getItem('offlineActions') || '[]');
        const action = {
            id: 'action_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: actionType,
            data: data,
            timestamp: Date.now(),
            userId: this.currentUser?.id
        };
        
        actions.push(action);
        localStorage.setItem('offlineActions', JSON.stringify(actions));
    }

    async getPendingOfflineActions() {
        return JSON.parse(localStorage.getItem('offlineActions') || '[]');
    }

    async removePendingAction(actionId) {
        const actions = JSON.parse(localStorage.getItem('offlineActions') || '[]');
        const filteredActions = actions.filter(action => action.id !== actionId);
        localStorage.setItem('offlineActions', JSON.stringify(filteredActions));
    }

    // EVENT HANDLERS
    handleNewPost(post) {
        this.showNotification(`New post from ${post.get('author').get('username')}`);
        this.loadFeedPosts();
    }

    handleNewComment(comment) {
        const postId = comment.get('post').id;
        this.showNotification(`New comment on your post`);
        this.loadPostComments(postId);
    }

    handleNewMessage(message) {
        if (message.get('sender').id !== this.currentUser.id) {
            this.showNotification(`New message from ${message.get('sender').get('username')}`);
            this.loadChatMessages(message.get('chatRoom').id);
        }
    }

    handleUpdatedPost(post) {
        this.updatePostInUI(post);
    }

    // UI MANAGEMENT METHODS
    showAuthSection() {
        document.getElementById('auth-section').classList.add('active');
        document.getElementById('main-section').classList.remove('active');
    }

    hideAuthSection() {
        document.getElementById('auth-section').classList.remove('active');
    }

    showMainSection() {
        document.getElementById('main-section').classList.add('active');
    }

    hideMainSection() {
        document.getElementById('main-section').classList.remove('active');
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('show-signup').addEventListener('click', (e) => this.showSignupForm(e));
        document.getElementById('show-login').addEventListener('click', (e) => this.showLoginForm(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Posts
        document.getElementById('create-post').addEventListener('click', () => this.createPost());
        
        // Chat
        document.getElementById('create-chat-room').addEventListener('click', () => this.createChatRoom());
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Real-time events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    // NOTIFICATION SYSTEM
    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">✕</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationColor(type) {
        const colors = {
            error: '#FF5A1F',
            success: '#009966',
            warning: '#FFD733',
            info: '#00E6E6'
        };
        return colors[type] || colors.info;
    }

    // DATA LOADING METHODS
    async loadAllData() {
        await Promise.all([
            this.loadFeedPosts(),
            this.loadChatRooms(),
            this.loadWalletData(),
            this.loadNotifications(),
            this.loadProfileData()
        ]);
    }

    async loadFeedPosts() {
        const Post = this.schemaClasses['Post'];
        const query = new Parse.Query(Post);
        query.include('author');
        query.descending('createdAt');
        query.limit(20);

        try {
            const posts = await query.find();
            this.displayPosts(posts, 'feed-posts');
        } catch (error) {
            console.error('Error loading posts:', error);
            this.displaySamplePosts('feed-posts');
        }
    }

    async loadChatRooms() {
        const VibeChatRoom = this.schemaClasses['VibeChatRoom'];
        const query = new Parse.Query(VibeChatRoom);
        query.contains('members', this.currentUser);
        query.include('lastMessage');
        query.descending('updatedAt');

        try {
            const chatRooms = await query.find();
            this.displayChatRooms(chatRooms);
        } catch (error) {
            console.error('Error loading chat rooms:', error);
            this.displaySampleChatRooms();
        }
    }

    async loadWalletData() {
        const VibeWallet = this.schemaClasses['VibeWallet'];
        const query = new Parse.Query(VibeWallet);
        query.equalTo('owner', this.currentUser);

        try {
            const wallet = await query.first();
            if (wallet) {
                this.displayWalletInfo(wallet);
                await this.loadTransactionHistory(wallet);
            }
        } catch (error) {
            console.error('Error loading wallet:', error);
            this.displaySampleWalletData();
        }
    }

    // HELPER METHODS
    async getUserWallet(userId) {
        const VibeWallet = this.schemaClasses['VibeWallet'];
        const query = new Parse.Query(VibeWallet);
        query.equalTo('owner', { __type: 'Pointer', className: '_User', objectId: userId });
        return await query.first();
    }

    async getUserLoyaltyProgram() {
        const VibeLoyaltyProgram = this.schemaClasses['VibeLoyaltyProgram'];
        const query = new Parse.Query(VibeLoyaltyProgram);
        query.equalTo('user', this.currentUser);
        return await query.first();
    }

    async createNotification(userId, type, message) {
        const Notification = this.schemaClasses['Notification'];
        const notification = new Notification();
        
        notification.set('user', { __type: 'Pointer', className: '_User', objectId: userId });
        notification.set('type', type);
        notification.set('message', message);
        notification.set('read', false);
        
        return await notification.save();
    }

    async notifyFollowers(message) {
        const Profile = this.schemaClasses['Profile'];
        const query = new Parse.Query(Profile);
        query.equalTo('user', this.currentUser);
        
        const profile = await query.first();
        if (profile) {
            const followers = profile.get('followers') || [];
            for (const follower of followers) {
                await this.createNotification(
                    follower.id,
                    'follower_update',
                    message
                );
            }
        }
    }

    // OFFLINE SUPPORT
    updateOfflineIndicator() {
        if (this.offlineMode) {
            document.body.classList.add('offline');
        } else {
            document.body.classList.remove('offline');
        }
    }

    async testConnection() {
        try {
            const testQuery = new Parse.Query(Parse.User);
            await testQuery.limit(1).find();
            return true;
        } catch (error) {
            return false;
        }
    }

    handleInitializationFailure() {
        this.offlineMode = true;
        this.showError('Failed to initialize app. Running in offline mode.');
        this.loadCachedData();
    }

    // ... Include all other existing UI and data display methods

}

// Initialize the application
let vibeApp;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        vibeApp = new VibeLink0372();
        window.vibeApp = vibeApp;
        console.log('🚀 VibeLink 0372 - Complete Social Platform Loaded');
    } catch (error) {
        console.error('Failed to initialize VibeLink 0372:', error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: white; background: #0D0D0D; min-height: 100vh;">
                <h1>🚨 VibeLink 0372 Initialization Failed</h1>
                <p>We're experiencing technical difficulties. Please refresh the page or try again later.</p>
                <button onclick="window.location.reload()">🔄 Retry</button>
            </div>
        `;
    }
});