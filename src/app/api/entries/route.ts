import { NextRequest, NextResponse } from 'next/server'
import { ensureSqliteSchema, prisma } from '@/lib/db'
import { normalizeDateString, today } from '@/lib/date'
import { isEntryPriority, isEntryStatus, isEntryType, parseEntryInput } from '@/lib/entry-parsing'

async function getNextOrder(date: string): Promise<number> {
  const result = await prisma.entry.aggregate({
    where: { date },
    _max: { order: true },
  })

  return (result._max.order ?? -1) + 1
}

// GET /api/entries - list entries with optional filters
export async function GET(request: NextRequest) {
  await ensureSqliteSchema()
  const searchParams = request.nextUrl.searchParams
  const requestedDate = searchParams.get('date')
  const type = searchParams.get('type')

  const where: Record<string, unknown> = {}

  if (requestedDate && requestedDate !== 'all') {
    const normalizedDate = normalizeDateString(requestedDate)
    where.date = normalizedDate || requestedDate
  }

  if (type) {
    where.type = type
  }

  const entries = await prisma.entry.findMany({
    where,
    orderBy: [
      { date: 'desc' },
      { order: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  return NextResponse.json(entries.map(entry => ({
    ...entry,
    date: normalizeDateString(entry.date) || entry.date,
    movedFrom: entry.movedFrom ? normalizeDateString(entry.movedFrom) || entry.movedFrom : null,
    originalDate: entry.originalDate ? normalizeDateString(entry.originalDate) || entry.originalDate : null,
  })))
}

// POST /api/entries - create new entry
export async function POST(request: NextRequest) {
  try {
    await ensureSqliteSchema()
    const body = await request.json()
    const { type, content, priority, date: entryDate, area } = body
    const resolvedDate = typeof entryDate === 'string' && entryDate ? normalizeDateString(entryDate) || today() : today()

    let parsedEntry
    if (typeof type === 'string') {
      if (!isEntryType(type)) {
        return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
      }

      const cleanedContent = typeof content === 'string' ? content.trim() : ''
      if (!cleanedContent) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 })
      }

      parsedEntry = {
        type,
        content: cleanedContent,
        priority: typeof priority === 'string' && isEntryPriority(priority) ? priority : 'medium',
      }
    } else {
      parsedEntry = parseEntryInput(typeof content === 'string' ? content : '')
    }

    if (parsedEntry.type === 'habit') {
      return NextResponse.json({ error: 'Habits must be created from the habits flow' }, { status: 400 })
    }

    if (!parsedEntry.content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const entry = await prisma.entry.create({
      data: {
        type: parsedEntry.type,
        content: parsedEntry.content,
        date: resolvedDate,
        priority: parsedEntry.priority,
        area: typeof area === 'string' ? area : null,
        order: await getNextOrder(resolvedDate),
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
    await ensureSqliteSchema()
    const body = await request.json()
    const { id, status, priority, area, type, date, movedFrom, originalDate, carryCount, reorderIds } = body

    if (Array.isArray(reorderIds)) {
      await prisma.$transaction(
        reorderIds.map((entryId, index) =>
          prisma.entry.update({
            where: { id: entryId },
            data: { order: index },
          })
        )
      )

      return NextResponse.json({ success: true })
    }

    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'Entry id is required' }, { status: 400 })
    }

    const existingEntry = await prisma.entry.findUnique({ where: { id } })
    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      if (typeof status !== 'string' || !isEntryStatus(status)) {
        return NextResponse.json({ error: 'Invalid entry status' }, { status: 400 })
      }
      updateData.status = status
    }

    if (priority !== undefined) {
      if (typeof priority !== 'string' || !isEntryPriority(priority)) {
        return NextResponse.json({ error: 'Invalid entry priority' }, { status: 400 })
      }
      updateData.priority = priority
    }

    if (area !== undefined) {
      updateData.area = typeof area === 'string' ? area : null
    }

    if (type !== undefined) {
      if (typeof type !== 'string' || !isEntryType(type)) {
        return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
      }
      updateData.type = type
    }

    if (movedFrom !== undefined) {
      updateData.movedFrom = typeof movedFrom === 'string' && movedFrom ? movedFrom : null
    }

    if (originalDate !== undefined) {
      updateData.originalDate = typeof originalDate === 'string' && originalDate ? originalDate : null
    }

    if (carryCount !== undefined) {
      const nextCarryCount = Number(carryCount)
      if (!Number.isInteger(nextCarryCount) || nextCarryCount < 0) {
        return NextResponse.json({ error: 'Invalid carry count' }, { status: 400 })
      }
      updateData.carryCount = nextCarryCount
    }

    if (date !== undefined) {
      if (typeof date !== 'string' || !date) {
        return NextResponse.json({ error: 'Invalid entry date' }, { status: 400 })
      }
      const normalizedDate = normalizeDateString(date)
      if (!normalizedDate) {
        return NextResponse.json({ error: 'Invalid entry date' }, { status: 400 })
      }

      updateData.date = normalizedDate
      if (normalizedDate !== existingEntry.date) {
        updateData.order = await getNextOrder(normalizedDate)
      }
    }

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
    await ensureSqliteSchema()
    const { id } = await request.json()
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'Entry id is required' }, { status: 400 })
    }

    await prisma.entry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
