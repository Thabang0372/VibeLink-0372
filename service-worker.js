const CACHE_NAME = 'vibelink-v3.7.2';
const OFFLINE_CACHE = 'vibelink-offline-v1';
const API_CACHE = 'vibelink-api-v1';
const IMAGE_CACHE = 'vibelink-images-v1';

// Core app files that should be cached immediately
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/offline.html',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192.png',
  '/icon-384x384.png',
  '/icon-512.png',
  '/icon-512x512.png',
  '/default-avatar.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/parse/dist/parse.min.js'
];

// External resources that should be cached
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// API endpoints that should be cached for offline use
const API_ENDPOINTS = [
  '/api/posts',
  '/api/profile',
  '/api/notifications'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker installing and caching core assets.');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll([...CORE_ASSETS, ...EXTERNAL_ASSETS]);
      })
      .then(() => {
        // Pre-cache API responses
        return caches.open(API_CACHE);
      })
      .then(cache => {
        // Pre-cache critical API data if needed
        return Promise.all(
          API_ENDPOINTS.map(endpoint => {
            return fetch(endpoint)
              .then(response => {
                if (response.ok) {
                  return cache.put(endpoint, response);
                }
              })
              .catch(err => console.log('Could not cache API endpoint:', endpoint, err));
          })
        );
      })
      .then(() => {
        console.log('All resources have been fetched and cached.');
      })
      .catch(error => {
        console.log('Cache addAll failed:', error);
      })
  );
});

// Fetch event with sophisticated caching strategies
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response to store in cache
          const responseClone = response.clone();
          caches.open(API_CACHE)
            .then(cache => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request)
            .then(response => {
              if (response) {
                return response;
              }
              // Return a generic offline response for API calls
              return new Response(
                JSON.stringify({ error: 'You are offline and no cached data is available.' }),
                { headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }
  
  // Handle image requests with cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          // Return cached image or fetch from network
          return response || fetch(request)
            .then(response => {
              // Don't cache images if not successful
              if (!response.ok) {
                return response;
              }
              
              // Clone the response to store in cache
              const responseClone = response.clone();
              caches.open(IMAGE_CACHE)
                .then(cache => {
                  cache.put(request, responseClone);
                });
              
              return response;
            })
            .catch(() => {
              // Return a placeholder image if both cache and network fail
              return caches.match('/default-avatar.png');
            });
        })
    );
    return;
  }
  
  // For HTML, CSS, JS - use stale-while-revalidate strategy
  if (request.destination === 'document' || 
      request.destination === 'style' || 
      request.destination === 'script') {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          // Always make network request in background to update cache
          const fetchPromise = fetch(request)
            .then(networkResponse => {
              // Don't update cache if response is not valid
              if (!networkResponse.ok) {
                return networkResponse;
              }
              
              // Clone the response to update cache
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseClone);
                });
              
              return networkResponse;
            })
            .catch(error => {
              console.log('Fetch failed:', error);
            });
          
          // Return cached response immediately, then update from network
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }
  
  // Default handling: try cache first, then network
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(request)
          .then(response => {
            // Don't cache if response is not valid
            if (!response.ok) {
              return response;
            }
            
            // Clone the response to store in cache
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
            
            return response;
          })
          .catch(() => {
            // If requesting an HTML page and offline, return offline page
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
            
            // For other file types, return a generic offline response
            return new Response('You are offline and the requested resource is not available.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating and cleaning up old caches.');
  
  // Take control of all clients immediately
  event.waitUntil(
    clients.claim()
      .then(() => {
        // Clean up old caches
        return caches.keys()
          .then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                // Delete old caches that don't match current version
                if (cacheName !== CACHE_NAME && 
                    cacheName !== OFFLINE_CACHE && 
                    cacheName !== API_CACHE && 
                    cacheName !== IMAGE_CACHE) {
                  console.log('Deleting old cache:', cacheName);
                  return caches.delete(cacheName);
                }
              })
            );
          });
      })
      .then(() => {
        // Send message to all clients about SW activation
        self.clients.matchAll()
          .then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SW_ACTIVATED',
                message: 'Service Worker is now active and controlling the app.'
              });
            });
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'pending-posts') {
    event.waitUntil(
      // Process pending posts from IndexedDB
      processPendingPosts()
    );
  }
  
  if (event.tag === 'pending-comments') {
    event.waitUntil(
      // Process pending comments from IndexedDB
      processPendingComments()
    );
  }
});

// Push notification event handler
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'VibeLink 0372',
      body: 'You have a new notification!',
      icon: '/icon-192.png'
    };
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'vibelink-notification',
    data: data.url || '/',
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event handler
self.addEventListener('notificationclick', event => {
  console.log('Notification click:', event.notification.tag);
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to the relevant page
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  } else if (event.action === 'dismiss') {
    // Just dismiss the notification
    console.log('Notification dismissed');
  } else {
    // Default behavior - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message event handler for communication with the app
self.addEventListener('message', event => {
  console.log('Message received in service worker:', event.data);
  
  if (event.data.type === 'CACHE_NEW_POST') {
    // Cache a new post for offline viewing
    const post = event.data.post;
    const url = `/api/posts/${post.id}`;
    
    caches.open(API_CACHE)
      .then(cache => {
        cache.put(url, new Response(JSON.stringify(post), {
          headers: { 'Content-Type': 'application/json' }
        }));
      });
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper function to process pending posts (for background sync)
function processPendingPosts() {
  // This would typically interact with IndexedDB to get pending posts
  // and then try to sync them with the server
  return new Promise((resolve) => {
    console.log('Processing pending posts...');
    // Simulate processing time
    setTimeout(() => {
      console.log('Pending posts processed');
      resolve();
    }, 2000);
  });
}

// Helper function to process pending comments (for background sync)
function processPendingComments() {
  return new Promise((resolve) => {
    console.log('Processing pending comments...');
    // Simulate processing time
    setTimeout(() => {
      console.log('Pending comments processed');
      resolve();
    }, 2000);
  });
}

// Periodic sync handler (for background data updates)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    console.log('Periodic sync for content update');
    event.waitUntil(updateCachedContent());
  }
});

// Function to update cached content periodically
function updateCachedContent() {
  return caches.open(API_CACHE)
    .then(cache => {
      return Promise.all(
        API_ENDPOINTS.map(endpoint => {
          return fetch(endpoint)
            .then(response => {
              if (response.ok) {
                return cache.put(endpoint, response);
              }
            })
            .catch(err => console.log('Could not update cached endpoint:', endpoint, err));
        })
      );
    });
}

// Handle app installation prompt
self.addEventListener('beforeinstallprompt', event => {
  console.log('App installation prompt available');
  // You can store the event and show the prompt later in your app
  event.preventDefault();
  
  // Send message to app about install availability
  self.clients.matchAll()
    .then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'INSTALL_PROMPT_AVAILABLE',
          event: event
        });
      });
    });
  
  // Store the event for later use
  self.deferredInstallPrompt = event;
});