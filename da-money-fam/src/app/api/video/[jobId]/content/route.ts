import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { fetchOpenRouterVideoBuffer, serveBufferedVideo } from '@/lib/video-content-proxy'

export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = params
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
  }

  try {
    const result = await fetchOpenRouterVideoBuffer(jobId)
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    return serveBufferedVideo(result.buffer, {
      request: req,
      contentType: result.contentType,
      cacheControl: 'private, max-age=3600',
      filename: `dmf-ad-${jobId}.mp4`,
    })
  } catch (error) {
    console.error('Video content proxy error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
