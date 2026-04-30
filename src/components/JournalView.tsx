'use client'

import { useState, useEffect } from 'react'
import { formatDate, parseDate } from '@/lib/date'

interface Entry {
  id: string
  type: string
  content: string
  date: string
  status: string
  priority: string
  area?: string
  createdAt: string
  movedFrom?: string | null
  originalDate?: string | null
  carryCount: number
  order: number
}

type FilterType = 'all' | 'open' | 'done' | 'carried'

function getBullet(entry: Entry): string {
  if (entry.status === 'done') return '✓'
  if (entry.movedFrom || entry.carryCount > 0 || entry.status === 'moved') return '>'
  if (entry.priority === 'high') return '!'
  switch (entry.type) {
    case 'task': return '•'
    case 'event': return '○'
    case 'note': return '–'
    case 'idea': return '💡'
    default: return '•'
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
  { key: 'carried', label: 'Carried' },
]

export default function JournalView() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => { fetchEntries() }, [])

  async function fetchEntries() {
    try {
      const res = await fetch('/api/entries?type=task')
      if (res.ok) setEntries(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Apply filter
  const filtered = entries.filter(e => {
    if (filter === 'all') return true
    if (filter === 'done') return e.status === 'done'
    if (filter === 'open') return e.status === 'open' || e.status === 'moved'
    if (filter === 'carried') return Boolean(e.movedFrom) || e.carryCount > 0 || e.status === 'moved'
    return true
  })

  // Group by date - each entry appears ONCE under its effective date
  const grouped = filtered.reduce((acc, entry) => {
    const d = entry.date
    if (!acc[d]) acc[d] = []
    acc[d].push(entry)
    return acc
  }, {} as Record<string, Entry[]>)

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    parseDate(b).getTime() - parseDate(a).getTime()
  )

  function formatDateHeader(dateStr: string): string {
    const date = parseDate(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const todayStr = formatDate(today)
    const yesterdayStr = formatDate(yesterday)

    if (dateStr === todayStr) return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function formatCarryDate(dateStr: string): string {
    return parseDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) return <div className="text-center py-12 text-secondary">Loading...</div>

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-semibold text-primary">Journal</h1>
      </div>

      {/* Single dropdown filter */}
      <div className="px-4 pb-4">
        <div className="relative inline-block">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterType)}
            className="appearance-none bg-gray-100 text-primary text-sm font-medium pl-4 pr-10 py-2.5 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {FILTERS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">▼</span>
        </div>
      </div>

      {/* Timeline */}
      {sortedDates.length === 0 ? (
        <div className="px-4 py-16 text-center text-secondary">
          <p className="text-3xl mb-2">📓</p>
          <p className="text-sm">No entries found</p>
        </div>
      ) : (
        sortedDates.map(dateStr => (
          <div key={dateStr} className="border-t border-gray-100">
            <div className="px-4 py-2 bg-bg sticky top-0 z-10">
              <span className="text-sm font-medium text-secondary">{formatDateHeader(dateStr)}</span>
            </div>
            <div>
              {grouped[dateStr]
                .sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map(entry => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 py-2.5 px-4 ${entry.status === 'done' ? 'opacity-50' : ''}`}
                  >
                    <span className="text-base w-5 text-center">{getBullet(entry)}</span>
                    <span className={`flex-1 text-sm ${entry.status === 'done' ? 'line-through text-secondary' : 'text-primary'}`}>
                      {entry.content}
                      {(entry.movedFrom || entry.carryCount > 0) && (
                        <span className="ml-2 text-xs text-blue-500">
                          from {formatCarryDate(entry.movedFrom || entry.originalDate || entry.date)}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-secondary/60 font-mono">{formatTime(entry.createdAt)}</span>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
