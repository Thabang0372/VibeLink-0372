const CACHE_NAME = 'vibelink-0372-v3.7.2';
const STATIC_ASSETS = ['/', '/index.html', '/style.css', '/manifest.json', '/offline.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/offline.html')))
  );
});

// ---- NEW: Push Notification ----
self.addEventListener('push', (e) => {
  let data = {};
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { title: 'VibeLink', body: 'New notification' };
    }
  } else {
    data = { title: 'VibeLink', body: 'You have a notification' };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'VibeLink', {
      body: data.body || 'New activity',
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data.url || '/'));
});

// ---- NEW: Background Sync ----
self.addEventListener('sync', (e) => {
  if (e.tag === 'offline-sync') {
    e.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  for (const action of queue) {
    try {
      await fetch('/parse/functions/' + action.function, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...action.data, userId: Parse.User.current().id })
      });
    } catch (e) { /* keep in queue */ }
  }
  localStorage.setItem('offlineQueue', JSON.stringify([]));
}