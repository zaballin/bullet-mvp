import { NextRequest, NextResponse } from 'next/server'
import { ensureSqliteSchema, prisma, getStatusConfirmMessage, normalizeHabitName } from '@/lib/db'
import { today } from '@/lib/date'
import { parseEntryInput } from '@/lib/entry-parsing'

// Simplified capture endpoint - stores entries without Twilio dependency
// Can be called internally or via external tools
export async function POST(request: NextRequest) {
  try {
    await ensureSqliteSchema()
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const trimmed = message.trim()
    const parsed = parseEntryInput(trimmed)

    if (!parsed.content) {
      return NextResponse.json({ error: 'Message content is empty' }, { status: 400 })
    }

    let replyMessage = ''

    if (parsed.type === 'habit') {
      const normalizedName = normalizeHabitName(parsed.content)
      const existingHabits = await prisma.habit.findMany({
        select: { id: true, name: true, active: true },
      })
      const existing = existingHabits.find(habit => normalizeHabitName(habit.name) === normalizedName)
      
      if (existing) {
        if (!existing.active) {
          await prisma.habit.update({
            where: { id: existing.id },
            data: { active: true, name: parsed.content },
          })
          replyMessage = `✔️ Habit reactivated: "${parsed.content}"`
        } else {
          replyMessage = `✔️ Habit already exists: "${parsed.content}"`
        }
      } else {
        await prisma.habit.create({
          data: { name: parsed.content },
        })
        replyMessage = `✔️ New habit created: "${parsed.content}"`
      }
    } else {
      // Create an entry
      const result = await prisma.entry.aggregate({
        where: { date: today() },
        _max: { order: true },
      })
      await prisma.entry.create({
        data: {
          type: parsed.type,
          content: parsed.content,
          date: today(),
          priority: parsed.priority || 'medium',
          order: (result._max.order ?? -1) + 1,
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
