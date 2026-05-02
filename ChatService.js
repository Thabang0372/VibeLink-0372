class ChatService {
    constructor(app) {
        this.app = app;
        this.activeRoom = null;
        this.subscription = null;
        this.typingTimers = new Map();
    }

    async loadChatRooms() {
        const q = new Parse.Query('VibeChatRoom').containedIn('members', [this.app.currentUser]);
        const rooms = await q.find();
        const container = document.getElementById('chat-rooms-list');
        if (!container) return;
        if (rooms.length === 0) {
            container.innerHTML = '<p>No chat rooms yet. Create one!</p>';
            return;
        }
        container.innerHTML = rooms.map(r => 
            `<div class="chat-room" data-id="${r.id}">
                <strong>${r.get('name')}</strong>
                <small>${r.get('isGroup') ? 'Group' : 'Direct'}</small>
            </div>`
        ).join('');
        document.querySelectorAll('.chat-room').forEach(el => {
            el.onclick = () => this.openRoom(el.dataset.id);
        });
    }

    async openRoom(roomId) {
        this.activeRoom = roomId;
        const win = document.getElementById('chat-window');
        if (win) win.classList.remove('hidden');
        
        const titleEl = document.getElementById('chat-title');
        if (titleEl) {
            try {
                const room = await new Parse.Query('VibeChatRoom').get(roomId);
                titleEl.innerText = room.get('name');
            } catch (e) {
                titleEl.innerText = 'Chat';
            }
        }
        await this.loadMessages(roomId);
        if (this.subscription) this.subscription.unsubscribe();
        const query = new Parse.Query('Message')
            .equalTo('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: roomId });
        try {
            this.subscription = await query.subscribe();
            this.subscription.on('create', (msg) => {
                if (msg.get('sender').id !== this.app.currentUser.id) {
                    this.appendMessage(msg);
                    this.markAsRead(msg);
                }
            });
            this.subscription.on('update', (msg) => {
                this.updateMessageStatus(msg);
            });
        } catch (e) {
            console.warn('LiveQuery subscription failed', e);
        }
    }

    async loadMessages(roomId) {
        const q = new Parse.Query('Message')
            .equalTo('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: roomId })
            .include('sender')
            .ascending('createdAt');
        const msgs = await q.find();
        const container = document.getElementById('chat-messages') || document.getElementById('chat-messages-overlay');
        if (!container) return;
        container.innerHTML = msgs.map(m => {
            const sender = m.get('sender');
            const username = sender ? sender.get('username') : 'Unknown';
            const isSent = sender && sender.id === this.app.currentUser.id;
            const readBy = m.get('readBy') || [];
            const readIndicator = isSent && readBy.length > 0 ? ' ✓✓' : isSent ? ' ✓' : '';
            return `<div class="message ${isSent ? 'sent' : 'received'}" data-id="${m.id}">
                <strong>${username}</strong>: ${m.get('text')}
                <span class="message-time">${formatTime(m.createdAt)}${readIndicator}</span>
            </div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    }

    appendMessage(msg) {
        const container = document.getElementById('chat-messages') || document.getElementById('chat-messages-overlay');
        if (!container) return;
        const div = document.createElement('div');
        const sender = msg.get('sender');
        const username = sender ? sender.get('username') : 'Unknown';
        div.className = `message ${sender && sender.id === this.app.currentUser.id ? 'sent' : 'received'}`;
        div.innerHTML = `<strong>${username}</strong>: ${msg.get('text')}
                         <span class="message-time">${formatTime(msg.createdAt)}</span>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    async markAsRead(msg) {
        if (msg.get('sender').id === this.app.currentUser.id) return;
        const readBy = msg.get('readBy') || [];
        if (!readBy.includes(this.app.currentUser.id)) {
            readBy.push(this.app.currentUser.id);
            msg.set('readBy', readBy);
            await msg.save();
        }
    }

    updateMessageStatus(msg) {
        const el = document.querySelector(`.message[data-id="${msg.id}"]`);
        if (el) {
            const readBy = msg.get('readBy') || [];
            const timeSpan = el.querySelector('.message-time');
            if (timeSpan) timeSpan.textContent = `${formatTime(msg.createdAt)} ${readBy.length > 0 ? '✓✓' : '✓'}`;
        }
    }

    async sendMessage(text) {
        if (!this.activeRoom || !text.trim()) return;
        const Message = Parse.Object.extend('Message');
        const m = new Message();
        m.set('text', text);
        m.set('sender', this.app.currentUser);
        m.set('chatRoom', { __type: 'Pointer', className: 'VibeChatRoom', objectId: this.activeRoom });
        m.set('readBy', []);
        await m.save();
        ['message-input', 'chat-message-input'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
    }

    async createRoom(name, members = []) {
        const Room = Parse.Object.extend('VibeChatRoom');
        const r = new Room();
        r.set('name', name);
        r.set('members', [this.app.currentUser, ...members]);
        r.set('isGroup', members.length > 0);
        await r.save();
        showNotification('Chat room created');
        await this.loadChatRooms();
    }

    async createAudioRoom(name) {
        const Room = Parse.Object.extend('VibeAudioRoom');
        const r = new Room();
        r.set('name', name);
        r.set('host', this.app.currentUser);
        r.set('members', [this.app.currentUser]);
        r.set('startedAt', new Date());
        await r.save();
        showNotification('Audio room created');
    }

    async createSecureChat(receiverId) {
        const Secure = Parse.Object.extend('VibeSecureChat');
        const s = new Secure();
        s.set('sender', this.app.currentUser);
        s.set('receiver', { __type: 'Pointer', className: '_User', objectId: receiverId });
        s.set('encryptionLevel', 'high');
        await s.save();
        showNotification('Secure chat initiated');
    }
}

window.ChatService = ChatService;