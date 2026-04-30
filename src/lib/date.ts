export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SLASH_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const DOT_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/

export function normalizeDateString(dateString: string): string | null {
  const trimmed = dateString.trim()
  if (!trimmed) return null

  if (ISO_DATE_RE.test(trimmed)) {
    return trimmed
  }

  const slashMatch = trimmed.match(SLASH_DATE_RE)
  if (slashMatch) {
    const month = Number(slashMatch[1])
    const day = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const parsed = new Date(year, month - 1, day)
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed)
  }

  const dotMatch = trimmed.match(DOT_DATE_RE)
  if (dotMatch) {
    const day = Number(dotMatch[1])
    const month = Number(dotMatch[2])
    const year = Number(dotMatch[3])
    const parsed = new Date(year, month - 1, day)
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed)
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(parsed)
  }

  return null
}

export function parseDate(dateString: string): Date {
  const normalized = normalizeDateString(dateString)
  if (!normalized) {
    return new Date(Number.NaN)
  }

  const [year, month, day] = normalized.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function today(): string {
  return formatDate(new Date())
}

export function shiftDate(dateValue: Date | string, days: number): string {
  const nextDate = typeof dateValue === 'string' ? parseDate(dateValue) : new Date(dateValue)
  if (Number.isNaN(nextDate.getTime())) {
    return today()
  }
  nextDate.setDate(nextDate.getDate() + days)
  return formatDate(nextDate)
}

export function getTomorrowDate(baseDate: Date | string = new Date()): string {
  return shiftDate(baseDate, 1)
}
