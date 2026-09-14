# Offline-First PWA Implementation Plan untuk E-Form System

## 📋 Analisis Sistem Saat Ini

**Tech Stack:**
- Backend: PHP PDO (MySQL)
- Frontend: HTML/CSS/JS Vanilla
- Database: 11 Tabel (users, forms, form_submissions, notifications, etc)
- Forms: 3 tipe (Form A, SPPD, ST)
- Auth: Session-based (super_admin, admin, user)

---

## 🎯 Arsitektur Offline-First

### 1. **Service Worker** (Caching Strategy)

**File:** `frontend/js/service-worker.js`

```
Cache Strategy:
├─ App Shell (Cache-First)
│  ├─ index.html
│  ├─ dashboard.html
│  ├─ form.html
│  ├─ css/style.css
│  └─ js/app.js, db.js, sync.js
│
├─ API Calls (Network-First with fallback)
│  ├─ GET /api/forms.php → cached JSON
│  ├─ GET /api/form-data.php → cached submission
│  └─ POST /api/sync.php → queue offline
│
└─ Files (Cache-First)
   ├─ PDF templates
   ├─ Images
   └─ Downloads
```

### 2. **IndexedDB Schema** (Local Data)

**File:** `frontend/js/db.js`

```javascript
// Database Name: eformdb_offline
// Version: 1

// Tables:
├─ "users" (key: id)
│  ├─ id, username, fullname, email, role
│  └─ isLoggedIn, lastLogin, sessionToken
│
├─ "forms" (key: id)
│  ├─ id, form_key, form_name, icon, description
│  └─ kop_instansi, kop_alamat, kop_telp, kop_email
│
├─ "form_submissions" (key: id, index: userId, status)
│  ├─ id, user_id, form_id, formData (JSON)
│  ├─ status: pending|synced|failed
│  ├─ version, created_at, updated_at
│  └─ syncedAt, retryCount
│
├─ "form_drafts" (key: id, index: formId, userId)
│  ├─ id, user_id, form_id, draftData (JSON)
│  ├─ lastSaved, autoSaveInterval
│  └─ isAutoSaved
│
├─ "files" (key: id, index: submissionId)
│  ├─ id, submission_id, fileName, fileData (Blob)
│  ├─ fileSize, mimeType, uploadedAt
│  └─ status: pending|synced
│
├─ "sync_queue" (key: id, index: type)
│  ├─ id, type: form|file|delete
│  ├─ payload (JSON), retries
│  └─ createdAt, lastRetry
│
└─ "offline_cache" (key: key)
   ├─ key: unique identifier
   ├─ value: cached data
   └─ expiredAt, isCritical
```

### 3. **LocalStorage** (Session & Status)

**File:** `frontend/js/storage.js`

```javascript
{
  // Auth
  "auth:token": "session_token_xxx",
  "auth:userId": "3",
  "auth:role": "user",
  "auth:fullname": "Budi Santoso",
  "auth:isLoggedIn": "true",

  // Offline Status
  "offline:mode": "true|false",
  "offline:lastOnlineAt": "2026-09-14T10:30:00Z",
  "offline:pendingCount": "3",
  "offline:failedCount": "1",

  // Sync Status
  "sync:lastSyncAt": "2026-09-14T10:25:00Z",
  "sync:isSyncing": "false",
  "sync:nextRetry": "2026-09-14T10:35:00Z",

  // UI Preferences
  "ui:theme": "light|dark",
  "ui:sidebarOpen": "true|false",
  "ui:lastViewedForm": "form_a"
}
```

### 4. **Sync Logic** (Auto-Sync)

**File:** `frontend/js/sync.js`

**Flow:**
```
1. User Online Detection
   └─ window.addEventListener('online', syncPendingForms)
   └─ setInterval(checkConnection, 5000)

2. Get Pending Items
   └─ Query IndexedDB: "form_submissions" WHERE status = "pending"
   └─ Query IndexedDB: "files" WHERE status = "pending"

3. Prepare Payload
   └─ Batch forms & files
   └─ Include user_id, form_id, formData, files

4. POST /api/sync.php
   └─ Server validate & insert
   └─ Return: { synced: [ids], failed: [{id, error}] }

5. Update Local State
   └─ Mark synced items → status = "synced"
   └─ Mark failed items → retry later
   └─ Update lastSyncAt
   └─ Show notification to user
```

### 5. **API Endpoints** (Backend)

**New APIs needed:**

```php
// 1. POST /api/auth.php
Action: login
Input: { username, password }
Output: { success, token, user: { id, name, role, forms } }

// 2. POST /api/sync.php
Action: sync_forms
Input: {
  token: "session_token",
  forms: [
    {
      form_id: 1,
      form_key: "form_a",
      formData: { ... },
      files: [ { name, base64, size } ]
    }
  ]
}
Output: {
  success: true,
  synced: [1, 2, 3],
  failed: [{ id, error: "validation error" }]
}

// 3. GET /api/forms.php
Action: get_forms
Input: { token }
Output: { forms: [ { id, form_key, form_name, icon, ... } ] }

// 4. GET /api/form-data.php?id=1
Action: get_form_data
Input: { token, form_id }
Output: { form: { ... }, userSubmissions: [ ... ] }

// 5. POST /api/download.php
Action: download_submission
Input: { token, submission_id }
Output: PDF file (streamed)
```

---

## 🔄 Offline-Online Flow

### **Scenario 1: User Online → Offline**

```
1. User akses https://eform.nurakreasidigital.my.id/
   └─ Service Worker load cache
   └─ App terbuka normal

2. Signal hilang
   └─ App detect: navigator.onLine = false
   └─ Show banner: "Mode Offline - Data lokal tersimpan"
   └─ Switch to IndexedDB for read operations

3. User buka form
   └─ Render dari cache (app shell)
   └─ Load form template dari cache

4. User isi form & save
   └─ Save ke IndexedDB { status: "pending" }
   └─ Save draft ke IndexedDB
   └─ Show: "✓ Tersimpan lokal (menunggu sync)"

5. User upload file
   └─ Save file ke IndexedDB dengan status: "pending"
   └─ Show file dalam list (lokal)
   └─ File tidak bisa download yet (belum sync)

6. User download/view data
   └─ Get dari IndexedDB cache
   └─ If tidak ada di cache: show "Tidak tersedia offline"
```

### **Scenario 2: User Offline → Online**

```
1. Signal kembali
   └─ App detect: navigator.onLine = true
   └─ Remove offline banner
   └─ Trigger sync otomatis

2. Sync Logic
   └─ Get pending forms dari IndexedDB
   └─ Get pending files dari IndexedDB
   └─ POST ke /api/sync.php dengan batch

3. Server Response
   ├─ Success:
   │  └─ Update IndexedDB: status = "synced"
   │  └─ Show: "✓ 3 form synced!"
   │  └─ Clear dari pending queue
   │
   └─ Error:
      └─ Mark as "failed" in IndexedDB
      └─ Schedule retry dalam 30 detik
      └─ Show: "⚠ Sync gagal, retry..."

4. Post-Sync
   └─ Refresh dashboard
   └─ Load fresh data dari server
   └─ Sync notifications
   └─ Update user preferences
```

---

## 💾 Data Persistence

### **What to Cache:**

✅ **Cache (Service Worker)**
- App shell (HTML, CSS, JS)
- Form templates
- Icons & images
- PDF templates

✅ **IndexedDB (User Data)**
- User profile
- Form submissions (draft & pending)
- File uploads (pending)
- Sync queue
- Cached form lists

✅ **LocalStorage (Session)**
- Auth token
- User ID & role
- Offline mode flag
- Last sync timestamp

### **What NOT to Cache:**

❌ Sensitive data (passwords)
❌ Real-time notifications
❌ Live chat/messages
❌ Third-party integrations (belum sync)

---

## 🛠 Implementation Steps

### **Phase 1: Foundation** (Week 1)
- [ ] Setup Service Worker
- [ ] Setup IndexedDB schema & operations
- [ ] Setup LocalStorage wrapper
- [ ] Implement login offline
- [ ] Setup offline detection UI

### **Phase 2: Form Handling** (Week 2)
- [ ] Create form save/draft logic
- [ ] File upload handling (local)
- [ ] Form validation offline
- [ ] Auto-save to IndexedDB

### **Phase 3: Sync Engine** (Week 3)
- [ ] Create sync API endpoints (PHP)
- [ ] Implement sync queue logic
- [ ] Background sync
- [ ] Error handling & retry

### **Phase 4: Testing & Polish** (Week 4)
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Browser compatibility
- [ ] Deployment & documentation

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   USER BROWSER                          │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  HTML UI (App Shell - Cached by SW)            │   │
│  └────────────┬─────────────────────────────────┘   │
│               │                                     │
│  ┌────────────▼──────┐  ┌──────────────────────┐  │
│  │  JavaScript App   │  │  Service Worker      │  │
│  │  (app.js, ...)    │  │  (Intercept & Cache)│  │
│  └────────┬──────────┘  └──────────────────────┘  │
│           │                                        │
│  ┌────────▼─────────────────────────────────┐   │
│  │  IndexedDB (Local Database)              │   │
│  │  ├─ users                                 │   │
│  │  ├─ forms                                 │   │
│  │  ├�� form_submissions (pending/synced)    │   │
│  │  ├─ files (uploads)                      │   │
│  │  └─ sync_queue                           │   │
│  └────────┬─────────────────────────────────┘   │
│           │                                       │
│  ┌────────▼──────────────────────────────┐      │
│  │  LocalStorage (Session)                │      │
│  │  ├─ auth:token                        │      │
│  │  ├─ offline:mode                      │      │
│  │  └─ sync:lastSyncAt                   │      │
│  └────────┬───────────────────────────────┘      │
└───────────┼──────────────────────────────────────┘
            │
            │ Online Only
            ▼
┌─────────────────────────────────────────────────────────┐
│              API SERVER (PHP)                           │
│                                                         │
│  POST /api/sync.php                                    │
│  ├─ Receive pending forms                             │
│  ├─ Validate & insert to DB                           │
│  └─ Return: { synced: [...], failed: [...] }          │
│                                                         │
│  DB: MySQL (eformdb)                                  │
│  ├─ form_submissions                                  │
│  ├─ users                                             │
│  ├─ forms                                             │
│  └─ files                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Technologies

- **Service Worker API** - Offline caching
- **IndexedDB** - Local database
- **LocalStorage** - Session storage
- **Sync API** - Background sync (optional, graceful fallback)
- **Fetch API** - HTTP requests with offline fallback
- **Web App Manifest** - PWA metadata
- **PHP PDO** - Server-side data persistence
- **MySQL** - Central database

---

## ⚙️ Configuration

### **Backend Config:**
```php
// config/offline.php
define('OFFLINE_SYNC_TIMEOUT', 30000); // ms
define('OFFLINE_MAX_RETRIES', 3);
define('OFFLINE_RETRY_DELAY', 5000); // ms
define('OFFLINE_BATCH_SIZE', 10); // forms per request
define('OFFLINE_MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
```

### **Frontend Config:**
```javascript
// frontend/js/config.js
const OFFLINE_CONFIG = {
  dbName: 'eformdb_offline',
  dbVersion: 1,
  syncInterval: 30000,  // Check online every 30s
  autoSaveInterval: 10000,  // Auto-save every 10s
  maxRetries: 3,
  retryDelay: 5000,
  cacheName: 'eform-v1',
  apiUrl: '/api'
};
```

---

## 📌 Important Notes

1. **Security:** Token disimpan di session, bukan localStorage (secure)
2. **Storage Limit:** IndexedDB ~50MB, LocalStorage ~5-10MB
3. **Sync Reliability:** Gunakan retry logic & queue persistence
4. **User Experience:** Show clear offline/online status
5. **Browser Support:** Service Worker support di 95%+ browsers

---

## 📚 Next Steps

1. Review & approve architecture
2. Create detailed API specification
3. Setup project structure
4. Begin implementation Phase 1
5. Setup CI/CD pipeline
