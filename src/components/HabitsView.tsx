'use client'

import { useState, useEffect } from 'react'
import { today } from '@/lib/db'

interface HabitLog {
  id: string
  habitId: string
  date: string
  completed: boolean
}

interface Habit {
  id: string
  name: string
  active: boolean
  frequency: string
  createdAt: string
  logs: HabitLog[]
}

// GitHub-style contribution square
function ContributionSquare({ date, completed, onClick, isToday }: {
  date: string
  completed: boolean
  onClick: () => void
  isToday: boolean
}) {
  const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
  return (
    <button
      onClick={onClick}
      className={`w-4 h-4 rounded-sm transition-colors ${
        completed
          ? 'bg-success'
          : isToday
          ? 'border border-accent bg-accent/10'
          : 'bg-gray-100 hover:bg-gray-200'
      }`}
      title={`${date}${completed ? ' ✓' : ''}`}
    />
  )
}

// GitHub-style contribution grid for 52 weeks
function ContributionGraph({ habit, onToggleDay }: {
  habit: Habit
  onToggleDay: (date: string) => void
}) {
  const todayStr = today()
  
  // Build 52 weeks of data (364 days + partial week)
  function get52Weeks(): string[] {
    const days: string[] = []
    const now = new Date()
    // Start from 52 weeks ago, aligned to Sunday
    const start = new Date(now)
    start.setDate(start.getDate() - 364)
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay())
    
    for (let i = 0; i < 371; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const dateStr = d.toLocaleDateString('en-CA')
      if (dateStr <= todayStr) {
        days.push(dateStr)
      }
    }
    return days
  }

  const days = get52Weeks()
  // Group into weeks
  const weeks: string[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  function isCompleted(date: string): boolean {
    return habit.logs.some(l => l.date === date && l.completed)
  }

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="px-4 pb-4 overflow-x-auto">
      {/* Month labels */}
      <div className="flex text-xs text-secondary mb-1 ml-8">
        {weeks.filter((_, i) => i % 4 === 0).map((week, i) => {
          const month = new Date(week[0]).getMonth()
          return (
            <span key={i} className="w-4 shrink-0" style={{ marginLeft: i === 0 ? 0 : '12px' }}>
              {monthLabels[month]}
            </span>
          )
        })}
      </div>
      
      {/* Grid + day labels */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 text-xs text-secondary mr-1">
          <span className="h-4" />
          <span>M</span>
          <span className="h-4" />
          <span>W</span>
          <span className="h-4" />
          <span>F</span>
          <span className="h-4" />
          <span>S</span>
        </div>
        
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <ContributionSquare
                key={day}
                date={day}
                completed={isCompleted(day)}
                isToday={day === todayStr}
                onClick={() => onToggleDay(day)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { fetchHabits() }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  async function fetchHabits() {
    try {
      const res = await fetch('/api/habits')
      setHabits(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleHabitDay(habitId: string, date: string) {
    await fetch(`/api/habits/${habitId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    })
    // Optimistic update
    setHabits(habits.map(h => {
      if (h.id !== habitId) return h
      const existing = h.logs.find(l => l.date === date)
      if (existing) {
        return {
          ...h,
          logs: h.logs.map(l => l.date === date ? { ...l, completed: !l.completed } : l)
        }
      } else {
        return { ...h, logs: [...h.logs, { id: 'new', habitId, date, completed: true }] }
      }
    }))
    showToast(date === today() ? 'Toggled today' : `Toggled ${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`)
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newHabitName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newHabitName }),
      })
      setHabits([...habits, { ...await res.json(), logs: [] }])
      setNewHabitName('')
      setShowAddForm(false)
    } finally {
      setAdding(false)
    }
  }

  async function deleteHabit(habitId: string) {
    if (!confirm('Delete this habit?')) return
    await fetch('/api/habits', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: habitId }),
    })
    setHabits(habits.filter(h => h.id !== habitId))
  }

  function getLast7Days(): string[] {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(d.toLocaleDateString('en-CA'))
    }
    return days
  }

  function isCompleted(habit: Habit, date: string): boolean {
    return habit.logs.some(l => l.date === date && l.completed)
  }

  function getStreak(habit: Habit): number {
    const days = getLast7Days()
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (isCompleted(habit, days[i])) streak++
      else break
    }
    return streak
  }

  const last7Days = getLast7Days()
  const todayStr = today()

  if (loading) return <div className="text-center py-12 text-secondary">Loading...</div>

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Habits</h1>
          <p className="text-sm text-secondary mt-0.5">
            {habits.filter(h => isCompleted(h, todayStr)).length}/{habits.length} today
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center text-xl font-medium"
        >
          +
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={addHabit} className="px-4 pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              placeholder="habit name"
              className="flex-1 px-4 py-3 rounded-xl bg-surface border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <button
              type="submit"
              disabled={adding || !newHabitName.trim()}
              className="px-5 py-3 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="px-4 py-16 text-center text-secondary">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm">No habits yet</p>
          <p className="text-xs mt-1 text-secondary/70">Tap + to add your first habit</p>
        </div>
      ) : (
        <div>
          {habits.map(habit => {
            const streak = getStreak(habit)
            const todayDone = isCompleted(habit, todayStr)
            const isExpanded = expandedHabit === habit.id

            return (
              <div key={habit.id} className="border-b border-gray-100">
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Today toggle */}
                  <button
                    onClick={() => toggleHabitDay(habit.id, todayStr)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                      todayDone
                        ? 'bg-success border-success text-white'
                        : 'border-gray-300 hover:border-accent'
                    }`}
                  >
                    {todayDone && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Name + streak */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${todayDone ? 'text-secondary' : 'text-primary'}`}>
                      {habit.name}
                    </p>
                    {streak > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">🔥 {streak} day streak</p>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                    className={`w-8 h-8 flex items-center justify-center text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    ▼
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="w-8 h-8 flex items-center justify-center text-secondary hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>

                {/* 7-day compact row */}
                <div className="px-4 pb-3 flex items-center gap-1">
                  {last7Days.map(day => {
                    const done = isCompleted(habit, day)
                    const isToday = day === todayStr
                    const dayLabel = new Date(day).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
                    return (
                      <button
                        key={day}
                        onClick={() => toggleHabitDay(habit.id, day)}
                        className="flex flex-col items-center gap-0.5 px-1"
                        title={day}
                      >
                        <span className={`text-xs ${isToday ? 'text-accent font-semibold' : 'text-secondary'}`}>
                          {dayLabel}
                        </span>
                        <div className={`w-5 h-5 rounded-sm ${done ? 'bg-success' : isToday ? 'border-2 border-accent' : 'bg-gray-100'}`} />
                      </button>
                    )
                  })}
                </div>

                {/* 52-week contribution graph (expandable) */}
                {isExpanded && (
                  <ContributionGraph habit={habit} onToggleDay={(date) => toggleHabitDay(habit.id, date)} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-white text-sm rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}