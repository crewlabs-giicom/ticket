# External API — Integrasi Ticket per Project

Dokumentasi ini untuk sistem/aplikasi lain yang ingin berintegrasi dengan ticketing ini: membuat ticket, menambahkan komentar/diskusi, menutup ticket, dan menerima notifikasi realtime lewat webhook.

Versi in-app dari dokumentasi ini tersedia di halaman `/api-docs` (menu sidebar "Dokumentasi API").

## Autentikasi

Setiap sistem eksternal yang mau berintegrasi harus **didaftarkan** terlebih dahulu di project yang ingin diaksesnya. Satu sistem terdaftar hanya bisa mengakses **satu project** — API key yang didapat hanya berlaku untuk project tempat sistem itu didaftarkan.

Semua endpoint eksternal diautentikasi lewat header:

```
X-API-Key: <api_key_sistem>
```

### Mendaftarkan sistem & mendapatkan API key

1. Login sebagai admin.
2. Buka halaman project → tab **Integrasi API** → **Daftarkan Sistem** (memanggil `POST /api/projects/{id}/registered-systems`) — isi nama sistem, deskripsi opsional, dan webhook URL jika perlu menerima notifikasi (lihat bagian Webhook di bawah).
3. `api_key` (dan `webhook_secret` jika webhook URL diisi) hanya ditampilkan **sekali** saat pendaftaran — simpan dengan aman. Regenerate lewat tombol **Regenerate Key** akan langsung menggantikan key lama (key lama langsung tidak berlaku).

Jika key tidak valid → `401 Unauthorized`. Jika sistem dinonaktifkan → `403 Forbidden` ("Sistem tidak aktif"). Jika project sedang nonaktif → `403 Forbidden` ("Project tidak aktif").

Semua request POST harus menyertakan header `Content-Type: application/json` — kecuali endpoint upload file yang memakai `multipart/form-data`.

## 0. Upload File (untuk attachment)

```
POST /api/external/upload
```

`attachments` di Create Ticket dan Comment hanya menerima **metadata** file, bukan file binary-nya. Untuk melampirkan file sungguhan, upload dulu file-nya lewat endpoint ini (multipart form-data, field `file`), lalu sertakan metadata hasilnya di array `attachments` saat memanggil Create Ticket atau Comment.

- Tipe file diizinkan: gambar (jpeg/png/gif/webp/svg), pdf, dokumen Office, zip, txt/csv.
- Maksimal ukuran: 10MB.
- Gambar otomatis di-resize maksimal 1920px dan dikonversi ke JPEG kualitas 80.

```bash
curl -X POST https://ticketing.example.com/api/external/upload \
  -H "X-API-Key: <api_key>" \
  -F "file=@screenshot.png"
```

### Contoh response (200)

```json
{
  "success": true,
  "data": {
    "filename": "ticket/4_it_infrastructure/20260813/1755085000-ab12cd.jpg",
    "original_name": "screenshot.png",
    "mime_type": "image/jpeg",
    "size": 84213
  }
}
```

Field `data` ini yang lalu dimasukkan apa adanya sebagai salah satu elemen array `attachments`:

```json
{ "title": "...", "created_by_email": "...", "attachments": [ { "filename": "ticket/4_it_infrastructure/20260813/1755085000-ab12cd.jpg", "original_name": "screenshot.png", "mime_type": "image/jpeg", "size": 84213 } ] }
```

### Error

| Status | Penyebab |
|---|---|
| 400 | Tidak ada file dikirim, tipe file tidak diizinkan, atau ukuran > 10MB |
| 401 | API key kosong/invalid |
| 403 | Project nonaktif |

## 1. Create Ticket

```
POST /api/external/tickets
```

Field request **sama persis** dengan endpoint internal (`POST /api/tickets`) yang dipakai sistem ticketing sendiri — ini menjamin ticket yang dibuat lewat API terlihat identik dengan ticket yang dibuat lewat UI. Satu-satunya perbedaan: `project_id` tidak dikirim di body (ditentukan dari project tempat sistem terdaftar), dan pengganti sesi login adalah `created_by_email`.

| Field | Wajib | Tipe | Keterangan |
|---|---|---|---|
| `title` | ya | string | Judul ticket |
| `created_by_email` | ya | string | Email user yang sudah terdaftar & aktif di sistem, jadi pembuat ticket |
| `description` | tidak | string | Deskripsi ticket |
| `priority_id` | tidak | number | Default: priority dengan `order_index` terkecil |
| `status_id` | tidak | number | Default: status dengan `order_index` terkecil |
| `assigned_to` | tidak | number | User id yang ditugaskan |
| `due_date` | tidak | string (`YYYY-MM-DD HH:mm:ss`) | Default: dihitung dari SLA priority |
| `task_id` | tidak | number | Relasi ke task terkait |
| `subsystem` | tidak | string | |
| `system_menu_id` | tidak | number | |
| `participants` | tidak | number[] | User id yang diundang ke ticket |
| `attachments` | tidak | array | `{ filename, original_name, mime_type, size }[]` — hasil dari `POST /api/external/upload` |

### Contoh request

```bash
curl -X POST https://ticketing.example.com/api/external/tickets \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pembayaran gagal diproses",
    "description": "User melaporkan error saat checkout",
    "created_by_email": "integrasi@partner.com"
  }'
```

### Contoh response (200)

```json
{
  "success": true,
  "data": {
    "id": 123,
    "ticket_number": "TKT-0123",
    "title": "Pembayaran gagal diproses",
    "project_id": 4,
    "priority_id": 2,
    "status_id": 1,
    "created_by": 7,
    "assigned_to": null,
    "due_date": "2026-08-14 10:00:00",
    "resolved_at": null,
    "created_at": "2026-08-13 10:00:00"
  }
}
```

### Error

| Status | Penyebab |
|---|---|
| 400 | `title`/`created_by_email` kosong, atau `created_by_email` tidak ditemukan/tidak aktif |
| 401 | Header `X-API-Key` kosong atau tidak valid |
| 403 | Project nonaktif |

## 2. Comment / Discuss

```
POST /api/external/tickets/{id}/comments
```

| Field | Wajib | Tipe | Keterangan |
|---|---|---|---|
| `message` | ya | string | Isi komentar |
| `author_email` | ya | string | Email user pengirim, harus sudah terdaftar & aktif |
| `is_internal` | tidak | boolean | Default `false` (komentar customer-facing, memicu notifikasi ke creator/assignee/participants) |
| `attachments` | tidak | array | `{ filename, original_name, mime_type, size }[]` — hasil dari `POST /api/external/upload` |

```bash
curl -X POST https://ticketing.example.com/api/external/tickets/123/comments \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Update: sudah kami cek di sisi kami","author_email":"integrasi@partner.com"}'
```

### Error

| Status | Penyebab |
|---|---|
| 400 | `message`/`author_email` kosong, atau `author_email` tidak ditemukan |
| 401 | API key kosong/invalid |
| 403 | Ticket bukan milik project tempat sistem ini terdaftar, atau sistem/project nonaktif |
| 404 | Ticket tidak ditemukan |

## 3. Action Closed

```
POST /api/external/tickets/{id}/close
```

"Closed" bukan status khusus — sistem ini memakai status apa pun yang ditandai `is_resolved = 1`. Jika `status_id` tidak dikirim, endpoint otomatis memakai status resolved pertama.

| Field | Wajib | Tipe | Keterangan |
|---|---|---|---|
| `status_id` | tidak | number | Harus status dengan `is_resolved = 1`, kalau tidak dikirim dipilih otomatis |
| `closed_by_email` | tidak | string | Email user yang tercatat menutup ticket (untuk activity log) |
| `resolution_type` | tidak | string | `fixed` atau `mismatch_requirement` |

```bash
curl -X POST https://ticketing.example.com/api/external/tickets/123/close \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"closed_by_email":"integrasi@partner.com","resolution_type":"fixed"}'
```

### Error

| Status | Penyebab |
|---|---|
| 400 | `status_id` dikirim tapi bukan status `is_resolved=1`, `resolution_type` bukan salah satu nilai yang valid, `closed_by_email` tidak ditemukan, atau tidak ada status resolved tersedia sama sekali |
| 401 | API key kosong/invalid |
| 403 | Ticket bukan milik project tempat sistem ini terdaftar, atau sistem/project nonaktif |
| 404 | Ticket tidak ditemukan |

## Webhook

Webhook URL & secret diatur **per sistem terdaftar** (bukan per project), diisi saat mendaftarkan sistem atau lewat tombol **Edit** di tab Integrasi API project. Saat sebuah event ticket terjadi di suatu project, ticketing mengirim POST ke webhook URL **semua sistem aktif** yang terdaftar pada project itu dan subscribe event tersebut — bukan cuma sistem yang memicu aksinya. Jadi kalau ada 2 sistem terdaftar untuk project yang sama, keduanya bisa menerima notifikasi yang sama.

`webhook_secret` **hanya tampil sekali**: saat sistem pertama kali didaftarkan dengan webhook URL terisi, saat webhook URL diisi belakangan lewat Edit (padahal sebelumnya kosong), atau lewat tombol **Regenerate Secret**.

### Event yang tersedia

- `ticket.created`
- `ticket.commented`
- `ticket.closed`
- `ticket.status_changed`

### Format payload

```json
{
  "event": "ticket.created",
  "data": { "...": "isi bergantung event, umumnya row ticket" },
  "timestamp": "2026-08-13T10:00:00.000Z"
}
```

### Verifikasi signature

Setiap request webhook menyertakan header `X-Webhook-Signature`, yaitu HMAC-SHA256 dari body JSON (persis seperti dikirim) menggunakan `webhook_secret` milik sistem terdaftar tersebut.

```js
const crypto = require('crypto')

function isValidSignature(rawBody, signatureHeader, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
}
```

> Gunakan raw request body (belum di-parse) saat menghitung HMAC agar hasilnya cocok.

### Catatan

- Tidak ada retry otomatis. Jika endpoint penerima gagal merespons, pengiriman dianggap gagal dan dicatat di tabel `webhook_deliveries` (untuk audit internal, tidak diekspos lewat API).
- Pastikan endpoint penerima merespons cepat (di bawah beberapa detik) karena tidak ada mekanisme antrian di sisi pengirim.
