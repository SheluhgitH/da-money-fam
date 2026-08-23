import { imageModelChain, IMAGE_MODELS, type ImageTier } from '@/lib/image-models'
import { uploadStorePublicImage, type StoreImageFolder } from '@/lib/store-image-storage'

export type AdminImageFolder = StoreImageFolder

export async function saveAdminPublicImage(
  buffer: Buffer,
  contentType = 'image/png',
  folder: AdminImageFolder = 'covers'
): Promise<string> {
  return uploadStorePublicImage(buffer, folder, contentType)
}

/** @deprecated Prefer saveAdminPublicImage — kept for song cover callers */
export async function saveSongCoverBuffer(
  buffer: Buffer,
  contentType = 'image/png'
): Promise<string> {
  return saveAdminPublicImage(buffer, contentType, 'covers')
}

async function generateAdminCoverImage(input: {
  prompt: string
  title?: string
  tier?: ImageTier
  aspectRatio: '1:1' | '16:9'
  folder: AdminImageFolder
  defaultPromptFromTitle: (title: string) => string
  xTitle: string
}): Promise<{ path: string; previewUrl: string; modelId: string }> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    throw new Error('OpenRouter API Key not configured')
  }

  let prompt = input.prompt.trim()
  if (!prompt && input.title?.trim()) {
    prompt = input.defaultPromptFromTitle(input.title.trim())
  }
  if (!prompt) {
    throw new Error('Cover prompt is required')
  }

  const tier: ImageTier = input.tier || 'fast'
  const chain = imageModelChain(tier)
  let lastError = 'All image models failed'

  for (const modelId of chain) {
    try {
      const body: Record<string, unknown> = {
        model: modelId,
        prompt,
        aspect_ratio: input.aspectRatio,
        n: 1,
      }
      const cfg = IMAGE_MODELS[tier].imageConfig
      if (cfg) body.image_config = cfg

      const response = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
          'X-Title': input.xTitle,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (!response.ok) {
        lastError =
          data.error?.message || JSON.stringify(data.error) || `HTTP ${response.status}`
        console.error(`Cover model ${modelId} failed:`, lastError)
        continue
      }

      const item = data.data?.[0]
      let buffer: Buffer | null = null
      let contentType = 'image/png'

      if (item?.b64_json) {
        buffer = Buffer.from(item.b64_json, 'base64')
        contentType = item.media_type || 'image/png'
      } else if (typeof item?.url === 'string') {
        const imgRes = await fetch(item.url)
        if (!imgRes.ok) {
          lastError = 'Failed to download generated image'
          continue
        }
        buffer = Buffer.from(await imgRes.arrayBuffer())
        contentType = imgRes.headers.get('content-type') || 'image/png'
      }

      if (!buffer) {
        lastError = 'No image in response'
        continue
      }

      const savedPath = await saveAdminPublicImage(buffer, contentType, input.folder)
      return {
        path: savedPath,
        previewUrl: savedPath,
        modelId,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Request failed'
      console.error(`Cover model ${modelId} error:`, lastError)
    }
  }

  throw new Error(lastError)
}

export async function generateAdminSongCover(input: {
  prompt: string
  title?: string
  tier?: ImageTier
}): Promise<{ album_cover_path: string; previewUrl: string; modelId: string }> {
  const result = await generateAdminCoverImage({
    ...input,
    aspectRatio: '1:1',
    folder: 'covers',
    xTitle: 'DMF Admin Song Covers',
    defaultPromptFromTitle: (title) =>
      `Square album cover art for the song "${title}", luxury hip-hop aesthetic, cinematic lighting, no text, no logos, no watermarks`,
  })
  return {
    album_cover_path: result.path,
    previewUrl: result.previewUrl,
    modelId: result.modelId,
  }
}

export async function generateAdminBlogCover(input: {
  prompt: string
  title?: string
  tier?: ImageTier
}): Promise<{ cover_image_url: string; previewUrl: string; modelId: string }> {
  const result = await generateAdminCoverImage({
    ...input,
    aspectRatio: '16:9',
    folder: 'blog',
    xTitle: 'DMF Admin Blog Covers',
    defaultPromptFromTitle: (title) =>
      `Wide cinematic 16:9 blog hero image for "${title}", luxury hip-hop culture aesthetic, dramatic lighting, no text, no logos, no watermarks`,
  })
  return {
    cover_image_url: result.path,
    previewUrl: result.previewUrl,
    modelId: result.modelId,
  }
}
