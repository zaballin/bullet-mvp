'use client'

import { useState } from 'react'
import TodayView from '@/components/TodayView'
import JournalView from '@/components/JournalView'
import HabitsView from '@/components/HabitsView'
import BottomNav from '@/components/BottomNav'

type Tab = 'today' | 'journal' | 'habits'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('today')

  return (
    <main className="max-w-md mx-auto px-4 pt-6">
      {activeTab === 'today' && <TodayView />}
      {activeTab === 'journal' && <JournalView />}
      {activeTab === 'habits' && <HabitsView />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  )
}