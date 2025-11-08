const CACHE_NAME = 'vibelink-0372-v1.0.0';
const OFFLINE_CACHE = 'vibelink-offline-v1.0.0';
const API_CACHE = 'vibelink-api-v1.0.0';

// Core assets for app shell
const CORE_ASSETS = [
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
  '/VibeLink-0372/assets/default-avatar.png',
  'https://npmcdn.com/parse/dist/parse.min.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
  'https://parseapi.back4app.com/classes/Post',
  'https://parseapi.back4app.com/classes/User',
  'https://parseapi.back4app.com/classes/Profile',
  'https://parseapi.back4app.com/classes/Message',
  'https://parseapi.back4app.com/classes/VibeWallet',
  'https://parseapi.back4app.com/classes/MarketplaceItem',
  'https://parseapi.back4app.com/classes/VibeEvent',
  'https://parseapi.back4app.com/classes/VibeLiveStream',
  'https://parseapi.back4app.com/classes/Notification'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('📦 Caching core app shell...');
          return cache.addAll(CORE_ASSETS);
        }),
      caches.open(OFFLINE_CACHE)
        .then(cache => {
          console.log('📦 Caching offline page...');
          return cache.add('/VibeLink-0372/offline.html');
        }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== OFFLINE_CACHE && 
              cacheName !== API_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated and ready!');
      return self.clients.claim();
    })
  );
});

// Fetch event - sophisticated caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.href.includes('parseapi.back4app.com')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle same-origin requests with cache-first strategy
  if (url.origin === self.location.origin) {
    event.respondWith(handleSameOriginRequest(request));
    return;
  }

  // Handle external resources with cache-first strategy
  event.respondWith(handleExternalResource(request));
});

// API request handler - Network First with offline fallback
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the successful response
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📡 Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // No cache, return offline response for specific endpoints
    if (request.url.includes('/classes/Post') || 
        request.url.includes('/classes/Message')) {
      return new Response(JSON.stringify({
        results: getOfflineData(request.url)
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generic error response
    return new Response(JSON.stringify({ 
      error: 'You are offline and no cached data is available',
      code: 100
    }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Same-origin request handler - Cache First
async function handleSameOriginRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCache(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If request is for a page, serve offline page
    if (request.headers.get('Accept')?.includes('text/html')) {
      const offlineCache = await caches.open(OFFLINE_CACHE);
      const offlineResponse = await offlineCache.match('/VibeLink-0372/offline.html');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// External resource handler - Cache First
async function handleExternalResource(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return generic error for external resources
    return new Response('', { 
      status: 408,
      statusText: 'Offline'
    });
  }
}

// Background cache update
async function updateCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail - we have cached version
  }
}

// Offline data for critical features
function getOfflineData(apiUrl) {
  const timestamp = new Date().toISOString();
  
  if (apiUrl.includes('/classes/Post')) {
    return [
      {
        objectId: 'offline-post-1',
        author: { __type: 'Pointer', className: '_User', objectId: 'offline-user' },
        content: "You're currently offline 🌐 but can still browse cached content!",
        media: [],
        vibeTags: ["offline", "cached"],
        aiSuggestions: {},
        pinned: false,
        visibility: "public",
        reactions: { like: 0, love: 0, fire: 0 },
        shares: 0,
        location: { __type: 'GeoPoint', latitude: 0, longitude: 0 },
        createdAt: timestamp,
        updatedAt: timestamp
      },
      {
        objectId: 'offline-post-2',
        author: { __type: 'Pointer', className: '_User', objectId: 'offline-user' },
        content: "Your posts will sync when you're back online 🔄",
        media: [],
        vibeTags: ["sync", "offline"],
        aiSuggestions: {},
        pinned: false,
        visibility: "public",
        reactions: { like: 0, love: 0, fire: 0 },
        shares: 0,
        location: { __type: 'GeoPoint', latitude: 0, longitude: 0 },
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ];
  }
  
  if (apiUrl.includes('/classes/Message')) {
    return [
      {
        objectId: 'offline-msg-1',
        sender: { __type: 'Pointer', className: '_User', objectId: 'offline-user' },
        text: "Messages will sync when you're back online 💬",
        messageType: "text",
        paymentIncluded: false,
        readBy: [],
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ];
  }
  
  return [];
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'vibelink-posts') {
    event.waitUntil(syncOfflinePosts());
  }
  
  if (event.tag === 'vibelink-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

// Sync offline posts when back online
async function syncOfflinePosts() {
  try {
    const store = await openOfflineStore('vibelink-posts');
    const posts = await store.getAll();
    
    for (const post of posts) {
      try {
        const response = await fetch('https://parseapi.back4app.com/classes/Post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Parse-Application-Id': 'HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA',
            'X-Parse-REST-API-Key': 'u5GO2TsZzgeShi55nk16lyCRMht5G3fPdmE2jkPn'
          },
          body: JSON.stringify(post)
        });
        
        if (response.ok) {
          await store.delete(post.localId);
          console.log('✅ Synced offline post:', post.localId);
        }
      } catch (error) {
        console.error('❌ Failed to sync post:', error);
      }
    }
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

// Sync offline messages when back online
async function syncOfflineMessages() {
  try {
    const store = await openOfflineStore('vibelink-messages');
    const messages = await store.getAll();
    
    for (const message of messages) {
      try {
        const response = await fetch('https://parseapi.back4app.com/classes/Message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Parse-Application-Id': 'HbzqSUpPcWR5fJttXz0f2KMrjKWndkTimYZrixCA',
            'X-Parse-REST-API-Key': 'u5GO2TsZzgeShi55nk16lyCRMht5G3fPdmE2jkPn'
          },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          await store.delete(message.localId);
          console.log('✅ Synced offline message:', message.localId);
        }
      } catch (error) {
        console.error('❌ Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

// IndexedDB for offline data storage
function openOfflineStore(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VibeLinkOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      resolve({
        add: (data) => new Promise((res, rej) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const addRequest = store.add({ ...data, timestamp: Date.now() });
          addRequest.onsuccess = () => res(addRequest.result);
          addRequest.onerror = () => rej(addRequest.error);
        }),
        getAll: () => new Promise((res, rej) => {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => res(getAllRequest.result);
          getAllRequest.onerror = () => rej(getAllRequest.error);
        }),
        delete: (id) => new Promise((res, rej) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const deleteRequest = store.delete(id);
          deleteRequest.onsuccess = () => res();
          deleteRequest.onerror = () => rej(deleteRequest.error);
        })
      });
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('vibelink-posts')) {
        db.createObjectStore('vibelink-posts', { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains('vibelink-messages')) {
        db.createObjectStore('vibelink-messages', { keyPath: 'localId' });
      }
    };
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/VibeLink-0372/assets/icon-192.png',
    badge: '/VibeLink-0372/assets/icon-192.png',
    tag: data.tag || 'vibelink-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open VibeLink',
        icon: '/VibeLink-0372/assets/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/VibeLink-0372/assets/icon-192.png'
      }
    ],
    data: {
      url: data.url || '/VibeLink-0372/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes('/VibeLink-0372/') && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
    );
  }
});

// Periodic sync for background updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'vibelink-background-sync') {
    console.log('🔄 Periodic background sync');
    event.waitUntil(performBackgroundSync());
  }
});

// Background sync tasks
async function performBackgroundSync() {
  try {
    // Sync user data
    await syncUserData();
    
    // Sync notifications
    await syncNotifications();
    
    // Update cache for critical resources
    await updateCriticalCache();
    
    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Sync user data in background
async function syncUserData() {
  // Implementation for syncing user profile, wallet, etc.
  console.log('👤 Syncing user data...');
}

// Sync notifications in background
async function syncNotifications() {
  // Implementation for fetching new notifications
  console.log('🔔 Syncing notifications...');
}

// Update critical cache in background
async function updateCriticalCache() {
  const cache = await caches.open(CACHE_NAME);
  const criticalUrls = [
    '/VibeLink-0372/',
    '/VibeLink-0372/index.html',
    '/VibeLink-0372/style.css',
    '/VibeLink-0372/script.js'
  ];
  
  for (const url of criticalUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.log('⚠️ Failed to update cache for:', url);
    }
  }
}

// Cache health check and cleanup
async function performCacheMaintenance() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await cache.match(request);
      if (!response || response.status === 404) {
        await cache.delete(request);
      }
    } catch (error) {
      await cache.delete(request);
    }
  }
}

// Perform maintenance once a day
setInterval(performCacheMaintenance, 24 * 60 * 60 * 1000);

console.log('🚀 VibeLink 0372 Service Worker loaded successfully!');