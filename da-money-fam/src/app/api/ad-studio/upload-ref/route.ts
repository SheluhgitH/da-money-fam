import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { uploadReferenceImage } from '@/lib/reference-upload'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file required' }, { status: 400 })
      }
      const buf = Buffer.from(await file.arrayBuffer())
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${buf.toString('base64')}`
      const uploaded = await uploadReferenceImage({
        userId: user.id,
        dataUrlOrBase64: dataUrl,
        contentType: file.type || 'image/jpeg',
      })
      return NextResponse.json(uploaded)
    }

    const body = await req.json()
    const dataUrl =
      typeof body.dataUrl === 'string'
        ? body.dataUrl
        : typeof body.base64 === 'string'
          ? body.base64
          : null
    if (!dataUrl) {
      return NextResponse.json({ error: 'dataUrl required' }, { status: 400 })
    }

    const uploaded = await uploadReferenceImage({
      userId: user.id,
      dataUrlOrBase64: dataUrl,
      contentType: typeof body.contentType === 'string' ? body.contentType : undefined,
    })
    return NextResponse.json(uploaded)
  } catch (error) {
    console.error('upload-ref:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
