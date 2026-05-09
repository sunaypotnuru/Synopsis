import { useState, useEffect, useCallback } from 'react';
import {
    isOnline,
    getPendingCount,
    syncAllData,
    saveForOfflineSync
} from '../utils/offline-sync';

interface OfflineSyncState {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    updateAvailable: boolean;
}

export function useOfflineSync() {
    const [state, setState] = useState<OfflineSyncState>({
        isOnline: isOnline(),
        pendingCount: 0,
        isSyncing: false,
        lastSyncTime: null,
        updateAvailable: false
    });

    // Sync all data
    const handleSync = useCallback(async () => {
        if (!isOnline() || state.isSyncing) return;

        setState(prev => ({ ...prev, isSyncing: true }));

        try {
            await syncAllData();
        } catch (error) {
            console.error('Sync failed:', error instanceof Error ? error.message : 'Unknown error');
            setState(prev => ({ ...prev, isSyncing: false }));
        }
    }, [state.isSyncing]);

    // Update online status
    useEffect(() => {
        const handleOnline = () => {
            setState(prev => ({ ...prev, isOnline: true }));
            // Auto-sync when coming back online
            handleSync();
        };

        const handleOffline = () => {
            setState(prev => ({ ...prev, isOnline: false }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleSync]);

    // Update pending count
    const updatePendingCount = useCallback(async () => {
        const count = await getPendingCount();
        setState(prev => ({ ...prev, pendingCount: count }));
    }, []);

    // Listen for sync complete
    useEffect(() => {
        const handleSyncComplete = () => {
            setState(prev => ({
                ...prev,
                isSyncing: false,
                lastSyncTime: new Date()
            }));
            updatePendingCount();
        };

        window.addEventListener('sync-complete', handleSyncComplete);

        return () => {
            window.removeEventListener('sync-complete', handleSyncComplete);
        };
    }, [updatePendingCount]);

    // Listen for service worker updates
    useEffect(() => {
        const handleUpdate = () => {
            setState(prev => ({ ...prev, updateAvailable: true }));
        };

        window.addEventListener('sw-update-available', handleUpdate);

        return () => {
            window.removeEventListener('sw-update-available', handleUpdate);
        };
    }, []);

    // Initial pending count
    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    // Save data for offline sync
    const saveOffline = useCallback(
        async (storeName: string, endpoint: string, method: string, data: unknown) => {
            await saveForOfflineSync(storeName, endpoint, method, data);
            await updatePendingCount();
        },
        [updatePendingCount]
    );

    // Reload to activate new service worker
    const activateUpdate = useCallback(() => {
        window.location.reload();
    }, []);

    return {
        ...state,
        sync: handleSync,
        saveOffline,
        activateUpdate,
        refreshPendingCount: updatePendingCount
    };
}

// Hook for specific store
export function useOfflineStore(storeName: string) {
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const updateCount = async () => {
            const count = await getPendingCount(storeName);
            setPendingCount(count);
        };

        updateCount();

        const handleSyncComplete = () => {
            updateCount();
        };

        window.addEventListener('sync-complete', handleSyncComplete);

        return () => {
            window.removeEventListener('sync-complete', handleSyncComplete);
        };
    }, [storeName]);

    const saveData = useCallback(
        async (endpoint: string, method: string, data: unknown) => {
            await saveForOfflineSync(storeName, endpoint, method, data);
            const count = await getPendingCount(storeName);
            setPendingCount(count);
        },
        [storeName]
    );

    return {
        pendingCount,
        saveData
    };
}
