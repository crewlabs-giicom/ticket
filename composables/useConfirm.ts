import Swal from 'sweetalert2'

export function useConfirm() {
  async function confirmDelete(message = 'Data yang dihapus tidak bisa dikembalikan.', title = 'Hapus item ini?') {
    const result = await Swal.fire({
      title,
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    })
    return result.isConfirmed
  }

  async function confirmAction(message: string, title = 'Konfirmasi', confirmText = 'Ya') {
    const result = await Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Batal',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    })
    return result.isConfirmed
  }

  function toast(title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    })
  }

  return { confirmDelete, confirmAction, toast }
}
