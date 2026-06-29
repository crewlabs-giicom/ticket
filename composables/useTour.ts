import { driver } from 'driver.js'

export function useTour() {
  const auth = useAuthStore()

  const tourKey = computed(() => `tour_completed_${auth.user?.id}`)

  function isCompleted() {
    if (!import.meta.client) return true
    return localStorage.getItem(tourKey.value) === '1'
  }

  function markCompleted() {
    if (import.meta.client) localStorage.setItem(tourKey.value, '1')
  }

  function reset() {
    if (import.meta.client) localStorage.removeItem(tourKey.value)
  }

  const customerSteps = [
    {
      popover: {
        title: '👋 Selamat Datang!',
        description:
          'Halo! Ini adalah sistem tiket bantuan kami. Tour singkat ini akan membantu Anda mengenal fitur-fitur utama. Klik <b>Berikutnya</b> untuk mulai.',
        side: 'over' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-sidebar',
      popover: {
        title: '📋 Menu Navigasi',
        description:
          'Panel ini adalah menu utama. Gunakan untuk berpindah antar halaman seperti Tiket, Proyek, dan Profil.',
        side: 'right' as const,
        align: 'start' as const,
      },
    },
    {
      element: '#nav-link-dashboard',
      popover: {
        title: '🏠 Dashboard',
        description:
          'Halaman dashboard menampilkan ringkasan tiket Anda — tiket aktif, yang sudah selesai, dan statusnya.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-tickets',
      popover: {
        title: '🎫 Menu Tiket',
        description:
          'Klik <b>Tiket</b> untuk melihat semua tiket yang pernah Anda buat. Di sini Anda bisa memantau status dan membalas pesan dari tim support.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-projects',
      popover: {
        title: '📁 Proyek',
        description:
          'Halaman Proyek menampilkan proyek-proyek yang Anda ikuti. Anda bisa melihat perkembangan dan anggota tim di sini.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#sidebar-catatan',
      popover: {
        title: '📝 Catatan Pribadi',
        description:
          'Simpan ide atau daftar permintaan fitur di <b>Catatan</b>. Setiap catatan bisa diisi checklist item dan di-<b>pin</b> sebagai widget di layar. Item catatan juga bisa langsung dijadikan tiket baru.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#sidebar-user-profile',
      popover: {
        title: '👤 Profil Anda',
        description:
          'Klik nama/avatar Anda untuk mengelola profil, mengganti foto, dan mengubah password.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#sidebar-help-btn',
      popover: {
        title: '🎉 Selesai!',
        description:
          'Tour selesai. Jika ingin membaca panduan lengkap, klik tombol <b>Panduan & FAQ</b> ini kapan saja. Selamat menggunakan sistem!',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
  ]

  const staffSteps = [
    {
      popover: {
        title: '👋 Selamat Datang, Tim Support!',
        description:
          'Tour ini akan memperkenalkan semua fitur utama sistem untuk staff. Klik <b>Berikutnya</b> untuk mulai.',
        side: 'over' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-sidebar',
      popover: {
        title: '📋 Menu Navigasi',
        description:
          'Panel kiri ini berisi semua menu yang Anda butuhkan — dari tiket, task, proyek, hingga laporan.',
        side: 'right' as const,
        align: 'start' as const,
      },
    },
    {
      element: '#nav-link-dashboard',
      popover: {
        title: '🏠 Dashboard',
        description:
          'Dashboard menampilkan statistik tiket, SLA compliance, tren 30 hari, dan aktivitas terbaru seluruh tim.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-tickets',
      popover: {
        title: '🎫 Manajemen Tiket',
        description:
          'Halaman Tiket menampilkan semua tiket masuk. Anda bisa <b>assign</b> tiket ke staff, ubah <b>status & prioritas</b>, dan balas pesan customer langsung dari sini.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-tasks',
      popover: {
        title: '✅ Manajemen Task',
        description:
          'Halaman Task untuk mengelola tugas-tugas teknis. Tersedia tampilan <b>List</b> dan <b>Kanban Board</b> dengan drag-and-drop.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-tasks',
      popover: {
        title: '🗂️ Kanban Board',
        description:
          'Di halaman Task, klik tombol <b>Kanban</b> untuk switch ke papan visual. Seret kartu tugas antar kolom (Backlog → Todo → In Progress → Review → Done).',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-tasks',
      popover: {
        title: '⏱️ Time Tracker',
        description:
          'Buka detail task, lalu klik tombol <b>▶ Mulai</b> untuk memulai pencatatan waktu kerja. Klik <b>⏹ Stop</b> saat selesai. Semua log waktu tersimpan otomatis.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-projects',
      popover: {
        title: '📁 Proyek',
        description:
          'Lihat progress proyek, daftar task, anggota tim, dan aktivitas terbaru. Setiap task dalam proyek punya indikator penyelesaian.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#nav-link-calendar',
      popover: {
        title: '📅 Kalender',
        description:
          'Tampilan kalender menggabungkan semua task & tiket berdasarkan <b>due date</b>. Anda bisa drag event untuk mengubah jadwal.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#sidebar-catatan',
      popover: {
        title: '📝 Catatan Pribadi',
        description:
          'Buat catatan atau wishlist fitur yang perlu kamu ingat. Setiap catatan bisa diisi checklist item, diberi warna, dan di-<b>pin</b> sebagai widget mengambang di layar. Item catatan juga bisa langsung dijadikan tiket baru.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#sidebar-user-profile',
      popover: {
        title: '👤 Profil Anda',
        description:
          'Klik nama/avatar untuk mengelola profil, mengganti foto profil, dan mengubah password.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
    {
      element: '#sidebar-help-btn',
      popover: {
        title: '🎉 Tour Selesai!',
        description:
          'Semua fitur utama sudah diperkenalkan. Klik <b>Panduan & FAQ</b> ini untuk membaca panduan lengkap termasuk cara penggunaan time tracker, laporan, dan master data.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },
  ]

  const adminExtraStep = {
    element: '#nav-link-reports',
    popover: {
      title: '📊 Laporan & Workload',
      description:
        'Sebagai admin, Anda bisa mengakses <b>Reports</b> untuk analisis SLA, produktivitas staff, dan log waktu. Menu <b>Workload</b> menampilkan distribusi beban kerja tim.',
      side: 'right' as const,
      align: 'center' as const,
    },
  }

  function startTour(force = false) {
    if (!import.meta.client) return
    if (!force && isCompleted()) return

    const role = auth.user?.role
    let steps = role === 'customer' ? [...customerSteps] : [...staffSteps]

    if (role === 'admin') {
      // Insert admin step before the last step (help button step)
      steps.splice(steps.length - 1, 0, adminExtraStep)
    }

    const d = driver({
      animate: true,
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Berikutnya →',
      prevBtnText: '← Sebelumnya',
      doneBtnText: 'Selesai ✓',
      progressText: 'Langkah {{current}} dari {{total}}',
      steps,
      onDestroyStarted: () => {
        markCompleted()
        d.destroy()
      },
    })

    d.drive()
  }

  return { startTour, isCompleted, reset }
}
