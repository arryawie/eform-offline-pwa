/**
 * LocalStorage Wrapper for Session & Status
 */

class StorageManager {
    constructor() {
        this.prefix = 'eform:';
    }

    // Auth
    setAuthToken(token) {
        localStorage.setItem(this.prefix + 'auth:token', token);
    }

    getAuthToken() {
        return localStorage.getItem(this.prefix + 'auth:token');
    }

    setUser(userId, fullname, role, email) {
        localStorage.setItem(this.prefix + 'auth:userId', userId);
        localStorage.setItem(this.prefix + 'auth:fullname', fullname);
        localStorage.setItem(this.prefix + 'auth:role', role);
        localStorage.setItem(this.prefix + 'auth:email', email);
        localStorage.setItem(this.prefix + 'auth:isLoggedIn', 'true');
    }

    getUser() {
        return {
            userId: localStorage.getItem(this.prefix + 'auth:userId'),
            fullname: localStorage.getItem(this.prefix + 'auth:fullname'),
            role: localStorage.getItem(this.prefix + 'auth:role'),
            email: localStorage.getItem(this.prefix + 'auth:email'),
            isLoggedIn: localStorage.getItem(this.prefix + 'auth:isLoggedIn') === 'true'
        };
    }

    clearUser() {
        const keys = ['token', 'userId', 'fullname', 'role', 'email', 'isLoggedIn'];
        keys.forEach(key => localStorage.removeItem(this.prefix + 'auth:' + key));
    }

    // Offline Status
    setOfflineMode(isOffline) {
        localStorage.setItem(this.prefix + 'offline:mode', isOffline ? 'true' : 'false');
    }

    isOfflineMode() {
        return localStorage.getItem(this.prefix + 'offline:mode') === 'true';
    }

    setLastOnlineAt(timestamp) {
        localStorage.setItem(this.prefix + 'offline:lastOnlineAt', timestamp);
    }

    getLastOnlineAt() {
        return localStorage.getItem(this.prefix + 'offline:lastOnlineAt');
    }

    // Sync Status
    setLastSyncAt(timestamp) {
        localStorage.setItem(this.prefix + 'sync:lastSyncAt', timestamp);
    }

    getLastSyncAt() {
        return localStorage.getItem(this.prefix + 'sync:lastSyncAt');
    }

    setSyncing(isSyncing) {
        localStorage.setItem(this.prefix + 'sync:isSyncing', isSyncing ? 'true' : 'false');
    }

    isSyncing() {
        return localStorage.getItem(this.prefix + 'sync:isSyncing') === 'true';
    }

    // Pending counts
    setPendingCount(count) {
        localStorage.setItem(this.prefix + 'offline:pendingCount', count);
    }

    getPendingCount() {
        return parseInt(localStorage.getItem(this.prefix + 'offline:pendingCount') || '0');
    }
}

const storage = new StorageManager();
