'use client'

import { useState, useEffect } from 'react'

interface Entry {
  id: string
  type: string
  content: string
  date: string
  status: string
  priority: string
  area?: string
  createdAt: string
}

type FilterType = 'all' | 'task' | 'event' | 'idea' | 'note' | 'done' | 'open'

function getBullet(entry: Entry): string {
  if (entry.status === 'done') return '✓'
  if (entry.status === 'moved') return '>'
  if (entry.priority === 'high') return '🔥'
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
  { key: 'task', label: 'Tasks' },
  { key: 'event', label: 'Events' },
  { key: 'idea', label: 'Ideas' },
  { key: 'note', label: 'Notes' },
  { key: 'done', label: 'Done' },
  { key: 'open', label: 'Open' },
]

export default function JournalView() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => { fetchEntries() }, [])

  async function fetchEntries() {
    try {
      const res = await fetch('/api/entries')
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
    return e.type === filter
  })

  // Group by date - each entry appears ONCE under its effective date
  const grouped = filtered.reduce((acc, entry) => {
    const d = entry.date
    if (!acc[d]) acc[d] = []
    acc[d].push(entry)
    return acc
  }, {} as Record<string, Entry[]>)

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  function formatDateHeader(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const todayStr = today.toLocaleDateString('en-CA')
    const yesterdayStr = yesterday.toLocaleDateString('en-CA')

    if (dateStr === todayStr) return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(entry => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 py-2.5 px-4 ${entry.status === 'done' ? 'opacity-50' : ''}`}
                  >
                    <span className="text-base w-5 text-center">{getBullet(entry)}</span>
                    <span className={`flex-1 text-sm ${entry.status === 'done' ? 'line-through text-secondary' : 'text-primary'}`}>
                      {entry.content}
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