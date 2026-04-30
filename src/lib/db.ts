import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
