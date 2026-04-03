'use client'

import { useState, useEffect } from 'react'

interface UsageData {
  summary: {
    totalCalls: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    estimatedCostUsd: string
    successRate: number
  }
  byOperation: Array<{ operation: string; count: number; tokens: number; cost: number }>
  byModel: Array<{ model: string; count: number; tokens: number; cost: number }>
  byFileType: Array<{ fileType: string; count: number; tokens: number; cost: number }>
  dailyUsage: Array<{ date: string; calls: number; tokens: number; cost: number }>
  recentCalls: Array<{
    id: string
    operation: string
    model: string
    inputTokens: number
    outputTokens: number
    cost: number
    fileType: string
    success: boolean
    createdAt: string
  }>
  message?: string
}

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
    totalProfiles: number
    avgRecordsPerUser: number
    avgRecordsPerSession: number
    usersWithRecords: number
    sessionsWithRecords: number
    combatAnalyses: number
  }
  combatStats?: {
    total: number
    diagnosis: number
    treatment: number
    avgEvidenceStrength: number
    byCancerType: Record<string, number>
    recentCombats: Array<{
      phase: string
      cancerType: string
      recordsCount: number
      evidenceStrength: number
      createdAt: string
    }>
  }
  sharingStats?: {
    totalShares: number
    byTool: Array<{ tool: string; count: number }>
    byMethod: Array<{ method: string; count: number }>
  }
  referralStats?: {
    totalReferralArrivals: number
    uniqueReferralSessions: number
    bySource: Array<{ source: string; count: number }>
  }
  roleBreakdown?: {
    caregivers: number
    patients: number
    ratio: string
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
  drillDown?: {
    questions: Array<{
      timestamp: string
      sessionId: string
      question: string
      cancerType: string
    }>
  }
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

interface UserStats {
  userId: string
  email: string
  stats: {
    totalEvents: number
    recordsUploaded: number
    questionsAsked: number
    pageViews: number
    combatRuns: number
    trialSearches: number
    uniqueSessions: number
    firstActivity: string | null
    lastActivity: string | null
  }
  deviceInfo?: {
    primary: string
    all: Array<{ device: string; count: number }>
  }
  trafficInfo?: {
    primary: string
    all: Array<{ source: string; count: number }>
  }
  pagesVisited: Array<{ path: string; count: number }>
  recentActivity: Array<{
    type: string
    path: string
    timestamp: string
    metadata?: Record<string, unknown>
  }>
  combatAnalyses: Array<{
    phase: string
    createdAt: string
    evidenceStrength: number
    cancerType: string
    recordsCount: number
  }>
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [profilesData, setProfilesData] = useState<ProfilesData | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminKey, setAdminKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [days, setDays] = useState(30)
  const [activeTab, setActiveTab] = useState<'analytics' | 'profiles' | 'usage'>('analytics')
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loadingUserStats, setLoadingUserStats] = useState(false)
  const [showQuestionsDrillDown, setShowQuestionsDrillDown] = useState(false)

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
      // Also fetch profiles and usage
      fetchProfiles(key)
      fetchUsage(key, numDays)
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

  const fetchUsage = async (key: string, numDays: number) => {
    try {
      const res = await fetch(`/api/admin/usage?days=${numDays}`, {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setUsageData(json)
      }
    } catch (err) {
      console.error('Error fetching usage:', err)
    }
  }

  const fetchUserStats = async (profile: ProfileData) => {
    setSelectedProfile(profile)
    setLoadingUserStats(true)
    setUserStats(null)
    try {
      const res = await fetch(`/api/admin/user-stats?userId=${profile.id}&email=${encodeURIComponent(profile.email)}`, {
        headers: { 'x-admin-key': adminKey }
      })
      if (res.ok) {
        const json = await res.json()
        setUserStats(json)
      }
    } catch (err) {
      console.error('Error fetching user stats:', err)
    } finally {
      setLoadingUserStats(false)
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
            <p className="text-slate-600 mt-1">{
              activeTab === 'analytics' ? (data?.period || `Last ${days} days`) :
              activeTab === 'usage' ? `API cost: $${usageData?.summary?.estimatedCostUsd || '0.00'} (${days} days)` :
              `${profilesData?.total || 0} profiles`
            }</p>
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
              onClick={() => { fetchAnalytics(adminKey, days); fetchProfiles(adminKey); fetchUsage(adminKey, days); }}
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
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'usage'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            API Usage {usageData?.summary?.totalCalls ? `($${usageData.summary.estimatedCostUsd})` : ''}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        ) : activeTab === 'usage' ? (
          /* Usage Tab */
          <div className="space-y-6">
            {usageData?.message && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                {usageData.message}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-slate-900">{usageData?.summary?.totalCalls || 0}</p>
                <p className="text-xs text-slate-500">API Calls</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-blue-600">{((usageData?.summary?.totalInputTokens || 0) / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Input Tokens</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-purple-600">{((usageData?.summary?.totalOutputTokens || 0) / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Output Tokens</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-emerald-600">{((usageData?.summary?.totalTokens || 0) / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Total Tokens</p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl shadow p-4 border border-violet-200">
                <p className="text-2xl font-bold text-violet-700">${usageData?.summary?.estimatedCostUsd || '0.00'}</p>
                <p className="text-xs text-violet-600 font-medium">Est. Cost</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-slate-900">{usageData?.summary?.successRate || 100}%</p>
                <p className="text-xs text-slate-500">Success Rate</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* By Operation */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">By Operation</h3>
                {!usageData?.byOperation?.length ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {usageData.byOperation.map((item) => (
                      <div key={item.operation} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          <span className="text-sm text-slate-700 capitalize">{item.operation}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                          <span className="text-xs text-slate-400 ml-2">${item.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By Model */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">By Model</h3>
                {!usageData?.byModel?.length ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {usageData.byModel.map((item) => (
                      <div key={item.model} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 truncate max-w-[120px]" title={item.model}>
                          {item.model.replace('claude-', '').replace(/-20\d{6}/, '')}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                          <span className="text-xs text-slate-400 ml-2">${item.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By File Type */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">By File Type</h3>
                {!usageData?.byFileType?.length ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {usageData.byFileType.map((item) => (
                      <div key={item.fileType} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 capitalize">{item.fileType || 'unknown'}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                          <span className="text-xs text-slate-400 ml-2">${item.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Usage Chart */}
            {usageData?.dailyUsage && usageData.dailyUsage.length > 0 && (() => {
              const chartData = usageData.dailyUsage.slice(0, 14).reverse()
              const maxCost = Math.max(...chartData.map(d => d.cost), 0.01)

              return (
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Cost (14 days)</h3>
                  <div className="flex items-end gap-1 h-32">
                    {chartData.map((day) => (
                      <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                        <div
                          className="w-full bg-gradient-to-t from-violet-500 to-fuchsia-400 rounded-t hover:from-violet-600 hover:to-fuchsia-500 transition-colors cursor-pointer"
                          style={{ height: `${(day.cost / maxCost) * 100}%`, minHeight: day.cost > 0 ? '4px' : '0' }}
                        />
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {day.date.slice(5)}: ${day.cost.toFixed(4)} ({day.calls} calls)
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Total: ${chartData.reduce((sum, d) => sum + d.cost, 0).toFixed(4)} | {chartData.reduce((sum, d) => sum + d.calls, 0)} calls
                  </p>
                </div>
              )
            })()}

            {/* Recent Calls Table */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent API Calls</h3>
              {!usageData?.recentCalls?.length ? (
                <p className="text-slate-500 text-sm">No API calls yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 font-medium text-slate-600">Operation</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-600">Model</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Input</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Output</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Cost</th>
                        <th className="text-center py-2 px-2 font-medium text-slate-600">Status</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageData.recentCalls.map((call) => (
                        <tr key={call.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium capitalize">
                              {call.operation}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-600 text-xs font-mono">
                            {call.model?.replace('claude-', '').replace(/-20\d{6}/, '') || 'unknown'}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{(call.inputTokens || 0).toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{(call.outputTokens || 0).toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-slate-900 font-medium tabular-nums">${call.cost?.toFixed(4) || '0.0000'}</td>
                          <td className="py-2 px-2 text-center">
                            {call.success ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Success" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Failed" />
                            )}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-500 text-xs">{formatTimestamp(call.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
                          onClick={() => fetchUserStats(profile)}
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
                <div className="absolute inset-0 bg-black/50" onClick={() => { setSelectedProfile(null); setUserStats(null); }} />
                <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => { setSelectedProfile(null); setUserStats(null); }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedProfile.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{selectedProfile.email}</p>

                  {/* Profile Info Row */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedProfile.role === 'caregiver'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}>
                      {selectedProfile.role}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {selectedProfile.cancerType}
                    </span>
                    {selectedProfile.stage && (
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                        Stage {selectedProfile.stage}
                      </span>
                    )}
                    {selectedProfile.location && (
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                        📍 {selectedProfile.location}
                      </span>
                    )}
                  </div>

                  {/* Stats Section */}
                  {loadingUserStats ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent"></div>
                    </div>
                  ) : userStats ? (
                    <>
                      {/* Activity Stats Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                        <div className="bg-violet-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-violet-700">{userStats.stats.recordsUploaded}</p>
                          <p className="text-xs text-slate-600">Records</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-700">{userStats.stats.questionsAsked}</p>
                          <p className="text-xs text-slate-600">Questions</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-orange-700">{userStats.stats.combatRuns}</p>
                          <p className="text-xs text-slate-600">Combats</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-700">{userStats.stats.trialSearches}</p>
                          <p className="text-xs text-slate-600">Trial Searches</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-slate-700">{userStats.stats.pageViews}</p>
                          <p className="text-xs text-slate-600">Page Views</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-slate-700">{userStats.stats.uniqueSessions}</p>
                          <p className="text-xs text-slate-600">Sessions</p>
                        </div>
                      </div>

                      {/* Activity Dates */}
                      <div className="flex flex-wrap gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-slate-500">First seen: </span>
                          <span className="text-slate-900">{userStats.stats.firstActivity ? formatTimestamp(userStats.stats.firstActivity) : 'Never'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Last active: </span>
                          <span className="text-slate-900">{userStats.stats.lastActivity ? formatTimestamp(userStats.stats.lastActivity) : 'Never'}</span>
                        </div>
                      </div>

                      {/* Device & Traffic Info */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {userStats.deviceInfo && userStats.deviceInfo.primary !== 'unknown' && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            userStats.deviceInfo.primary === 'mobile' ? 'bg-emerald-100 text-emerald-700' :
                            userStats.deviceInfo.primary === 'tablet' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {userStats.deviceInfo.primary === 'mobile' ? '📱' :
                             userStats.deviceInfo.primary === 'tablet' ? '📲' : '🖥️'} {userStats.deviceInfo.primary}
                          </span>
                        )}
                        {userStats.trafficInfo && userStats.trafficInfo.primary !== 'unknown' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700">
                            {userStats.trafficInfo.primary === 'direct' ? '🔗' :
                             userStats.trafficInfo.primary === 'google' ? '🔍' :
                             userStats.trafficInfo.primary === 'facebook' ? '📘' :
                             userStats.trafficInfo.primary === 'circle' ? '⭕' :
                             userStats.trafficInfo.primary === 'twitter' ? '🐦' : '🌐'} via {userStats.trafficInfo.primary}
                          </span>
                        )}
                      </div>

                      {/* Two Column Layout */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Pages Visited */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Pages Visited</h4>
                          {userStats.pagesVisited.length === 0 ? (
                            <p className="text-slate-500 text-sm">No page views tracked</p>
                          ) : (
                            <div className="space-y-1">
                              {userStats.pagesVisited.map((page, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-slate-600 truncate font-mono">{page.path}</span>
                                  <span className="text-slate-900 font-semibold ml-2">{page.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent Activity */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Recent Activity</h4>
                          {userStats.recentActivity.length === 0 ? (
                            <p className="text-slate-500 text-sm">No activity tracked</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {userStats.recentActivity.slice(0, 10).map((activity, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                                    {formatEventType(activity.type)}
                                  </span>
                                  <span className="text-slate-500">{formatTimestamp(activity.timestamp)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Combat Analyses */}
                      {userStats.combatAnalyses.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Combat Analyses</h4>
                          <div className="space-y-2">
                            {userStats.combatAnalyses.map((combat, i) => (
                              <div key={i} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                                    combat.phase === 'diagnosis' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {combat.phase}
                                  </span>
                                  <span className="text-slate-700 capitalize">{combat.cancerType}</span>
                                  <span className="text-slate-500">({combat.recordsCount} records)</span>
                                </div>
                                <span className="text-slate-500 text-xs">{formatTimestamp(combat.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center text-slate-500">
                      No activity data available for this user
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    Joined {formatTimestamp(selectedProfile.createdAt)} · Updated {formatTimestamp(selectedProfile.updatedAt)}
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
                onClick={() => setShowQuestionsDrillDown(true)}
                clickable
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
                label="Total Profiles"
                value={data.summary.totalProfiles || data.summary.profileCreations}
                subtext={data.summary.profileCreations > 0 ? `+${data.summary.profileCreations} this period` : undefined}
                icon="🆕"
              />
              <SummaryCard
                label="Avg Records/Uploader"
                value={data.summary.avgRecordsPerSession || 0}
                subtext={`${data.summary.sessionsWithRecords || 0} uploaders`}
                icon="📊"
              />
              <SummaryCard
                label="Combat Analyses"
                value={data.summary.combatAnalyses || 0}
                icon="⚔️"
              />
            </div>

            {/* Combat Stats Section */}
            {data.combatStats && data.combatStats.total > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl shadow p-6 mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  ⚔️ CancerCombat Analytics
                </h2>
                <div className="grid sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">{data.combatStats.total}</p>
                    <p className="text-xs text-slate-600">Total Analyses</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.combatStats.diagnosis}</p>
                    <p className="text-xs text-slate-600">Diagnosis Phase</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{data.combatStats.treatment}</p>
                    <p className="text-xs text-slate-600">Treatment Phase</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{data.combatStats.avgEvidenceStrength}%</p>
                    <p className="text-xs text-slate-600">Avg Evidence</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* By Cancer Type */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">By Cancer Type</h3>
                    <div className="space-y-2">
                      {Object.entries(data.combatStats.byCancerType)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                            <span className="text-sm text-slate-700 capitalize">{type}</span>
                            <span className="text-sm font-semibold text-slate-900">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recent Combats */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Recent Analyses</h3>
                    <div className="space-y-2">
                      {data.combatStats.recentCombats.slice(0, 5).map((combat, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              combat.phase === 'diagnosis' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {combat.phase}
                            </span>
                            <span className="text-sm text-slate-700 capitalize">{combat.cancerType}</span>
                          </div>
                          <span className="text-xs text-slate-500">{formatTimestamp(combat.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sharing & Viral Growth Section */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                🚀 Sharing & Viral Growth
              </h2>
              <div className="grid sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{data.sharingStats?.totalShares || 0}</p>
                  <p className="text-xs text-slate-600">Total Shares</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{data.referralStats?.uniqueReferralSessions || 0}</p>
                  <p className="text-xs text-slate-600">Referral Arrivals</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{data.roleBreakdown?.caregivers || 0}</p>
                  <p className="text-xs text-slate-600">Caregivers</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-violet-600">{data.roleBreakdown?.patients || 0}</p>
                  <p className="text-xs text-slate-600">Patients</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Shares by Tool */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Shares by Tool</h3>
                  {!data.sharingStats?.byTool?.length ? (
                    <p className="text-slate-500 text-xs">No shares yet</p>
                  ) : (
                    <div className="space-y-2">
                      {data.sharingStats.byTool.slice(0, 5).map((item) => (
                        <div key={item.tool} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <span className="text-sm text-slate-700 capitalize">{item.tool}</span>
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shares by Method */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Share Methods</h3>
                  {!data.sharingStats?.byMethod?.length ? (
                    <p className="text-slate-500 text-xs">No shares yet</p>
                  ) : (
                    <div className="space-y-2">
                      {data.sharingStats.byMethod.map((item) => (
                        <div key={item.method} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <span className="text-sm text-slate-700 capitalize">
                            {item.method === 'copy' ? '📋 Copy' :
                             item.method === 'email' ? '✉️ Email' :
                             item.method === 'twitter' ? '🐦 Twitter' : item.method}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referral Sources */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Referral Sources</h3>
                  {!data.referralStats?.bySource?.length ? (
                    <p className="text-slate-500 text-xs">No referrals tracked yet</p>
                  ) : (
                    <div className="space-y-2">
                      {data.referralStats.bySource.slice(0, 5).map((item) => (
                        <div key={item.source} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <span className="text-sm text-slate-700 font-mono">{item.source}</span>
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Caregiver/Patient Insight */}
              {(data.roleBreakdown?.caregivers || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Caregiver Ratio:</span>{' '}
                    {data.roleBreakdown?.ratio || '0'} caregivers per patient •{' '}
                    <span className="text-green-700">
                      {Math.round((data.roleBreakdown?.caregivers || 0) / ((data.roleBreakdown?.caregivers || 0) + (data.roleBreakdown?.patients || 1)) * 100)}% of signups are caregivers
                    </span>
                  </p>
                </div>
              )}
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

            {/* Daily Charts */}
            {data.dailyBreakdown.length > 0 && (() => {
              const chartData = data.dailyBreakdown.slice(0, 14).reverse()
              const maxSessions = Math.max(...chartData.map(d => d.sessions), 1)
              const maxUploads = Math.max(...chartData.map(d => d.events.record_upload || 0), 1)
              const maxViews = Math.max(...chartData.map(d => d.views), 1)

              return (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {/* Sessions Chart */}
                  <div className="bg-white rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">📊 Sessions (14 days)</h3>
                    <div className="flex items-end gap-1 h-24">
                      {chartData.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-violet-500 rounded-t hover:bg-violet-600 transition-colors cursor-pointer"
                            style={{ height: `${(day.sessions / maxSessions) * 100}%`, minHeight: day.sessions > 0 ? '4px' : '0' }}
                          />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {day.date.slice(5)}: {day.sessions}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Total: {chartData.reduce((sum, d) => sum + d.sessions, 0)}
                    </p>
                  </div>

                  {/* Records Uploaded Chart */}
                  <div className="bg-white rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">📁 Records Uploaded (14 days)</h3>
                    <div className="flex items-end gap-1 h-24">
                      {chartData.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors cursor-pointer"
                            style={{ height: `${((day.events.record_upload || 0) / maxUploads) * 100}%`, minHeight: (day.events.record_upload || 0) > 0 ? '4px' : '0' }}
                          />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {day.date.slice(5)}: {day.events.record_upload || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Total: {chartData.reduce((sum, d) => sum + (d.events.record_upload || 0), 0)}
                    </p>
                  </div>

                  {/* Page Views Chart */}
                  <div className="bg-white rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">👁️ Page Views (14 days)</h3>
                    <div className="flex items-end gap-1 h-24">
                      {chartData.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                            style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: day.views > 0 ? '4px' : '0' }}
                          />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {day.date.slice(5)}: {day.views}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Total: {chartData.reduce((sum, d) => sum + d.views, 0)}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Daily Breakdown Table */}
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

            {/* Questions Drill-Down Modal */}
            {showQuestionsDrillDown && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowQuestionsDrillDown(false)} />
                <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setShowQuestionsDrillDown(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <span>💬</span> Questions Asked
                  </h3>
                  <p className="text-slate-500 text-sm mb-6">
                    {data.drillDown?.questions?.length || 0} questions in the last {days} days
                  </p>

                  {!data.drillDown?.questions?.length ? (
                    <p className="text-slate-500 text-center py-8">No questions asked in this period</p>
                  ) : (
                    <div className="space-y-4">
                      {data.drillDown.questions.map((q, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                              {q.cancerType}
                            </span>
                            <span className="text-xs text-slate-500">
                              Session: {q.sessionId}
                            </span>
                            <span className="text-xs text-slate-400 ml-auto">
                              {formatTimestamp(q.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-800 text-sm leading-relaxed">
                            {q.question}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon, subtext, onClick, clickable }: { label: string; value: number; icon: string; subtext?: string; onClick?: () => void; clickable?: boolean }) {
  const Component = clickable ? 'button' : 'div'
  return (
    <Component
      onClick={onClick}
      className={`bg-white rounded-xl shadow p-4 sm:p-6 text-left w-full ${clickable ? 'hover:bg-violet-50 hover:ring-2 hover:ring-violet-200 cursor-pointer transition-all' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
          <p className="text-xs sm:text-sm text-slate-600">{label}</p>
          {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
          {clickable && <p className="text-xs text-violet-500 mt-1">Click for details →</p>}
        </div>
      </div>
    </Component>
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
