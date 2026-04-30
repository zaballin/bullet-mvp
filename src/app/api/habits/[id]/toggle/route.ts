import { NextRequest, NextResponse } from 'next/server'
import { prisma, today } from '@/lib/db'

// POST /api/habits/[id]/toggle - toggle habit for a specific date (default: today)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const habitId = params.id
    const date = body.date || today()

    const existing = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date } },
    })

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