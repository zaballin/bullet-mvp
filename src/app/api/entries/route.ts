import { NextRequest, NextResponse } from 'next/server'
import { prisma, parseMessage, getStatusConfirmMessage, today } from '@/lib/db'

// GET /api/entries - list entries with optional filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')
  const type = searchParams.get('type')

  // If date is "all" or not provided, fetch all entries (for journal view)
  const where: Record<string, unknown> = {}
  
  if (date && date !== 'all') {
    where.date = date
  }
  
  if (type) where.type = type

  const entries = await prisma.entry.findMany({
    where,
    orderBy: [
      { date: 'desc' },
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  return NextResponse.json(entries)
}

// POST /api/entries - create new entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, content, priority, date: entryDate, area } = body

    // If type AND content are explicitly provided (from web UI), use them directly
    // This bypasses parseMessage entirely for UI-driven creation
    if (type && content) {
      const entry = await prisma.entry.create({
        data: {
          type,
          content,
          date: entryDate || today(),
          priority: priority || 'medium',
          area: area || null,
        },
      })
      return NextResponse.json(entry)
    }

    // Only use parseMessage for raw content (WhatsApp/capture)
    const parsed = parseMessage(content || '')
    const entry = await prisma.entry.create({
      data: {
        type: parsed.type,
        content: parsed.content,
        date: today(),
        priority: parsed.priority || 'medium',
        area: null,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Entry creation error:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}

// PATCH /api/entries - update entry
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, priority, area, type, date } = body

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (area !== undefined) updateData.area = area
    if (type !== undefined) updateData.type = type
    if (date !== undefined) updateData.date = date

    const entry = await prisma.entry.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Entry update error:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

// DELETE /api/entries - delete entry
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    await prisma.entry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}