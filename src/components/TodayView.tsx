'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, getTomorrowDate, normalizeDateString, parseDate, shiftDate } from '@/lib/date'
import { parseEntryInput } from '@/lib/entry-parsing'

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

function getBullet(entry: Entry): string {
  if (entry.status === 'done') return '✓'
  if (entry.movedFrom || entry.status === 'moved') return '>'
  if (entry.priority === 'high') return '!'
  switch (entry.type) {
    case 'task': return '•'
    case 'event': return '○'
    case 'note': return '–'
    case 'idea': return '💡'
    default: return '•'
  }
}

function formatDateForDisplay(date: Date): { day: string; full: string } {
  const todayDate = new Date()
  const yesterday = new Date(todayDate)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateStr = formatDate(date)
  const todayStr = formatDate(todayDate)
  const yesterdayStr = formatDate(yesterday)

  if (dateStr === todayStr) {
    return { day: 'Today', full: todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }
  }

  if (dateStr === yesterdayStr) {
    return { day: 'Yesterday', full: yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }
  }

  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  }
}

interface DraggableRowProps {
  entry: Entry
  index: number
  onToggle: () => void
  onMove: () => void
  onUnmove: () => void
  onTypeChange: (type: string) => void
  onPriorityToggle: () => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: (index: number) => void
  onSortPointerStart: (index: number, event: React.PointerEvent<HTMLDivElement>) => void
  onSortPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onSortPointerEnd: (event: React.PointerEvent<HTMLDivElement>) => void
  isDragging: boolean
  isDragOver: boolean
}

function DraggableRow({
  entry,
  index,
  onToggle,
  onMove,
  onUnmove,
  onTypeChange,
  onPriorityToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onSortPointerStart,
  onSortPointerMove,
  onSortPointerEnd,
  isDragging,
  isDragOver,
}: DraggableRowProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [startX, setStartX] = useState(0)
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  const isDone = entry.status === 'done'
  const isCarried = Boolean(entry.movedFrom) || entry.status === 'moved' || entry.carryCount > 0

  function handleTouchStart(e: React.TouchEvent) {
    setStartX(e.touches[0].clientX)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const diff = e.touches[0].clientX - startX
    if (diff > 0) setSwipeX(Math.min(diff, 80))
    else setSwipeX(Math.max(diff, -80))
  }

  function handleTouchEnd() {
    if (swipeX > 60) onToggle()
    else if (swipeX < -60) onMove()
    setSwipeX(0)
  }

  function formatCarryDate(date: string): string {
    const normalized = normalizeDateString(date)
    if (!normalized) return date
    const parsed = parseDate(normalized)
    if (Number.isNaN(parsed.getTime())) return normalized
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const types = ['task', 'event', 'idea', 'note']

  return (
    <>
      <div
        data-entry-index={index}
        className={`relative overflow-hidden transition-opacity ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-accent/10' : ''}`}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
        onDrop={(e) => { e.preventDefault(); onDrop(index) }}
      >
        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
          {swipeX > 0 && <span className="text-success text-lg">✓</span>}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {swipeX < 0 && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl font-medium text-blue-600">›</div>
          )}
        </div>

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => { e.preventDefault(); setShowTypeMenu(true) }}
          className={`relative flex items-center gap-1 px-4 py-2 transition-transform ${isDone ? 'opacity-50' : ''}`}
          style={{ transform: `translateX(${swipeX}px)` }}
        >
          <div
            className="mr-1 flex w-7 cursor-grab touch-none items-center justify-center text-secondary/40 active:cursor-grabbing"
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(index) }}
            onPointerDown={(e) => onSortPointerStart(index, e)}
            onPointerMove={onSortPointerMove}
            onPointerUp={onSortPointerEnd}
            onPointerCancel={onSortPointerEnd}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            ⋮⋮
          </div>

          <span className={`w-5 text-center text-base ${isCarried ? 'text-blue-400' : ''}`}>
            {getBullet(entry)}
          </span>

          <div className="min-w-0 flex-1">
            <span className={`block truncate text-sm ${isDone ? 'text-secondary line-through' : 'text-primary'}`}>
              {entry.content}
            </span>
            {isCarried && (
              <button
                type="button"
                onClick={onUnmove}
                className="mt-0.5 text-xs text-blue-500"
                style={{ minHeight: 0, minWidth: 0 }}
              >
                from {formatCarryDate(entry.movedFrom || entry.originalDate || entry.date)} · undo
              </button>
            )}
          </div>

          {isDone && <span className="text-xs text-success">✓</span>}
        </div>
      </div>

      {showTypeMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTypeMenu(false)}>
          <div className="rounded-2xl bg-surface p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="mb-4 text-sm text-secondary">Change type</p>
            <div className="flex gap-3">
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => { onTypeChange(t); setShowTypeMenu(false) }}
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl transition-colors ${entry.type === t ? 'bg-accent text-white' : 'bg-gray-100 text-primary'}`}
                >
                  <span className="text-xl">{t === 'task' ? '•' : t === 'event' ? '○' : t === 'note' ? '–' : '💡'}</span>
                  <span className="mt-1 text-xs">{t}</span>
                </button>
              ))}
            </div>
            {entry.type === 'task' && (
              <button
                onClick={() => { onPriorityToggle(); setShowTypeMenu(false) }}
                className="mt-4 w-full rounded-xl bg-gray-100 py-3 text-center text-sm text-primary"
              >
                {entry.priority === 'high' ? 'Remove ! priority' : 'Add ! priority'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function TodayView() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    setCurrentDate(new Date())
  }, [])

  const dateInfo = currentDate ? formatDateForDisplay(currentDate) : { day: '...', full: '...' }
  const currentDateStr = currentDate ? formatDate(currentDate) : ''

  useEffect(() => {
    if (currentDateStr) {
      fetchEntries()
    }
  }, [currentDateStr])

  async function readJson<T>(res: Response): Promise<T> {
    const data = await res.json()
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Request failed')
    }
    return data as T
  }

  function replaceEntry(nextEntry: Entry) {
    setEntries(currentEntries =>
      currentEntries.map(currentEntry => currentEntry.id === nextEntry.id ? nextEntry : currentEntry)
    )
  }

  async function fetchEntries() {
    if (!currentDateStr) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/entries?date=${currentDateStr}`)
      setEntries(await readJson<Entry[]>(res))
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to load entries')
    } finally {
      setLoading(false)
    }
  }

  async function addEntry(text: string) {
    if (!text.trim()) return
    setAdding(true)
    setError(null)

    try {
      const parsed = parseEntryInput(text)
      if (parsed.type === 'habit') {
        setError('Use the Habits tab to create habits.')
        return
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: parsed.type, priority: parsed.priority, content: parsed.content, date: currentDateStr }),
      })

      const entry = await readJson<Entry>(res)
      setEntries(currentEntries => [...currentEntries, entry])
      setInputText('')
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to add entry')
    } finally {
      setAdding(false)
    }
  }

  async function toggleComplete(entry: Entry) {
    setError(null)
    try {
      const newStatus = entry.status === 'done' ? 'open' : 'done'
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, status: newStatus }),
      })
      replaceEntry(await readJson<Entry>(res))
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to update entry')
    }
  }

  async function unmoveEntry(entry: Entry) {
    setError(null)
    try {
      const restoredDate = entry.movedFrom || shiftDate(entry.date, -1)
      const nextCarryCount = Math.max((entry.carryCount || 0) - 1, 0)
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          status: 'open',
          date: restoredDate,
          movedFrom: nextCarryCount > 0 ? shiftDate(restoredDate, -1) : null,
          originalDate: nextCarryCount > 0 ? entry.originalDate || restoredDate : null,
          carryCount: nextCarryCount,
        }),
      })
      const updatedEntry = await readJson<Entry>(res)
      if (updatedEntry.date === currentDateStr) {
        replaceEntry(updatedEntry)
      } else {
        setEntries(currentEntries => currentEntries.filter(currentEntry => currentEntry.id !== entry.id))
      }
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to restore entry')
    }
  }

  async function moveEntry(entry: Entry) {
    setError(null)
    try {
      const tomorrowDate = getTomorrowDate(entry.date)
      const nextCarryCount = (entry.carryCount || 0) + 1
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          status: 'open',
          date: tomorrowDate,
          movedFrom: entry.date,
          originalDate: entry.originalDate || entry.movedFrom || entry.date,
          carryCount: nextCarryCount,
        }),
      })
      const updatedEntry = await readJson<Entry>(res)
      if (updatedEntry.date === currentDateStr) {
        replaceEntry(updatedEntry)
      } else {
        setEntries(currentEntries => currentEntries.filter(currentEntry => currentEntry.id !== entry.id))
      }
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to move entry')
    }
  }

  async function changeType(entry: Entry, type: string) {
    setError(null)
    try {
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, type }),
      })
      replaceEntry(await readJson<Entry>(res))
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to change type')
    }
  }

  async function togglePriority(entry: Entry) {
    setError(null)
    try {
      const newPriority = entry.priority === 'high' ? 'medium' : 'high'
      const res = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, priority: newPriority }),
      })
      replaceEntry(await readJson<Entry>(res))
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to change priority')
    }
  }

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  function handleSortPointerStart(index: number, event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragIndex(index)
    setDragOverIndex(index)
  }

  function handleSortPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragIndex === null) return
    event.preventDefault()
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-entry-index]')
    const nextIndex = Number(target?.dataset.entryIndex)
    if (Number.isInteger(nextIndex)) {
      setDragOverIndex(nextIndex)
    }
  }

  function handleSortPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (dragIndex !== null && dragOverIndex !== null) {
      handleDrop(dragOverIndex)
    } else {
      setDragIndex(null)
      setDragOverIndex(null)
    }
  }

  async function handleDrop(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      const newEntries = [...entries]
      const [dragged] = newEntries.splice(dragIndex, 1)
      newEntries.splice(index, 0, dragged)
      setEntries(newEntries)

      try {
        const res = await fetch('/api/entries', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reorderIds: newEntries.map(entry => entry.id) }),
        })
        await readJson<{ success: true }>(res)
      } catch (e) {
        console.error(e)
        setError(e instanceof Error ? e.message : 'Failed to save order')
        fetchEntries()
      }
    }

    setDragIndex(null)
    setDragOverIndex(null)
  }

  function goToPrevDay() {
    if (!currentDate) return
    const prev = new Date(currentDate)
    prev.setDate(prev.getDate() - 1)
    setCurrentDate(prev)
  }

  function goToNextDay() {
    if (!currentDate) return
    const next = new Date(currentDate)
    next.setDate(next.getDate() + 1)
    setCurrentDate(next)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const isToday = currentDate ? currentDateStr === formatDate(new Date()) : false
  const openCount = entries.filter(entry => entry.type === 'task' && entry.status === 'open').length

  if (loading) return <div className="py-12 text-center text-secondary">Loading...</div>

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 pb-2 pt-6">
        <div className="flex items-center justify-between">
          <button onClick={goToPrevDay} className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-surface text-xl text-primary hover:bg-gray-50">
            ‹
          </button>
          <div className="text-center">
            <button onClick={goToToday} className="text-xl font-semibold text-primary hover:text-accent">
              {dateInfo.day}
            </button>
            <p className="mt-0.5 text-xs text-secondary">{dateInfo.full}</p>
          </div>
          <button
            onClick={goToNextDay}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-xl text-primary hover:bg-gray-50"
          >
            ›
          </button>
        </div>
        {!isToday && (
          <p className="mt-1 text-center text-xs text-secondary">Tap the title to jump back to today.</p>
        )}
        {openCount > 0 && <p className="mt-1 text-center text-sm text-secondary">{openCount} to do</p>}
        {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
      </div>

      <div className="border-t border-gray-100">
        {entries.length === 0 ? (
          <div className="px-4 py-16 text-center text-secondary">
            <p className="mb-2 text-3xl">✨</p>
            <p className="text-sm">Nothing logged</p>
            <p className="mt-1 text-xs text-secondary/70">Add below or via WhatsApp</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <DraggableRow
              key={entry.id}
              entry={entry}
              index={index}
              onToggle={() => toggleComplete(entry)}
              onMove={() => moveEntry(entry)}
              onUnmove={() => unmoveEntry(entry)}
              onTypeChange={(type) => changeType(entry, type)}
              onPriorityToggle={() => togglePriority(entry)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onSortPointerStart={handleSortPointerStart}
              onSortPointerMove={handleSortPointerMove}
              onSortPointerEnd={handleSortPointerEnd}
              isDragging={dragIndex === index}
              isDragOver={dragOverIndex === index}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 border-t border-gray-100 bg-bg/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-md">
          <div className="mb-1.5 flex gap-4 px-1 text-xs text-secondary/60">
            <span>. task</span>
            <span>.! urgent</span>
            <span>/ note</span>
            <span>! idea</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-surface px-3 py-2 shadow-sm">
            <button
              onClick={() => { inputRef.current?.focus(); if (inputText.trim()) addEntry(inputText) }}
              disabled={adding}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-medium text-white"
            >
              +
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry(inputText) } }}
              placeholder="What do you want to log?"
              className="flex-1 bg-transparent py-2 text-sm text-primary placeholder:text-secondary focus:outline-none"
            />
            {inputText.trim() && (
              <button onClick={() => addEntry(inputText)} disabled={adding} className="shrink-0 text-sm font-medium text-accent">
                {adding ? '...' : 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
