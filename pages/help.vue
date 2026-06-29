<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Panduan & FAQ</h2>
        <p class="text-sm text-slate-500 mt-0.5">Tata cara penggunaan sistem Shadow Care</p>
      </div>
      <button @click="tour.startTour(true)" class="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Mulai Tour Interaktif
      </button>
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
