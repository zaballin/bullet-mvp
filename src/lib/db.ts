import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function formatDate(date: Date): string {
  // Use en-CA locale to get YYYY-MM-DD in local timezone (not UTC)
  return date.toLocaleDateString('en-CA')
}

export function today(): string {
  return formatDate(new Date())
}

export function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDate(tomorrow)
}

export function parseMessage(text: string): {
  type: string
  content: string
  priority?: string
  time?: string
} {
  const trimmed = text.trim()

  // task: [!priority] content
  const taskMatch = trimmed.match(/^task:?\s*(?:!?(high|medium|low)\s+)?(.+)/i)
  if (taskMatch) {
    return {
      type: 'task',
      content: taskMatch[2] || taskMatch[1],
      priority: taskMatch[1]?.toLowerCase() || 'medium',
    }
  }

  // event: content at HH:MM
  const eventMatch = trimmed.match(/^event:?\s*(.+?)(?:\s+at\s+(\d{1,2}:\d{2}))?$/i)
  if (eventMatch) {
    return {
      type: 'event',
      content: eventMatch[1],
      time: eventMatch[2],
    }
  }

  // idea: content
  const ideaMatch = trimmed.match(/^idea:?\s*(.+)/i)
  if (ideaMatch) {
    return { type: 'idea', content: ideaMatch[1] }
  }

  // note: content
  const noteMatch = trimmed.match(/^note:?\s*(.+)/i)
  if (noteMatch) {
    return { type: 'note', content: noteMatch[1] }
  }

  // habit: name — creates a habit
  const habitMatch = trimmed.match(/^habit:?\s*(.+)/i)
  if (habitMatch) {
    return { type: 'habit', content: habitMatch[1] }
  }

  // Fallback: infer from keywords
  const lower = trimmed.toLowerCase()
  if (/\b(meeting|call|dinner|lunch|at \d|appoint|schedule)\b/.test(lower)) {
    return { type: 'event', content: trimmed }
  }
  if (/\b(maybe|someday|explore|consider|would be cool)\b/.test(lower)) {
    return { type: 'idea', content: trimmed }
  }
  if (/\b(remember|note|insight|observe)\b/.test(lower)) {
    return { type: 'note', content: trimmed }
  }

  // Default to task
  return { type: 'task', content: trimmed }
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