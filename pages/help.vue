<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Panduan & FAQ</h2>
        <p class="text-sm text-slate-500 mt-0.5">Tata cara penggunaan sistem Shadow Care</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button @click="showFlowModal = true" class="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
          Alur Development Fitur Baru
        </button>
        <button @click="tour.startTour(true)" class="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Mulai Tour Interaktif
        </button>
      </div>
    </div>

    <!-- Alur Development Modal -->
    <div v-if="showFlowModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showFlowModal = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 class="text-lg font-bold text-slate-900">Alur Development Fitur Baru</h3>
            <p class="text-xs text-slate-500 mt-0.5">Dari permintaan fitur hingga selesai dikerjakan</p>
          </div>
          <button @click="showFlowModal = false" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">

          <!-- Flow steps -->
          <div class="flex flex-col gap-0">

            <!-- Step 1: Request -->
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold flex-shrink-0">1</div>
                <div class="w-0.5 bg-slate-200 flex-1 mt-2 mb-2"></div>
              </div>
              <div class="pb-6 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base font-bold text-slate-800">📥 Request</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Customer / Staff</span>
                </div>
                <p class="text-sm text-slate-600 mb-2">Fitur baru dimulai dari sebuah <strong>Request</strong> — permintaan fitur atau perubahan yang diajukan oleh customer maupun staff.</p>
                <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-slate-100">
                  <p>✅ Customer mengisi judul, deskripsi, proyek, dan urgensi</p>
                  <p>✅ Staff dapat melihat, menyetujui, menolak (Reject), atau menandai sebagai berdiri sendiri (Standalone)</p>
                  <p>✅ Request yang disetujui dikelompokkan ke dalam PRD</p>
                  <p>⚠️ Request yang berstatus <strong>Rejected</strong> atau <strong>Standalone</strong> tidak bisa diedit lagi</p>
                </div>
              </div>
            </div>

            <!-- Step 2: PRD -->
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold flex-shrink-0">2</div>
                <div class="w-0.5 bg-slate-200 flex-1 mt-2 mb-2"></div>
              </div>
              <div class="pb-6 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base font-bold text-slate-800">📄 PRD (Product Requirements Document)</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Staff / Admin</span>
                </div>
                <p class="text-sm text-slate-600 mb-2">Satu atau beberapa Request dikelompokkan menjadi satu <strong>PRD</strong>. PRD berisi spesifikasi lengkap fitur yang akan dikerjakan.</p>
                <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-slate-100">
                  <p>✅ PRD memiliki versi (v1, v2, …) untuk melacak perubahan spesifikasi</p>
                  <p>✅ PRD memiliki milestone dan task yang harus diselesaikan</p>
                  <p>✅ Peserta (participants) bisa diundang untuk ikut dalam PRD</p>
                  <p>✅ Customer yang requestnya masuk ke PRD bisa melihat progress di halaman PRD</p>
                </div>
              </div>
            </div>

            <!-- Step 3: Task -->
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold flex-shrink-0">3</div>
                <div class="w-0.5 bg-slate-200 flex-1 mt-2 mb-2"></div>
              </div>
              <div class="pb-6 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base font-bold text-slate-800">✅ Task</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Staff</span>
                </div>
                <p class="text-sm text-slate-600 mb-2">Dari PRD, dibuat <strong>Task</strong>-task yang merupakan unit kerja aktual. Task dikerjakan oleh developer/staff dan mengikuti alur kanban.</p>
                <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-slate-100">
                  <p>✅ Alur status task: <span class="font-medium">Backlog → To Do → In Progress → Review → In QC → Done</span></p>
                  <p>✅ Task bisa dilihat di Kanban Board (per proyek atau semua task)</p>
                  <p>✅ Setiap task punya time tracker untuk mencatat waktu pengerjaan</p>
                  <p>✅ Saat task sudah di-review, staff bisa <strong>Push to QC</strong> untuk masuk ke tahap quality check</p>
                </div>
              </div>
            </div>

            <!-- Step 4: QC -->
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold flex-shrink-0">4</div>
                <div class="w-0.5 bg-slate-200 flex-1 mt-2 mb-2"></div>
              </div>
              <div class="pb-6 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base font-bold text-slate-800">🔍 QC (Quality Check)</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Checker</span>
                </div>
                <p class="text-sm text-slate-600 mb-2">Task yang sudah selesai dikerjakan masuk ke tahap <strong>QC (Quality Check)</strong>. Checker memverifikasi semua item checklist sebelum fitur dinyatakan selesai.</p>
                <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-slate-100">
                  <p>✅ Staff melakukan <strong>Push to QC</strong> dari panel detail task (task harus berstatus Review)</p>
                  <p>✅ Checker yang ditunjuk mengisi checklist — bisa dari template atau dibuat manual</p>
                  <p>✅ Checker bisa membuka tiket baru langsung dari item QC yang ditemukan bermasalah</p>
                  <p>✅ Setiap checker punya time tracker sendiri di Form QC</p>
                  <p>✅ Jika semua checker selesai dan tidak ada masalah → <strong>QC Approved</strong></p>
                </div>
              </div>
            </div>

            <!-- Step 5: Loop QC -->
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-lg font-bold flex-shrink-0">5</div>
                <div class="w-0.5 bg-slate-200 flex-1 mt-2 mb-2"></div>
              </div>
              <div class="pb-6 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base font-bold text-slate-800">🔁 Loop QC <span class="text-slate-400 font-normal text-sm">(jika ada bug)</span></span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Opsional</span>
                </div>
                <p class="text-sm text-slate-600 mb-2">Jika ditemukan masalah saat QC, task dikembalikan ke developer untuk diperbaiki, lalu <strong>QC diulang</strong> (Loop QC). Form QC baru dibuat dengan nomor urut berikutnya.</p>
                <div class="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-slate-100">
                  <p>✅ Bug dari QC dicatat sebagai tiket baru di sistem</p>
                  <p>✅ Developer memperbaiki bug, mengubah status task kembali ke <strong>Review</strong></p>
                  <p>✅ Staff klik <strong>"Ajukan QC Ulang"</strong> untuk membuat Form QC baru (Loop 2, Loop 3, dst.)</p>
                  <p>✅ Loop bisa terjadi beberapa kali hingga semua item QC bersih</p>
                </div>
              </div>
            </div>

            <!-- Step 6: Done -->
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold flex-shrink-0">✓</div>
              </div>
              <div class="pb-2 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-base font-bold text-slate-800">🎉 Done / Selesai</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Semua pihak</span>
                </div>
                <p class="text-sm text-slate-600 mb-2">Setelah QC disetujui, task berubah ke status <strong>Done</strong>. Jika semua task dalam PRD selesai, PRD bisa ditandai Done juga.</p>
                <div class="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700 space-y-1 border border-emerald-100">
                  <p>✅ Task status → <strong>Done</strong></p>
                  <p>✅ PRD bisa diupdate ke status <strong>Done</strong> jika semua task selesai</p>
                  <p>✅ Customer bisa melihat request mereka sudah diselesaikan melalui PRD terkait</p>
                  <p>✅ Semua waktu kerja dan log QC tersimpan untuk keperluan laporan</p>
                </div>
              </div>
            </div>

          </div>

          <!-- Summary flow bar -->
          <div class="border-t pt-4">
            <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3">Ringkasan Alur</p>
            <div class="flex items-center gap-1 flex-wrap text-xs font-medium">
              <span class="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700">📥 Request</span>
              <svg class="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span class="px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-700">📄 PRD</span>
              <svg class="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span class="px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-700">✅ Task</span>
              <svg class="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span class="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-700">🔍 QC</span>
              <svg class="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span class="px-2.5 py-1.5 rounded-lg bg-orange-100 text-orange-700">🔁 Loop QC</span>
              <svg class="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span class="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700">🎉 Done</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab switcher — for admin/staff show both, for customer only customer tab -->
    <div class="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      <button
        v-if="auth.isStaffOrAdmin"
        @click="activeTab = 'staff'"
        :class="['px-4 py-2 text-sm font-medium rounded-lg transition-colors', activeTab === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
      >
        👨‍💼 Panduan Staff
      </button>
      <button
        @click="activeTab = 'customer'"
        :class="['px-4 py-2 text-sm font-medium rounded-lg transition-colors', activeTab === 'customer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
      >
        👤 Panduan Customer
      </button>
    </div>

    <!-- CUSTOMER TAB -->
    <div v-if="activeTab === 'customer'" class="space-y-3">
      <FaqSection
        v-for="s in customerSections" :key="s.title"
        :title="s.title" :icon="s.icon" :items="s.items"
      />
    </div>

    <!-- STAFF TAB -->
    <div v-if="activeTab === 'staff' && auth.isStaffOrAdmin" class="space-y-3">
      <FaqSection
        v-for="s in staffSections" :key="s.title"
        :title="s.title" :icon="s.icon" :items="s.items"
        :adminOnly="s.adminOnly"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const tour = useTour()
const activeTab = ref(auth.isStaffOrAdmin ? 'staff' : 'customer')
const showFlowModal = ref(false)

const customerSections = [
  {
    icon: '🎫',
    title: 'Membuat & Mengelola Tiket',
    items: [
      {
        q: 'Apa itu tiket?',
        a: 'Tiket adalah permintaan bantuan atau laporan masalah yang Anda kirim ke tim support kami. Setiap tiket memiliki nomor unik, status, dan prioritas.',
      },
      {
        q: 'Cara membuat tiket baru',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka menu <strong>Tiket</strong> di sidebar</li>
          <li>Klik tombol <strong>"+ Buat Tiket"</strong> di kanan atas</li>
          <li>Isi judul, deskripsi masalah, pilih proyek & prioritas</li>
          <li>Klik <strong>Simpan</strong> — tiket akan langsung masuk ke antrean tim support</li>
        </ol>`,
      },
      {
        q: 'Status tiket dan artinya',
        a: `<ul class="space-y-1">
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 font-medium">Open</span> — Tiket baru, menunggu ditangani</li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">In Progress</span> — Sedang dikerjakan oleh tim support</li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">Waiting</span> — Menunggu respon/informasi tambahan dari Anda</li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Resolved</span> — Masalah sudah diselesaikan</li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-slate-200 font-medium">Closed</span> — Tiket ditutup</li>
        </ul>`,
      },
      {
        q: 'Cara membalas pesan di tiket',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka tiket yang ingin dibalas dari halaman <strong>Tiket</strong></li>
          <li>Klik tab <strong>Pesan</strong> di detail tiket</li>
          <li>Ketik balasan di kolom chat bagian bawah</li>
          <li>Tekan <strong>Enter</strong> atau klik tombol kirim</li>
        </ol>`,
      },
      {
        q: 'Kenapa tiket saya ditandai Overdue?',
        a: 'Tiket ditandai Overdue ketika melebihi batas waktu SLA (Service Level Agreement) yang ditetapkan berdasarkan prioritas tiket. Hubungi tim support jika tiket Anda overdue.',
      },
    ],
  },
  {
    icon: '🚦',
    title: 'Priority & SLA',
    items: [
      {
        q: 'Apa itu Priority tiket?',
        a: 'Priority menentukan tingkat urgensi tiket Anda dan batas waktu penanganan (SLA) yang diberikan kepada tim support. Semakin tinggi priority, semakin cepat tiket harus ditangani.',
      },
      {
        q: 'Apa bedanya Critical, High, Medium, dan Low?',
        a: `<ul class="space-y-2">
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-semibold">🔴 Critical</span> — Masalah sangat mendesak, sistem tidak bisa digunakan. <strong>SLA: 4 jam.</strong></li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 font-semibold">🟠 High</span> — Masalah serius yang mempengaruhi pekerjaan utama. <strong>SLA: 1 hari (24 jam).</strong></li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-semibold">🟡 Medium</span> — Masalah yang mengganggu namun masih bisa ditunda sebentar. <strong>SLA: 3 hari (72 jam).</strong></li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-semibold">🟢 Low</span> — Permintaan atau saran yang tidak mendesak. <strong>SLA: 7 hari (168 jam).</strong></li>
        </ul>`,
      },
      {
        q: 'Apa yang terjadi jika SLA terlewat?',
        a: 'Jika tiket belum diselesaikan dalam batas waktu SLA, tiket akan ditandai <strong>⚠ SLA Breach</strong> (tanda merah). Hal ini menjadi prioritas utama tim support untuk segera ditangani. Anda tidak perlu melakukan apa-apa — tim kami akan langsung merespons.',
      },
      {
        q: 'Bagaimana cara memilih priority yang tepat?',
        a: `<ul class="space-y-1">
          <li>Pilih <strong>Critical</strong> jika sistem mati total / tidak bisa diakses sama sekali</li>
          <li>Pilih <strong>High</strong> jika fitur utama tidak berfungsi dan menghambat operasional</li>
          <li>Pilih <strong>Medium</strong> jika ada error tapi masih bisa dikerjakan dengan cara lain</li>
          <li>Pilih <strong>Low</strong> untuk pertanyaan, saran, atau permintaan fitur baru</li>
        </ul>`,
      },
    ],
  },
  {
    icon: '📁',
    title: 'Proyek',
    items: [
      {
        q: 'Cara melihat proyek saya',
        a: 'Klik menu <strong>Proyek</strong> di sidebar. Anda hanya dapat melihat proyek yang Anda ikuti sebagai anggota.',
      },
      {
        q: 'Apa yang bisa dilihat di halaman proyek?',
        a: `<ul class="list-disc list-inside space-y-1">
          <li><strong>Overview</strong> — progress keseluruhan task dalam proyek</li>
          <li><strong>Tasks</strong> — daftar tugas dalam proyek</li>
          <li><strong>Team</strong> — anggota tim proyek</li>
          <li><strong>Activity</strong> — riwayat aktivitas terbaru</li>
        </ul>`,
      },
    ],
  },
  {
    icon: '👤',
    title: 'Profil & Akun',
    items: [
      {
        q: 'Cara mengubah foto profil',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Klik nama/avatar Anda di pojok kiri bawah sidebar</li>
          <li>Di halaman profil, klik area foto/avatar</li>
          <li>Pilih file gambar dari komputer Anda</li>
          <li>Klik <strong>Simpan Perubahan</strong></li>
        </ol>`,
      },
      {
        q: 'Cara mengubah password',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka halaman <strong>Profil</strong></li>
          <li>Scroll ke bagian <strong>Ubah Password</strong></li>
          <li>Isi password lama dan password baru</li>
          <li>Klik <strong>Simpan Password</strong></li>
        </ol>`,
      },
    ],
  },
  {
    icon: '📥',
    title: 'Request Fitur',
    items: [
      {
        q: 'Apa itu Request?',
        a: 'Request adalah cara Anda mengajukan permintaan fitur baru atau perubahan pada sistem. Setiap Request akan ditinjau oleh tim dan bisa berkembang menjadi fitur yang dikerjakan.',
      },
      {
        q: 'Cara mengajukan Request',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka menu <strong>Requests</strong> di sidebar</li>
          <li>Klik tombol <strong>"+ New Request"</strong></li>
          <li>Isi judul, deskripsi kebutuhan, pilih proyek, dan tingkat urgensi</li>
          <li>Klik <strong>Create Request</strong></li>
        </ol>`,
      },
      {
        q: 'Apa yang terjadi setelah Request diajukan?',
        a: `<ul class="space-y-1">
          <li>Tim staff akan meninjau Request Anda</li>
          <li>Jika disetujui, Request akan dikelompokkan ke dalam <strong>PRD</strong> dan mulai dikerjakan</li>
          <li>Jika tidak sesuai, Request bisa ditolak (<strong>Rejected</strong>) atau dijadikan standalone</li>
        </ul>`,
      },
      {
        q: 'Bisakah saya mengedit Request yang sudah diajukan?',
        a: 'Bisa, selama Request belum masuk ke PRD, belum ditolak, dan belum berstatus Standalone. Klik baris Request lalu klik <strong>Edit</strong> di modal detail.',
      },
      {
        q: 'Bagaimana cara melihat status Request saya?',
        a: 'Buka menu <strong>Requests</strong>. Klik baris Request untuk melihat detail status, urgensi, dan apakah sudah terhubung ke PRD. Jika sudah ada link PRD, klik untuk melihat progress pengerjaan.',
      },
    ],
  },
  {
    icon: '📄',
    title: 'PRD & Progress Pengerjaan',
    items: [
      {
        q: 'Apa itu PRD?',
        a: 'PRD (Product Requirements Document) adalah dokumen yang berisi spesifikasi fitur yang akan dikerjakan. Satu PRD bisa mencakup beberapa Request sekaligus.',
      },
      {
        q: 'Bagaimana saya tahu Request saya sudah masuk PRD?',
        a: 'Di halaman Requests, kolom <strong>PRD</strong> akan menampilkan link PRD jika Request Anda sudah dikelompokkan. Klik link tersebut untuk melihat detail dan progress pengerjaan.',
      },
      {
        q: 'Apa yang bisa dilihat di halaman PRD?',
        a: `<ul class="list-disc list-inside space-y-1">
          <li>Spesifikasi dan deskripsi fitur yang akan dikerjakan</li>
          <li>Milestone dan task yang dibuat dari PRD tersebut</li>
          <li>Status pengerjaan keseluruhan</li>
          <li>Daftar Request yang terhubung</li>
        </ul>`,
      },
    ],
  },
  {
    icon: '🔔',
    title: 'Notifikasi',
    items: [
      {
        q: 'Cara melihat notifikasi',
        a: 'Klik ikon 🔔 di sudut kanan atas header. Notifikasi muncul otomatis saat ada aktivitas baru di tiket Anda.',
      },
      {
        q: 'Cara menandai notifikasi sebagai dibaca',
        a: 'Klik notifikasi individual untuk menandainya dibaca, atau klik <strong>"Tandai semua dibaca"</strong> di panel notifikasi.',
      },
    ],
  },
  {
    icon: '📝',
    title: 'Catatan & Wishlist',
    items: [
      {
        q: 'Apa itu fitur Catatan?',
        a: 'Catatan adalah ruang pribadi untuk menyimpan ide, daftar tugas, atau wishlist fitur. Setiap catatan bisa diisi item checklist, diberi warna berbeda, dan tetap tersimpan sampai Anda hapus sendiri.',
      },
      {
        q: 'Bagaimana cara membuat catatan baru?',
        a: 'Buka menu <strong>Catatan</strong> di sidebar, lalu klik tombol <strong>+ Catatan Baru</strong>. Anda bisa langsung menulis judul dan menambahkan item-item di dalamnya.',
      },
      {
        q: 'Apa itu pin catatan?',
        a: 'Pin catatan menampilkan catatan sebagai widget mengambang di layar. Di desktop bisa di-drag ke mana saja; di mobile tampil sebagai bar di bawah layar yang bisa diketuk untuk membuka.',
      },
      {
        q: 'Bisakah membuat tiket langsung dari catatan?',
        a: 'Bisa! Klik ikon pilih item di catatan, centang item yang ingin dijadikan tiket, lalu klik <strong>Buat Tiket</strong>. Anda bisa edit deskripsi, pilih modul, dan priority sebelum submit.',
      },
    ],
  },
]

const staffSections = [
  {
    icon: '🎫',
    title: 'Manajemen Tiket',
    adminOnly: false,
    items: [
      {
        q: 'Cara meng-assign tiket ke staff',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka tiket dari halaman <strong>Tiket</strong></li>
          <li>Di panel detail (kanan), klik dropdown <strong>Assigned To</strong></li>
          <li>Pilih nama staff yang akan menangani</li>
          <li>Perubahan tersimpan otomatis</li>
        </ol>`,
      },
      {
        q: 'Cara mengubah status dan prioritas tiket',
        a: 'Di detail tiket, gunakan dropdown <strong>Status</strong> dan <strong>Prioritas</strong> di panel kanan. Setiap perubahan dicatat di tab <strong>History</strong>.',
      },
      {
        q: 'Apa itu indikator SLA breach?',
        a: 'Titik merah berkedip (🔴) di samping nomor tiket menandakan tiket telah melewati batas waktu SLA. Prioritaskan penanganan tiket ini segera.',
      },
      {
        q: 'Cara membalas tiket customer',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka tiket lalu klik tab <strong>Pesan</strong></li>
          <li>Ketik balasan di kolom chat</li>
          <li>Tekan <strong>Enter</strong> atau klik kirim</li>
          <li>Customer akan menerima notifikasi otomatis</li>
        </ol>`,
      },
    ],
  },
  {
    icon: '🚦',
    title: 'Priority & SLA',
    adminOnly: false,
    items: [
      {
        q: 'Tabel SLA per priority',
        a: `<ul class="space-y-2">
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-semibold">🔴 Critical</span> — SLA <strong>4 jam</strong>. Tangani segera, eskalasi ke lead jika perlu.</li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 font-semibold">🟠 High</span> — SLA <strong>24 jam</strong>. Tangani di hari yang sama.</li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-semibold">🟡 Medium</span> — SLA <strong>72 jam (3 hari)</strong>. Selesaikan dalam minggu berjalan.</li>
          <li><span class="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-semibold">🟢 Low</span> — SLA <strong>168 jam (7 hari)</strong>. Jadwalkan sesuai kapasitas tim.</li>
        </ul>`,
      },
      {
        q: 'Cara mengubah priority tiket',
        a: 'Di halaman detail tiket, gunakan dropdown <strong>Priority</strong> di action bar atas. Perubahan priority akan mengubah batas waktu SLA dan dicatat di Activity.',
      },
      {
        q: 'Bagaimana SLA dihitung?',
        a: 'SLA dihitung dari waktu tiket dibuat hingga diselesaikan. Jika tiket melewati batas waktu SLA-nya, status berubah menjadi <strong>SLA Breach</strong> dan ditandai ⚠ merah di daftar tiket.',
      },
    ],
  },
  {
    icon: '✅',
    title: 'Manajemen Task',
    adminOnly: false,
    items: [
      {
        q: 'Cara membuat task baru',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka menu <strong>Tasks</strong></li>
          <li>Klik <strong>"+ New Task"</strong></li>
          <li>Isi judul, proyek, assignee, due date, dan status</li>
          <li>Klik <strong>Simpan</strong></li>
        </ol>`,
      },
      {
        q: 'Cara menggunakan tampilan Kanban Board',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Di halaman <strong>Tasks</strong>, klik tombol <strong>Kanban</strong> di kanan atas</li>
          <li>Task tersusun dalam 5 kolom: <strong>Backlog → Todo → In Progress → Review → Done</strong></li>
          <li>Seret kartu task dari satu kolom ke kolom lain untuk mengubah status</li>
          <li>Klik kartu task untuk membuka detail</li>
        </ol>`,
      },
      {
        q: 'Cara membuka detail task',
        a: 'Di tampilan List, klik baris task. Di Kanban, klik kartu task. Panel detail akan muncul di sisi kanan layar.',
      },
      {
        q: 'Apa itu checklist di dalam task?',
        a: 'Checklist adalah daftar sub-tugas dalam sebuah task. Centang item untuk menandai progress. Persentase penyelesaian checklist ditampilkan di kartu Kanban.',
      },
    ],
  },
  {
    icon: '⏱️',
    title: 'Time Tracker (Pencatat Waktu)',
    adminOnly: false,
    items: [
      {
        q: 'Apa itu Time Tracker?',
        a: 'Time Tracker adalah fitur untuk mencatat berapa lama Anda mengerjakan sebuah task. Data ini digunakan untuk laporan produktivitas dan analisis beban kerja.',
      },
      {
        q: 'Cara memulai pencatatan waktu',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka detail task yang ingin dikerjakan</li>
          <li>Scroll ke bagian <strong>Time Tracker</strong> di panel detail</li>
          <li>Klik tombol <strong>▶ Mulai</strong></li>
          <li>Timer berjalan — Anda bisa menutup/navigasi halaman lain, timer tetap berjalan</li>
        </ol>`,
      },
      {
        q: 'Cara menghentikan pencatatan waktu',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka kembali detail task yang sama</li>
          <li>Klik tombol <strong>⏹ Stop</strong></li>
          <li>Durasi kerja tersimpan otomatis di log</li>
        </ol>`,
      },
      {
        q: 'Cara melihat total waktu yang sudah dicatat',
        a: 'Di panel detail task, bagian Time Tracker menampilkan <strong>total waktu</strong> semua sesi (contoh: "2j 30m") dan daftar log per sesi dengan tanggal & durasinya.',
      },
      {
        q: 'Apakah timer otomatis berhenti jika saya lupa?',
        a: 'Timer yang terbuka lebih dari <strong>12 jam</strong> akan otomatis ditutup oleh sistem untuk menghindari data yang tidak akurat.',
      },
      {
        q: 'Di mana melihat semua log waktu saya?',
        a: 'Buka menu <strong>Reports</strong> (admin) → bagian <strong>Activity Tracker</strong>. Tersedia filter per staff, proyek, dan rentang tanggal.',
      },
    ],
  },
  {
    icon: '📁',
    title: 'Proyek & Tim',
    adminOnly: false,
    items: [
      {
        q: 'Cara membuat task dalam proyek tertentu',
        a: 'Buka halaman detail proyek → tab <strong>Tasks</strong> → klik <strong>"+ New Task"</strong>. Task akan otomatis terhubung ke proyek tersebut.',
      },
      {
        q: 'Cara melihat progress proyek',
        a: 'Di halaman detail proyek, tab <strong>Overview</strong> menampilkan progress bar, jumlah task Done/In Progress/Overdue, dan anggota tim.',
      },
    ],
  },
  {
    icon: '📅',
    title: 'Kalender',
    adminOnly: false,
    items: [
      {
        q: 'Apa yang ditampilkan di kalender?',
        a: 'Kalender menampilkan semua task dan tiket berdasarkan <strong>due date</strong>-nya dalam tampilan harian, mingguan, atau bulanan.',
      },
      {
        q: 'Cara mengubah due date lewat kalender',
        a: 'Seret event di kalender ke tanggal baru. Perubahan due date tersimpan otomatis.',
      },
    ],
  },
  {
    icon: '📝',
    title: 'Catatan & Wishlist',
    adminOnly: false,
    items: [
      {
        q: 'Apa itu fitur Catatan?',
        a: 'Catatan adalah ruang pribadi untuk menyimpan ide, daftar tugas, atau wishlist fitur. Setiap catatan bisa diisi item checklist, diberi warna berbeda, dan tetap tersimpan sampai kamu hapus sendiri.',
      },
      {
        q: 'Bagaimana cara membuat catatan baru?',
        a: 'Buka menu <strong>Catatan</strong> di sidebar, lalu klik tombol <strong>+ Catatan Baru</strong>. Kamu bisa langsung menulis judul dan menambahkan item-item di dalamnya.',
      },
      {
        q: 'Apa itu pin catatan?',
        a: 'Pin catatan menampilkan catatan sebagai widget mengambang di layar. Di desktop bisa di-drag ke mana saja; di mobile tampil sebagai bar di bawah layar yang bisa diketuk untuk membuka.',
      },
      {
        q: 'Bisakah membuat tiket langsung dari catatan?',
        a: 'Bisa! Klik ikon pilih item di catatan, centang item yang ingin dijadikan tiket, lalu klik <strong>Buat Tiket</strong>. Kamu bisa edit deskripsi, pilih modul, dan priority sebelum submit.',
      },
    ],
  },
  {
    icon: '📥',
    title: 'Manajemen Request',
    adminOnly: false,
    items: [
      {
        q: 'Apa itu Request dan dari mana asalnya?',
        a: 'Request adalah permintaan fitur atau perubahan yang diajukan oleh customer atau staff. Request adalah titik awal dari alur development fitur baru.',
      },
      {
        q: 'Cara mengelola Request yang masuk',
        a: `<ul class="space-y-1">
          <li>Buka menu <strong>Requests</strong></li>
          <li>Klik baris Request untuk melihat detail</li>
          <li>Tombol <strong>Reject</strong> — tolak request yang tidak relevan</li>
          <li>Tombol <strong>Standalone</strong> — tandai request yang dikerjakan langsung tanpa PRD</li>
          <li>Centang beberapa Request + klik <strong>"Group to PRD"</strong> untuk mengelompokkannya ke PRD baru atau yang sudah ada</li>
        </ul>`,
      },
      {
        q: 'Kapan Request tidak bisa diedit lagi?',
        a: 'Request tidak bisa diedit jika sudah berstatus <strong>Rejected</strong>, <strong>Standalone</strong>, atau sudah masuk ke dalam PRD.',
      },
      {
        q: 'Cara mengelompokkan Request ke PRD',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Centang satu atau lebih Request di daftar (Request tidak boleh Rejected/Standalone)</li>
          <li>Klik tombol <strong>"Group to PRD"</strong> yang muncul di atas</li>
          <li>Pilih <strong>PRD yang sudah ada</strong> atau buat <strong>PRD baru</strong></li>
          <li>Klik <strong>Group Requests</strong></li>
        </ol>`,
      },
    ],
  },
  {
    icon: '📄',
    title: 'Manajemen PRD',
    adminOnly: false,
    items: [
      {
        q: 'Apa itu PRD dan kapan dibuat?',
        a: 'PRD (Product Requirements Document) dibuat setelah Request disetujui. PRD berisi spesifikasi lengkap fitur, dibagi per versi, dan menjadi dasar pembuatan Task.',
      },
      {
        q: 'Cara membuat PRD baru',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka menu <strong>PRDs</strong></li>
          <li>Klik <strong>"+ New PRD"</strong></li>
          <li>Isi judul dan pilih proyek</li>
          <li>Atau langsung dari halaman Requests — centang Request dan klik "Group to PRD" lalu pilih "Create New PRD"</li>
        </ol>`,
      },
      {
        q: 'Cara membuat Task dari PRD',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka detail PRD</li>
          <li>Klik tab <strong>Milestones & Tasks</strong></li>
          <li>Buat milestone terlebih dahulu, lalu tambahkan task di dalamnya</li>
          <li>Task yang dibuat akan otomatis terhubung ke PRD</li>
        </ol>`,
      },
      {
        q: 'Apa itu versi PRD?',
        a: 'PRD bisa memiliki beberapa versi (v1, v2, …) ketika spesifikasi berubah. Klik <strong>"New Version"</strong> di halaman PRD untuk membuat versi baru dengan changelog.',
      },
      {
        q: 'Cara mengundang peserta ke PRD',
        a: 'Di halaman detail PRD, bagian <strong>Peserta</strong> di bawah header — klik tombol <strong>"+ Undang"</strong>, cari nama user, lalu klik untuk menambahkan. Peserta mendapat notifikasi undangan.',
      },
    ],
  },
  {
    icon: '🔍',
    title: 'QC (Quality Check)',
    adminOnly: false,
    items: [
      {
        q: 'Apa itu QC dan kapan dilakukan?',
        a: 'QC (Quality Check) dilakukan setelah task selesai dikerjakan dan siap direview. Staff melakukan "Push to QC" dari panel detail task — task harus berstatus <strong>Review</strong> terlebih dahulu.',
      },
      {
        q: 'Cara melakukan Push to QC',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka detail task yang sudah selesai dikerjakan</li>
          <li>Pastikan status task sudah <strong>Review</strong></li>
          <li>Klik tombol <strong>"Push to QC"</strong></li>
          <li>Pilih template QC (opsional) atau buat item checklist manual</li>
          <li>Pilih satu atau lebih <strong>Checker</strong> yang akan melakukan pengecekan</li>
          <li>Klik <strong>Push to QC</strong></li>
        </ol>`,
      },
      {
        q: 'Cara mengisi Form QC sebagai Checker',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka menu <strong>Form QC</strong> di sidebar atau notifikasi yang diterima</li>
          <li>Buka form QC yang ditugaskan</li>
          <li>Centang setiap item checklist yang sudah diverifikasi</li>
          <li>Jika ada bug, klik <strong>"Buka Ticket"</strong> di item yang bermasalah</li>
          <li>Setelah semua item selesai, klik <strong>"Selesai (Done)"</strong></li>
        </ol>`,
      },
      {
        q: 'Cara melakukan Loop QC (QC ulang)',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Setelah bug diperbaiki, ubah status task kembali ke <strong>Review</strong></li>
          <li>Di panel detail task, klik <strong>"Ajukan QC Ulang"</strong></li>
          <li>Pilih checker untuk putaran QC berikutnya</li>
          <li>Form QC baru dibuat dengan nomor loop berikutnya (Loop 2, Loop 3, dst.)</li>
        </ol>`,
      },
      {
        q: 'Di mana melihat semua Form QC?',
        a: 'Buka menu <strong>Form QC</strong> di sidebar. Tersedia filter berdasarkan status, project, checker, template, dan rentang tanggal.',
      },
      {
        q: 'Apa itu Template QC?',
        a: 'Template QC adalah kumpulan item checklist yang bisa digunakan berulang kali saat membuat Form QC. Buat dan kelola template di <strong>Master → Template QC</strong> (admin only).',
      },
    ],
  },
  {
    icon: '📊',
    title: 'Laporan & Workload (Admin)',
    adminOnly: true,
    items: [
      {
        q: 'Cara membuka laporan SLA',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka menu <strong>Reports</strong></li>
          <li>Gunakan filter <strong>rentang tanggal</strong>, proyek, atau staff</li>
          <li>Lihat kartu statistik: Total tiket, Avg Response, SLA Met %, SLA Breach %</li>
          <li>Scroll ke bawah untuk tabel produktivitas per staff</li>
        </ol>`,
      },
      {
        q: 'Cara melihat laporan waktu kerja staff',
        a: 'Di halaman Reports, scroll ke bagian <strong>Activity Tracker</strong>. Gunakan filter staff dan tanggal untuk melihat detail log waktu per task.',
      },
      {
        q: 'Cara melihat workload tim',
        a: 'Buka menu <strong>Workload</strong>. Halaman ini menampilkan kartu setiap staff dengan jumlah tiket open dan indikator kapasitas.',
      },
    ],
  },
  {
    icon: '⚙️',
    title: 'Master Data (Admin)',
    adminOnly: true,
    items: [
      {
        q: 'Cara menambah user baru',
        a: `<ol class="list-decimal list-inside space-y-1">
          <li>Buka <strong>Master → Users</strong></li>
          <li>Klik <strong>"+ Tambah User"</strong></li>
          <li>Isi nama, email, password, dan pilih role (admin/staff/customer)</li>
          <li>Klik Simpan</li>
        </ol>`,
      },
      {
        q: 'Cara mengatur prioritas dan SLA',
        a: 'Buka <strong>Master → Priorities</strong>. Setiap prioritas memiliki jam SLA. Ubah angka jam SLA sesuai kebutuhan — ini mempengaruhi indikator overdue tiket.',
      },
      {
        q: 'Cara mengatur menu navigasi',
        a: 'Buka <strong>Master → Menus</strong> untuk mengubah urutan, nama, atau icon menu navigasi per role. Perubahan berlaku untuk semua user dengan role tersebut.',
      },
    ],
  },
]
</script>
