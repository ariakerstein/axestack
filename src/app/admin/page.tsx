'use client'

import { useState, useEffect } from 'react'

interface AnalyticsData {
  period: string
  summary: {
    totalPageViews: number
    uniqueSessions: number
    askQuestions: number
    recordsUploaded: number
    checklistViews: number
    trialsSearches: number
    profileCreations: number
    avgRecordsPerUser: number
    usersWithRecords: number
  }
  pageViewsByPath: Array<{ path: string; count: number }>
  eventsByType: Array<{ type: string; count: number }>
  trafficSources: Array<{ source: string; count: number }>
  deviceTypes: Array<{ device: string; count: number }>
  dailyBreakdown: Array<{
    date: string
    views: number
    sessions: number
    events: Record<string, number>
  }>
  recentEvents: Array<{
    type: string
    path: string
    timestamp: string
    sessionId: string
    metadata?: Record<string, unknown>
  }>
}

interface ProfileData {
  id: string
  email: string
  name: string
  role: 'patient' | 'caregiver'
  cancerType: string
  stage: string | null
  location: string | null
  createdAt: string
  updatedAt: string
}

interface ProfilesData {
  total: number
  aggregates: {
    cancerTypes: Array<{ name: string; count: number }>
    stages: Array<{ name: string; count: number }>
    roles: Array<{ name: string; count: number }>
    locations: Array<{ name: string; count: number }>
  }
  profiles: ProfileData[]
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [profilesData, setProfilesData] = useState<ProfilesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminKey, setAdminKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [days, setDays] = useState(30)
  const [activeTab, setActiveTab] = useState<'analytics' | 'profiles'>('analytics')
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null)

  const fetchAnalytics = async (key: string, numDays: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics?days=${numDays}`, {
        headers: { 'x-admin-key': key }
      })
      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized. Check admin key.')
          setIsAuthenticated(false)
          return
        }
        throw new Error('Failed to fetch analytics')
      }
      const json = await res.json()
      setData(json)
      setIsAuthenticated(true)
      // Save key to localStorage for convenience
      localStorage.setItem('opencancer_admin_key', key)
      // Also fetch profiles
      fetchProfiles(key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchProfiles = async (key: string) => {
    try {
      const res = await fetch('/api/admin/profiles', {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setProfilesData(json)
      }
    } catch (err) {
      console.error('Error fetching profiles:', err)
    }
  }

  useEffect(() => {
    // Try to load saved admin key
    const savedKey = localStorage.getItem('opencancer_admin_key')
    if (savedKey) {
      setAdminKey(savedKey)
      fetchAnalytics(savedKey, days)
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAnalytics(adminKey, days)
  }

  const handleDaysChange = (newDays: number) => {
    setDays(newDays)
    if (adminKey) {
      fetchAnalytics(adminKey, newDays)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('opencancer_admin_key')
    setIsAuthenticated(false)
    setAdminKey('')
    setData(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>
          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admin Key
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key"
              className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-4"
            />
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">{activeTab === 'analytics' ? (data?.period || `Last ${days} days`) : `${profilesData?.total || 0} profiles`}</p>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'analytics' && (
              <select
                value={days}
                onChange={(e) => handleDaysChange(Number(e.target.value))}
                className="px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            )}
            <button
              onClick={() => { fetchAnalytics(adminKey, days); fetchProfiles(adminKey); }}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'analytics'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'profiles'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Profiles {profilesData?.total ? `(${profilesData.total})` : ''}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        ) : activeTab === 'profiles' ? (
          /* Profiles Tab */
          <div>
            {/* Aggregates */}
            {profilesData && (
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Cancer Types */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Cancer Types</h2>
                  {profilesData.aggregates.cancerTypes.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {profilesData.aggregates.cancerTypes.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="text-slate-700 text-sm">{item.name}</span>
                          <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stages */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Stages</h2>
                  {profilesData.aggregates.stages.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {profilesData.aggregates.stages.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="text-slate-700 text-sm">Stage {item.name}</span>
                          <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Roles */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Roles</h2>
                  <div className="space-y-2">
                    {profilesData.aggregates.roles.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm capitalize">{item.name}</span>
                        <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Locations</h2>
                  {profilesData.aggregates.locations.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {profilesData.aggregates.locations.slice(0, 10).map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="text-slate-700 text-sm">{item.name}</span>
                          <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profiles List */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">All Profiles</h2>
              {!profilesData?.profiles.length ? (
                <p className="text-slate-500 text-sm">No profiles yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Name</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Email</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Role</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Cancer Type</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Stage</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Location</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profilesData.profiles.map((profile) => (
                        <tr
                          key={profile.id}
                          onClick={() => setSelectedProfile(profile)}
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="py-3 px-2 text-slate-900 font-medium">{profile.name}</td>
                          <td className="py-3 px-2 text-slate-700">{profile.email}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              profile.role === 'caregiver'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-violet-100 text-violet-700'
                            }`}>
                              {profile.role}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-700">{profile.cancerType}</td>
                          <td className="py-3 px-2 text-slate-700">{profile.stage || '-'}</td>
                          <td className="py-3 px-2 text-slate-700">{profile.location || '-'}</td>
                          <td className="py-3 px-2 text-slate-500 text-xs">{formatDate(profile.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Profile Detail Modal */}
            {selectedProfile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedProfile(null)} />
                <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{selectedProfile.name}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span className="text-slate-900 font-medium">{selectedProfile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Role</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        selectedProfile.role === 'caregiver'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-violet-100 text-violet-700'
                      }`}>
                        {selectedProfile.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cancer Type</span>
                      <span className="text-slate-900">{selectedProfile.cancerType}</span>
                    </div>
                    {selectedProfile.stage && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stage</span>
                        <span className="text-slate-900">{selectedProfile.stage}</span>
                      </div>
                    )}
                    {selectedProfile.location && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Location</span>
                        <span className="text-slate-900">{selectedProfile.location}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Joined</span>
                      <span className="text-slate-900">{formatTimestamp(selectedProfile.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Updated</span>
                      <span className="text-slate-900">{formatTimestamp(selectedProfile.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                label="Page Views"
                value={data.summary.totalPageViews}
                icon="👁️"
              />
              <SummaryCard
                label="Unique Sessions"
                value={data.summary.uniqueSessions}
                icon="👤"
              />
              <SummaryCard
                label="Questions Asked"
                value={data.summary.askQuestions}
                icon="💬"
              />
              <SummaryCard
                label="Records Uploaded"
                value={data.summary.recordsUploaded}
                icon="📄"
              />
              <SummaryCard
                label="Checklist Views"
                value={data.summary.checklistViews}
                icon="✅"
              />
              <SummaryCard
                label="Trial Searches"
                value={data.summary.trialsSearches}
                icon="🔬"
              />
              <SummaryCard
                label="Profiles Created"
                value={data.summary.profileCreations}
                icon="🆕"
              />
              <SummaryCard
                label="Avg Records/User"
                value={data.summary.avgRecordsPerUser || 0}
                icon="📊"
              />
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Page Views by Path */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Pages Visited</h2>
                {data.pageViewsByPath.length === 0 ? (
                  <p className="text-slate-500 text-sm">No page views yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.pageViewsByPath.slice(0, 10).map((item) => (
                      <div key={item.path} className="flex items-center justify-between">
                        <span className="text-slate-700 font-mono text-sm truncate flex-1 mr-4">
                          {item.path}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Events by Type */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Events by Type</h2>
                {data.eventsByType.length === 0 ? (
                  <p className="text-slate-500 text-sm">No events yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.eventsByType.map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm">
                          {formatEventType(item.type)}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Traffic & Device Grid - Drilldowns */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Traffic Sources */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Traffic Sources</h2>
                {!data.trafficSources || data.trafficSources.length === 0 ? (
                  <p className="text-slate-500 text-sm">No traffic data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.trafficSources.slice(0, 10).map((item) => (
                      <div key={item.source} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm capitalize">
                          {item.source === 'direct' ? '🔗 Direct' :
                           item.source === 'google' ? '🔍 Google' :
                           item.source === 'facebook' ? '📘 Facebook' :
                           item.source === 'twitter' ? '🐦 Twitter' :
                           item.source === 'circle' ? '⭕ Circle' :
                           item.source === 'linkedin' ? '💼 LinkedIn' :
                           item.source}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Device Types */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Device Types</h2>
                {!data.deviceTypes || data.deviceTypes.length === 0 ? (
                  <p className="text-slate-500 text-sm">No device data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.deviceTypes.map((item) => (
                      <div key={item.device} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm capitalize">
                          {item.device === 'desktop' ? '🖥️ Desktop' :
                           item.device === 'mobile' ? '📱 Mobile' :
                           item.device === 'tablet' ? '📲 Tablet' :
                           item.device}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Daily Activity</h2>
              {data.dailyBreakdown.length === 0 ? (
                <p className="text-slate-500 text-sm">No data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Date</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Views</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Sessions</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Questions</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Uploads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyBreakdown.slice(0, 14).map((day) => (
                        <tr key={day.date} className="border-b border-slate-100">
                          <td className="py-3 px-2 text-slate-700">{formatDate(day.date)}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.views}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.sessions}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.events.ask_question || 0}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.events.record_upload || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
              {data.recentEvents.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent events</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {data.recentEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-4 py-2 border-b border-slate-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                            {formatEventType(event.type)}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {event.sessionId}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm mt-1 truncate">{event.path}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
          <p className="text-xs sm:text-sm text-slate-600">{label}</p>
        </div>
      </div>
    </div>
  )
}

function formatEventType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
