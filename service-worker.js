const CACHE_NAME = 'vibelink-0372-v1.0.0';
const API_CACHE_NAME = 'vibelink-api-v1.0.0';
const DYNAMIC_CACHE_NAME = 'vibelink-dynamic-v1.0.0';

const APP_SHELL = [
  '/VibeLink-0372/',
  '/VibeLink-0372/index.html',
  '/VibeLink-0372/style.css',
  '/VibeLink-0372/script.js',
  '/VibeLink-0372/security.js',
  '/VibeLink-0372/manifest.json',
  '/VibeLink-0372/offline.html',
  '/VibeLink-0372/assets/logo.svg',
  '/VibeLink-0372/assets/icon-192.png',
  '/VibeLink-0372/assets/icon-512.png',
  '/VibeLink-0372/assets/default-avatar.png'
];

const API_ENDPOINTS = [
  '/parse/classes/_User',
  '/parse/classes/Post',
  '/parse/classes/Comment',
  '/parse/classes/Like',
  '/parse/classes/Friendship',
  '/parse/classes/Notification',
  '/parse/classes/VibeChatRoom',
  '/parse/classes/Message',
  '/parse/classes/VibeSecureChat',
  '/parse/classes/VibeEvent',
  '/parse/classes/Stream',
  '/parse/classes/VibeLiveStream',
  '/parse/classes/VibeWallet',
  '/parse/classes/WalletTransaction',
  '/parse/classes/MarketplaceItem',
  '/parse/classes/VibeGig',
  '/parse/classes/VibeLearn',
  '/parse/classes/Profile',
  '/parse/classes/VibeStory',
  '/parse/classes/VibeGallery',
  '/parse/classes/AI',
  '/parse/classes/VibeAnalytics'
];

// Install Event - Cache App Shell
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('✅ App shell cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Serve from cache or network with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.includes('/parse/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticAssetRequest(request));
});

// API Request Handler with offline queuing
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Network-first strategy for API calls
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
      
      // Process any queued offline actions
      await processQueuedActions();
      
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('🌐 Offline - Serving from cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Queue the failed request for later sync
    await queueOfflineAction(request);
    
    // Return appropriate fallback based on request type
    return createOfflineResponse(request);
  }
}

// Navigation Request Handler
async function handleNavigationRequest(request) {
  try {
    // Network-first for navigation
    return await fetch(request);
  } catch (error) {
    // Fallback to cached version or offline page
    const cache = await caches.open(CACHE_NAME);
    const cachedPage = await cache.match(request);
    
    if (cachedPage) {
      return cachedPage;
    }
    
    return cache.match('/VibeLink-0372/offline.html');
  }
}

// Static Asset Request Handler
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Cache-first for static assets
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache new assets
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    // If both cache and network fail, return appropriate fallback
    return createAssetFallback(request);
  }
}

// Offline Action Queue Management
async function queueOfflineAction(request) {
  const queue = await getOfflineQueue();
  const action = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' && request.method !== 'HEAD' ? 
      await request.clone().text() : null,
    timestamp: Date.now(),
    id: generateActionId()
  };
  
  queue.push(action);
  await setOfflineQueue(queue);
  
  // Trigger background sync if available
  if ('sync' in self.registration) {
    try {
      await self.registration.sync.register('offline-actions');
    } catch (error) {
      console.log('Background sync not supported');
    }
  }
}

// Process Queued Offline Actions
async function processQueuedActions() {
  const queue = await getOfflineQueue();
  
  if (queue.length === 0) return;
  
  console.log(`🔄 Processing ${queue.length} queued actions`);
  
  const successfulActions = [];
  
  for (const action of queue) {
    try {
      const fetchOptions = {
        method: action.method,
        headers: action.headers,
        body: action.body
      };
      
      const response = await fetch(action.url, fetchOptions);
      
      if (response.ok) {
        successfulActions.push(action.id);
        console.log(`✅ Synced action: ${action.method} ${action.url}`);
      }
    } catch (error) {
      console.log(`❌ Failed to sync action: ${action.url}`, error);
    }
  }
  
  // Remove successful actions from queue
  const updatedQueue = queue.filter(action => 
    !successfulActions.includes(action.id)
  );
  
  await setOfflineQueue(updatedQueue);
  
  // Notify clients about sync completion
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      successful: successfulActions.length,
      failed: queue.length - successfulActions.length
    });
  });
}

// Background Sync Event
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-actions') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(processQueuedActions());
  }
});

// Push Notification Event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/VibeLink-0372/assets/icon-192.png',
    badge: '/VibeLink-0372/assets/icon-192.png',
    image: data.image,
    data: data.data,
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    timestamp: data.timestamp || Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { notification, action } = event;
  const data = notification.data || {};
  
  let url = '/VibeLink-0372/';
  
  // Handle different notification types
  switch (data.type) {
    case 'message':
      url = '/VibeLink-0372/#chat';
      break;
    case 'post':
      url = `/VibeLink-0372/#post-${data.postId}`;
      break;
    case 'wallet':
      url = '/VibeLink-0372/#wallet';
      break;
    case 'stream':
      url = '/VibeLink-0372/#streams';
      break;
    default:
      url = '/VibeLink-0372/';
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Message Event - Communication with clients
self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      event.ports[0].postMessage({
        cached: APP_SHELL.length,
        total: APP_SHELL.length
      });
      break;
      
    case 'CACHE_NEW_RESOURCE':
      cacheNewResource(data.url, data.content);
      break;
      
    case 'GET_OFFLINE_QUEUE':
      getOfflineQueue().then(queue => {
        event.ports[0].postMessage({ queue });
      });
      break;
  }
});

// Helper Functions
async function getOfflineQueue() {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const response = await cache.match('/offline-queue');
  
  if (response) {
    return await response.json();
  }
  
  return [];
}

async function setOfflineQueue(queue) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const response = new Response(JSON.stringify(queue), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put('/offline-queue', response);
}

function generateActionId() {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createOfflineResponse(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Return appropriate fallback responses for different API endpoints
  if (path.includes('/classes/Post')) {
    return new Response(JSON.stringify({
      results: getSamplePosts(),
      count: 3
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (path.includes('/classes/Message')) {
    return new Response(JSON.stringify({
      results: getSampleMessages(),
      count: 5
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (path.includes('/classes/Notification')) {
    return new Response(JSON.stringify({
      results: getSampleNotifications(),
      count: 3
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Generic offline response
  return new Response(JSON.stringify({
    error: 'offline',
    message: 'You are currently offline. Data will sync when connection is restored.',
    timestamp: Date.now()
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createAssetFallback(request) {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('.css')) {
    return new Response('/* Offline fallback */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  if (url.pathname.endsWith('.js')) {
    return new Response('// Offline fallback', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
  
  if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg')) {
    // Return a simple 1x1 transparent pixel
    return new Response(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      { headers: { 'Content-Type': 'image/png' } }
    );
  }
  
  return new Response('Offline', { status: 503 });
}

async function cacheNewResource(url, content) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const response = new Response(content, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put(url, response);
}

// Sample Data for Offline Mode
function getSamplePosts() {
  return [
    {
      objectId: 'offline_post_1',
      author: {
        __type: 'Pointer',
        className: '_User',
        objectId: 'offline_user_1',
        username: 'VibeMaster'
      },
      content: '🌐 Welcome to VibeLink 0372! Even offline, you can still browse your cached content and compose new posts that will sync when you\'re back online! #VibeLink #OfflineMode',
      media: [],
      vibeTags: ['VibeLink', 'OfflineMode'],
      aiSuggestions: {},
      milestones: [],
      pinned: false,
      visibility: 'public',
      reactions: { like: 15, love: 8, fire: 3 },
      shares: 2,
      comments: {
        __type: 'Relation',
        className: 'Comment'
      },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      objectId: 'offline_post_2',
      author: {
        __type: 'Pointer',
        className: '_User',
        objectId: 'offline_user_2',
        username: 'TechInnovator'
      },
      content: '🚀 Progressive Web Apps are the future! VibeLink 0372 demonstrates true offline capabilities with real-time sync when connectivity returns. #PWA #Innovation',
      media: [],
      vibeTags: ['PWA', 'Innovation'],
      aiSuggestions: {},
      milestones: [],
      pinned: false,
      visibility: 'public',
      reactions: { like: 23, love: 12, wow: 5 },
      shares: 4,
      comments: {
        __type: 'Relation',
        className: 'Comment'
      },
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      objectId: 'offline_post_3',
      author: {
        __type: 'Pointer',
        className: '_User',
        objectId: 'offline_user_3',
        username: 'CreativeSoul'
      },
      content: '🎨 Creativity knows no bounds, even without an internet connection! Use this offline time to draft your next masterpiece. #Creativity #OfflineInspiration',
      media: [],
      vibeTags: ['Creativity', 'OfflineInspiration'],
      aiSuggestions: {},
      milestones: [],
      pinned: false,
      visibility: 'public',
      reactions: { like: 42, love: 18, sparkle: 9 },
      shares: 7,
      comments: {
        __type: 'Relation',
        className: 'Comment'
      },
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      updatedAt: new Date(Date.now() - 10800000).toISOString()
    }
  ];
}

function getSampleMessages() {
  return [
    {
      objectId: 'offline_msg_1',
      sender: {
        __type: 'Pointer',
        className: '_User',
        objectId: 'offline_user_2',
        username: 'TechInnovator'
      },
      text: 'Hey! I see you\'re offline. Messages will be delivered when you reconnect.',
      attachments: [],
      messageType: 'text',
      paymentIncluded: false,
      readBy: ['offline_user_1'],
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString()
    }
  ];
}

function getSampleNotifications() {
  return [
    {
      objectId: 'offline_notif_1',
      type: 'info',
      message: '📱 You are currently in offline mode',
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      objectId: 'offline_notif_2',
      type: 'reminder',
      message: '💾 Your posts will sync when online',
      read: false,
      createdAt: new Date().toISOString()
    }
  ];
}

// Cache Health Check
async function checkCacheHealth() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  console.log(`🔍 Cache health: ${requests.length} items cached`);
  
  // Verify critical assets are cached
  const criticalAssets = APP_SHELL.slice(0, 5); // First 5 are most critical
  for (const asset of criticalAssets) {
    const response = await cache.match(asset);
    if (!response) {
      console.warn(`⚠️ Critical asset missing from cache: ${asset}`);
    }
  }
}

// Periodic cache maintenance
setInterval(() => {
  checkCacheHealth();
}, 86400000); // Run once per day

console.log('🎯 VibeLink 0372 Service Worker loaded successfully');