export const ENTRY_TYPES = ['task', 'event', 'idea', 'note'] as const
export const ENTRY_PRIORITIES = ['high', 'medium', 'low'] as const
export const ENTRY_STATUSES = ['open', 'done', 'moved', 'dropped'] as const

export type EntryType = (typeof ENTRY_TYPES)[number]
export type EntryPriority = (typeof ENTRY_PRIORITIES)[number]
export type EntryStatus = (typeof ENTRY_STATUSES)[number]

export function isEntryType(value: string): value is EntryType {
  return ENTRY_TYPES.includes(value as EntryType)
}

export function isEntryPriority(value: string): value is EntryPriority {
  return ENTRY_PRIORITIES.includes(value as EntryPriority)
}

export function isEntryStatus(value: string): value is EntryStatus {
  return ENTRY_STATUSES.includes(value as EntryStatus)
}

function parseTaskContent(text: string): { content: string; priority: EntryPriority } {
  const trimmed = text.trim()

  if (trimmed.startsWith('!')) {
    return { content: trimmed.slice(1).trim(), priority: 'high' }
  }

  const priorityMatch = trimmed.match(/^(high|medium|low)\b\s*(.*)$/i)
  if (priorityMatch) {
    return {
      priority: priorityMatch[1].toLowerCase() as EntryPriority,
      content: priorityMatch[2].trim(),
    }
  }

  return { content: trimmed, priority: 'medium' }
}

export function parseEntryInput(text: string): {
  type: EntryType | 'habit'
  content: string
  priority: EntryPriority
  time?: string
} {
  const trimmed = text.trim()

  if (!trimmed) {
    return { type: 'task', content: '', priority: 'medium' }
  }

  const urgentTaskMatch = trimmed.match(/^\.!\s*(.+)$/)
  if (urgentTaskMatch) {
    return { type: 'task', priority: 'high', content: urgentTaskMatch[1].trim() }
  }

  const taskBulletMatch = trimmed.match(/^\.\s*(.+)$/)
  if (taskBulletMatch) {
    return { type: 'task', priority: 'medium', content: taskBulletMatch[1].trim() }
  }

  const noteBulletMatch = trimmed.match(/^\/\s*(.+)$/)
  if (noteBulletMatch) {
    return { type: 'note', priority: 'medium', content: noteBulletMatch[1].trim() }
  }

  const ideaBulletMatch = trimmed.match(/^!\s*(.+)$/)
  if (ideaBulletMatch) {
    return { type: 'idea', priority: 'medium', content: ideaBulletMatch[1].trim() }
  }

  const taskMatch = trimmed.match(/^task:?\s*(.+)$/i)
  if (taskMatch) {
    const parsedTask = parseTaskContent(taskMatch[1])
    return { type: 'task', ...parsedTask }
  }

  const eventMatch = trimmed.match(/^event:?\s*(.+?)(?:\s+at\s+(\d{1,2}:\d{2}))?$/i)
  if (eventMatch) {
    return {
      type: 'event',
      content: eventMatch[1].trim(),
      priority: 'medium',
      time: eventMatch[2],
    }
  }

  const ideaMatch = trimmed.match(/^idea:?\s*(.+)$/i)
  if (ideaMatch) {
    return { type: 'idea', content: ideaMatch[1].trim(), priority: 'medium' }
  }

  const noteMatch = trimmed.match(/^note:?\s*(.+)$/i)
  if (noteMatch) {
    return { type: 'note', content: noteMatch[1].trim(), priority: 'medium' }
  }

  const habitMatch = trimmed.match(/^habit:?\s*(.+)$/i)
  if (habitMatch) {
    return { type: 'habit', content: habitMatch[1].trim(), priority: 'medium' }
  }

  const lower = trimmed.toLowerCase()
  if (/\b(meeting|call|dinner|lunch|at \d|appoint|schedule)\b/.test(lower)) {
    return { type: 'event', content: trimmed, priority: 'medium' }
  }
  if (/\b(maybe|someday|explore|consider|would be cool)\b/.test(lower)) {
    return { type: 'idea', content: trimmed, priority: 'medium' }
  }
  if (/\b(remember|note|insight|observe)\b/.test(lower)) {
    return { type: 'note', content: trimmed, priority: 'medium' }
  }

  return { type: 'task', content: trimmed, priority: 'medium' }
}
