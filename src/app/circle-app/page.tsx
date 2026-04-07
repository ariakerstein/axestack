'use client'

import { useState } from 'react'
import { MessageCircle, Upload, User } from 'lucide-react'

type TabType = 'ask' | 'records'

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
        active
          ? 'text-[#C66B4A] border-b-2 border-[#C66B4A] bg-orange-50/50'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  )
}

export default function CircleAppPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ask')

  const tabUrls: Record<TabType, string> = {
    ask: '/ask?embed=1',
    records: '/records?embed=1',
  }

  const handleSignIn = () => {
    // Open sign in in new tab (can't do auth in iframe easily)
    window.open('https://opencancer.ai/ask?login=1', '_blank')
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Tabs */}
      <div className="bg-white border-b flex flex-shrink-0">
        <TabButton
          active={activeTab === 'ask'}
          onClick={() => setActiveTab('ask')}
          icon={MessageCircle}
          label="Ask Navis"
        />
        <TabButton
          active={activeTab === 'records'}
          onClick={() => setActiveTab('records')}
          icon={Upload}
          label="Records"
        />
        <div className="flex-1" />
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium transition-all"
        >
          <User className="w-5 h-5" />
          <span>Sign In</span>
        </button>
      </div>

      {/* Iframe - loads actual pages */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={tabUrls[activeTab]}
          className="w-full h-full border-0"
          title={`OpenCancer ${activeTab}`}
        />
      </div>
    </div>
  )
}
