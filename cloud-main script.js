// ==================== VibeLink 0372® Cloud Code ====================

// ----- ORIGINAL FUNCTIONS (unchanged) -----
Parse.Cloud.beforeSave('Post', (request) => {
    const post = request.object;
    if (!post.existed()) {
        post.set('engagementScore', 10);
        post.set('viewCount', 0);
        post.set('likeCount', 0);
        post.set('commentCount', 0);
        post.set('shareCount', 0);
    }
});

Parse.Cloud.afterSave('Like', async (request) => {
    const like = request.object;
    const post = like.get('post');
    if (post) {
        await post.fetch({ useMasterKey: true });
        post.increment('likeCount');
        updateEngagementScore(post);
        await post.save(null, { useMasterKey: true });
    }
});

Parse.Cloud.afterSave('Comment', async (request) => {
    const comment = request.object;
    const post = comment.get('post');
    if (post) {
        await post.fetch({ useMasterKey: true });
        post.increment('commentCount');
        updateEngagementScore(post);
        await post.save(null, { useMasterKey: true });
    }
});

function updateEngagementScore(post) {
    const likes = post.get('likeCount') || 0;
    const comments = post.get('commentCount') || 0;
    const shares = post.get('shareCount') || 0;
    const views = post.get('viewCount') || 0;
    const engagement = (likes * 3) + (comments * 5) + (shares * 10) + (views * 0.1);
    const hoursSinceCreation = (Date.now() - post.createdAt) / 3600000;
    const recencyBoost = 1 / (1 + hoursSinceCreation / 24);
    post.set('engagementScore', engagement * recencyBoost);
}

Parse.Cloud.define('getPersonalizedFeed', async (request) => {
    const user = request.user;
    const limit = request.params.limit || 20;
    
    const interactions = await new Parse.Query('VibeAnalytics')
        .equalTo('user', user)
        .descending('createdAt')
        .limit(50)
        .find({ useMasterKey: true });
    
    const tagScores = {};
    interactions.forEach(i => {
        const tags = i.get('tags') || [];
        tags.forEach(tag => { tagScores[tag] = (tagScores[tag] || 0) + 1; });
    });
    
    const posts = await new Parse.Query('Post')
        .greaterThan('engagementScore', 5)
        .descending('engagementScore')
        .limit(limit * 2)
        .include('author')
        .find({ useMasterKey: true });
    
    posts.forEach(post => {
        let boost = 1.0;
        const postTags = post.get('tags') || [];
        postTags.forEach(tag => { boost += (tagScores[tag] || 0) * 0.2; });
        post.personalizedScore = post.get('engagementScore') * boost;
    });
    
    return posts.sort((a, b) => b.personalizedScore - a.personalizedScore).slice(0, limit);
});

Parse.Cloud.beforeSave('VibeKeyBundle', async (request) => {
    const bundle = request.object;
    if (!bundle.existed()) {
        const query = new Parse.Query('VibeKeyBundle');
        query.equalTo('user', bundle.get('user'));
        const existing = await query.first({ useMasterKey: true });
        if (existing) throw new Error('User already has a key bundle');
    }
});

// ============================================================
// ADDITIONS – Complete missing functionality
// ============================================================

// ==================== AUTH FUNCTIONS ====================

Parse.Cloud.define('sendVerificationEmail', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    if (!user) throw new Error('User not found');
    
    const token = user.get('emailToken') || Math.random().toString(36).substr(2, 20);
    user.set('emailToken', token);
    await user.save(null, { useMasterKey: true });
    
    const link = `https://thabang0372.github.io/VibeLink-0372/verify?token=${token}`;
    
    // Real email via SendGrid (replace with your API key)
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey('YOUR_SENDGRID_API_KEY'); // ← REPLACE
    const msg = {
        to: user.get('email'),
        from: 'noreply@vibelink0372.com',
        subject: 'Verify your VibeLink account',
        text: `Click here to verify: ${link}`,
        html: `<a href="${link}">Verify your account</a>`
    };
    await sgMail.send(msg);
    return { success: true };
});

Parse.Cloud.define('verifyEmail', async (request) => {
    const { token } = request.params;
    const query = new Parse.Query(Parse.User);
    query.equalTo('emailToken', token);
    const user = await query.first({ useMasterKey: true });
    if (!user) throw new Error('Invalid verification token');
    
    user.set('emailVerified', true);
    user.unset('emailToken');
    await user.save(null, { useMasterKey: true });
    return { success: true };
});

// ==================== WALLET FUNCTIONS ====================

Parse.Cloud.define('ensureWallet', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    
    const Wallet = Parse.Object.extend('VibeWallet');
    const query = new Parse.Query(Wallet);
    query.equalTo('owner', user);
    let wallet = await query.first({ useMasterKey: true });
    
    if (!wallet) {
        wallet = new Wallet();
        wallet.set('owner', user);
        wallet.set('balance', 1000);
        wallet.set('currency', 'VIBE');
        wallet.set('aiTips', []);
        wallet.set('budgetPlan', {});
        await wallet.save(null, { useMasterKey: true });
    }
    
    return wallet.toJSON();
});

Parse.Cloud.define('ensureLoyalty', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    
    const Loyalty = Parse.Object.extend('VibeLoyaltyProgram');
    const query = new Parse.Query(Loyalty);
    query.equalTo('user', user);
    let loyalty = await query.first({ useMasterKey: true });
    
    if (!loyalty) {
        loyalty = new Loyalty();
        loyalty.set('user', user);
        loyalty.set('points', 0);
        loyalty.set('level', 'Bronze');
        loyalty.set('rewardsRedeemed', []);
        await loyalty.save(null, { useMasterKey: true });
    }
    
    return loyalty.toJSON();
});

Parse.Cloud.define('getBalance', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    
    const Wallet = Parse.Object.extend('VibeWallet');
    const query = new Parse.Query(Wallet);
    query.equalTo('owner', user);
    const wallet = await query.first({ useMasterKey: true });
    
    return { balance: wallet ? wallet.get('balance') : 0 };
});

Parse.Cloud.define('getLoyalty', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    
    const Loyalty = Parse.Object.extend('VibeLoyaltyProgram');
    const query = new Parse.Query(Loyalty);
    query.equalTo('user', user);
    const loyalty = await query.first({ useMasterKey: true });
    
    return loyalty ? { points: loyalty.get('points'), level: loyalty.get('level') } : { points: 0, level: 'Bronze' };
});

Parse.Cloud.define('addFunds', async (request) => {
    const { userId, amount } = request.params;
    if (amount <= 0) throw new Error('Amount must be positive');
    
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Wallet = Parse.Object.extend('VibeWallet');
    const query = new Parse.Query(Wallet);
    query.equalTo('owner', user);
    const wallet = await query.first({ useMasterKey: true });
    if (!wallet) throw new Error('Wallet not found');
    
    wallet.increment('balance', amount);
    await wallet.save(null, { useMasterKey: true });
    
    const Transaction = Parse.Object.extend('WalletTransaction');
    const tx = new Transaction();
    tx.set('wallet', wallet);
    tx.set('type', 'credit');
    tx.set('amount', amount);
    tx.set('description', 'Added funds');
    tx.set('status', 'completed');
    tx.set('reference', 'TX_' + Date.now());
    tx.set('timestamp', new Date());
    await tx.save(null, { useMasterKey: true });
    
    return { newBalance: wallet.get('balance') };
});

Parse.Cloud.define('sendMoney', async (request) => {
    const { userId, toUserId, amount } = request.params;
    if (amount <= 0) throw new Error('Amount must be positive');
    
    const fromUser = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const toUser = await new Parse.Query(Parse.User).get(toUserId, { useMasterKey: true });
    
    const Wallet = Parse.Object.extend('VibeWallet');
    const fromQuery = new Parse.Query(Wallet);
    fromQuery.equalTo('owner', fromUser);
    const fromWallet = await fromQuery.first({ useMasterKey: true });
    if (!fromWallet) throw new Error('Sender wallet not found');
    if (fromWallet.get('balance') < amount) throw new Error('Insufficient balance');
    
    const toQuery = new Parse.Query(Wallet);
    toQuery.equalTo('owner', toUser);
    let toWallet = await toQuery.first({ useMasterKey: true });
    if (!toWallet) {
        toWallet = new Wallet();
        toWallet.set('owner', toUser);
        toWallet.set('balance', 0);
        toWallet.set('currency', 'VIBE');
        await toWallet.save(null, { useMasterKey: true });
    }
    
    fromWallet.increment('balance', -amount);
    toWallet.increment('balance', amount);
    await Parse.Object.saveAll([fromWallet, toWallet], { useMasterKey: true });
    
    const Transaction = Parse.Object.extend('WalletTransaction');
    const tx1 = new Transaction();
    tx1.set('wallet', fromWallet);
    tx1.set('type', 'debit');
    tx1.set('amount', amount);
    tx1.set('description', `Sent to ${toUser.get('displayName') || toUser.get('username')}`);
    tx1.set('status', 'completed');
    tx1.set('reference', 'TX_' + Date.now());
    tx1.set('timestamp', new Date());
    await tx1.save(null, { useMasterKey: true });
    
    const tx2 = new Transaction();
    tx2.set('wallet', toWallet);
    tx2.set('type', 'credit');
    tx2.set('amount', amount);
    tx2.set('description', `Received from ${fromUser.get('displayName') || fromUser.get('username')}`);
    tx2.set('status', 'completed');
    tx2.set('reference', 'TX_' + Date.now() + 'r');
    tx2.set('timestamp', new Date());
    await tx2.save(null, { useMasterKey: true });
    
    return { newBalance: fromWallet.get('balance') };
});

Parse.Cloud.define('sendTip', async (request) => {
    const { userId, creatorId, amount, message } = request.params;
    if (amount <= 0) throw new Error('Amount must be positive');
    
    const sender = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const creator = await new Parse.Query(Parse.User).get(creatorId, { useMasterKey: true });
    
    const Wallet = Parse.Object.extend('VibeWallet');
    const fromQuery = new Parse.Query(Wallet);
    fromQuery.equalTo('owner', sender);
    const fromWallet = await fromQuery.first({ useMasterKey: true });
    if (!fromWallet) throw new Error('Sender wallet not found');
    if (fromWallet.get('balance') < amount) throw new Error('Insufficient balance');
    
    const toQuery = new Parse.Query(Wallet);
    toQuery.equalTo('owner', creator);
    let toWallet = await toQuery.first({ useMasterKey: true });
    if (!toWallet) {
        toWallet = new Wallet();
        toWallet.set('owner', creator);
        toWallet.set('balance', 0);
        toWallet.set('currency', 'VIBE');
        await toWallet.save(null, { useMasterKey: true });
    }
    
    fromWallet.increment('balance', -amount);
    toWallet.increment('balance', amount);
    await Parse.Object.saveAll([fromWallet, toWallet], { useMasterKey: true });
    
    const Tips = Parse.Object.extend('VibeTips');
    const tip = new Tips();
    tip.set('sender', sender);
    tip.set('creator', creator);
    tip.set('amount', amount);
    tip.set('currency', 'VIBE');
    tip.set('message', message || '');
    await tip.save(null, { useMasterKey: true });
    
    await addLoyaltyPointsInternal(userId, 10, 'sending_tip');
    return { success: true };
});

Parse.Cloud.define('addLoyaltyPoints', async (request) => {
    const { userId, points } = request.params;
    return await addLoyaltyPointsInternal(userId, points, 'manual');
});

async function addLoyaltyPointsInternal(userId, points, reason) {
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Loyalty = Parse.Object.extend('VibeLoyaltyProgram');
    const query = new Parse.Query(Loyalty);
    query.equalTo('user', user);
    let loyalty = await query.first({ useMasterKey: true });
    if (!loyalty) {
        loyalty = new Loyalty();
        loyalty.set('user', user);
        loyalty.set('points', 0);
        loyalty.set('level', 'Bronze');
        loyalty.set('rewardsRedeemed', []);
        await loyalty.save(null, { useMasterKey: true });
    }
    loyalty.increment('points', points);
    const total = loyalty.get('points');
    if (total >= 1000) loyalty.set('level', 'Platinum');
    else if (total >= 500) loyalty.set('level', 'Gold');
    else if (total >= 100) loyalty.set('level', 'Silver');
    await loyalty.save(null, { useMasterKey: true });
    return loyalty.toJSON();
}

Parse.Cloud.define('getTransactions', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Wallet = Parse.Object.extend('VibeWallet');
    const query = new Parse.Query(Wallet);
    query.equalTo('owner', user);
    const wallet = await query.first({ useMasterKey: true });
    if (!wallet) return [];
    const Transaction = Parse.Object.extend('WalletTransaction');
    const txQuery = new Parse.Query(Transaction);
    txQuery.equalTo('wallet', wallet);
    txQuery.descending('createdAt');
    txQuery.limit(20);
    const transactions = await txQuery.find({ useMasterKey: true });
    return transactions.map(t => ({
        id: t.id,
        type: t.get('type'),
        amount: t.get('amount'),
        description: t.get('description'),
        status: t.get('status'),
        createdAt: t.createdAt
    }));
});

// ==================== POST FUNCTIONS ====================

Parse.Cloud.define('createPost', async (request) => {
    const { userId, content, communityId } = request.params;
    if (!content || content.trim().length === 0) throw new Error('Content cannot be empty');
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Post = Parse.Object.extend('Post');
    const post = new Post();
    post.set('content', content);
    post.set('searchContent', content);
    post.set('author', user);
    post.set('likesCount', 0);
    post.set('commentCount', 0);
    post.set('shareCount', 0);
    if (communityId) {
        const Community = Parse.Object.extend('VibeCommunity');
        const community = await new Parse.Query(Community).get(communityId, { useMasterKey: true });
        post.set('community', community);
        community.increment('postCount');
        await community.save(null, { useMasterKey: true });
    }
    await post.save(null, { useMasterKey: true });
    return post.toJSON();
});

Parse.Cloud.define('toggleLike', async (request) => {
    const { userId, postId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Post = Parse.Object.extend('Post');
    const post = await new Parse.Query(Post).get(postId, { useMasterKey: true });
    const Like = Parse.Object.extend('Like');
    const query = new Parse.Query(Like);
    query.equalTo('user', user);
    query.equalTo('post', post);
    const existing = await query.first({ useMasterKey: true });
    if (existing) {
        await existing.destroy({ useMasterKey: true });
        post.increment('likesCount', -1);
        await post.save(null, { useMasterKey: true });
        return { liked: false };
    } else {
        const like = new Like();
        like.set('user', user);
        like.set('post', post);
        like.set('type', 'like');
        like.set('reaction', '❤️');
        await like.save(null, { useMasterKey: true });
        post.increment('likesCount', 1);
        await post.save(null, { useMasterKey: true });
        return { liked: true };
    }
});

Parse.Cloud.define('addComment', async (request) => {
    const { userId, postId, text } = request.params;
    if (!text || text.trim().length === 0) throw new Error('Comment cannot be empty');
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Post = Parse.Object.extend('Post');
    const post = await new Parse.Query(Post).get(postId, { useMasterKey: true });
    const Comment = Parse.Object.extend('Comment');
    const comment = new Comment();
    comment.set('content', text);
    comment.set('author', user);
    comment.set('post', post);
    await comment.save(null, { useMasterKey: true });
    post.increment('commentCount');
    await post.save(null, { useMasterKey: true });
    return comment.toJSON();
});

Parse.Cloud.define('deletePost', async (request) => {
    const { userId, postId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Post = Parse.Object.extend('Post');
    const post = await new Parse.Query(Post).get(postId, { useMasterKey: true });
    if (post.get('author').id !== userId) {
        throw new Error('You do not have permission to delete this post');
    }
    await post.destroy({ useMasterKey: true });
    return { success: true };
});

Parse.Cloud.define('sharePost', async (request) => {
    const { userId, postId } = request.params;
    const Post = Parse.Object.extend('Post');
    const post = await new Parse.Query(Post).get(postId, { useMasterKey: true });
    post.increment('shareCount');
    await post.save(null, { useMasterKey: true });
    return { shares: post.get('shareCount') };
});

// ==================== CHAT FUNCTIONS ====================

Parse.Cloud.define('sendMessage', async (request) => {
    const { userId, roomId, text } = request.params;
    if (!text || text.trim().length === 0) throw new Error('Message cannot be empty');
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Room = Parse.Object.extend('VibeChatRoom');
    const room = await new Parse.Query(Room).get(roomId, { useMasterKey: true });
    const Message = Parse.Object.extend('Message');
    const msg = new Message();
    msg.set('text', text);
    msg.set('sender', user);
    msg.set('chatRoom', room);
    msg.set('readBy', [userId]);
    msg.set('encrypted', false);
    await msg.save(null, { useMasterKey: true });
    room.set('lastMessage', msg);
    await room.save(null, { useMasterKey: true });
    return msg.toJSON();
});

Parse.Cloud.define('markMessageRead', async (request) => {
    const { userId, messageId } = request.params;
    const Message = Parse.Object.extend('Message');
    const msg = await new Parse.Query(Message).get(messageId, { useMasterKey: true });
    const readBy = msg.get('readBy') || [];
    if (!readBy.includes(userId)) {
        readBy.push(userId);
        msg.set('readBy', readBy);
        await msg.save(null, { useMasterKey: true });
    }
    return { success: true };
});

Parse.Cloud.define('createChatRoom', async (request) => {
    const { userId, name, memberIds } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const members = [user];
    for (const id of (memberIds || [])) {
        const m = await new Parse.Query(Parse.User).get(id, { useMasterKey: true });
        members.push(m);
    }
    const Room = Parse.Object.extend('VibeChatRoom');
    const room = new Room();
    room.set('name', name);
    room.set('members', members);
    room.set('isGroup', memberIds && memberIds.length > 0);
    room.set('admin', user);
    room.set('mediaEnabled', true);
    room.set('audioVibesEnabled', true);
    await room.save(null, { useMasterKey: true });
    return room.toJSON();
});

Parse.Cloud.define('createAudioRoom', async (request) => {
    const { userId, name } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Room = Parse.Object.extend('VibeAudioRoom');
    const room = new Room();
    room.set('name', name);
    room.set('host', user);
    room.set('members', [user]);
    room.set('isPrivate', false);
    room.set('startedAt', new Date());
    room.set('maxParticipants', 50);
    await room.save(null, { useMasterKey: true });
    return room.toJSON();
});

Parse.Cloud.define('createSecureChat', async (request) => {
    const { userId, receiverId } = request.params;
    const sender = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const receiver = await new Parse.Query(Parse.User).get(receiverId, { useMasterKey: true });
    const Secure = Parse.Object.extend('VibeSecureChat');
    const chat = new Secure();
    chat.set('sender', sender);
    chat.set('receiver', receiver);
    chat.set('encryptionLevel', 'high');
    chat.set('verificationStatus', false);
    chat.set('killSwitchEnabled', false);
    await chat.save(null, { useMasterKey: true });
    return chat.toJSON();
});

// ==================== COMMUNITY FUNCTIONS ====================

Parse.Cloud.define('createCommunity', async (request) => {
    const { userId, name, description, privacy } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Community = Parse.Object.extend('VibeCommunity');
    const community = new Community();
    community.set('name', name);
    community.set('description', description || '');
    community.set('category', 'General');
    community.set('privacy', privacy || 'public');
    community.set('owner', user);
    community.set('admins', [user]);
    community.set('moderators', []);
    community.set('members', [user]);
    community.set('memberCount', 1);
    community.set('postCount', 0);
    community.set('isActive', true);
    community.set('tags', []);
    community.set('language', 'en');
    await community.save(null, { useMasterKey: true });
    return community.toJSON();
});

Parse.Cloud.define('getCommunities', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Community = Parse.Object.extend('VibeCommunity');
    const query = new Parse.Query(Community);
    query.include('owner');
    query.equalTo('isActive', true);
    query.descending('memberCount');
    query.limit(20);
    const communities = await query.find({ useMasterKey: true });
    return communities.map(c => c.toJSON());
});

Parse.Cloud.define('getCommunity', async (request) => {
    const { communityId } = request.params;
    const Community = Parse.Object.extend('VibeCommunity');
    const community = await new Parse.Query(Community).include('owner').get(communityId, { useMasterKey: true });
    return community.toJSON();
});

Parse.Cloud.define('getCommunityPosts', async (request) => {
    const { communityId } = request.params;
    const Community = Parse.Object.extend('VibeCommunity');
    const community = await new Parse.Query(Community).get(communityId, { useMasterKey: true });
    const Post = Parse.Object.extend('Post');
    const query = new Parse.Query(Post);
    query.equalTo('community', community);
    query.include('author');
    query.descending('createdAt');
    query.limit(20);
    const posts = await query.find({ useMasterKey: true });
    return posts.map(p => ({
        id: p.id,
        content: p.get('content'),
        author: {
            id: p.get('author').id,
            username: p.get('author').get('username'),
            displayName: p.get('author').get('displayName')
        },
        createdAt: p.createdAt
    }));
});

Parse.Cloud.define('joinCommunity', async (request) => {
    const { userId, communityId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Community = Parse.Object.extend('VibeCommunity');
    const community = await new Parse.Query(Community).get(communityId, { useMasterKey: true });
    const members = community.get('members') || [];
    if (!members.some(m => m.id === userId)) {
        members.push(user);
        community.set('members', members);
        community.set('memberCount', members.length);
        await community.save(null, { useMasterKey: true });
    }
    return community.toJSON();
});

// ==================== EVENT FUNCTIONS ====================

Parse.Cloud.define('createEvent', async (request) => {
    const { userId, title, description, date, location, tickets, price } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Event = Parse.Object.extend('VibeEvent');
    const event = new Event();
    event.set('host', user);
    event.set('title', title);
    event.set('description', description || '');
    event.set('eventDate', new Date(date));
    event.set('location', location || 'Online');
    event.set('ticketsAvailable', tickets || 100);
    event.set('price', price || 0);
    event.set('promoted', false);
    event.set('attendees', []);
    await event.save(null, { useMasterKey: true });
    return event.toJSON();
});

Parse.Cloud.define('getEvents', async (request) => {
    const Event = Parse.Object.extend('VibeEvent');
    const query = new Parse.Query(Event);
    query.greaterThan('eventDate', new Date());
    query.include('host');
    query.ascending('eventDate');
    query.limit(20);
    const events = await query.find({ useMasterKey: true });
    return events.map(e => e.toJSON());
});

Parse.Cloud.define('rsvpEvent', async (request) => {
    const { userId, eventId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Event = Parse.Object.extend('VibeEvent');
    const event = await new Parse.Query(Event).get(eventId, { useMasterKey: true });
    const attendees = event.get('attendees') || [];
    if (!attendees.some(a => a.id === userId)) {
        if (attendees.length >= event.get('ticketsAvailable')) {
            throw new Error('Event is full');
        }
        attendees.push(user);
        event.set('attendees', attendees);
        await event.save(null, { useMasterKey: true });
    }
    return event.toJSON();
});

Parse.Cloud.define('startStream', async (request) => {
    const { userId, title } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Stream = Parse.Object.extend('VibeLiveStream');
    const stream = new Stream();
    stream.set('host', user);
    stream.set('title', title);
    stream.set('isLive', true);
    stream.set('viewers', []);
    stream.set('startedAt', new Date());
    await stream.save(null, { useMasterKey: true });
    return stream.toJSON();
});

Parse.Cloud.define('getLiveStreams', async (request) => {
    const Stream = Parse.Object.extend('VibeLiveStream');
    const query = new Parse.Query(Stream);
    query.equalTo('isLive', true);
    query.include('host');
    query.descending('startedAt');
    const streams = await query.find({ useMasterKey: true });
    return streams.map(s => s.toJSON());
});

// ==================== MARKETPLACE FUNCTIONS ====================

Parse.Cloud.define('createItem', async (request) => {
    const { userId, title, description, price } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Item = Parse.Object.extend('MarketplaceItem');
    const item = new Item();
    item.set('seller', user);
    item.set('title', title);
    item.set('description', description || '');
    item.set('price', price);
    item.set('currency', 'VIBE');
    item.set('status', 'available');
    item.set('condition', 'new');
    item.set('barterOption', false);
    await item.save(null, { useMasterKey: true });
    return item.toJSON();
});

Parse.Cloud.define('getItems', async (request) => {
    const Item = Parse.Object.extend('MarketplaceItem');
    const query = new Parse.Query(Item);
    query.equalTo('status', 'available');
    query.include('seller');
    query.descending('createdAt');
    query.limit(20);
    const items = await query.find({ useMasterKey: true });
    return items.map(i => i.toJSON());
});

Parse.Cloud.define('addToCart', async (request) => {
    const { userId, itemId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Item = Parse.Object.extend('MarketplaceItem');
    const item = await new Parse.Query(Item).get(itemId, { useMasterKey: true });
    const Cart = Parse.Object.extend('VibeShoppingCart');
    let cart = await new Parse.Query(Cart)
        .equalTo('owner', user)
        .equalTo('status', 'active')
        .first({ useMasterKey: true });
    if (!cart) {
        cart = new Cart();
        cart.set('owner', user);
        cart.set('items', []);
        cart.set('totalPrice', 0);
        cart.set('currency', 'VIBE');
        cart.set('status', 'active');
    }
    const items = cart.get('items') || [];
    const existing = items.find(i => i.itemId === itemId);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        items.push({ itemId, item: item.toJSON(), quantity: 1, price: item.get('price'), addedAt: new Date() });
    }
    cart.set('items', items);
    const total = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
    cart.set('totalPrice', total);
    await cart.save(null, { useMasterKey: true });
    return cart.toJSON();
});

Parse.Cloud.define('createGig', async (request) => {
    const { userId, skill, description, payment } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Gig = Parse.Object.extend('VibeGig');
    const gig = new Gig();
    gig.set('poster', user);
    gig.set('skillNeeded', skill);
    gig.set('description', description || '');
    gig.set('payment', payment);
    gig.set('currency', 'VIBE');
    gig.set('status', 'open');
    gig.set('verifiedProfessionals', false);
    gig.set('deadline', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    await gig.save(null, { useMasterKey: true });
    return gig.toJSON();
});

Parse.Cloud.define('getGigs', async (request) => {
    const Gig = Parse.Object.extend('VibeGig');
    const query = new Parse.Query(Gig);
    query.equalTo('status', 'open');
    query.include('poster');
    query.descending('createdAt');
    query.limit(20);
    const gigs = await query.find({ useMasterKey: true });
    return gigs.map(g => g.toJSON());
});

Parse.Cloud.define('applyToGig', async (request) => {
    const { userId, gigId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Gig = Parse.Object.extend('VibeGig');
    const gig = await new Parse.Query(Gig).get(gigId, { useMasterKey: true });
    const applicants = gig.get('applicants') || [];
    if (!applicants.some(a => a.id === userId)) {
        applicants.push(user);
        gig.set('applicants', applicants);
        await gig.save(null, { useMasterKey: true });
    }
    return gig.toJSON();
});

// ==================== LEARNING FUNCTIONS ====================

Parse.Cloud.define('createCourse', async (request) => {
    const { userId, title, description, price } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Course = Parse.Object.extend('VibeCourse');
    const course = new Course();
    course.set('instructor', user);
    course.set('title', title);
    course.set('description', description || '');
    course.set('price', price || 0);
    course.set('category', 'General');
    course.set('level', 'beginner');
    course.set('modules', []);
    course.set('enrolledStudents', []);
    course.set('tags', []);
    await course.save(null, { useMasterKey: true });
    return course.toJSON();
});

Parse.Cloud.define('getCourses', async (request) => {
    const Course = Parse.Object.extend('VibeCourse');
    const query = new Parse.Query(Course);
    query.include('instructor');
    query.descending('createdAt');
    query.limit(20);
    const courses = await query.find({ useMasterKey: true });
    return courses.map(c => c.toJSON());
});

Parse.Cloud.define('enrollCourse', async (request) => {
    const { userId, courseId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Course = Parse.Object.extend('VibeCourse');
    const course = await new Parse.Query(Course).get(courseId, { useMasterKey: true });
    const students = course.get('enrolledStudents') || [];
    if (!students.some(s => s.id === userId)) {
        students.push(user);
        course.set('enrolledStudents', students);
        await course.save(null, { useMasterKey: true });
    }
    return course.toJSON();
});

Parse.Cloud.define('createQuiz', async (request) => {
    const { userId, title, questions, courseId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Quiz = Parse.Object.extend('VibeQuiz');
    const quiz = new Quiz();
    quiz.set('title', title);
    quiz.set('questions', questions || []);
    quiz.set('passingScore', 70);
    quiz.set('maxAttempts', 3);
    if (courseId) {
        const Course = Parse.Object.extend('VibeCourse');
        const course = await new Parse.Query(Course).get(courseId, { useMasterKey: true });
        quiz.set('course', course);
    }
    await quiz.save(null, { useMasterKey: true });
    return quiz.toJSON();
});

// ==================== GAMING FUNCTIONS ====================

Parse.Cloud.define('createGameSession', async (request) => {
    const { userId, title, gameType, maxPlayers } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Session = Parse.Object.extend('VibeGameSession');
    const session = new Session();
    session.set('host', user);
    session.set('title', title);
    session.set('gameType', gameType);
    session.set('maxPlayers', maxPlayers || 4);
    session.set('currentPlayers', [user]);
    session.set('status', 'waiting');
    session.set('isPrivate', false);
    await session.save(null, { useMasterKey: true });
    return session.toJSON();
});

Parse.Cloud.define('getGameSessions', async (request) => {
    const Session = Parse.Object.extend('VibeGameSession');
    const query = new Parse.Query(Session);
    query.containedIn('status', ['waiting', 'active']);
    query.include('host');
    query.descending('createdAt');
    query.limit(20);
    const sessions = await query.find({ useMasterKey: true });
    return sessions.map(s => s.toJSON());
});

Parse.Cloud.define('joinGameSession', async (request) => {
    const { userId, sessionId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Session = Parse.Object.extend('VibeGameSession');
    const session = await new Parse.Query(Session).get(sessionId, { useMasterKey: true });
    const players = session.get('currentPlayers') || [];
    if (players.length >= session.get('maxPlayers')) throw new Error('Session is full');
    if (!players.some(p => p.id === userId)) {
        players.push(user);
        session.set('currentPlayers', players);
        await session.save(null, { useMasterKey: true });
    }
    return session.toJSON();
});

Parse.Cloud.define('createTournament', async (request) => {
    const { userId, title, gameType, maxParticipants } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Tournament = Parse.Object.extend('VibeTournament');
    const tournament = new Tournament();
    tournament.set('organizer', user);
    tournament.set('title', title);
    tournament.set('gameType', gameType);
    tournament.set('maxParticipants', maxParticipants || 8);
    tournament.set('status', 'registration');
    tournament.set('format', 'single_elimination');
    tournament.set('participants', []);
    tournament.set('startDate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    tournament.set('endDate', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    await tournament.save(null, { useMasterKey: true });
    return tournament.toJSON();
});

// ==================== DISCOVERY FUNCTIONS ====================

Parse.Cloud.define('getRecommendations', async (request) => {
    const Post = Parse.Object.extend('Post');
    const query = new Parse.Query(Post);
    query.include('author');
    query.descending('createdAt');
    query.limit(10);
    const posts = await query.find({ useMasterKey: true });
    return posts.map(p => ({
        id: p.id,
        content: p.get('content'),
        author: {
            id: p.get('author').id,
            username: p.get('author').get('username'),
            displayName: p.get('author').get('displayName')
        },
        createdAt: p.createdAt
    }));
});

Parse.Cloud.define('searchContent', async (request) => {
    const { query: searchQuery } = request.params;
    if (!searchQuery) return [];
    const Post = Parse.Object.extend('Post');
    const q = new Parse.Query(Post);
    q.contains('searchContent', searchQuery);
    q.include('author');
    q.descending('createdAt');
    q.limit(20);
    const posts = await q.find({ useMasterKey: true });
    return posts.map(p => ({
        id: p.id,
        content: p.get('content'),
        author: {
            id: p.get('author').id,
            username: p.get('author').get('username'),
            displayName: p.get('author').get('displayName')
        },
        createdAt: p.createdAt
    }));
});

Parse.Cloud.define('getChallenges', async (request) => {
    const Challenge = Parse.Object.extend('VibeChallenge');
    const query = new Parse.Query(Challenge);
    query.greaterThan('endDate', new Date());
    query.descending('createdAt');
    query.limit(10);
    const challenges = await query.find({ useMasterKey: true });
    return challenges.map(c => c.toJSON());
});

Parse.Cloud.define('joinChallenge', async (request) => {
    const { userId, challengeId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Challenge = Parse.Object.extend('VibeChallenge');
    const challenge = await new Parse.Query(Challenge).get(challengeId, { useMasterKey: true });
    const participants = challenge.get('participants') || [];
    if (!participants.some(p => p.id === userId)) {
        participants.push(user);
        challenge.set('participants', participants);
        await challenge.save(null, { useMasterKey: true });
    }
    return challenge.toJSON();
});

// ==================== SETTINGS FUNCTIONS ====================

Parse.Cloud.define('getUserSettings', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Settings = Parse.Object.extend('VibeUserSettings');
    const query = new Parse.Query(Settings);
    query.equalTo('user', user);
    let settings = await query.first({ useMasterKey: true });
    if (!settings) {
        settings = new Settings();
        settings.set('user', user);
        settings.set('privacy', { profileVisibility: 'public' });
        settings.set('notifications', { push: true });
        settings.set('appearance', { theme: 'auto' });
        settings.set('content', { safeSearch: true });
        settings.set('security', { twoFactorAuth: false });
        await settings.save(null, { useMasterKey: true });
    }
    return settings.toJSON();
});

Parse.Cloud.define('exportUserData', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const posts = await new Parse.Query('Post')
        .equalTo('author', user)
        .find({ useMasterKey: true });
    const wallet = await new Parse.Query('VibeWallet').equalTo('owner', user).first({ useMasterKey: true });
    const transactions = wallet ? await new Parse.Query('WalletTransaction')
        .equalTo('wallet', wallet)
        .find({ useMasterKey: true }) : [];
    return {
        user: {
            id: user.id,
            username: user.get('username'),
            email: user.get('email'),
            displayName: user.get('displayName'),
            bio: user.get('bio'),
            createdAt: user.createdAt
        },
        posts: posts.map(p => ({ id: p.id, content: p.get('content'), createdAt: p.createdAt })),
        transactions: transactions.map(t => ({ id: t.id, type: t.get('type'), amount: t.get('amount'), description: t.get('description'), createdAt: t.createdAt }))
    };
});

// ==================== AR FUNCTIONS ====================

Parse.Cloud.define('createARExperience', async (request) => {
    const { userId, type, interactiveObjects, filters } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const AR = Parse.Object.extend('VibeARExperience');
    const exp = new AR();
    exp.set('creator', user);
    exp.set('experienceType', type);
    exp.set('interactiveObjects', interactiveObjects || []);
    exp.set('filters', filters || []);
    exp.set('usageStats', {});
    await exp.save(null, { useMasterKey: true });
    return exp.toJSON();
});

Parse.Cloud.define('getARExperiences', async (request) => {
    const AR = Parse.Object.extend('VibeARExperience');
    const query = new Parse.Query(AR);
    query.include('creator');
    query.descending('createdAt');
    query.limit(20);
    const exps = await query.find({ useMasterKey: true });
    return exps.map(e => e.toJSON());
});

// ==================== QA FUNCTIONS ====================

Parse.Cloud.define('askQuestion', async (request) => {
    const { userId, question, topic } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const QA = Parse.Object.extend('VibeQuestion');
    const q = new QA();
    q.set('author', user);
    q.set('title', question);
    q.set('description', question);
    q.set('category', topic || 'General');
    q.set('tags', []);
    q.set('status', 'open');
    q.set('answers', []);
    q.set('upvotes', 0);
    q.set('views', 0);
    await q.save(null, { useMasterKey: true });
    return q.toJSON();
});

Parse.Cloud.define('getQuestions', async (request) => {
    const QA = Parse.Object.extend('VibeQuestion');
    const query = new Parse.Query(QA);
    query.include('author');
    query.descending('createdAt');
    query.limit(20);
    const questions = await query.find({ useMasterKey: true });
    return questions.map(q => q.toJSON());
});

// ==================== AI FUNCTIONS ====================

Parse.Cloud.define('trackBehavior', async (request) => {
    const { userId, action, data } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const AI = Parse.Object.extend('AI');
    const query = new Parse.Query(AI);
    query.equalTo('user', user);
    let ai = await query.first({ useMasterKey: true });
    if (!ai) {
        ai = new AI();
        ai.set('user', user);
        ai.set('aiData', {});
        ai.set('preferences', {});
        ai.set('learningPattern', {});
    }
    const lp = ai.get('learningPattern') || {};
    if (!lp[action]) lp[action] = { count: 0, lastPerformed: new Date() };
    lp[action].count++;
    lp[action].lastPerformed = new Date();
    ai.set('learningPattern', lp);
    await ai.save(null, { useMasterKey: true });
    return { success: true };
});

Parse.Cloud.define('getAISuggestions', async (request) => {
    const { userId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const AI = Parse.Object.extend('AI');
    const query = new Parse.Query(AI);
    query.equalTo('user', user);
    const ai = await query.first({ useMasterKey: true });
    if (!ai) return { content: [], connections: [], groups: [], events: [], challenges: [] };
    const pattern = ai.get('learningPattern') || {};
    const interests = Object.keys(pattern)
        .sort((a, b) => pattern[b].count - pattern[a].count)
        .slice(0, 5);
    return {
        content: { tags: interests, topics: interests.map(i => i.charAt(0).toUpperCase() + i.slice(1)) },
        connections: [],
        groups: [],
        events: [],
        challenges: []
    };
});

// ==================== NOTIFICATION FUNCTIONS ====================

Parse.Cloud.define('createNotification', async (request) => {
    const { userId, type, message, senderId } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Notification = Parse.Object.extend('Notification');
    const notif = new Notification();
    notif.set('user', user);
    notif.set('type', type);
    notif.set('message', message);
    notif.set('read', false);
    if (senderId) {
        const sender = await new Parse.Query(Parse.User).get(senderId, { useMasterKey: true });
        notif.set('sender', sender);
    }
    await notif.save(null, { useMasterKey: true });
    return notif.toJSON();
});

Parse.Cloud.define('markNotificationRead', async (request) => {
    const { userId, notificationId } = request.params;
    const Notification = Parse.Object.extend('Notification');
    const notif = await new Parse.Query(Notification).get(notificationId, { useMasterKey: true });
    if (notif.get('user').id !== userId) {
        throw new Error('You do not have permission');
    }
    notif.set('read', true);
    await notif.save(null, { useMasterKey: true });
    return { success: true };
});

Parse.Cloud.define('getNotifications', async (request) => {
    const { userId, limit } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Notification = Parse.Object.extend('Notification');
    const query = new Parse.Query(Notification);
    query.equalTo('user', user);
    query.descending('createdAt');
    query.limit(limit || 20);
    const notifications = await query.find({ useMasterKey: true });
    return notifications.map(n => n.toJSON());
});

Parse.Cloud.define('notifyFollowers', async (request) => {
    const { userId, message } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    const Follow = Parse.Object.extend('VibeFollow');
    const query = new Parse.Query(Follow);
    query.equalTo('following', user);
    query.include('follower');
    const follows = await query.find({ useMasterKey: true });
    const Notification = Parse.Object.extend('Notification');
    const notifications = [];
    for (const f of follows) {
        const notif = new Notification();
        notif.set('user', f.get('follower'));
        notif.set('type', 'follower_update');
        notif.set('message', message);
        notif.set('read', false);
        await notif.save(null, { useMasterKey: true });
        notifications.push(notif);
    }
    return { count: notifications.length };
});

// ==================== SYSTEM FUNCTIONS ====================

Parse.Cloud.define('logError', async (request) => {
    const { error, context, stack } = request.params;
    console.error(`❌ [${context}]`, error, stack);
    const ErrorLog = Parse.Object.extend('ErrorLog');
    const log = new ErrorLog();
    log.set('error', error);
    log.set('context', context);
    log.set('stack', stack || '');
    log.set('timestamp', new Date());
    await log.save(null, { useMasterKey: true });
    return { success: true };
});

// ============================================================
// NEW ADDITIONS – Email & Push Notifications (Parse Push)
// ============================================================

Parse.Cloud.define('sendPushNotification', async (request) => {
    const { userId, title, body, data } = request.params;
    const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
    if (!user) throw new Error('User not found');

    // Use Parse Push to send a notification to this user's installations
    const query = new Parse.Query(Parse.Installation);
    query.equalTo('user', user);

    await Parse.Push.send({
        where: query,
        data: {
            alert: body,
            title: title,
            badge: 'Increment',
            sound: 'default',
            payload: data || {}
        }
    }, { useMasterKey: true });
    return { success: true };
});

// (The sendVerificationEmail function is already defined above with SendGrid)