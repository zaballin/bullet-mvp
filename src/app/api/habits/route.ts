import { NextRequest, NextResponse } from 'next/server'
import { prisma, today } from '@/lib/db'

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

  return NextResponse.json(habits)
}

// POST /api/habits - create new habit
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    const habit = await prisma.habit.create({
      data: { name },
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
    await prisma.habit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 })
  }
}