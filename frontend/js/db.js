/**
 * IndexedDB Manager for Offline-First E-Form
 * Handles all local database operations
 */

class OfflineDB {
    constructor() {
        this.dbName = 'eformdb_offline';
        this.dbVersion = 1;
        this.db = null;
        this.tables = {
            'users': { keyPath: 'id' },
            'forms': { keyPath: 'id' },
            'form_submissions': { 
                keyPath: 'id',
                indexes: [{ name: 'userId', keyPath: 'user_id' }, { name: 'status', keyPath: 'status' }]
            },
            'form_drafts': { 
                keyPath: 'id',
                indexes: [{ name: 'formId', keyPath: 'form_id' }, { name: 'userId', keyPath: 'user_id' }]
            },
            'files': { 
                keyPath: 'id',
                indexes: [{ name: 'submissionId', keyPath: 'submission_id' }]
            },
            'sync_queue': { 
                keyPath: 'id',
                indexes: [{ name: 'type', keyPath: 'type' }, { name: 'status', keyPath: 'status' }]
            },
            'offline_cache': { keyPath: 'key' }
        };
    }

    /**
     * Initialize database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✓ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // Create object stores
                for (const [storeName, config] of Object.entries(this.tables)) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
                        if (config.indexes) {
                            config.indexes.forEach(idx => {
                                store.createIndex(idx.name, idx.keyPath);
                            });
                        }
                    }
                }
                console.log('✓ Object stores created');
            };
        });
    }

    /**
     * Save form submission
     */
    async saveFormSubmission(userId, formId, formData) {
        const tx = this.db.transaction('form_submissions', 'readwrite');
        const store = tx.objectStore('form_submissions');
        
        const data = {
            id: `${userId}_${formId}_${Date.now()}`,
            user_id: userId,
            form_id: formId,
            formData: formData,
            status: 'pending',
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            syncedAt: null,
            retryCount: 0
        };

        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get pending form submissions
     */
    async getPendingSubmissions() {
        const tx = this.db.transaction('form_submissions', 'readonly');
        const store = tx.objectStore('form_submissions');
        const index = store.index('status');

        return new Promise((resolve, reject) => {
            const request = index.getAll('pending');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update submission status
     */
    async updateSubmissionStatus(submissionId, status) {
        const tx = this.db.transaction('form_submissions', 'readwrite');
        const store = tx.objectStore('form_submissions');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(submissionId);
            getRequest.onsuccess = () => {
                const submission = getRequest.result;
                submission.status = status;
                submission.updated_at = new Date().toISOString();
                if (status === 'synced') {
                    submission.syncedAt = new Date().toISOString();
                }
                
                const updateRequest = store.put(submission);
                updateRequest.onsuccess = () => resolve(submission);
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Save user data
     */
    async saveUser(userData) {
        const tx = this.db.transaction('users', 'readwrite');
        const store = tx.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.put(userData);
            request.onsuccess = () => resolve(userData);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get user data
     */
    async getUser(userId) {
        const tx = this.db.transaction('users', 'readonly');
        const store = tx.objectStore('users');

        return new Promise((resolve, reject) => {
            const request = store.get(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data (on logout)
     */
    async clearAll() {
        for (const storeName of Object.keys(this.tables)) {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        console.log('✓ IndexedDB cleared');
    }
}

// Global instance
const offlineDB = new OfflineDB();
