// ============================================================
// VibeLink 0372® - Cloud Functions (Production Ready)
// ============================================================

Parse.Cloud.afterSave(Parse.User, async (request) => {
  const user = request.object;
  if (!request.original) { // New user
    try {
      // Create Profile
      const Profile = Parse.Object.extend('Profile');
      const profile = new Profile();
      profile.set('user', user);
      profile.set('bio', user.get('bio') || 'Welcome to VibeLink!');
      profile.set('verified', false);
      profile.set('avatar', null);
      profile.set('nftBadges', []);
      profile.set('achievements', []);
      await profile.save(null, { useMasterKey: true });

      // Create Wallet
      const VibeWallet = Parse.Object.extend('VibeWallet');
      const wallet = new VibeWallet();
      wallet.set('owner', user);
      wallet.set('balance', 100); // Starting balance
      wallet.set('currency', 'VIBE');
      wallet.set('aiTips', []);
      wallet.set('budgetPlan', {});
      await wallet.save(null, { useMasterKey: true });

      // Create AI record
      const AI = Parse.Object.extend('AI');
      const aiRecord = new AI();
      aiRecord.set('user', user);
      aiRecord.set('aiData', {});
      aiRecord.set('preferences', {});
      aiRecord.set('learningPattern', {});
      await aiRecord.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Error in afterSave _User:', error);
    }
  }
});

Parse.Cloud.afterSave('Post', async (request) => {
  const post = request.object;
  if (!request.original) { // New post
    try {
      // Initialize engagement score
      post.set('engagementScore', 10);
      post.set('viewCount', 0);
      post.set('likeCount', 0);
      post.set('commentCount', 0);
      post.set('shareCount', 0);
      await post.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Error in afterSave Post:', error);
    }
  }
});

Parse.Cloud.afterSave('Comment', async (request) => {
  const comment = request.object;
  const post = comment.get('post');
  const author = comment.get('author');
  const postAuthor = post.get('author');

  if (postAuthor && postAuthor.id !== author.id) {
    try {
      const Notification = Parse.Object.extend('Notification');
      const notification = new Notification();
      notification.set('user', postAuthor);
      notification.set('type', 'new_comment');
      notification.set('message', `${author.get('username') || 'User'} commented on your post`);
      notification.set('read', false);
      notification.set('relatedObject', post);
      notification.set('createdAt', new Date());
      await notification.save(null, { useMasterKey: true });
    } catch (error) {
      console.error('Error in afterSave Comment:', error);
    }
  }
});

// ==================== POST FUNCTIONS ====================

Parse.Cloud.define('createPost', async (request) => {
  const { content, userId } = request.params;
  if (!content || content.trim().length === 0) throw new Parse.Error(400, 'Content cannot be empty');
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const Post = Parse.Object.extend('Post');
  const post = new Post();
  post.set('content', content);
  post.set('author', user);
  post.set('likesCount', 0);
  post.set('commentCount', 0);
  post.set('shareCount', 0);
  post.set('engagementScore', 10);
  post.set('viewCount', 0);
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
  if (!text || text.trim().length === 0) throw new Parse.Error(400, 'Comment cannot be empty');
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
    throw new Parse.Error(403, 'You can only delete your own posts');
  }
  await post.destroy({ useMasterKey: true });
  return { success: true };
});

Parse.Cloud.define('getPersonalizedFeed', async (request) => {
  const user = request.user; // current user from session
  const limit = request.params.limit || 20;
  // Simple rank: order by engagementScore descending
  const Post = Parse.Object.extend('Post');
  const query = new Parse.Query(Post);
  query.include('author');
  query.descending('engagementScore');
  query.limit(limit);
  const posts = await query.find({ useMasterKey: true });
  return posts.map(post => post.toJSON());
});

// ==================== CHAT FUNCTIONS ====================

Parse.Cloud.define('sendMessage', async (request) => {
  const { userId, roomId, text } = request.params;
  if (!text || text.trim().length === 0) throw new Parse.Error(400, 'Message cannot be empty');
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const Room = Parse.Object.extend('VibeChatRoom');
  const room = await new Parse.Query(Room).get(roomId, { useMasterKey: true });
  const Message = Parse.Object.extend('Message');
  const msg = new Message();
  msg.set('text', text);
  msg.set('sender', user);
  msg.set('chatRoom', room);
  msg.set('readBy', [userId]);
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
  room.set('audioVideoEnabled', true);
  await room.save(null, { useMasterKey: true });
  return room.toJSON();
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
    wallet.set('balance', 100);
    wallet.set('currency', 'VIBE');
    wallet.set('aiTips', []);
    wallet.set('budgetPlan', {});
    await wallet.save(null, { useMasterKey: true });
  }
  return wallet.toJSON();
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

Parse.Cloud.define('addFunds', async (request) => {
  const { userId, amount } = request.params;
  if (amount <= 0) throw new Parse.Error(400, 'Amount must be positive');
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const Wallet = Parse.Object.extend('VibeWallet');
  const query = new Parse.Query(Wallet);
  query.equalTo('owner', user);
  let wallet = await query.first({ useMasterKey: true });
  if (!wallet) {
    wallet = new Wallet();
    wallet.set('owner', user);
    wallet.set('balance', 0);
    wallet.set('currency', 'VIBE');
    await wallet.save(null, { useMasterKey: true });
  }
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
  if (amount <= 0) throw new Parse.Error(400, 'Amount must be positive');
  const fromUser = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const toUser = await new Parse.Query(Parse.User).get(toUserId, { useMasterKey: true });
  const Wallet = Parse.Object.extend('VibeWallet');
  const fromQuery = new Parse.Query(Wallet);
  fromQuery.equalTo('owner', fromUser);
  const fromWallet = await fromQuery.first({ useMasterKey: true });
  if (!fromWallet) throw new Parse.Error(404, 'Sender wallet not found');
  if (fromWallet.get('balance') < amount) throw new Parse.Error(400, 'Insufficient balance');
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
  tx1.set('description', `Sent to ${toUser.get('username')}`);
  tx1.set('status', 'completed');
  tx1.set('reference', 'TX_' + Date.now());
  tx1.set('timestamp', new Date());
  await tx1.save(null, { useMasterKey: true });
  const tx2 = new Transaction();
  tx2.set('wallet', toWallet);
  tx2.set('type', 'credit');
  tx2.set('amount', amount);
  tx2.set('description', `Received from ${fromUser.get('username')}`);
  tx2.set('status', 'completed');
  tx2.set('reference', 'TX_' + Date.now() + 'r');
  tx2.set('timestamp', new Date());
  await tx2.save(null, { useMasterKey: true });
  return { newBalance: fromWallet.get('balance') };
});

Parse.Cloud.define('sendTip', async (request) => {
  const { userId, creatorId, amount, message } = request.params;
  if (amount <= 0) throw new Parse.Error(400, 'Amount must be positive');
  const sender = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const creator = await new Parse.Query(Parse.User).get(creatorId, { useMasterKey: true });
  const Wallet = Parse.Object.extend('VibeWallet');
  const fromQuery = new Parse.Query(Wallet);
  fromQuery.equalTo('owner', sender);
  const fromWallet = await fromQuery.first({ useMasterKey: true });
  if (!fromWallet) throw new Parse.Error(404, 'Sender wallet not found');
  if (fromWallet.get('balance') < amount) throw new Parse.Error(400, 'Insufficient balance');
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
  tip.set('message', message || '');
  await tip.save(null, { useMasterKey: true });
  return { success: true };
});

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
  return transactions.map(t => t.toJSON());
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
    await loyalty.save(null, { useMasterKey: true });
  }
  return loyalty.toJSON();
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

// ==================== COMMUNITY FUNCTIONS ====================

Parse.Cloud.define('createCommunity', async (request) => {
  const { userId, name, description, privacy } = request.params;
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const Community = Parse.Object.extend('VibeCommunity');
  const community = new Community();
  community.set('name', name);
  community.set('description', description || '');
  community.set('privacy', privacy || 'public');
  community.set('owner', user);
  community.set('members', [user]);
  community.set('memberCount', 1);
  community.set('postCount', 0);
  await community.save(null, { useMasterKey: true });
  return community.toJSON();
});

Parse.Cloud.define('getCommunities', async (request) => {
  const Community = Parse.Object.extend('VibeCommunity');
  const query = new Parse.Query(Community);
  query.equalTo('isActive', true);
  query.include('owner');
  query.descending('memberCount');
  query.limit(20);
  const communities = await query.find({ useMasterKey: true });
  return communities.map(c => c.toJSON());
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
    attendees.push(user);
    event.set('attendees', attendees);
    await event.save(null, { useMasterKey: true });
  }
  return event.toJSON();
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
    const item = await new Parse.Query('MarketplaceItem').get(itemId, { useMasterKey: true });
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
  gig.set('deadline', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days
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
  if (players.length >= session.get('maxPlayers')) throw new Parse.Error(400, 'Session is full');
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
  query.descending('engagementScore');
  query.limit(10);
  const posts = await query.find({ useMasterKey: true });
  return posts.map(p => p.toJSON());
});

Parse.Cloud.define('searchContent', async (request) => {
  const { query: searchQuery } = request.params;
  if (!searchQuery) return [];
  const Post = Parse.Object.extend('Post');
  const q = new Parse.Query(Post);
  q.contains('content', searchQuery);
  q.include('author');
  q.descending('createdAt');
  q.limit(20);
  const posts = await q.find({ useMasterKey: true });
  return posts.map(p => p.toJSON());
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

// ==================== Q&A FUNCTIONS ====================

Parse.Cloud.define('askQuestion', async (request) => {
  const { userId, question, topic } = request.params;
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const QA = Parse.Object.extend('VibeQuestion');
  const q = new QA();
  q.set('author', user);
  q.set('title', question);
  q.set('description', question);
  q.set('category', topic || 'General');
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

// ==================== SETTINGS & DATA EXPORT ====================

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
  const wallet = await new Parse.Query('VibeWallet')
    .equalTo('owner', user)
    .first({ useMasterKey: true });
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
  const { userId, type } = request.params;
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const AR = Parse.Object.extend('VibeARExperience');
  const exp = new AR();
  exp.set('creator', user);
  exp.set('experienceType', type);
  exp.set('interactiveObjects', []);
  exp.set('filters', []);
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

// ==================== EMAIL & PUSH ====================

Parse.Cloud.define('sendVerificationEmail', async (request) => {
  const { userId } = request.params;
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const token = user.get('emailToken') || Math.random().toString(36).substr(2, 20);
  user.set('emailToken', token);
  await user.save(null, { useMasterKey: true });
  const link = `https://thabang0372.github.io/VibeLink-0372/verify?token=${token}`;
  // In production, replace with real email service. For now log.
  console.log(`Verification link for ${user.get('email')}: ${link}`);
  return { success: true, link };
});

Parse.Cloud.define('sendPushNotification', async (request) => {
  const { userId, title, body } = request.params;
  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  // For real push, integrate with Parse.Push (requires installation tokens)
  // Placeholder for now - logs.
  console.log(`Push to ${user.get('username')}: ${title} - ${body}`);
  return { success: true };
});