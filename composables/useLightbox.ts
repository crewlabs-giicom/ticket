export function useLightbox() {
  const images = useState<Array<{ url: string; name: string }>>('lb_images', () => [])
  const index = useState<number>('lb_index', () => 0)
  const isOpen = useState<boolean>('lb_open', () => false)

  function open(imgs: Array<{ url: string; name: string }>, startIndex = 0) {
    images.value = imgs
    index.value = startIndex
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function next() {
    if (!images.value.length) return
    index.value = (index.value + 1) % images.value.length
  }

  function prev() {
    if (!images.value.length) return
    index.value = (index.value - 1 + images.value.length) % images.value.length
  }

  return { images, index, isOpen, open, close, next, prev }
}
