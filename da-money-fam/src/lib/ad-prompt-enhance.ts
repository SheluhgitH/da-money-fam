import {

  buildAdPromptFromBrief,

  type CreativeSelections,

  getCreativeFragments,

  normalizeCreativeSelections,

} from '@/lib/ad-creative-presets'

import { completeChatWithFallback } from '@/lib/chat-completion'



export function buildBaseAdPrompt(

  brief: string,

  creative?: Partial<CreativeSelections> | null

): string {

  const selections = normalizeCreativeSelections(creative)

  return buildAdPromptFromBrief(brief, selections)

}



export async function enhanceAdPrompt(

  brief: string,

  creative?: Partial<CreativeSelections> | null

): Promise<string> {

  const selections = normalizeCreativeSelections(creative)

  const basePrompt = buildAdPromptFromBrief(brief, selections)

  const fragments = getCreativeFragments(selections)



  const systemPrompt = `You rewrite ad briefs into a single Seedance video generation prompt.

Rules:

- Output ONE paragraph only, no markdown, no bullet points.

- Keep the user's core message and all creative direction.

- Preserve these exact creative choices in meaning: ${fragments.join('; ')}

- Include camera, lighting, mood, pacing, and subject motion naturally.

- DMF brand: luxury hip-hop, gold and black, premium commercial polish.

- Do not add dialogue unless the brief asks for it.

- Maximum 120 words.`



  const enhanced = await completeChatWithFallback(

    [

      { role: 'system', content: systemPrompt },

      {

        role: 'user',

        content: `Brief: ${brief.trim()}\n\nBase prompt to polish:\n${basePrompt}`,

      },

    ],

    { maxTokens: 300 }

  )



  return enhanced || basePrompt

}



export async function resolveAdPrompt(input: {

  brief: string

  creative?: Partial<CreativeSelections> | null

  enhance?: boolean

}): Promise<string> {

  const { brief, creative, enhance } = input

  if (enhance) {

    return enhanceAdPrompt(brief, creative)

  }

  return buildBaseAdPrompt(brief, creative)

}

