'use client'

import { useState, useEffect } from 'react'
import { Calendar, Circle, Pill, Dna, FlaskConical, Stethoscope, Building2, AlertCircle, Activity, MessageCircle } from 'lucide-react'

const ENTITY_CONFIG: Record<string, { icon: typeof Circle; color: string; bgColor: string }> = {
  diagnosis: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  biomarker: { icon: Dna, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  treatment: { icon: Pill, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  medication: { icon: Pill, color: 'text-green-600', bgColor: 'bg-green-100' },
  procedure: { icon: Stethoscope, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  lab_result: { icon: FlaskConical, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  provider: { icon: Stethoscope, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  institution: { icon: Building2, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  symptom: { icon: Activity, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  vital_sign: { icon: Activity, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  question: { icon: MessageCircle, color: 'text-violet-600', bgColor: 'bg-violet-100' },
}

interface TimelineEntity {
  id: string
  entity_type: string
  entity_value: string
  entity_date: string | null
  entity_status: string | null
  numeric_value: number | null
  numeric_unit: string | null
  confidence: number
  created_at: string
}

interface PatientTimelineProps {
  sessionId: string | null
  userId: string | null
  className?: string
}

export function PatientTimeline({ sessionId, userId, className = '' }: PatientTimelineProps) {
  const [entities, setEntities] = useState<TimelineEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    const fetchEntities = async () => {
      if (!sessionId && !userId) return

      try {
        const params = new URLSearchParams()
        if (userId) params.set('userId', userId)
        else if (sessionId) params.set('sessionId', sessionId)

        const response = await fetch(`/api/entities/extract?${params}`)
        if (response.ok) {
          const data = await response.json()
          setEntities(data.entities || [])
        }
      } catch (err) {
        console.error('Error fetching entities for timeline:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEntities()
  }, [sessionId, userId])

  // Group entities by date/period
  const groupedByDate = entities
    .filter(e => !filter || e.entity_type === filter)
    .sort((a, b) => {
      // Sort by date if available, otherwise by created_at
      const dateA = a.entity_date || a.created_at
      const dateB = b.entity_date || b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
    .reduce((groups, entity) => {
      const date = entity.entity_date
        ? new Date(entity.entity_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        : 'Date Unknown'

      if (!groups[date]) groups[date] = []
      groups[date].push(entity)
      return groups
    }, {} as Record<string, TimelineEntity[]>)

  const entityTypes = [...new Set(entities.map(e => e.entity_type))]

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-8 ${className}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-xl" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-8 text-center ${className}`}>
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-900 mb-2">Your Treatment Timeline</h3>
        <p className="text-slate-500 text-sm">
          Upload medical documents to see your cancer journey visualized over time.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Treatment Timeline</h3>
              <p className="text-xs text-slate-500">{entities.length} events tracked</p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === null
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {entityTypes.map(type => {
            const config = ENTITY_CONFIG[type] || ENTITY_CONFIG.diagnosis
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                  filter === type
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-5 max-h-[500px] overflow-y-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          {Object.entries(groupedByDate).map(([date, dateEntities], groupIndex) => (
            <div key={date} className="mb-6 last:mb-0">
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center z-10">
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <span className="font-semibold text-slate-900">{date}</span>
              </div>

              {/* Events */}
              <div className="ml-4 pl-7 border-l-2 border-slate-100 space-y-3">
                {dateEntities.map((entity, index) => {
                  const config = ENTITY_CONFIG[entity.entity_type] || ENTITY_CONFIG.diagnosis
                  const Icon = config.icon

                  return (
                    <div
                      key={entity.id}
                      className="relative flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {/* Entity Icon */}
                      <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${config.color} capitalize`}>
                            {entity.entity_type.replace('_', ' ')}
                          </span>
                          {entity.entity_status && (
                            <span className="text-xs bg-white px-2 py-0.5 rounded-full text-slate-500 border border-slate-200">
                              {entity.entity_status}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-slate-900 mt-0.5">
                          {entity.entity_value}
                          {entity.numeric_value && entity.numeric_unit && (
                            <span className="text-slate-500 ml-2">
                              {entity.numeric_value} {entity.numeric_unit}
                            </span>
                          )}
                        </p>
                        {entity.confidence < 0.8 && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Lower confidence extraction
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
