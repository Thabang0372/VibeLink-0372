class RealtimeManager {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.subscriptions = new Map();
    }

    async initialize() {
        await this.initializeWebSocket();
        await this.initializeParseSubscriptions();
    }

    async initializeWebSocket() {
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
            this.app.offlineMode = true;
        };
    }

    async initializeParseSubscriptions() {
        const subscriptions = [
            this.subscribeToPosts(),
            this.subscribeToComments(),
            this.subscribeToMessages(),
            this.subscribeToNotifications()
        ];
        await Promise.allSettled(subscriptions);
    }

    async subscribeToPosts() {
        try {
            const Post = this.app.services.parse.getClass('Post');
            const query = new Parse.Query(Post);
            const subscription = await query.subscribe();
            
            subscription.on('create', (post) => {
                this.app.services.posts.handleNewPost(post);
            });
            
            subscription.on('update', (post) => {
                this.app.services.posts.handleUpdatedPost(post);
            });
            
            this.subscriptions.set('posts', subscription);
        } catch (error) {
            console.error('Failed to subscribe to posts:', error);
        }
    }

    async subscribeToComments() {
        try {
            const Comment = this.app.services.parse.getClass('Comment');
            const query = new Parse.Query(Comment);
            const subscription = await query.subscribe();
            
            subscription.on('create', (comment) => {
                this.app.services.posts.handleNewComment(comment);
            });
            
            this.subscriptions.set('comments', subscription);
        } catch (error) {
            console.error('Failed to subscribe to comments:', error);
        }
    }

    async subscribeToMessages() {
        try {
            const Message = this.app.services.parse.getClass('Message');
            const query = new Parse.Query(Message);
            query.equalTo('chatRoom.members', this.app.currentUser);
            
            const subscription = await query.subscribe();
            subscription.on('create', (message) => {
                this.app.services.chat.handleNewMessage(message);
            });
            
            this.subscriptions.set('messages', subscription);
        } catch (error) {
            console.error('Failed to subscribe to messages:', error);
        }
    }

    async subscribeToNotifications() {
        try {
            const Notification = this.app.services.parse.getClass('Notification');
            const query = new Parse.Query(Notification);
            query.equalTo('user', this.app.currentUser);
            
            const subscription = await query.subscribe();
            subscription.on('create', (notification) => {
                this.app.services.notifications.handleNewNotification(notification);
            });
            
            this.subscriptions.set('notifications', subscription);
        } catch (error) {
            console.error('Failed to subscribe to notifications:', error);
        }
    }

    broadcastUpdate(type, data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: type,
                data: data,
                timestamp: Date.now(),
                userId: this.app.currentUser?.id
            }));
        }
    }

    handleRealtimeMessage(messageData) {
        switch (messageData.type) {
            case 'new_message':
                this.app.services.chat.receiveMessage(messageData.data);
                break;
            case 'new_notification':
                this.app.services.notifications.receiveNotification(messageData.data);
                break;
            case 'post_update':
                this.app.services.posts.handlePostUpdate(messageData.data);
                break;
        }
    }

    async reconnect() {
        if (this.socket) {
            this.socket.close();
        }
        await this.initializeWebSocket();
    }
}

export default RealtimeManager;