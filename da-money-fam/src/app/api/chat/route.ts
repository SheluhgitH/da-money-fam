import { NextResponse } from 'next/server'
import { getSystemPrompt } from '@/lib/chat-prompts'
import { streamChatWithFallback } from '@/lib/chat-completion'
import { getDefaultChatModel, getPickerModels } from '@/lib/chat-models'

export async function GET() {
  return NextResponse.json({
    models: getPickerModels(),
    defaultModel: getDefaultChatModel(),
  })
}

export async function POST(req: Request) {
  const { messages, model } = await req.json()

  const systemPrompt = getSystemPrompt()
  const conversationHistory = [{ role: 'system' as const, content: systemPrompt }, ...messages]

  return streamChatWithFallback(conversationHistory, model)
}
