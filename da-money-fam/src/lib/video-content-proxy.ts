/**
 * Serve a buffered MP4 with Safari-friendly Range support.
 * Short Seedance clips are fine to buffer fully.
 */
export function serveBufferedVideo(
  buffer: ArrayBuffer,
  options: {
    request: Request
    contentType?: string
    cacheControl?: string
    filename?: string
  }
): Response {
  const bytes = new Uint8Array(buffer)
  const total = bytes.byteLength
  const contentType = options.contentType || 'video/mp4'
  const rangeHeader = options.request.headers.get('range')

  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': options.cacheControl || 'public, max-age=3600',
  }
  if (options.filename) {
    baseHeaders['Content-Disposition'] = `inline; filename="${options.filename}"`
  }

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
    if (match) {
      let start = match[1] ? Number(match[1]) : 0
      let end = match[2] ? Number(match[2]) : total - 1

      if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end >= total || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes */${total}`,
          },
        })
      }

      const chunk = bytes.subarray(start, end + 1)
      return new Response(chunk, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Length': String(chunk.byteLength),
          'Content-Range': `bytes ${start}-${end}/${total}`,
        },
      })
    }
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(total),
    },
  })
}

export async function fetchOpenRouterVideoBuffer(jobId: string): Promise<{
  buffer: ArrayBuffer
  contentType: string
} | { error: string; status: number }> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    return { error: 'OpenRouter API Key not configured', status: 500 }
  }

  const upstream = await fetch(
    `https://openrouter.ai/api/v1/videos/${jobId}/content?index=0`,
    {
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
      },
      redirect: 'follow',
    }
  )

  if (!upstream.ok) {
    const detail = await upstream.text()
    console.error('OpenRouter content fetch failed:', upstream.status, detail)
    return { error: 'Failed to fetch video content', status: upstream.status }
  }

  const contentType = upstream.headers.get('content-type') || 'video/mp4'
  const buffer = await upstream.arrayBuffer()
  return { buffer, contentType }
}
