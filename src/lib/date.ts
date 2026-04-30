export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function today(): string {
  return formatDate(new Date())
}

export function shiftDate(dateValue: Date | string, days: number): string {
  const nextDate = typeof dateValue === 'string' ? parseDate(dateValue) : new Date(dateValue)
  nextDate.setDate(nextDate.getDate() + days)
  return formatDate(nextDate)
}

export function getTomorrowDate(baseDate: Date | string = new Date()): string {
  return shiftDate(baseDate, 1)
}
