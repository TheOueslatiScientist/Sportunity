import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { SYSTEM_PROMPT } from '@/lib/chatbot/prompts'
import { TOOL_DEFINITIONS, executeTool } from '@/lib/chatbot/tools'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

type UserMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: UserMessage[] }

    // Build history — only user/assistant turns from client
    const history: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ]

    // Agent loop — max 3 tool-call rounds
    for (let round = 0; round < 3; round++) {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: history as any,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0.3,
      })

      const choice = response.choices[0]
      const msg = choice.message

      if (choice.finish_reason === 'tool_calls' && msg.tool_calls?.length) {
        // Append assistant message with tool_calls
        history.push({
          role: 'assistant',
          content: msg.content ?? '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_calls: msg.tool_calls as any,
        } as Groq.Chat.ChatCompletionMessageParam)

        // Execute each tool and append results
        for (const call of msg.tool_calls) {
          const args = JSON.parse(call.function.arguments || '{}') as Record<string, string>
          const result = await executeTool(call.function.name, args)
          history.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          } as Groq.Chat.ChatCompletionMessageParam)
        }
        continue
      }

      return NextResponse.json({ reply: msg.content ?? '' })
    }

    return NextResponse.json({
      reply: "Désolé, je n'ai pas pu trouver une réponse. Réessaie avec plus de détails.",
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[chat]', msg)
    return NextResponse.json({ reply: `Erreur: ${msg}` })
  }
}
