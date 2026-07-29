import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'

export async function GET(
  _req: Request,
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

  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    return NextResponse.json({ error: 'OpenRouter API Key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Seedance Polling API Error Response:', JSON.stringify(errorData, null, 2))
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    const status = data.status as string

    // Browser cannot call OpenRouter content URLs (need API key).
    // Always serve completed videos through our authenticated proxy.
    const videoUrl =
      status === 'completed' || status === 'succeeded'
        ? `/api/video/${jobId}/content`
        : null

    return NextResponse.json({
      status,
      videoUrl,
      jobId,
    })
  } catch (error) {
    console.error('Video Polling API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
