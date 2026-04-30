import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeDateString, today } from '@/lib/date'

// POST /api/habits/[id]/toggle - toggle habit for a specific date (default: today)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const habitId = params.id
    const todayStr = today()
    const rawDate = typeof body.date === 'string' && body.date ? body.date : todayStr
    const date = normalizeDateString(rawDate)

    if (!date) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (date > todayStr) {
      return NextResponse.json({ error: 'Future habit dates cannot be edited' }, { status: 400 })
    }

    const logs = await prisma.habitLog.findMany({
      where: { habitId },
    })
    const existing = logs.find(log => normalizeDateString(log.date) === date)

    if (existing) {
      await prisma.habitLog.update({
        where: { id: existing.id },
        data: { completed: !existing.completed },
      })
    } else {
      await prisma.habitLog.create({
        data: { habitId, date, completed: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Habit toggle error:', error)
    return NextResponse.json({ error: 'Failed to toggle habit' }, { status: 500 })
  }
}
