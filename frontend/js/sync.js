/**
 * Sync Engine for Offline-First Forms
 * Handles data synchronization between local and server
 */

class SyncEngine {
    constructor() {
        this.apiUrl = '/api';
        this.syncInProgress = false;
        this.syncInterval = 30000; // 30 seconds
    }

    /**
     * Initialize sync engine
     */
    init() {
        // Listen to online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Periodic sync check
        setInterval(() => this.checkAndSync(), this.syncInterval);

        console.log('✓ Sync engine initialized');
    }

    /**
     * Handle online event
     */
    async handleOnline() {
        console.log('🟢 Connection restored');
        storage.setOfflineMode(false);
        storage.setLastOnlineAt(new Date().toISOString());
        
        // Update UI
        this.updateOfflineUI();
        
        // Trigger sync
        await this.syncAllPendingForms();
    }

    /**
     * Handle offline event
     */
    handleOffline() {
        console.log('🔴 Connection lost');
        storage.setOfflineMode(true);
        
        // Update UI
        this.updateOfflineUI();
    }

    /**
     * Check if online and sync if needed
     */
    async checkAndSync() {
        if (!navigator.onLine || this.syncInProgress) return;

        const pendingCount = (await offlineDB.getPendingSubmissions()).length;
        if (pendingCount > 0) {
            console.log(`📤 ${pendingCount} pending forms detected, syncing...`);
            await this.syncAllPendingForms();
        }
    }

    /**
     * Sync all pending forms
     */
    async syncAllPendingForms() {
        if (this.syncInProgress) return;
        this.syncInProgress = true;
        storage.setSyncing(true);

        try {
            // Get pending submissions
            const pending = await offlineDB.getPendingSubmissions();
            if (pending.length === 0) {
                console.log('✓ No pending forms to sync');
                this.syncInProgress = false;
                storage.setSyncing(false);
                return;
            }

            console.log(`📤 Syncing ${pending.length} forms...`);

            // Get auth token
            const token = storage.getAuthToken();
            if (!token) {
                console.error('❌ No auth token found');
                this.syncInProgress = false;
                storage.setSyncing(false);
                return;
            }

            // Prepare payload
            const payload = {
                token: token,
                forms: pending.map(form => ({
                    form_id: form.form_id,
                    formData: form.formData,
                    submissionId: form.id
                }))
            };

            // Send to server
            const response = await fetch(this.apiUrl + '/sync.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();

            // Update local status
            if (result.synced && result.synced.length > 0) {
                for (const submissionId of result.synced) {
                    await offlineDB.updateSubmissionStatus(submissionId, 'synced');
                }
                console.log(`✓ ${result.synced.length} forms synced successfully`);
            }

            if (result.failed && result.failed.length > 0) {
                console.warn(`⚠ ${result.failed.length} forms failed to sync`);
                result.failed.forEach(item => {
                    console.error(`  - ${item.id}: ${item.error}`);
                });
            }

            // Update sync timestamp
            storage.setLastSyncAt(new Date().toISOString());
            
            // Show notification
            this.showNotification('✓ Data berhasil disinkronisasi!', 'success');

        } catch (error) {
            console.error('❌ Sync error:', error);
            this.showNotification(`Sync gagal: ${error.message}`, 'error');
        } finally {
            this.syncInProgress = false;
            storage.setSyncing(false);
        }
    }

    /**
     * Update offline UI elements
     */
    updateOfflineUI() {
        const banner = document.getElementById('offlineBanner');
        if (!banner) return;

        if (storage.isOfflineMode()) {
            banner.style.display = 'flex';
            banner.innerHTML = '🔴 Mode Offline - Data Anda tersimpan secara lokal';
        } else {
            banner.style.display = 'none';
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `notification notification-${type}`;
        div.textContent = message;
        document.body.appendChild(div);

        setTimeout(() => div.remove(), 5000);
    }
}

const syncEngine = new SyncEngine();
