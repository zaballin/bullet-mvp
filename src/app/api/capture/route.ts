import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseMessage, getStatusConfirmMessage, today } from '@/lib/db'

// Simplified capture endpoint - stores entries without Twilio dependency
// Can be called internally or via external tools
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, from } = body

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const trimmed = message.trim()
    const parsed = parseMessage(trimmed)

    let replyMessage = ''

    if (parsed.type === 'habit') {
      // Check if habit already exists
      const existing = await prisma.habit.findFirst({
        where: { name: { equals: parsed.content } }
      })
      
      if (existing) {
        replyMessage = `✔️ Habit already exists: "${parsed.content}"`
      } else {
        const habit = await prisma.habit.create({
          data: { name: parsed.content },
        })
        replyMessage = `✔️ New habit created: "${parsed.content}"`
      }
    } else {
      // Create an entry
      const entry = await prisma.entry.create({
        data: {
          type: parsed.type,
          content: parsed.content,
          date: today(),
          priority: parsed.priority || 'medium',
        },
      })
      replyMessage = getStatusConfirmMessage(parsed.type, parsed.content)
    }

    console.log(`📱 Capture: ${parsed.type} - ${parsed.content}`)

    return NextResponse.json({ 
      success: true, 
      reply: replyMessage,
      parsed 
    })
  } catch (error) {
    console.error('Capture error:', error)
    return NextResponse.json({ error: 'Failed to capture' }, { status: 500 })
  }
}

// GET - health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'bullet-mvp-capture',
    usage: 'POST with { message: "task: your task" }'
  })
}