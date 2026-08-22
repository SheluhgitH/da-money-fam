/** Client-side image compression for Ad Studio uploads (iPhone photos, HEIC, etc.) */

const MAX_EDGE = 2048
const TARGET_BYTES = Math.floor(1.8 * 1024 * 1024)

export interface CompressedImage {
  dataUrl: string
  contentType: 'image/jpeg'
  byteLength: number
}

function loadImageFromFile(file: File): Promise<HTMLImageElement | ImageBitmap> {
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file)
        resolve(bitmap)
        return
      }
    } catch {
      /* fall through to Image */
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this photo'))
    }
    img.src = url
  })
}

function getSize(source: HTMLImageElement | ImageBitmap): { w: number; h: number } {
  if ('naturalWidth' in source && source.naturalWidth) {
    return { w: source.naturalWidth, h: source.naturalHeight }
  }
  return { w: source.width, h: source.height }
}

function estimateBase64Bytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',')
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

/**
 * Resize longest edge to 2048px and export JPEG under ~1.8MB for upload-ref limits.
 */
export async function compressImageForUpload(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp|gif)$/i.test(file.name)) {
    throw new Error('Please choose a photo (JPEG, PNG, HEIC, or WebP)')
  }

  const source = await loadImageFromFile(file)
  const { w, h } = getSize(source)
  if (!w || !h) {
    throw new Error('Could not read this photo')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale))
  const th = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process photo')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, tw, th)
  ctx.drawImage(source, 0, 0, tw, th)

  if ('close' in source && typeof source.close === 'function') {
    source.close()
  }

  let quality = 0.82
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  let byteLength = estimateBase64Bytes(dataUrl)

  while (byteLength > TARGET_BYTES && quality > 0.45) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    byteLength = estimateBase64Bytes(dataUrl)
  }

  if (byteLength > TARGET_BYTES) {
    // Second pass: smaller edge
    const scale2 = 0.7
    canvas.width = Math.max(1, Math.round(tw * scale2))
    canvas.height = Math.max(1, Math.round(th * scale2))
    const ctx2 = canvas.getContext('2d')
    if (!ctx2) throw new Error('Could not process photo')
    // redraw from previous jpeg as image
    const tmp = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('Could not optimize photo'))
      im.src = dataUrl
    })
    ctx2.fillStyle = '#000'
    ctx2.fillRect(0, 0, canvas.width, canvas.height)
    ctx2.drawImage(tmp, 0, 0, canvas.width, canvas.height)
    quality = 0.75
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    byteLength = estimateBase64Bytes(dataUrl)
    while (byteLength > TARGET_BYTES && quality > 0.4) {
      quality -= 0.08
      dataUrl = canvas.toDataURL('image/jpeg', quality)
      byteLength = estimateBase64Bytes(dataUrl)
    }
  }

  if (byteLength > TARGET_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(
      `Photo couldn't be optimized (${mb}MB) — try a screenshot or smaller image`
    )
  }

  return { dataUrl, contentType: 'image/jpeg', byteLength }
}
