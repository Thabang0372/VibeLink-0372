class ChatService {
    constructor(app) {
        this.app = app;
        this.activeChatRoom = null;
        this.messageHandlers = new Map();
    }

    async createChatRoom(roomData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeChatRoom = this.app.services.parse.getClass('VibeChatRoom');
        const chatRoom = new VibeChatRoom();
        
        const allMembers = [this.app.currentUser, ...(roomData.members || [])];
        
        chatRoom.set('name', roomData.name);
        chatRoom.set('members', allMembers);
        chatRoom.set('isGroup', roomData.isGroup !== false);
        chatRoom.set('mediaEnabled', roomData.mediaEnabled !== false);
        chatRoom.set('audioVibesEnabled', roomData.audioVibesEnabled !== false);
        chatRoom.set('admin', this.app.currentUser);

        await chatRoom.save();
        
        this.app.showSuccess('Chat room created! 💬');
        await this.loadChatRooms();
        
        return chatRoom;
    }

    async sendMessage(chatRoomId, messageText, attachments = []) {
        if (!this.app.currentUser || !messageText.trim()) return;

        try {
            const Message = this.app.services.parse.getClass('Message');
            const message = new Message();
            
            const encryptedContent = await this.app.services.encryption.encrypt(messageText);

            message.set('sender', this.app.currentUser);
            message.set('chatRoom', this.app.services.parse.createPointer('VibeChatRoom', chatRoomId));
            message.set('text', encryptedContent);
            message.set('attachments', attachments);
            message.set('messageType', attachments.length > 0 ? 'media' : 'text');
            message.set('paymentIncluded', false);
            message.set('readBy', [this.app.currentUser.id]);

            await message.save();
            
            await this.updateChatRoomLastMessage(chatRoomId, message);
            
            this.app.services.realtime.broadcastUpdate('message', {
                chatRoomId: chatRoomId,
                messageId: message.id,
                sender: this.app.currentUser.get('username'),
                preview: messageText.substring(0, 50)
            });

            this.app.showSuccess('Message sent! ✨');
            await this.loadChatMessages(chatRoomId);
            
        } catch (error) {
            this.app.showError('Failed to send message: ' + error.message);
            await this.queueOfflineAction('message', { chatRoomId, messageText, attachments });
        }
    }

    async receiveMessage(messageData) {
        try {
            const decryptedContent = await this.app.services.encryption.decrypt(messageData.text);
            
            this.displayMessageInChat({
                id: messageData.id,
                sender: messageData.sender,
                content: decryptedContent,
                timestamp: new Date(),
                type: 'received',
                attachments: messageData.attachments || []
            });

            await this.markMessageAsRead(messageData.id);
            
        } catch (error) {
            console.error('Failed to process received message:', error);
        }
    }

    async createSecureChat(receiverId, encryptionLevel = 'high') {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeSecureChat = this.app.services.parse.getClass('VibeSecureChat');
        
        const chatKey = await this.app.services.encryption.generateKey();
        const encryptedKey = await this.app.services.encryption.encrypt(
            await this.app.services.encryption.exportKey(chatKey)
        );

        const secureChat = new VibeSecureChat();
        secureChat.set('sender', this.app.currentUser);
        secureChat.set('receiver', this.app.services.parse.createPointer('_User', receiverId));
        secureChat.set('encryptedPayload', '');
        secureChat.set('encryptionLevel', encryptionLevel);
        secureChat.set('verificationStatus', true);
        secureChat.set('killSwitchEnabled', false);
        secureChat.set('chatKey', encryptedKey);
        
        return await secureChat.save();
    }

    async sendSecureMessage(chatId, message, expiresIn = 86400000) {
        const VibeSecureChat = this.app.services.parse.getClass('VibeSecureChat');
        const query = new Parse.Query(VibeSecureChat);
        const secureChat = await query.get(chatId);
        
        const encryptedKey = secureChat.get('chatKey');
        const chatKey = await this.app.services.encryption.importKey(
            await this.app.services.encryption.decrypt(encryptedKey)
        );

        const encryptedMessage = await this.app.services.encryption.encrypt(message, chatKey);
        
        secureChat.set('encryptedPayload', encryptedMessage);
        secureChat.set('expiresAt', new Date(Date.now() + expiresIn));
        await secureChat.save();

        this.app.services.realtime.broadcastUpdate('secure_message', {
            chatId: chatId,
            sender: this.app.currentUser.get('username'),
            timestamp: new Date()
        });

        return secureChat;
    }

    async createAudioRoom(roomData) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeAudioRoom = this.app.services.parse.getClass('VibeAudioRoom');
        const audioRoom = new VibeAudioRoom();
        
        audioRoom.set('name', roomData.name);
        audioRoom.set('host', this.app.currentUser);
        audioRoom.set('members', [this.app.currentUser]);
        audioRoom.set('moderators', [this.app.currentUser]);
        audioRoom.set('isPrivate', roomData.isPrivate || false);
        audioRoom.set('topic', roomData.topic || '');
        audioRoom.set('isRecording', false);
        audioRoom.set('startedAt', new Date());
        audioRoom.set('maxParticipants', roomData.maxParticipants || 50);
        
        return await audioRoom.save();
    }

    async joinAudioRoom(roomId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeAudioRoom = this.app.services.parse.getClass('VibeAudioRoom');
        const query = new Parse.Query(VibeAudioRoom);
        const audioRoom = await query.get(roomId);
        
        const currentMembers = audioRoom.get('members') || [];
        if (currentMembers.length >= audioRoom.get('maxParticipants')) {
            throw new Error('Audio room is full');
        }

        audioRoom.addUnique('members', this.app.currentUser);
        await audioRoom.save();

        this.app.services.realtime.broadcastUpdate('audio_room_join', {
            roomId: roomId,
            user: this.app.currentUser.get('username'),
            timestamp: new Date()
        });

        return audioRoom;
    }

    async loadChatRooms() {
        const VibeChatRoom = this.app.services.parse.getClass('VibeChatRoom');
        const query = new Parse.Query(VibeChatRoom);
        query.contains('members', this.app.currentUser);
        query.include('lastMessage');
        query.descending('updatedAt');

        try {
            const chatRooms = await query.find();
            this.displayChatRooms(chatRooms);
            return chatRooms;
        } catch (error) {
            console.error('Error loading chat rooms:', error);
            this.app.showError('Failed to load chat rooms');
            return [];
        }
    }

    async loadChatMessages(chatRoomId, limit = 50) {
        const Message = this.app.services.parse.getClass('Message');
        const query = new Parse.Query(Message);
        query.equalTo('chatRoom', this.app.services.parse.createPointer('VibeChatRoom', chatRoomId));
        query.include('sender');
        query.descending('createdAt');
        query.limit(limit);

        try {
            const messages = await query.find();
            
            for (const message of messages) {
                try {
                    const decryptedContent = await this.app.services.encryption.decrypt(message.get('text'));
                    message.set('decryptedContent', decryptedContent);
                } catch (error) {
                    message.set('decryptedContent', '[Encrypted message]');
                }
            }
            
            this.displayChatMessages(messages.reverse());
            await this.markAllMessagesAsRead(chatRoomId);
            
            return messages;
        } catch (error) {
            console.error('Error loading chat messages:', error);
            this.app.showError('Failed to load messages');
            return [];
        }
    }

    async updateChatRoomLastMessage(chatRoomId, message) {
        const VibeChatRoom = this.app.services.parse.getClass('VibeChatRoom');
        const query = new Parse.Query(VibeChatRoom);
        const chatRoom = await query.get(chatRoomId);
        chatRoom.set('lastMessage', message);
        await chatRoom.save();
    }

    async markMessageAsRead(messageId) {
        const Message = this.app.services.parse.getClass('Message');
        const query = new Parse.Query(Message);
        const message = await query.get(messageId);
        
        const readBy = message.get('readBy') || [];
        if (!readBy.includes(this.app.currentUser.id)) {
            readBy.push(this.app.currentUser.id);
            message.set('readBy', readBy);
            await message.save();
        }
    }

    async markAllMessagesAsRead(chatRoomId) {
        const Message = this.app.services.parse.getClass('Message');
        const query = new Parse.Query(Message);
        query.equalTo('chatRoom', this.app.services.parse.createPointer('VibeChatRoom', chatRoomId));
        query.notContainedIn('readBy', [this.app.currentUser.id]);
        
        try {
            const unreadMessages = await query.find();
            const updatePromises = unreadMessages.map(message => {
                const readBy = message.get('readBy') || [];
                readBy.push(this.app.currentUser.id);
                message.set('readBy', readBy);
                return message.save();
            });
            
            await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    displayChatRooms(chatRooms) {
        const chatRoomsContainer = document.getElementById('chat-rooms-list');
        if (!chatRoomsContainer) return;

        chatRoomsContainer.innerHTML = chatRooms.map(room => `
            <div class="chat-room-card" data-room-id="${room.id}" onclick="vibeApp.services.chat.openChatRoom('${room.id}')">
                <div class="chat-room-avatar">
                    ${room.get('isGroup') ? '👥' : '💬'}
                </div>
                <div class="chat-room-info">
                    <div class="chat-room-name">${room.get('name')}</div>
                    <div class="chat-room-last-message">
                        ${this.getLastMessagePreview(room)}
                    </div>
                </div>
                <div class="chat-room-meta">
                    <div class="chat-room-time">${this.formatTime(room.get('updatedAt'))}</div>
                    ${this.getUnreadCount(room) > 0 ? `
                        <div class="unread-badge">${this.getUnreadCount(room)}</div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    displayChatMessages(messages) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = messages.map(message => `
            <div class="message ${message.get('sender').id === this.app.currentUser.id ? 'message-sent' : 'message-received'}">
                <div class="message-sender">${message.get('sender').get('username')}</div>
                <div class="message-content">${message.get('decryptedContent')}</div>
                ${message.get('attachments') && message.get('attachments').length > 0 ? `
                    <div class="message-attachments">
                        ${message.get('attachments').map(attachment => `
                            <div class="message-attachment">
                                <img src="${attachment.url}" alt="Attachment" class="attachment-image">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="message-time">${this.formatTime(message.get('createdAt'))}</div>
                ${message.get('readBy') && message.get('readBy').length > 1 ? `
                    <div class="message-read">✓ Read</div>
                ` : ''}
            </div>
        `).join('');

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    displayMessageInChat(message) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type === 'sent' ? 'message-sent' : 'message-received'}`;
        messageElement.innerHTML = `
            <div class="message-sender">${message.sender}</div>
            <div class="message-content">${message.content}</div>
            ${message.attachments && message.attachments.length > 0 ? `
                <div class="message-attachments">
                    ${message.attachments.map(attachment => `
                        <div class="message-attachment">
                            <img src="${attachment.url}" alt="Attachment" class="attachment-image">
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    getLastMessagePreview(chatRoom) {
        const lastMessage = chatRoom.get('lastMessage');
        if (!lastMessage) return 'No messages yet';

        try {
            const decryptedContent = this.app.services.encryption.decryptSync(lastMessage.get('text'));
            return decryptedContent.substring(0, 50) + (decryptedContent.length > 50 ? '...' : '');
        } catch (error) {
            return 'Encrypted message';
        }
    }

    getUnreadCount(chatRoom) {
        // This would need to be calculated based on actual unread messages
        // For now, return a placeholder
        return 0;
    }

    formatTime(date) {
        const now = new Date();
        const messageDate = new Date(date);
        const diffMs = now - messageDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return messageDate.toLocaleDateString();
    }

    async openChatRoom(roomId) {
        this.activeChatRoom = roomId;
        await this.loadChatMessages(roomId);
        this.showChatRoom();
    }

    showChatRoom() {
        document.getElementById('chat-rooms-view').classList.remove('active');
        document.getElementById('chat-messages-view').classList.add('active');
    }

    showChatRooms() {
        document.getElementById('chat-messages-view').classList.remove('active');
        document.getElementById('chat-rooms-view').classList.add('active');
    }

    async deleteChatRoom(roomId) {
        if (!this.app.currentUser) throw new Error('User must be logged in');

        const VibeChatRoom = this.app.services.parse.getClass('VibeChatRoom');
        const query = new Parse.Query(VibeChatRoom);
        query.equalTo('admin', this.app.currentUser);
        
        const room = await query.get(roomId);
        if (!room) throw new Error('Room not found or not authorized');

        // First delete all messages in the room
        const Message = this.app.services.parse.getClass('Message');
        const messageQuery = new Parse.Query(Message);
        messageQuery.equalTo('chatRoom', room);
        
        const messages = await messageQuery.find();
        await Promise.all(messages.map(msg => msg.destroy()));

        // Then delete the room
        await room.destroy();
        
        this.app.showSuccess('Chat room deleted');
        await this.loadChatRooms();
        this.showChatRooms();
    }

    async addMemberToRoom(roomId, userId) {
        const VibeChatRoom = this.app.services.parse.getClass('VibeChatRoom');
        const query = new Parse.Query(VibeChatRoom);
        const room = await query.get(roomId);
        
        room.addUnique('members', this.app.services.parse.createPointer('_User', userId));
        await room.save();
        
        this.app.services.realtime.broadcastUpdate('room_member_added', {
            roomId: roomId,
            userId: userId,
            addedBy: this.app.currentUser.get('username')
        });

        this.app.showSuccess('Member added to room');
    }

    async removeMemberFromRoom(roomId, userId) {
        const VibeChatRoom = this.app.services.parse.getClass('VibeChatRoom');
        const query = new Parse.Query(VibeChatRoom);
        const room = await query.get(roomId);
        
        room.remove('members', this.app.services.parse.createPointer('_User', userId));
        await room.save();
        
        this.app.services.realtime.broadcastUpdate('room_member_removed', {
            roomId: roomId,
            userId: userId,
            removedBy: this.app.currentUser.get('username')
        });

        this.app.showSuccess('Member removed from room');
    }

    async searchMessages(query, roomId = null) {
        const Message = this.app.services.parse.getClass('Message');
        const searchQuery = new Parse.Query(Message);
        
        if (roomId) {
            searchQuery.equalTo('chatRoom', this.app.services.parse.createPointer('VibeChatRoom', roomId));
        } else {
            searchQuery.contains('chatRoom.members', this.app.currentUser);
        }
        
        searchQuery.include('sender');
        searchQuery.include('chatRoom');
        searchQuery.descending('createdAt');
        searchQuery.limit(100);

        try {
            const messages = await searchQuery.find();
            
            const results = [];
            for (const message of messages) {
                try {
                    const decryptedContent = await this.app.services.encryption.decrypt(message.get('text'));
                    if (decryptedContent.toLowerCase().includes(query.toLowerCase())) {
                        message.set('decryptedContent', decryptedContent);
                        results.push(message);
                    }
                } catch (error) {
                    // Skip encrypted messages that can't be decrypted in search
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error searching messages:', error);
            return [];
        }
    }

    async getChatRoomStats(roomId) {
        const Message = this.app.services.parse.getClass('Message');
        const query = new Parse.Query(Message);
        query.equalTo('chatRoom', this.app.services.parse.createPointer('VibeChatRoom', roomId));
        
        const messages = await query.find();
        
        const stats = {
            totalMessages: messages.length,
            activeMembers: new Set(),
            messageTypes: {},
            dailyAverage: this.calculateDailyAverage(messages),
            mostActiveTime: this.calculateMostActiveTime(messages)
        };

        messages.forEach(message => {
            stats.activeMembers.add(message.get('sender').id);
            
            const messageType = message.get('messageType') || 'text';
            stats.messageTypes[messageType] = (stats.messageTypes[messageType] || 0) + 1;
        });

        stats.uniqueMembers = stats.activeMembers.size;
        
        return stats;
    }

    calculateDailyAverage(messages) {
        if (messages.length === 0) return 0;
        
        const firstMessage = messages.reduce((earliest, current) => 
            earliest.get('createdAt') < current.get('createdAt') ? earliest : current
        );
        
        const daysSinceFirst = Math.max(1, (new Date() - firstMessage.get('createdAt')) / (1000 * 60 * 60 * 24));
        return Math.round(messages.length / daysSinceFirst);
    }

    calculateMostActiveTime(messages) {
        const hourCounts = new Array(24).fill(0);
        
        messages.forEach(message => {
            const hour = new Date(message.get('createdAt')).getHours();
            hourCounts[hour]++;
        });
        
        const maxCount = Math.max(...hourCounts);
        const mostActiveHour = hourCounts.indexOf(maxCount);
        
        return {
            hour: mostActiveHour,
            messageCount: maxCount
        };
    }

    // Real-time event handlers
    handleNewMessage(message) {
        if (message.get('sender').id !== this.app.currentUser.id) {
            this.app.showNotification(`New message from ${message.get('sender').get('username')}`);
            
            if (this.activeChatRoom === message.get('chatRoom').id) {
                this.receiveMessage({
                    id: message.id,
                    sender: message.get('sender').get('username'),
                    text: message.get('text'),
                    attachments: message.get('attachments') || []
                });
            } else {
                this.updateChatRoomBadge(message.get('chatRoom').id);
            }
        }
    }

    updateChatRoomBadge(roomId) {
        const roomElement = document.querySelector(`[data-room-id="${roomId}"]`);
        if (roomElement) {
            const badge = roomElement.querySelector('.unread-badge') || document.createElement('div');
            badge.className = 'unread-badge';
            badge.textContent = (parseInt(badge.textContent) || 0) + 1;
            
            if (!roomElement.querySelector('.unread-badge')) {
                roomElement.querySelector('.chat-room-meta').appendChild(badge);
            }
        }
    }

    async queueOfflineAction(actionType, data) {
        const actions = JSON.parse(localStorage.getItem('offlineChatActions') || '[]');
        const action = {
            id: 'chat_action_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: actionType,
            data: data,
            timestamp: Date.now(),
            userId: this.app.currentUser?.id
        };
        
        actions.push(action);
        localStorage.setItem('offlineChatActions', JSON.stringify(actions));
    }

    async syncOfflineChatActions() {
        const actions = JSON.parse(localStorage.getItem('offlineChatActions') || '[]');
        
        for (const action of actions) {
            try {
                await this.executeOfflineChatAction(action);
                await this.removeOfflineChatAction(action.id);
            } catch (error) {
                console.error('Failed to sync chat action:', action, error);
            }
        }
    }

    async executeOfflineChatAction(action) {
        switch (action.type) {
            case 'message':
                await this.sendMessage(action.data.chatRoomId, action.data.messageText, action.data.attachments);
                break;
            // Handle other chat action types
        }
    }

    async removeOfflineChatAction(actionId) {
        const actions = JSON.parse(localStorage.getItem('offlineChatActions') || '[]');
        const filteredActions = actions.filter(action => action.id !== actionId);
        localStorage.setItem('offlineChatActions', JSON.stringify(filteredActions));
    }
}

export default ChatService;