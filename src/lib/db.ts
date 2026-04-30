import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  schemaReady?: Promise<void>
}

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${table}")`)
  return rows.some(row => row.name === column)
}

export async function ensureSqliteSchema(): Promise<void> {
  if (globalForPrisma.schemaReady) {
    return globalForPrisma.schemaReady
  }

  globalForPrisma.schemaReady = (async () => {
    const entryColumns = [
      { name: 'movedFrom', ddl: 'ALTER TABLE "Entry" ADD COLUMN "movedFrom" TEXT' },
      { name: 'order', ddl: 'ALTER TABLE "Entry" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0' },
      { name: 'originalDate', ddl: 'ALTER TABLE "Entry" ADD COLUMN "originalDate" TEXT' },
      { name: 'carryCount', ddl: 'ALTER TABLE "Entry" ADD COLUMN "carryCount" INTEGER NOT NULL DEFAULT 0' },
    ]

    for (const column of entryColumns) {
      if (!(await hasColumn('Entry', column.name))) {
        await prisma.$executeRawUnsafe(column.ddl)
      }
    }

    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Entry_date_order_idx" ON "Entry"("date","order")')
  })().catch(error => {
    globalForPrisma.schemaReady = undefined
    throw error
  })

  return globalForPrisma.schemaReady
}

export function normalizeHabitName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function getTypeEmoji(type: string): string {
  switch (type) {
    case 'task': return '📋'
    case 'event': return '📅'
    case 'idea': return '💡'
    case 'note': return '📝'
    default: return '📋'
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700'
    case 'medium': return 'bg-amber-100 text-amber-700'
    case 'low': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function getStatusConfirmMessage(type: string, content: string): string {
  const truncated = content.length > 30 ? content.substring(0, 30) + '...' : content
  switch (type) {
    case 'task': return `✅ Task saved: "${truncated}"`
    case 'event': return `📅 Event saved: "${truncated}"`
    case 'idea': return `💡 Idea noted: "${truncated}"`
    case 'note': return `📝 Note saved: "${truncated}"`
    default: return `✅ Saved: "${truncated}"`
  }
}
