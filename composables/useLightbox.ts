const _images = ref<Array<{ url: string; name: string }>>([])
const _index = ref(0)
const _open = ref(false)

export function useLightbox() {
  function open(images: Array<{ url: string; name: string }>, index = 0) {
    _images.value = images
    _index.value = index
    _open.value = true
  }

  function close() {
    _open.value = false
  }

  function next() {
    if (!_images.value.length) return
    _index.value = (_index.value + 1) % _images.value.length
  }

  function prev() {
    if (!_images.value.length) return
    _index.value = (_index.value - 1 + _images.value.length) % _images.value.length
  }

  return {
    images: _images,
    index: _index,
    isOpen: _open,
    open,
    close,
    next,
    prev,
  }
}
