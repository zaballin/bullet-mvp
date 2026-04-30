import { NextRequest, NextResponse } from 'next/server'
import { prisma, normalizeHabitName } from '@/lib/db'
import { normalizeDateString } from '@/lib/date'

// GET /api/habits - list all habits with ALL logs (for 52-week graph)
export async function GET() {
  const habits = await prisma.habit.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
    include: {
      logs: {
        orderBy: { date: 'desc' },
      },
    },
  })

  const normalizedHabits = habits.map(habit => {
    const logsByDate = new Map<string, typeof habit.logs[number]>()
    for (const log of habit.logs) {
      const normalizedDate = normalizeDateString(log.date)
      if (!normalizedDate) continue
      const current = logsByDate.get(normalizedDate)
      if (!current || current.createdAt < log.createdAt) {
        logsByDate.set(normalizedDate, { ...log, date: normalizedDate })
      }
    }

    return {
      ...habit,
      logs: Array.from(logsByDate.values()).sort((a, b) => b.date.localeCompare(a.date)),
    }
  })

  return NextResponse.json(normalizedHabits)
}

// POST /api/habits - create new habit
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) {
      return NextResponse.json({ error: 'Habit name is required' }, { status: 400 })
    }

    const normalizedName = normalizeHabitName(trimmedName)
    const existingHabits = await prisma.habit.findMany({
      select: { id: true, name: true, active: true },
    })
    const existing = existingHabits.find(habit => normalizeHabitName(habit.name) === normalizedName)

    if (existing?.active) {
      return NextResponse.json({ error: 'Habit already exists' }, { status: 409 })
    }

    const habit = existing
      ? await prisma.habit.update({
          where: { id: existing.id },
          data: { active: true, name: trimmedName },
        })
      : await prisma.habit.create({
          data: { name: trimmedName },
        })

    return NextResponse.json(habit)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 })
  }
}

// PATCH /api/habits - update habit
export async function PATCH(request: NextRequest) {
  try {
    const { id, name, active } = await request.json()
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (active !== undefined) updateData.active = active

    const habit = await prisma.habit.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(habit)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 })
  }
}

// DELETE /api/habits - delete habit
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'Habit id is required' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.habitLog.deleteMany({ where: { habitId: id } }),
      prisma.habit.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 })
  }
}
