'use client'

import { useState, useEffect, useRef } from 'react'

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

// Parse input prefix into type/priority
// . → task  .! → priority task  / → note  ! → idea
function parseInput(text: string): { type: string; priority: string; content: string } {
  const trimmed = text.trim()
  
  if (trimmed.startsWith('/ ')) {
    return { type: 'note', priority: 'medium', content: trimmed.slice(2) }
  }
  if (trimmed.startsWith('! ')) {
    return { type: 'idea', priority: 'medium', content: trimmed.slice(2) }
  }
  if (trimmed.startsWith('.! ')) {
    return { type: 'task', priority: 'high', content: trimmed.slice(3) }
  }
  if (trimmed.startsWith('. ')) {
    return { type: 'task', priority: 'medium', content: trimmed.slice(2) }
  }
  return { type: 'task', priority: 'medium', content: trimmed }
}

function getBullet(entry: Entry): string {
  if (entry.status === 'done') return '✓'
  if (entry.status === 'moved') return '>'
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
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const dateStr = date.toLocaleDateString('en-CA')
  const todayStr = today.toLocaleDateString('en-CA')
  const yesterdayStr = yesterday.toLocaleDateString('en-CA')
  
  if (dateStr === todayStr) {
    return { day: 'Today', full: today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }
  }
  if (dateStr === yesterdayStr) {
    return { day: 'Yesterday', full: yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }
  }
  return { 
    day: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }
}

import { today, getTomorrowDate } from '@/lib/db'

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
  isDragging: boolean
  isDragOver: boolean
}

function DraggableRow({ entry, index, onToggle, onMove, onUnmove, onTypeChange, onPriorityToggle, onDragStart, onDragOver, onDrop, isDragging, isDragOver }: DraggableRowProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [startX, setStartX] = useState(0)
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  const isDone = entry.status === 'done'
  const isMoved = entry.status === 'moved'
  // Allow toggle (right swipe) for open items, undo move (left swipe) for moved items
  const canAct = !isDone

  function handleTouchStart(e: React.TouchEvent) {
    if (!canAct) return
    setStartX(e.touches[0].clientX)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!canAct) return
    const diff = e.touches[0].clientX - startX
    if (diff > 0) setSwipeX(Math.min(diff, 80))
    else setSwipeX(Math.max(diff, -80))
  }

  function handleTouchEnd() {
    if (swipeX > 60) onToggle()
    else if (swipeX < -60) {
      if (isMoved) onUnmove()
      else onMove()
    }
    setSwipeX(0)
  }

  const types = ['task', 'event', 'idea', 'note']

  return (
    <>
      <div 
        className={`relative overflow-hidden transition-opacity ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-accent/10' : ''}`}
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(index) }}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
        onDrop={(e) => { e.preventDefault(); onDrop(index) }}
      >
        {/* Swipe backgrounds */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
          {swipeX > 0 && <span className="text-success text-lg">✓</span>}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {swipeX < 0 && (
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-medium">›</div>
          )}
        </div>

        {/* Row */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => { e.preventDefault(); setShowTypeMenu(true) }}
          className={`relative flex items-center gap-1 py-2 px-4 transition-transform ${isDone || isMoved ? 'opacity-50' : ''}`}
          style={{ transform: `translateX(${swipeX}px)` }}
        >
          {/* Drag handle */}
          <div className="w-6 text-secondary/30 cursor-grab active:cursor-grabbing flex items-center justify-center mr-1">
            ⋮⋮
          </div>

          {/* Bullet */}
          <span className={`text-base w-5 text-center ${isMoved ? 'text-blue-400' : ''}`}>
            {getBullet(entry)}
          </span>
          
          {/* Content */}
          <span className={`flex-1 text-sm ${isDone || isMoved ? 'line-through text-secondary' : 'text-primary'}`}>
            {entry.content}
          </span>
          
          {/* Moved indicator */}
          {isMoved && <span className="text-xs text-blue-400">› tomorrow</span>}
          
          {/* Done indicator */}
          {isDone && <span className="text-xs text-success">✓</span>}
        </div>
      </div>

      {/* Type menu */}
      {showTypeMenu && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowTypeMenu(false)}>
          <div className="bg-surface rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-secondary mb-4">Change type</p>
            <div className="flex gap-3">
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => { onTypeChange(t); setShowTypeMenu(false) }}
                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-colors ${entry.type === t ? 'bg-accent text-white' : 'bg-gray-100 text-primary'}`}
                >
                  <span className="text-xl">{t === 'task' ? '•' : t === 'event' ? '○' : t === 'note' ? '–' : '💡'}</span>
                  <span className="text-xs mt-1">{t}</span>
                </button>
              ))}
            </div>
            {entry.type === 'task' && (
              <button
                onClick={() => { onPriorityToggle(); setShowTypeMenu(false) }}
                className="w-full mt-4 py-3 text-center text-sm rounded-xl bg-gray-100 text-primary"
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
  // Initialize as null to avoid SSR/client hydration mismatch
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Set date only on client to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date())
  }, [])

  const dateInfo = currentDate ? formatDateForDisplay(currentDate) : { day: '...', full: '...' }
  const currentDateStr = currentDate ? currentDate.toLocaleDateString('en-CA') : ''
  const tomorrowStr = getTomorrowDate()

  useEffect(() => {
    if (currentDateStr) fetchEntries()
  }, [currentDateStr])

  async function fetchEntries() {
    if (!currentDateStr) return
    try {
      const res = await fetch(`/api/entries?date=${currentDateStr}`)
      setEntries(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function addEntry(text: string) {
    if (!text.trim()) return
    setAdding(true)
    try {
      const { type, priority, content } = parseInput(text)
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, priority, content, date: currentDateStr }),
      })
      setEntries([...entries, await res.json()])
      setInputText('')
    } finally { setAdding(false) }
  }

  async function toggleComplete(entry: Entry) {
    const newStatus = entry.status === 'done' ? 'open' : 'done'
    await fetch('/api/entries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, status: newStatus }) })
    setEntries(entries.map(e => e.id === entry.id ? { ...e, status: newStatus } : e))
  }

  async function unmoveEntry(entry: Entry) {
    await fetch('/api/entries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, status: 'open' }) })
    setEntries(entries.map(e => e.id === entry.id ? { ...e, status: 'open' } : e))
  }

  async function moveEntry(entry: Entry) {
    const tomorrowDate = getTomorrowDate()
    await fetch('/api/entries', { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id: entry.id, status: 'moved', date: tomorrowDate }) 
    })
    setEntries(entries.map(e => e.id === entry.id ? { ...e, status: 'moved', date: tomorrowDate } : e))
  }

  async function changeType(entry: Entry, type: string) {
    await fetch('/api/entries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, type }) })
    setEntries(entries.map(e => e.id === entry.id ? { ...e, type } : e))
  }

  async function togglePriority(entry: Entry) {
    const newP = entry.priority === 'high' ? 'medium' : 'high'
    await fetch('/api/entries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, priority: newP }) })
    setEntries(entries.map(e => e.id === entry.id ? { ...e, priority: newP } : e))
  }

  // Drag handlers
  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDrop(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      const newEntries = [...entries]
      const [dragged] = newEntries.splice(dragIndex, 1)
      newEntries.splice(index, 0, dragged)
      setEntries(newEntries)
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

  const isToday = currentDate ? (currentDateStr === new Date().toLocaleDateString('en-CA')) : false
  const openCount = entries.filter(e => e.type === 'task' && e.status !== 'done' && e.status !== 'dropped').length

  if (loading) return <div className="text-center py-12 text-secondary">Loading...</div>

  return (
    <div className="min-h-screen pb-24">
      {/* Day Navigation Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={goToPrevDay} className="w-10 h-10 rounded-full bg-surface border border-gray-200 flex items-center justify-center text-xl text-primary hover:bg-gray-50">
            ‹
          </button>
          <div className="text-center">
            <button onClick={goToToday} className="text-xl font-semibold text-primary hover:text-accent">
              {dateInfo.day}
            </button>
            <p className="text-xs text-secondary mt-0.5">{dateInfo.full}</p>
          </div>
          <button 
            onClick={goToNextDay} 
            className="w-10 h-10 rounded-full border border-gray-200 text-primary hover:bg-gray-50 flex items-center justify-center text-xl"
          >
            ›
          </button>
        </div>
        {openCount > 0 && <p className="text-center text-sm text-secondary mt-1">{openCount} to do</p>}
      </div>

      {/* Entries List */}
      <div className="border-t border-gray-100">
        {entries.length === 0 ? (
          <div className="px-4 py-16 text-center text-secondary">
            <p className="text-3xl mb-2">✨</p>
            <p className="text-sm">Nothing logged</p>
            <p className="text-xs mt-1 text-secondary/70">Add below or via WhatsApp</p>
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
              onTypeChange={(t) => changeType(entry, t)}
              onPriorityToggle={() => togglePriority(entry)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={dragIndex === index}
              isDragOver={dragOverIndex === index}
            />
          ))
        )}
      </div>

      {/* Bottom Input */}
      <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-bg/95 backdrop-blur-sm border-t border-gray-100">
        <div className="max-w-md mx-auto">
          {/* Input hint */}
          <div className="flex gap-4 text-xs text-secondary/60 mb-1.5 px-1">
            <span>. task</span>
            <span>.! urgent</span>
            <span>/ note</span>
            <span>! idea</span>
          </div>
          <div className="flex items-center gap-2 bg-surface rounded-2xl px-3 py-2 shadow-sm border border-gray-100">
            <button 
              onClick={() => { inputRef.current?.focus(); if (inputText.trim()) addEntry(inputText) }}
              disabled={adding}
              className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-lg font-medium shrink-0"
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
              className="flex-1 py-2 bg-transparent text-primary placeholder:text-secondary text-sm focus:outline-none"
            />
            {inputText.trim() && (
              <button onClick={() => addEntry(inputText)} disabled={adding} className="text-accent text-sm font-medium shrink-0">
                {adding ? '...' : 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}