'use client'

import { useEffect, useState } from 'react'
import { formatDate, normalizeDateString, parseDate, shiftDate, today } from '@/lib/date'

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

function startOfWeek(date: Date): Date {
  const weekStart = new Date(date)
  const day = weekStart.getDay()
  const diff = day === 0 ? -6 : 1 - day
  weekStart.setDate(weekStart.getDate() + diff)
  return weekStart
}

function getWeekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index))
}

function formatWeekRange(weekStart: string): string {
  const start = parseDate(weekStart)
  const end = parseDate(shiftDate(weekStart, 6))
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function ContributionSquare({ date, completed, isToday }: {
  date: string
  completed: boolean
  isToday: boolean
}) {
  return (
    <div
      className={`h-4 w-4 rounded-sm ${
        completed
          ? 'bg-success'
          : isToday
          ? 'border border-accent bg-accent/10'
          : 'bg-gray-100'
      }`}
      title={`${date}${completed ? ' ✓' : ''}`}
    />
  )
}

function ContributionGraph({ habit }: { habit: Habit }) {
  const todayStr = today()
  const normalizedCompletedDays = new Set(
    habit.logs
      .filter(log => log.completed)
      .map(log => normalizeDateString(log.date))
      .filter((date): date is string => Boolean(date))
  )

  function get52Weeks(): string[] {
    const days: string[] = []
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 364)
    start.setDate(start.getDate() - start.getDay())

    for (let i = 0; i < 371; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const dateStr = formatDate(d)
      if (dateStr <= todayStr) {
        days.push(dateStr)
      }
    }
    return days
  }

  const days = get52Weeks()
  const weeks: string[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  function isCompleted(date: string): boolean {
    return normalizedCompletedDays.has(date)
  }

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="overflow-x-auto px-4 pb-4">
      <div className="mb-1 ml-8 flex text-xs text-secondary">
        {weeks.filter((_, index) => index % 4 === 0).map((week, index) => {
          const month = parseDate(week[0]).getMonth()
          return (
            <span key={`${week[0]}-${index}`} className="w-4 shrink-0" style={{ marginLeft: index === 0 ? 0 : '12px' }}>
              {monthLabels[month]}
            </span>
          )
        })}
      </div>

      <div className="flex gap-1">
        <div className="mr-1 flex flex-col gap-0.5 text-xs text-secondary">
          <span className="h-4" />
          <span>M</span>
          <span className="h-4" />
          <span>W</span>
          <span className="h-4" />
          <span>F</span>
          <span className="h-4" />
          <span>S</span>
        </div>

        {weeks.map((week) => (
          <div key={week[0]} className="flex flex-col gap-0.5">
            {week.map(day => (
              <ContributionSquare
                key={day}
                date={day}
                completed={isCompleted(day)}
                isToday={day === todayStr}
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
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => formatDate(startOfWeek(new Date())))
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { fetchHabits() }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  async function readJson<T>(res: Response): Promise<T> {
    const data = await res.json()
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Request failed')
    }
    return data as T
  }

  async function fetchHabits() {
    try {
      const res = await fetch('/api/habits')
      setHabits(await readJson<Habit[]>(res))
    } catch (e) {
      console.error(e)
      showToast(e instanceof Error ? e.message : 'Failed to load habits')
    } finally {
      setLoading(false)
    }
  }

  async function toggleHabitDay(habitId: string, date: string) {
    if (date > today()) {
      showToast('Future days cannot be edited')
      return
    }

    try {
      const res = await fetch(`/api/habits/${habitId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      await readJson<{ success: true }>(res)
      setHabits(currentHabits => currentHabits.map(habit => {
        if (habit.id !== habitId) return habit
        const existing = habit.logs.find(log => log.date === date)
        if (existing) {
          return {
            ...habit,
            logs: habit.logs.map(log => log.date === date ? { ...log, completed: !log.completed } : log),
          }
        }
        return { ...habit, logs: [...habit.logs, { id: `new-${habitId}-${date}`, habitId, date, completed: true }] }
      }))
      showToast(date === today() ? 'Toggled today' : `Toggled ${parseDate(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`)
    } catch (e) {
      console.error(e)
      showToast(e instanceof Error ? e.message : 'Failed to toggle habit')
    }
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
      const habit = await readJson<Omit<Habit, 'logs'>>(res)
      setHabits(currentHabits => [...currentHabits, { ...habit, logs: [] }])
      setNewHabitName('')
      setShowAddForm(false)
      showToast('Habit added')
    } catch (e) {
      console.error(e)
      showToast(e instanceof Error ? e.message : 'Failed to add habit')
    } finally {
      setAdding(false)
    }
  }

  async function deleteHabit(habitId: string) {
    if (!confirm('Delete this habit?')) return
    try {
      const res = await fetch('/api/habits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: habitId }),
      })
      await readJson<{ success: true }>(res)
      setHabits(currentHabits => currentHabits.filter(habit => habit.id !== habitId))
      showToast('Habit deleted')
    } catch (e) {
      console.error(e)
      showToast(e instanceof Error ? e.message : 'Failed to delete habit')
    }
  }

  function isCompleted(habit: Habit, date: string): boolean {
    return habit.logs.some(log => normalizeDateString(log.date) === date && log.completed)
  }

  function getStreak(habit: Habit): number {
    let cursor = today()
    let streak = 0

    while (isCompleted(habit, cursor)) {
      streak++
      cursor = shiftDate(cursor, -1)
    }

    return streak
  }

  const todayStr = today()
  const selectedWeekDays = getWeekDays(selectedWeekStart)
  const nextWeekStart = shiftDate(selectedWeekStart, 7)
  const canGoNextWeek = nextWeekStart <= todayStr

  if (loading) return <div className="py-12 text-center text-secondary">Loading...</div>

  return (
    <div className="min-h-screen pb-16">
      <div className="flex items-center justify-between px-4 pb-3 pt-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Habits</h1>
          <p className="mt-0.5 text-sm text-secondary">
            {habits.filter(habit => isCompleted(habit, todayStr)).length}/{habits.length} today
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xl font-medium text-white"
        >
          +
        </button>
      </div>

      <div className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-surface px-2 py-2">
        <button
          onClick={() => setSelectedWeekStart(shiftDate(selectedWeekStart, -7))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-primary hover:bg-gray-50"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-primary">{formatWeekRange(selectedWeekStart)}</p>
          <p className="text-xs text-secondary">{parseDate(selectedWeekStart).getFullYear()}</p>
        </div>
        <button
          onClick={() => setSelectedWeekStart(nextWeekStart)}
          disabled={!canGoNextWeek}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-primary hover:bg-gray-50 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addHabit} className="px-4 pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              placeholder="habit name"
              className="flex-1 rounded-xl border border-gray-200 bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <button
              type="submit"
              disabled={adding || !newHabitName.trim()}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {habits.length === 0 ? (
        <div className="px-4 py-16 text-center text-secondary">
          <p className="mb-2 text-3xl">🎯</p>
          <p className="text-sm">No habits yet</p>
          <p className="mt-1 text-xs text-secondary/70">Tap + to add your first habit</p>
        </div>
      ) : (
        <div>
          {habits.map(habit => {
            const streak = getStreak(habit)

            return (
              <div key={habit.id} className="border-b border-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary">{habit.name}</p>
                    {streak > 0 && (
                      <p className="mt-0.5 text-xs text-amber-600">🔥 {streak} day streak</p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="flex h-8 w-8 items-center justify-center text-secondary hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 px-4 pb-4">
                  {selectedWeekDays.map(day => {
                    const done = isCompleted(habit, day)
                    const isToday = day === todayStr
                    const isFuture = day > todayStr
                    const date = parseDate(day)

                    return (
                      <button
                        key={day}
                        onClick={() => toggleHabitDay(habit.id, day)}
                        disabled={isFuture}
                        className="flex min-w-0 flex-col items-center gap-1 rounded-lg py-2 disabled:opacity-35"
                        title={day}
                      >
                        <span className={`text-xs ${isToday ? 'font-semibold text-accent' : 'text-secondary'}`}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                        </span>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-md text-xs ${
                          done
                            ? 'bg-success text-white'
                            : isToday
                            ? 'border-2 border-accent text-accent'
                            : 'bg-gray-100 text-secondary'
                        }`}>
                          {date.getDate()}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <ContributionGraph habit={habit} />
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
