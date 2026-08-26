import { Resvg } from '@resvg/resvg-js'
import { uploadGeneratedImageBuffer } from '@/lib/reference-upload'

const SIZE = 1024
const cache = new Map<string, string>()

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function buildCharacterSheetPng(sourceImageUrl: string): Promise<Buffer> {
  const res = await fetch(sourceImageUrl, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error('Could not load reference image for privacy markup')
  const ab = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/png'
  const mime = contentType.split(';')[0].trim() || 'image/png'
  const dataUrl = `data:${mime};base64,${Buffer.from(ab).toString('base64')}`

  const CX = SIZE * 0.4
  const CY = SIZE * 0.3
  const ARM = SIZE * 0.1
  const STROKE = 26
  const BANNER_H = 86
  const BANNER_TEXT_Y = 58

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
    <image href="${escapeXml(dataUrl)}" width="${SIZE}" height="${SIZE}" preserveAspectRatio="xMidYMid slice" />
    <g stroke="#dc2626" stroke-width="${STROKE}" stroke-linecap="round" opacity="0.97">
      <line x1="${CX - ARM}" y1="${CY}" x2="${CX + ARM}" y2="${CY}" />
      <line x1="${CX}" y1="${CY - ARM}" x2="${CX}" y2="${CY + ARM}" />
    </g>
    <rect x="0" y="0" width="${SIZE}" height="${BANNER_H}" fill="#ffffff" />
    <text x="${SIZE / 2}" y="${BANNER_TEXT_Y}" font-family="Arial, sans-serif"
          font-weight="700" font-size="38" fill="#000000" text-anchor="middle">
      CHARACTER SHEET REFERENCE
    </text>
  </svg>`

  return new Resvg(svg, {
    fitTo: { mode: 'width', value: SIZE },
  })
    .render()
    .asPng()
}

export async function markCharacterSheetRefUrl(url: string): Promise<string> {
  if (!url.startsWith('http')) return url
  const cached = cache.get(url)
  if (cached) return cached

  try {
    const png = await buildCharacterSheetPng(url)
    const uploaded = await uploadGeneratedImageBuffer({
      userId: 'seedance-markup',
      buffer: png,
      contentType: 'image/png',
    })
    cache.set(url, uploaded.url)
    return uploaded.url
  } catch (err) {
    console.error('character-sheet markup failed, using original URL', err)
    return url
  }
}

export async function markImageUrlsForSeedance(
  urls: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(urls.filter((u) => u.startsWith('http'))))
  const mapped = await Promise.all(
    unique.map(async (url) => [url, await markCharacterSheetRefUrl(url)] as const)
  )
  return new Map(mapped)
}
