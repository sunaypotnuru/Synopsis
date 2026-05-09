// Enhanced Service Worker for Sunay Health PWA
const CACHE_VERSION = 'sunay-v3.0.0';
const CACHE_NAMES = {
    static: `${CACHE_VERSION}-static`,
    dynamic: `${CACHE_VERSION}-dynamic`,
    images: `${CACHE_VERSION}-images`,
    api: `${CACHE_VERSION}-api`,
    fonts: `${CACHE_VERSION}-fonts`
};

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.ico'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    '/api/v1/patient/profile',
    '/api/v1/doctor/profile',
    '/api/v1/appointments',
    '/api/v1/prescriptions',
    '/api/v1/scans'
];

// Maximum cache sizes
const MAX_CACHE_SIZE = {
    dynamic: 50,
    images: 30,
    api: 20
};

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAMES.static)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Service worker installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old caches
                        if (!Object.values(CACHE_NAMES).includes(cacheName)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
    
    // Notify clients about update
    event.waitUntil(
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'SW_UPDATED',
                    version: CACHE_VERSION
                });
            });
        })
    );
});

// ============================================
// FETCH EVENT - Advanced Caching Strategy
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // API requests - Network first, cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.api));
        return;
    }
    
    // Images - Cache first, network fallback
    if (request.destination === 'image') {
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.images));
        return;
    }
    
    // Fonts - Cache first
    if (request.destination === 'font' || url.pathname.includes('/fonts/')) {
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.fonts));
        return;
    }
    
    // HTML pages - Network first, cache fallback
    if (request.destination === 'document') {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.dynamic));
        return;
    }
    
    // Static assets - Cache first, network fallback
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.static));
});

// ============================================
// CACHING STRATEGIES
// ============================================

// Network First Strategy
async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
            await limitCacheSize(cacheName, MAX_CACHE_SIZE.api);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.destination === 'document') {
            return caches.match('/offline.html');
        }
        
        // Return offline response for API requests
        return new Response(
            JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. This data will sync when you reconnect.',
                offline: true
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Cache First Strategy
async function cacheFirstStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
            await limitCacheSize(cacheName, MAX_CACHE_SIZE.dynamic);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache and network failed:', error);
        
        // Return placeholder for images
        if (request.destination === 'image') {
            return new Response(
                '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        
        return new Response('Offline', { status: 503 });
    }
}

// Limit cache size
async function limitCacheSize(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxSize) {
        // Delete oldest entries
        const deleteCount = keys.length - maxSize;
        for (let i = 0; i < deleteCount; i++) {
            await cache.delete(keys[i]);
        }
    }
}

// ============================================
// BACKGROUND SYNC
// ============================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-appointments') {
        event.waitUntil(syncAppointments());
    } else if (event.tag === 'sync-forms') {
        event.waitUntil(syncForms());
    } else if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    } else if (event.tag.startsWith('sync-')) {
        event.waitUntil(syncGenericData(event.tag));
    }
});

async function syncAppointments() {
    try {
        console.log('[SW] Syncing appointments...');
        
        // Get pending appointments from IndexedDB
        const db = await openDatabase();
        const pendingAppointments = await getPendingData(db, 'appointments');
        
        for (const appointment of pendingAppointments) {
            try {
                const response = await fetch('/api/v1/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appointment.data)
                });
                
                if (response.ok) {
                    await removePendingData(db, 'appointments', appointment.id);
                    console.log('[SW] Appointment synced:', appointment.id);
                }
            } catch (error) {
                console.error('[SW] Failed to sync appointment:', error);
            }
        }
        
        // Notify clients
        await notifyClients({ type: 'SYNC_COMPLETE', entity: 'appointments' });
    } catch (error) {
        console.error('[SW] Sync appointments failed:', error);
    }
}

async function syncForms() {
    try {
        console.log('[SW] Syncing forms...');
        
        const db = await openDatabase();
        const pendingForms = await getPendingData(db, 'forms');
        
        for (const form of pendingForms) {
            try {
                const response = await fetch(form.endpoint, {
                    method: form.method || 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form.data)
                });
                
                if (response.ok) {
                    await removePendingData(db, 'forms', form.id);
                    console.log('[SW] Form synced:', form.id);
                }
            } catch (error) {
                console.error('[SW] Failed to sync form:', error);
            }
        }
        
        await notifyClients({ type: 'SYNC_COMPLETE', entity: 'forms' });
    } catch (error) {
        console.error('[SW] Sync forms failed:', error);
    }
}

async function syncMessages() {
    try {
        console.log('[SW] Syncing messages...');
        
        const db = await openDatabase();
        const pendingMessages = await getPendingData(db, 'messages');
        
        for (const message of pendingMessages) {
            try {
                const response = await fetch('/api/v1/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message.data)
                });
                
                if (response.ok) {
                    await removePendingData(db, 'messages', message.id);
                    console.log('[SW] Message synced:', message.id);
                }
            } catch (error) {
                console.error('[SW] Failed to sync message:', error);
            }
        }
        
        await notifyClients({ type: 'SYNC_COMPLETE', entity: 'messages' });
    } catch (error) {
        console.error('[SW] Sync messages failed:', error);
    }
}

async function syncGenericData(tag) {
    console.log('[SW] Syncing generic data:', tag);
    await notifyClients({ type: 'SYNC_COMPLETE', tag });
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Sunay Health';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        image: data.image,
        data: {
            url: data.url || '/',
            timestamp: Date.now(),
            ...data
        },
        actions: data.actions || [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' }
        ],
        vibrate: [200, 100, 200],
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// ============================================
// MESSAGES FROM CLIENTS
// ============================================
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(cacheUrls(event.data.urls));
    } else if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(clearAllCaches());
    } else if (event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(getCacheSize().then((size) => {
            event.ports[0].postMessage({ size });
        }));
    }
});

async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAMES.dynamic);
    await cache.addAll(urls);
    console.log('[SW] URLs cached:', urls.length);
}

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[SW] All caches cleared');
}

async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        totalSize += keys.length;
    }
    
    return totalSize;
}

// ============================================
// INDEXEDDB HELPERS
// ============================================
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SunayHealthDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('appointments')) {
                db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('forms')) {
                db.createObjectStore('forms', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('messages')) {
                db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getPendingData(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function removePendingData(db, storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
async function notifyClients(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) => {
        client.postMessage(message);
    });
}

// ============================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncAllData());
    }
});

async function syncAllData() {
    console.log('[SW] Periodic sync triggered');
    await syncAppointments();
    await syncForms();
    await syncMessages();
}

console.log('[SW] Service worker loaded');
