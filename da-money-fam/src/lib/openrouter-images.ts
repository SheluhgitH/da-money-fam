import { imageModelChain, IMAGE_MODELS, type ImageTier, resolveImageModel } from '@/lib/image-models'
import { uploadGeneratedImageBuffer } from '@/lib/reference-upload'

export interface OpenRouterImageResult {
  url: string
  modelId: string
  usdCost: number | null
}

export async function generateOpenRouterImage(input: {
  tier: ImageTier
  prompt: string
  aspectRatio?: string
  inputReferences?: string[]
  userId: string
}): Promise<OpenRouterImageResult> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    throw new Error('OpenRouter API Key not configured')
  }

  const model = resolveImageModel(input.tier)
  const chain = imageModelChain(input.tier)
  let lastError = 'All image models failed'

  for (const modelId of chain) {
    try {
      const body: Record<string, unknown> = {
        model: modelId,
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio || '9:16',
        n: 1,
      }

      const cfg = IMAGE_MODELS[input.tier].imageConfig
      if (cfg) body.image_config = cfg

      const refs = (input.inputReferences || []).filter(
        (u) => u.startsWith('http://') || u.startsWith('https://')
      )
      if (refs.length > 0) {
        body.input_references = refs.slice(0, 4).map((url) => ({
          type: 'image_url',
          image_url: { url },
        }))
      }

      const response = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
          'X-Title': 'DMF Ad Studio Images',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (!response.ok) {
        lastError =
          data.error?.message || JSON.stringify(data.error) || `HTTP ${response.status}`
        console.error(`Image model ${modelId} failed:`, lastError)
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

      const uploaded = await uploadGeneratedImageBuffer({
        userId: input.userId,
        buffer,
        contentType,
      })

      const usdCost =
        typeof data.usage?.cost === 'number'
          ? data.usage.cost
          : typeof data.usage?.cost === 'string'
            ? Number(data.usage.cost)
            : model.usdEstimate

      return {
        url: uploaded.url,
        modelId,
        usdCost: Number.isFinite(usdCost) ? usdCost : null,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Request failed'
      console.error(`Image model ${modelId} error:`, lastError)
    }
  }

  throw new Error(lastError)
}
