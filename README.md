# Shadow Care — Panduan Setup & Deploy

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ticketing.com | password123 |
| Staff | budi@ticketing.com | password123 |
| Staff | siti@ticketing.com | password123 |
| Customer | customer1@example.com | password123 |

---

## Jalankan di Local (Development)

### Prasyarat
- Node.js v18 atau lebih baru
- npm atau pnpm

### Langkah-langkah

```bash
# 1. Masuk ke folder project
cd ticketing-app

# 2. Copy file environment
cp .env.example .env

# 3. Edit .env — ganti JWT_SECRET
nano .env   # atau buka di VS Code

# 4. Install dependencies
npm install

# 5. Jalankan development server
npm run dev
```

Buka browser: **http://localhost:3000**

Database SQLite akan otomatis dibuat di folder `data/ticketing.db`
serta di-seed dengan data dummy saat pertama kali dijalankan.

---

## Build untuk Production

```bash
# Build project
npm run build

# Jalankan server production
npm run start
# atau
node .output/server/index.mjs
```

---

## Deploy di cPanel (Shared Hosting dengan Node.js)

### Prasyarat di cPanel
- Hosting support **Node.js** (cPanel NodeJS Selector)
- Node.js versi **18+**
- Akses SSH atau File Manager

---

### Langkah 1 — Build di Local

```bash
npm install
npm run build
```

Setelah build, folder `.output` akan terbuat berisi semua yang diperlukan.

---

### Langkah 2 — Upload ke cPanel

**Via File Manager cPanel:**
1. Buka cPanel → File Manager
2. Buat folder baru di `public_html` atau di luar `public_html`, misal: `/home/usermu/ticketing`
3. Upload folder `.output` ke server
4. Upload file `.env` (sudah diisi JWT_SECRET)
5. Upload folder `public/uploads` (kosong saja)

**Via FTP (FileZilla):**
```
Host: domain-kamu.com
Username: username cpanel
Password: password cpanel
Port: 21
```
Upload seluruh folder `.output` dan `.env` ke direktori tujuan.

**Via SSH (lebih cepat):**
```bash
# Di local, zip dulu .output
zip -r output.zip .output .env

# Upload via scp
scp output.zip user@domain-kamu.com:/home/user/ticketing/

# Di server, extract
ssh user@domain-kamu.com
cd /home/user/ticketing
unzip output.zip
```

---

### Langkah 3 — Setup Node.js di cPanel

1. Buka **cPanel** → cari **"Setup Node.js App"** atau **"Node.js Selector"**
2. Klik **"Create Application"**
3. Isi form:
   - **Node.js version:** 18.x atau 20.x
   - **Application mode:** Production
   - **Application root:** `/home/usermu/ticketing/.output/server`
   - **Application URL:** domain atau subdomain kamu (misal `tiket.domain.com`)
   - **Application startup file:** `index.mjs`
4. Klik **Save** / **Create**

---

### Langkah 4 — Set Environment Variables

Masih di halaman Node.js App, scroll ke bagian **Environment Variables**, tambahkan:

| Key | Value |
|-----|-------|
| JWT_SECRET | secret-key-kamu-minimal-32-karakter |
| APP_NAME | Shadow Care |
| NODE_ENV | production |

Atau pastikan file `.env` sudah ada di folder aplikasi.

---

### Langkah 5 — Buat folder data & uploads

Via SSH atau File Manager, buat folder:
```
/home/usermu/ticketing/.output/server/data/        ← SQLite database akan disimpan di sini
/home/usermu/ticketing/public/uploads/             ← file attachment
```

Pastikan folder dapat ditulis (writable):
```bash
chmod 755 /home/usermu/ticketing/.output/server/data
chmod 755 /home/usermu/ticketing/public/uploads
```

---

### Langkah 6 — Start Application

Di halaman Node.js App cPanel, klik tombol **"Start"** atau **"Restart"**.

Buka browser ke domain/subdomain kamu — aplikasi siap digunakan!

---

### Langkah 7 — Setup Domain / Subdomain (opsional)

Jika ingin pakai subdomain khusus (misal `tiket.domain.com`):
1. cPanel → **Subdomains** → buat subdomain baru
2. Arahkan document root ke folder aplikasi
3. Di Node.js App, set Application URL ke subdomain tersebut

---

## Catatan Penting

### Keamanan Production
Sebelum go live, **wajib** ganti di file `server/utils/auth.ts`:
```typescript
// Ganti fungsi hashPassword dan verifyPassword
// dengan implementasi bcrypt yang sesungguhnya:
import bcrypt from 'bcryptjs'
export function hashPassword(p: string) { return bcrypt.hashSync(p, 10) }
export function verifyPassword(p: string, h: string) { return bcrypt.compareSync(p, h) }
```
Lalu `npm install bcryptjs` dan rebuild.

### Reset Database
Hapus file `data/ticketing.db` → restart server → database akan dibuat ulang dari awal dengan data seed.

### Backup Database
File database ada di `data/ticketing.db` — cukup copy file ini untuk backup.

### Update Aplikasi
```bash
# Di local
npm run build

# Upload .output baru ke server
# Restart Node.js App di cPanel
```

---

## Troubleshooting

**App tidak bisa start:**
- Cek versi Node.js sudah 18+
- Pastikan `.env` sudah ada dan JWT_SECRET diisi
- Cek log error di cPanel Node.js App → Log

**Database error:**
- Pastikan folder `data/` ada dan writable
- Coba hapus `data/ticketing.db` dan restart untuk rebuild

**Login gagal:**
- Gunakan email sesuai tabel demo di atas
- Password default semua akun: `password123`

**Upload file tidak bisa:**
- Pastikan folder `public/uploads/` ada dan writable (`chmod 755`)

**Port conflict di local:**
```bash
PORT=4000 npm run dev
```
