import { getCurrentUser } from '@/lib/auth/user'
import { getUserCoins } from '@/lib/user-store'
import { listAdStudioGenerations } from '@/lib/ad-studio-jobs'
import { getPublishedPosts } from '@/lib/blog/posts'
import { buildImageQuote, getImageCoinPrice } from '@/lib/image-pricing'
import { getAdVideoCoinPrice } from '@/lib/ad-studio-pricing'
import { resolveSeedanceModel } from '@/lib/seedance-models'
import { createServiceClient } from '@/lib/supabase/server'
import type { AssistantAction } from '@/lib/assistant-actions'

export type OpenAiTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** Tools the model may call. Server tools run on the server; client tools become actions. */
export const ASSISTANT_TOOLS: OpenAiTool[] = [
  {
    type: 'function',
    function: {
      name: 'quoteImage',
      description: 'Quote Coinz cost for generating one still image. Does not spend.',
      parameters: {
        type: 'object',
        properties: {
          tier: { type: 'string', enum: ['fast', 'smart'], description: 'Default fast' },
          prompt: { type: 'string', description: 'Image prompt to propose after quoting' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quoteVideo',
      description: 'Quote Coinz cost for a Seedance video. Does not spend.',
      parameters: {
        type: 'object',
        properties: {
          brief: { type: 'string' },
          scenes: { type: 'number', description: 'Scene count 1–3' },
          sceneBriefs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional storyboard scene strings',
          },
        },
        required: ['brief'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listLibrary',
      description: 'List the signed-in user’s recent Ad Studio videos and stills.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchBlog',
      description: 'Search published blog posts by keyword.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigate a homepage tab/section.',
      parameters: {
        type: 'object',
        properties: { target: { type: 'string' } },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open',
      description: 'Open an allowlisted path like /ad-studio or /coin-wallet.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'link',
      description: 'Open Instagram, Kick, or mailto contact.',
      parameters: {
        type: 'object',
        properties: { href: { type: 'string' } },
        required: ['href'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setBrief',
      description: 'Replace the Ad Studio single-shot brief (no generate).',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'appendBrief',
      description: 'Append a sentence to the current brief (no generate).',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setScenes',
      description: 'Set storyboard scenes (2–5 strings).',
      parameters: {
        type: 'object',
        properties: { scenes: { type: 'array', items: { type: 'string' } } },
        required: ['scenes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setAspect',
      description: 'Set aspect ratio 9:16, 16:9, 1:1, or 4:5.',
      parameters: {
        type: 'object',
        properties: { aspect: { type: 'string' } },
        required: ['aspect'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'proposeImageGenerate',
      description:
        'After quoting (or with known price), propose image generate for the user to confirm. Prefer calling quoteImage first.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          tier: { type: 'string', enum: ['fast', 'smart'] },
          quoteId: { type: 'string' },
          priceCoins: { type: 'number' },
          canAfford: { type: 'boolean' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'proposeVideoGenerate',
      description:
        'Propose video generate for user confirm. Prefer quoteVideo first. Does not spend until they confirm.',
      parameters: {
        type: 'object',
        properties: {
          brief: { type: 'string' },
          scenes: { type: 'array', items: { type: 'string' } },
          priceCoins: { type: 'number' },
          canAfford: { type: 'boolean' },
        },
        required: ['brief'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'attachLibraryRef',
      description:
        'Attach an image URL as an Ad Studio reference. Default asFirstFrame=false for Guide/identity. Set asFirstFrame=true only when the user wants Lock start or Animate A→B Start frame.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          asFirstFrame: {
            type: 'boolean',
            description:
              'false = identity/Guide. true = Start frame for Lock start or Animate A→B.',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'classifyRefs',
      description:
        'Classify attached still URLs into opening_subject / appears_later / identity for video timing. Returns roles JSON.',
      parameters: {
        type: 'object',
        properties: {
          brief: { type: 'string' },
          urls: { type: 'array', items: { type: 'string' } },
        },
        required: ['urls'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'continueStoryboard',
      description: 'Load a storyboard from library for continuation.',
      parameters: {
        type: 'object',
        properties: { libraryId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelJob',
      description: 'Cancel the current Ad Studio generation.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'playTrack',
      description: 'Preview a published song by title/artist query.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'openProduct',
      description: 'Scroll to merch/shop on the homepage.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'startCoinCheckout',
      description: 'Open Stripe checkout for a Coinz pack (user still pays).',
      parameters: {
        type: 'object',
        properties: {
          packageId: { type: 'string', enum: ['starter', 'creator', 'studio'] },
        },
      },
    },
  },
]

const SERVER_TOOLS = new Set([
  'quoteImage',
  'quoteVideo',
  'listLibrary',
  'searchBlog',
  'classifyRefs',
])

export function isServerTool(name: string): boolean {
  return SERVER_TOOLS.has(name)
}

export async function executeServerTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    if (name === 'quoteImage') {
      const user = await getCurrentUser()
      if (!user) return JSON.stringify({ error: 'Sign in required', signedIn: false })
      const tier = args.tier === 'smart' ? 'smart' : 'fast'
      const pricing = await getImageCoinPrice(tier)
      const balance = await getUserCoins(user.id)
      const { quoteId, expiresAt } = buildImageQuote(
        pricing.tier,
        pricing.priceCoins,
        pricing.modelId
      )
      return JSON.stringify({
        quoteId,
        expiresAt,
        priceCoins: pricing.priceCoins,
        balance,
        canAfford: balance >= pricing.priceCoins,
        tier: pricing.tier,
        prompt: typeof args.prompt === 'string' ? args.prompt : '',
      })
    }

    if (name === 'quoteVideo') {
      const user = await getCurrentUser()
      if (!user) return JSON.stringify({ error: 'Sign in required', signedIn: false })
      const scenes = Math.min(
        3,
        Math.max(
          1,
          Array.isArray(args.sceneBriefs) && args.sceneBriefs.length >= 2
            ? args.sceneBriefs.length
            : Number(args.scenes) || 1
        )
      )
      const model = resolveSeedanceModel(null)
      const pricing = await getAdVideoCoinPrice(model.key, 6, false, '480p')
      const balance = await getUserCoins(user.id)
      const totalPriceCoins = pricing.priceCoins * scenes
      return JSON.stringify({
        priceCoins: pricing.priceCoins,
        totalPriceCoins,
        balance,
        canAfford: balance >= totalPriceCoins,
        scenes,
        brief: typeof args.brief === 'string' ? args.brief : '',
        sceneBriefs: Array.isArray(args.sceneBriefs)
          ? args.sceneBriefs.filter((s): s is string => typeof s === 'string')
          : undefined,
      })
    }

    if (name === 'listLibrary') {
      const user = await getCurrentUser()
      if (!user) {
        return JSON.stringify({ signedIn: false, lastVideos: [], lastImages: [] })
      }
      const gens = await listAdStudioGenerations(user.id).catch(() => [])
      const lastVideos = gens.slice(0, 5).map((g) => ({
        id: g.id,
        brief: (g.brief || g.scenes?.[0]?.brief || 'Untitled').slice(0, 160),
        thumb: g.thumbnail_url,
        url: g.video_urls?.[0] || null,
        mode: g.mode,
      }))
      let lastImages: Array<{ id: string; url: string; prompt: string }> = []
      const supabase = createServiceClient()
      if (supabase) {
        const { data } = await supabase
          .from('ad_studio_images')
          .select('id,output_url,prompt')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
        lastImages = (data || []).map(
          (row: { id?: string; output_url?: string; prompt?: string }) => ({
            id: String(row.id || ''),
            url: String(row.output_url || ''),
            prompt: String(row.prompt || '').slice(0, 120),
          })
        )
      }
      const coins = await getUserCoins(user.id).catch(() => 0)
      return JSON.stringify({ signedIn: true, coins, lastVideos, lastImages })
    }

    if (name === 'searchBlog') {
      const q = String(args.query || '')
        .trim()
        .toLowerCase()
      const posts = await getPublishedPosts()
      const matched = (q
        ? posts.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.excerpt.toLowerCase().includes(q) ||
              p.slug.toLowerCase().includes(q)
          )
        : posts
      ).slice(0, 6)
      return JSON.stringify({
        posts: matched.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt.slice(0, 180),
        })),
      })
    }

    if (name === 'classifyRefs') {
      const urls = Array.isArray(args.urls)
        ? args.urls.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
        : []
      const brief = typeof args.brief === 'string' ? args.brief : ''
      const { classifyReferenceRoles } = await import('@/lib/classify-reference-roles')
      const result = await classifyReferenceRoles({ brief, urls })
      return JSON.stringify(result)
    }

    return JSON.stringify({ error: `Unknown server tool: ${name}` })
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : 'Tool failed',
    })
  }
}

/** Map a client-side tool call into an AssistantAction (or null). */
export function clientToolToAction(
  name: string,
  args: Record<string, unknown>
): AssistantAction | null {
  switch (name) {
    case 'navigate':
      return typeof args.target === 'string' ? { type: 'navigate', target: args.target } : null
    case 'open':
      return typeof args.path === 'string' ? { type: 'open', path: args.path } : null
    case 'link':
      return typeof args.href === 'string' ? { type: 'link', href: args.href } : null
    case 'setBrief':
      return typeof args.text === 'string' ? { type: 'setBrief', text: args.text } : null
    case 'appendBrief':
      return typeof args.text === 'string' ? { type: 'appendBrief', text: args.text } : null
    case 'setScenes':
      return Array.isArray(args.scenes) && args.scenes.every((s) => typeof s === 'string')
        ? { type: 'setScenes', scenes: args.scenes as string[] }
        : null
    case 'setAspect':
      return typeof args.aspect === 'string' ? { type: 'setAspect', aspect: args.aspect } : null
    case 'proposeImageGenerate':
    case 'generateImage':
      return typeof args.prompt === 'string'
        ? {
            type: 'generateImage',
            prompt: args.prompt,
            tier: args.tier === 'smart' ? 'smart' : 'fast',
          }
        : null
    case 'proposeVideoGenerate':
    case 'generateVideo':
      return typeof args.brief === 'string'
        ? {
            type: 'generateVideo',
            brief: args.brief,
            scenes: Array.isArray(args.scenes)
              ? (args.scenes as string[]).filter((s) => typeof s === 'string')
              : Array.isArray(args.sceneBriefs)
                ? (args.sceneBriefs as string[]).filter((s) => typeof s === 'string')
                : undefined,
          }
        : null
    case 'attachLibraryRef':
      return typeof args.url === 'string'
        ? {
            type: 'attachLibraryRef',
            url: args.url,
            asFirstFrame: args.asFirstFrame === true,
          }
        : null
    case 'continueStoryboard':
      return {
        type: 'continueStoryboard',
        libraryId: typeof args.libraryId === 'string' ? args.libraryId : undefined,
      }
    case 'cancelJob':
      return { type: 'cancelJob' }
    case 'listLibrary':
      return { type: 'listLibrary' }
    case 'searchBlog':
      return typeof args.query === 'string' ? { type: 'searchBlog', query: args.query } : null
    case 'playTrack':
      return typeof args.query === 'string' ? { type: 'playTrack', query: args.query } : null
    case 'openProduct':
      return { type: 'openProduct' }
    case 'startCoinCheckout':
      return {
        type: 'startCoinCheckout',
        packageId: typeof args.packageId === 'string' ? args.packageId : undefined,
      }
    default:
      return null
  }
}

export type ToolCallMessage = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}
