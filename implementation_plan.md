# 💸 AT Finance Cost — Monthly Expense Tracker

Aplikasi pencatatan pengeluaran bulanan berbasis **web + Telegram Bot** yang memungkinkan pengguna mencatat transaksi secara manual maupun melalui scan/foto bon/bill belanja. Laporan bulanan tersedia di dashboard web dan bisa dikirim via Telegram.

> 🚀 **Deploy Target: Vercel** — Stack dipilih agar fully compatible dengan Vercel (serverless, stateless).

---

## ✅ Keputusan Final (Semua Sudah Dikonfirmasi)

| Pertanyaan | Pilihan | Status |
|---|---|---|
| Database | **Turso** (libSQL/SQLite cloud) | ✅ Confirmed |
| OCR Engine | **Tesseract.js** (gratis, client-side) | ✅ Confirmed |
| Telegram Bot | **2 arah** — input + laporan | ✅ Confirmed |
| Hosting | **Vercel** | ✅ Confirmed |
| Domain | Default `*.vercel.app` | ✅ Assumed |

---

## ⚠️ Catatan Penting Teknis

> [!NOTE]
> **Turso + Vercel** — ✅ Fully compatible! Turso menggunakan HTTP (bukan TCP), sehingga bekerja sempurna di Vercel Serverless Functions. Cukup install `@libsql/client` dan set 2 env var: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. Bisa langsung integrate via Vercel ↔ Turso integration dashboard.

> [!WARNING]
> **Tesseract.js di Vercel Serverless = ❌ TIDAK BISA** langsung di server karena:
> - File WASM + traineddata bisa melebihi limit 250MB function
> - Vercel membatasi request body **4.5MB** — foto bill biasanya lebih besar
>
> **✅ Solusi: Jalankan Tesseract.js di BROWSER (client-side)**
> Proses OCR terjadi di browser user → hasilnya (teks) dikirim ke API → disimpan ke Turso.
> Keuntungan: gratis 100%, tidak ada limit server, lebih cepat.

> [!NOTE]
> **Telegram + Foto Bill (OCR)** — Karena Tesseract.js harus client-side, foto yang dikirim via Telegram akan di-OCR menggunakan **Telegram File API** → download URL → kirim ke API khusus yang memanggil Tesseract di **Vercel Edge Function** dengan worker thread, atau fallback ke **simple regex pattern matching** untuk struk digital (Tokopedia, Shopee, GoPay).

---

## Proposed Changes

### 🏗️ Arsitektur Sistem (Final)

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER (User)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │             Next.js UI (React)                     │     │
│  │  - Form input manual                               │     │
│  │  - Upload foto → Tesseract.js (OCR di browser)    │     │
│  │  - Dashboard + Charts (Recharts)                   │     │
│  └────────────────────────────┬───────────────────────┘     │
└───────────────────────────────┼──────────────────────────────┘
                                │ API calls (JSON)
┌───────────────────────────────┼──────────────────────────────┐
│              VERCEL PLATFORM  │                              │
│                               ▼                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Next.js API Routes (Serverless)            │     │
│  │  POST /api/transactions   — simpan transaksi       │     │
│  │  GET  /api/transactions   — ambil daftar           │     │
│  │  GET  /api/reports        — laporan bulanan        │     │
│  │  POST /api/telegram/webhook — bot handler          │     │
│  └────────────────────────────────────────────────────┘     │
│                               │                              │
│  ┌────────────────────────────▼───────────────────────┐     │
│  │              Vercel Blob Storage                    │     │
│  │         (simpan foto bill asli sebagai arsip)      │     │
│  └────────────────────────────────────────────────────┘     │
└───────────────────────────────┬──────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
   ┌──────▼──────┐    ┌────────▼────────┐    ┌───────▼────────┐
   │    Turso    │    │  Telegram Bot   │    │  Tesseract.js  │
   │  (libSQL)   │    │  API (Webhook)  │    │  (di Browser)  │
   │  Free tier  │    │  Input+Laporan  │    │  OCR Gratis    │
   └─────────────┘    └─────────────────┘    └────────────────┘
```

---

### 📁 Struktur Project (Final)

```
AT_FINANCE_COST/                          ← 1 repo, deploy ke Vercel
├── app/                                  # Next.js App Router (UI Pages)
│   ├── layout.tsx                        # Root layout + global CSS
│   ├── page.tsx                          # Dashboard utama
│   ├── transactions/
│   │   └── page.tsx                      # Daftar & filter transaksi
│   ├── add/
│   │   └── page.tsx                      # Form input manual
│   └── scan/
│       └── page.tsx                      # Scan bill (Tesseract.js di browser)
│
├── app/api/                              # Serverless API Routes
│   ├── transactions/
│   │   └── route.ts                      # GET, POST, PATCH, DELETE
│   ├── categories/
│   │   └── route.ts                      # GET daftar kategori
│   ├── reports/
│   │   └── route.ts                      # GET laporan bulanan
│   └── telegram/
│       └── webhook/
│           └── route.ts                  # POST — Telegram bot handler
│
├── components/                           # Shared React components
│   ├── TransactionCard.tsx               # Kartu 1 transaksi
│   ├── MonthlyChart.tsx                  # Bar + Pie chart (Recharts)
│   ├── CategoryBadge.tsx                 # Badge warna per kategori
│   ├── BillScanner.tsx                   # Upload + Tesseract.js OCR
│   └── SummaryStats.tsx                  # Total, rata-rata, tertinggi
│
├── lib/
│   ├── turso.ts                          # Turso client (@libsql/client)
│   ├── telegram.ts                       # Telegram bot helper & commands
│   └── reports.ts                        # Generate data laporan
│
├── styles/
│   └── globals.css                       # CSS variables, dark mode, animations
│
├── .env.local                            # API keys (tidak di-commit)
├── .env.example                          # Template env vars
├── vercel.json                           # Konfigurasi Vercel
└── package.json
```

---

### 🗃️ Database Schema (Turso / SQLite syntax)

```sql
-- Kategori pengeluaran
CREATE TABLE categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  icon      TEXT NOT NULL,         -- emoji, e.g. "🍔"
  color     TEXT NOT NULL          -- hex, e.g. "#FF6B6B"
);

-- Transaksi pengeluaran
CREATE TABLE transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  store_name      TEXT NOT NULL,
  item            TEXT NOT NULL,
  total           REAL NOT NULL,
  date            TEXT NOT NULL,   -- ISO 8601: "2026-06-21"
  category_id     INTEGER REFERENCES categories(id),
  source          TEXT DEFAULT 'manual', -- 'manual' | 'ocr' | 'telegram'
  bill_image_url  TEXT,            -- URL Vercel Blob (opsional)
  ocr_raw_text    TEXT,            -- Raw text hasil Tesseract (untuk debug)
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Seed data kategori default
INSERT INTO categories (name, icon, color) VALUES
  ('Makanan & Minuman', '🍔', '#FF6B6B'),
  ('Transport',         '🚗', '#4ECDC4'),
  ('Belanja',           '🛍️', '#45B7D1'),
  ('Hiburan',           '🎬', '#96CEB4'),
  ('Kesehatan',         '💊', '#FFEAA7'),
  ('Tagihan',           '📱', '#DDA0DD'),
  ('Lainnya',           '📦', '#B0C4DE');
```

---

### ✨ Fitur Detail

#### 1. Input Manual (Free Text)
- Form field: **Nama Toko, Item, Total (Rp), Tanggal, Kategori**
- Auto-suggest nama toko dari histori sebelumnya
- Format Rupiah otomatis saat mengetik (e.g. `25000` → `Rp 25.000`)
- Keyboard shortcut: tekan Enter untuk submit

#### 2. Scan Bill / OCR (Client-Side Tesseract.js)
```
User upload foto  →  Browser load Tesseract.js
     ↓
Tesseract proses foto (di browser, tanpa kirim ke server)
     ↓
Hasil teks di-parse dengan regex:
  - Cari pola harga: Rp 25.000 / 25,000 / IDR 25000
  - Cari nama toko (baris pertama biasanya)
  - Cari tanggal (dd/mm/yyyy)
     ↓
Tampilkan form pre-filled → User review & edit → Simpan ke API
```
- Support: JPG, PNG, PDF (screenshot)
- Akurasi lebih baik untuk foto terang & teks digital
- Tombol "Scan Ulang" jika hasil kurang akurat

#### 3. Telegram Bot (2 Arah)

**Input ke bot:**
| Command/Aksi | Fungsi |
|---|---|
| `/start` | Sambutan + daftar perintah |
| `/catat Kopi Janji Jiwa 25000` | Catat cepat (toko + item + total) |
| `/catat` | Wizard step-by-step (toko? item? total? kategori?) |
| Kirim foto struk | Download via Telegram API → OCR regex → konfirmasi |
| `/hapus [id]` | Hapus transaksi terakhir |

**Laporan dari bot:**
| Command | Fungsi |
|---|---|
| `/laporan` | Ringkasan bulan ini (total + top kategori) |
| `/laporan 2026-05` | Laporan bulan tertentu |
| `/total` | Total pengeluaran hari ini |
| `/minggu` | Total 7 hari terakhir |

**Notifikasi otomatis:**
- Akhir bulan: laporan bulanan dikirim otomatis
- Setiap transaksi berhasil: konfirmasi singkat

#### 4. Dashboard & Laporan Bulanan
- **Header stats**: Total bulan ini | Rata-rata/hari | Pengeluaran terbesar
- **Bar chart**: Pengeluaran per hari dalam bulan berjalan
- **Pie chart**: Distribusi per kategori
- **Tabel transaksi**: Filter by tanggal, kategori, toko + search
- **Export CSV**: Download semua transaksi bulan ini
- **Export PDF**: Laporan ringkas dengan chart

---

### 🔧 Tech Stack Final (Semua Terkonfirmasi)

| Layer | Teknologi | Keterangan |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Frontend + API 1 repo |
| Database | **Turso** (libSQL/SQLite) | Free: 9GB, HTTP-based ✅ Vercel |
| ORM | **Drizzle ORM** | Type-safe, libSQL native support |
| File Storage | **Vercel Blob** | Arsip foto bill |
| OCR | **Tesseract.js** (browser) | Gratis, tanpa server limit ✅ |
| Telegram | **Webhook** via API Route | `node-telegram-bot-api` |
| Styling | **Vanilla CSS** (dark mode, glassmorphism) | |
| Charts | **Recharts** | Bar, Pie chart |
| Export | **jsPDF** + **papaparse** | PDF & CSV |
| Deploy | **Vercel** | Auto deploy dari GitHub |

---

### 🔐 Environment Variables

```env
# Turso Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOi...

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=random_secret_string_here

# Vercel Blob (auto-set oleh Vercel jika pakai integration)
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

> **Catatan**: Tidak ada OpenAI API key yang dibutuhkan karena OCR pakai Tesseract.js gratis! 🎉

---

### 🚀 Langkah Setup & Deploy

1. **Setup Turso**
   ```bash
   npx turso db create at-finance-cost
   npx turso db show at-finance-cost   # dapat URL
   npx turso db tokens create at-finance-cost  # dapat token
   ```

2. **Setup Telegram Bot**
   - Buka [@BotFather](https://t.me/BotFather) di Telegram
   - `/newbot` → beri nama → dapat `BOT_TOKEN`

3. **Push ke GitHub** → Import di [vercel.com](https://vercel.com)

4. **Set Environment Variables** di Vercel Dashboard

5. **Deploy** → dapat URL `https://at-finance-cost.vercel.app`

6. **Aktifkan Telegram Webhook**:
   ```
   https://api.telegram.org/bot{TOKEN}/setWebhook
     ?url=https://at-finance-cost.vercel.app/api/telegram/webhook
     &secret_token={WEBHOOK_SECRET}
   ```

7. **Jalankan migrasi DB** via Turso CLI:
   ```bash
   npx turso db shell at-finance-cost < schema.sql
   ```

---

## Verification Plan

### Automated Tests
- `npm run build` — pastikan tidak ada TypeScript error
- Drizzle schema validation

### Manual Verification
- [ ] Input manual transaksi → muncul di dashboard
- [ ] Upload foto struk → Tesseract ekstrak teks di browser
- [ ] Data OCR pre-fill form → edit → simpan ke Turso
- [ ] Kirim `/catat` di Telegram → tersimpan, konfirmasi dikirim balik
- [ ] Kirim foto bill ke Telegram → bot membalas dengan data transaksi
- [ ] Dashboard chart tampil benar berdasarkan data Turso
- [ ] Export CSV/PDF berfungsi
- [ ] `/laporan` via Telegram mengirim ringkasan bulanan

---

*Plan difinalisasi: 21 Juni 2026 — Siap untuk eksekusi* ✅
