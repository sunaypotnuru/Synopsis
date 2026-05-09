// Offline Sync Utility for Sunay Health PWA

interface PendingData {
    id?: number;
    endpoint: string;
    method: string;
    data: unknown;
    timestamp: number;
    retryCount: number;
}

class OfflineSync {
    private db: IDBDatabase | null = null;
    private readonly DB_NAME = 'SunayHealthDB';
    private readonly DB_VERSION = 1;
    private syncInProgress = false;

    constructor() {
        this.initDatabase();
        this.setupOnlineListener();
    }

    // ============================================
    // DATABASE INITIALIZATION
    // ============================================
    private async initDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object stores
                if (!db.objectStoreNames.contains('appointments')) {
                    const appointmentStore = db.createObjectStore('appointments', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    appointmentStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('forms')) {
                    const formStore = db.createObjectStore('forms', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    formStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('IndexedDB stores created');
            };
        });
    }

    // ============================================
    // SERVICE WORKER REGISTRATION (Handled by Vite PWA)
    // ============================================

    // ============================================
    // ONLINE/OFFLINE DETECTION
    // ============================================
    private setupOnlineListener(): void {
        window.addEventListener('online', () => {
            console.log('Back online - triggering sync');
            this.syncAll();
        });

        window.addEventListener('offline', () => {
            console.log('Gone offline');
            this.notifyOffline();
        });
    }

    public isOnline(): boolean {
        return navigator.onLine;
    }

    // ============================================
    // SAVE DATA FOR OFFLINE SYNC
    // ============================================
    public async saveForSync(
        storeName: string,
        endpoint: string,
        method: string,
        data: unknown
    ): Promise<number> {
        if (!this.db) {
            await this.initDatabase();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            const pendingData: PendingData = {
                endpoint,
                method,
                data,
                timestamp: Date.now(),
                retryCount: 0
            };

            const request = store.add(pendingData);

            request.onsuccess = () => {
                console.log(`Data saved for offline sync in ${storeName}:`, request.result);
                resolve(request.result as number);
            };

            request.onerror = () => {
                console.error('Failed to save data for sync:', request.error);
                reject(request.error);
            };
        });
    }

    // ============================================
    // SYNC OPERATIONS
    // ============================================
    public async syncAll(): Promise<void> {
        if (this.syncInProgress || !this.isOnline()) {
            return;
        }

        this.syncInProgress = true;

        try {
            await this.syncStore('appointments');
            await this.syncStore('forms');
            await this.syncStore('messages');

            // Trigger service worker background sync
            if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
                const registration = await navigator.serviceWorker.ready;
                const syncReg = registration as unknown as { sync: { register: (tag: string) => Promise<void> } };
                await syncReg.sync.register('sync-appointments');
                await syncReg.sync.register('sync-forms');
                await syncReg.sync.register('sync-messages');
            }

            this.notifySyncComplete();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    private async syncStore(storeName: string): Promise<void> {
        if (!this.db) return;

        const pendingData = await this.getPendingData(storeName);

        for (const item of pendingData) {
            try {
                const response = await fetch(item.endpoint, {
                    method: item.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(item.data)
                });

                if (response.ok) {
                    await this.removePendingData(storeName, item.id!);
                    console.log(`Synced ${storeName} item:`, item.id);
                } else {
                    // Increment retry count
                    await this.incrementRetryCount(storeName, item.id!);
                }
            } catch (error) {
                console.error(`Failed to sync ${storeName} item:`, error);
                await this.incrementRetryCount(storeName, item.id!);
            }
        }
    }

    private getPendingData(storeName: string): Promise<PendingData[]> {
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    private removePendingData(storeName: string, id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async incrementRetryCount(storeName: string, id: number): Promise<void> {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data) {
                data.retryCount = (data.retryCount || 0) + 1;
                store.put(data);
            }
        };
    }

    // ============================================
    // PENDING DATA COUNTS
    // ============================================
    public async getPendingCount(storeName?: string): Promise<number> {
        if (!this.db) return 0;

        if (storeName) {
            const data = await this.getPendingData(storeName);
            return data.length;
        }

        // Get total count from all stores
        const appointments = await this.getPendingData('appointments');
        const forms = await this.getPendingData('forms');
        const messages = await this.getPendingData('messages');

        return appointments.length + forms.length + messages.length;
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================
    private notifyUpdate(): void {
        const event = new CustomEvent('sw-update-available');
        window.dispatchEvent(event);
    }

    private notifyOffline(): void {
        const event = new CustomEvent('app-offline');
        window.dispatchEvent(event);
    }

    private notifySyncComplete(): void {
        const event = new CustomEvent('sync-complete');
        window.dispatchEvent(event);
    }

    private handleServiceWorkerMessage(data: { type?: string }): void {
        if (data.type === 'SW_UPDATED') {
            this.notifyUpdate();
        } else if (data.type === 'SYNC_COMPLETE') {
            this.notifySyncComplete();
        }
    }

    // ============================================
    // CACHE MANAGEMENT
    // ============================================
    public async clearCache(): Promise<void> {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration.active) {
                registration.active.postMessage({ type: 'CLEAR_CACHE' });
            }
        }
    }

    public async getCacheSize(): Promise<number> {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration.active) {
                return new Promise((resolve) => {
                    const messageChannel = new MessageChannel();
                    messageChannel.port1.onmessage = (event) => {
                        resolve(event.data.size);
                    };
                    registration.active!.postMessage(
                        { type: 'GET_CACHE_SIZE' },
                        [messageChannel.port2]
                    );
                });
            }
        }
        return 0;
    }

    // ============================================
    // PUSH NOTIFICATIONS
    // ============================================
    public async requestNotificationPermission(): Promise<NotificationPermission> {
        if ('Notification' in window) {
            return await Notification.requestPermission();
        }
        return 'denied';
    }

    public async subscribeToPush(): Promise<PushSubscription | null> {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidKey ? this.urlBase64ToUint8Array(vapidKey) as BufferSource : undefined
                });
                return subscription;
            } catch (error) {
                console.error('Failed to subscribe to push:', error);
                return null;
            }
        }
        return null;
    }

    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray as Uint8Array;
    }
}

// Export singleton instance
export const offlineSync = new OfflineSync();

// Export helper functions
export const saveForOfflineSync = (
    storeName: string,
    endpoint: string,
    method: string,
    data: unknown
) => offlineSync.saveForSync(storeName, endpoint, method, data);

export const syncAllData = () => offlineSync.syncAll();

export const isOnline = () => offlineSync.isOnline();

export const getPendingCount = (storeName?: string) => offlineSync.getPendingCount(storeName);

export const clearCache = () => offlineSync.clearCache();

export const getCacheSize = () => offlineSync.getCacheSize();

export const requestNotificationPermission = () => offlineSync.requestNotificationPermission();

export const subscribeToPush = () => offlineSync.subscribeToPush();
