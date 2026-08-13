<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h2 class="text-xl font-bold text-slate-900">Dokumentasi API Eksternal</h2>
      <p class="text-sm text-slate-500 mt-0.5">Integrasi create ticket, komentar, close ticket, dan webhook dari sistem lain</p>
    </div>

    <!-- Auth -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-base font-bold text-slate-800 mb-2">🔑 Autentikasi</h3>
      <p class="text-sm text-slate-600 mb-3">
        Sistem eksternal harus <strong>didaftarkan</strong> dulu di project yang mau diakses — satu sistem terdaftar hanya bisa mengakses satu project.
        Semua endpoint eksternal diautentikasi via header berikut:
      </p>
      <CodeBlock code="X-API-Key: <api_key_sistem>" />
      <p class="text-sm text-slate-600 mt-3">
        Daftarkan sistem lewat halaman project (admin) → tab <strong>Integrasi API</strong> → <strong>Daftarkan Sistem</strong> — memanggil
        <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">POST /api/projects/{id}/registered-systems</code>.
        <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">api_key</code> (dan <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">webhook_secret</code> jika webhook URL diisi) hanya tampil sekali saat pendaftaran.
      </p>
      <div class="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
        401 jika key kosong/invalid · 403 jika sistem/project nonaktif
      </div>
    </div>

    <!-- Upload File -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">POST</span>
        <code class="text-sm font-semibold text-slate-800">/api/external/upload</code>
      </div>
      <p class="text-sm text-slate-600 mb-3">
        Field <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">attachments</code> di Create Ticket & Comment hanya menerima metadata, bukan file binary.
        Upload dulu file-nya di sini (<code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">multipart/form-data</code>, field <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">file</code>),
        lalu sertakan hasilnya sebagai elemen array <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">attachments</code>. Maks 10MB, gambar otomatis di-resize & dikonversi JPEG.
      </p>
      <CodeBlock code='curl -X POST https://ticketing.example.com/api/external/upload \
  -H "X-API-Key: <api_key>" \
  -F "file=@screenshot.png"' />
      <p class="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-3 mb-1">Contoh response</p>
      <CodeBlock code='{
  "success": true,
  "data": {
    "filename": "ticket/4_it_infrastructure/20260813/175-ab12.jpg",
    "original_name": "screenshot.png",
    "mime_type": "image/jpeg",
    "size": 84213
  }
}' />
      <div class="mt-3 bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-700">
        400 tidak ada file / tipe tidak diizinkan / > 10MB · 401 API key invalid · 403 sistem/project nonaktif
      </div>
    </div>

    <!-- Create Ticket -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">POST</span>
        <code class="text-sm font-semibold text-slate-800">/api/external/tickets</code>
      </div>
      <p class="text-sm text-slate-600 mb-3">
        Field request sama persis dengan endpoint internal <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">POST /api/tickets</code> —
        ticket yang dihasilkan identik bentuknya dengan ticket yang dibuat lewat UI. Bedanya hanya <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">project_id</code> (ditentukan dari project tempat sistem terdaftar)
        dan <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">created_by_email</code> sebagai pengganti sesi login.
      </p>
      <div class="overflow-x-auto mb-3">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-left text-slate-400 uppercase tracking-wide">
              <th class="py-1.5 pr-3">Field</th><th class="py-1.5 pr-3">Wajib</th><th class="py-1.5">Keterangan</th>
            </tr>
          </thead>
          <tbody class="text-slate-600">
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">title</td><td>ya</td><td>Judul ticket</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">created_by_email</td><td>ya</td><td>Email user terdaftar & aktif</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">description</td><td>-</td><td>Deskripsi ticket</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">priority_id</td><td>-</td><td>Default: order_index terkecil</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">status_id</td><td>-</td><td>Default: order_index terkecil</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">assigned_to</td><td>-</td><td>User id assignee</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">due_date</td><td>-</td><td>Default: dihitung dari SLA priority</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">participants</td><td>-</td><td>Array user id</td></tr>
            <tr class="border-t border-slate-100"><td class="py-1.5 pr-3 font-mono">attachments</td><td>-</td><td>{filename, original_name, mime_type, size}[]</td></tr>
          </tbody>
        </table>
      </div>
      <CodeBlock code='curl -X POST https://ticketing.example.com/api/external/tickets \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d &apos;{"title":"Pembayaran gagal","created_by_email":"integrasi@partner.com"}&apos;' />
      <div class="mt-3 bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-700">
        400 field tidak lengkap / email tidak ditemukan · 401 API key invalid · 403 sistem/project nonaktif
      </div>
    </div>

    <!-- Comment -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">POST</span>
        <code class="text-sm font-semibold text-slate-800">/api/external/tickets/{id}/comments</code>
      </div>
      <p class="text-sm text-slate-600 mb-3">Menambahkan komentar/diskusi ke ticket. Field: <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">message</code> (wajib),
        <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">author_email</code> (wajib), <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">is_internal</code> (opsional, default false),
        <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">attachments</code> (opsional, hasil dari <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">POST /api/external/upload</code>).</p>
      <CodeBlock code='curl -X POST https://ticketing.example.com/api/external/tickets/123/comments \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d &apos;{"message":"Update progres","author_email":"integrasi@partner.com"}&apos;' />
      <div class="mt-3 bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-700">
        400 field tidak lengkap · 401 API key invalid · 403 ticket bukan milik project tempat sistem ini terdaftar · 404 ticket tidak ditemukan
      </div>
    </div>

    <!-- Close -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">POST</span>
        <code class="text-sm font-semibold text-slate-800">/api/external/tickets/{id}/close</code>
      </div>
      <p class="text-sm text-slate-600 mb-3">
        "Closed" adalah status apa pun dengan <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">is_resolved = 1</code>. Jika <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">status_id</code> tidak dikirim,
        dipilih otomatis status resolved pertama.
      </p>
      <CodeBlock code='curl -X POST https://ticketing.example.com/api/external/tickets/123/close \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d &apos;{"closed_by_email":"integrasi@partner.com","resolution_type":"fixed"}&apos;' />
      <div class="mt-3 bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-700">
        400 status_id bukan resolved / email tidak ditemukan · 401 API key invalid · 403 ticket bukan milik project tempat sistem ini terdaftar · 404 ticket tidak ditemukan
      </div>
    </div>

    <!-- Webhook -->
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-base font-bold text-slate-800 mb-2">🔔 Webhook</h3>
      <p class="text-sm text-slate-600 mb-3">
        Webhook URL & secret diatur <strong>per sistem terdaftar</strong> (bukan per project) — diisi saat mendaftarkan sistem atau lewat Edit di tab Integrasi API. Saat event terjadi,
        dikirim ke <strong>semua sistem aktif</strong> yang terdaftar pada project itu dan subscribe event tsb, bukan cuma sistem yang memicu aksinya. Secret hanya tampil sekali saat dibuat/diisi/regenerate.
      </p>
      <p class="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Event tersedia</p>
      <div class="flex flex-wrap gap-2 mb-3">
        <span v-for="e in events" :key="e" class="text-[11px] font-mono px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">{{ e }}</span>
      </div>
      <p class="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Format payload</p>
      <CodeBlock code='{
  "event": "ticket.created",
  "data": { "...": "row ticket" },
  "timestamp": "2026-08-13T10:00:00.000Z"
}' />
      <p class="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-3 mb-1">Verifikasi signature (header X-Webhook-Signature)</p>
      <CodeBlock code="const crypto = require('crypto')

function isValidSignature(rawBody, signatureHeader, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
}" />
      <div class="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600">
        Tidak ada retry otomatis. Setiap percobaan pengiriman dicatat di tabel <code class="font-mono">webhook_deliveries</code> untuk audit internal.
      </div>
    </div>

    <p class="text-xs text-slate-400 text-center">
      Dokumentasi lengkap juga tersedia di repo: <code class="font-mono">docs/EXTERNAL_API.md</code>
    </p>
  </div>
</template>

<script setup lang="ts">
const events = ['ticket.created', 'ticket.commented', 'ticket.closed', 'ticket.status_changed']
</script>
