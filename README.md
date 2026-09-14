# E-Form Offline-First PWA

Progressive Web App untuk E-Form System dengan dukungan offline mode penuh.

## 🎯 Fitur

- ✅ **Auto Offline Mode** - Saat signal hilang, app beralih otomatis ke mode offline
- ✅ **Login Tersimpan** - Tidak perlu login ulang di mode offline
- ✅ **Isi Form Lengkap** - Bisa isi semua field form tanpa internet
- ✅ **Lihat & Download File** - File-file cached bisa diakses offline
- ✅ **Save Lokal** - Semua data disimpan di IndexedDB
- ✅ **Auto-Sync** - Saat online, data sync otomatis ke server
- ✅ **Background Sync** - Sync berjalan bahkan saat app ditutup

## 📁 Struktur

```
eform-offline-pwa/
├── public/
│   ├── index.php          (Redirect ke frontend)
│   └── manifest.json      (PWA metadata)
│
├── frontend/
│   ├── js/
│   │   ├── app.js              (Main app logic)
│   │   ├── service-worker.js   (Service Worker)
│   │   ├── db.js               (IndexedDB operations)
│   │   ├── storage.js          (LocalStorage wrapper)
│   │   ├── auth.js             (Auth logic)
│   │   ├── form.js             (Form handling)
│   │   ├── sync.js             (Sync logic)
│   │   └── ui.js               (UI utilities)
│   │
│   ├── css/
│   │   ├── style.css           (Main styles)
│   │   └── offline.css         (Offline mode styles)
│   │
│   └── pages/
│       ├── login.html          (Login page)
│       ├── dashboard.html      (Dashboard)
│       └── form.html           (Form template)
│
├── api/
│   ├── auth.php           (Login API)
│   ├── sync.php           (Sync API endpoint)
│   ├── upload.php         (File upload API)
│   └── forms.php          (Forms API)
│
├── config/
│   ├── database.php       (DB config)
│   ├── auth.php           (Auth config)
│   └── offline.php        (Offline config)
│
└── docs/
    ├── ARCHITECTURE.md    (Architecture docs)
    ├── OFFLINE-FLOW.md    (Offline flow)
    └── API-REFERENCE.md   (API reference)
```

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/arryawie/eform-offline-pwa.git
cd eform-offline-pwa

# Setup database
mysql -u root < database.sql

# Access
http://localhost/eform-offline-pwa
```

## 📚 Documentation

Baca dokumentasi lengkap di folder `/docs`
