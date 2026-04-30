'use client'

type Tab = 'today' | 'journal' | 'habits'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: '📅' },
  { key: 'journal', label: 'Journal', icon: '📓' },
  { key: 'habits', label: 'Habits', icon: '✔️' },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 safe-area-bottom">
      <div className="max-w-md mx-auto flex">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
              activeTab === tab.key
                ? 'text-accent'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-xs font-medium ${
              activeTab === tab.key ? 'font-semibold' : ''
            }`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}