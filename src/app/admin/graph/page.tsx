'use client'

import { useState, useEffect } from 'react'
import { Network, RefreshCw, Search, Filter, Download } from 'lucide-react'

const ENTITY_COLORS: Record<string, string> = {
  diagnosis: '#ef4444',
  biomarker: '#a855f7',
  treatment: '#3b82f6',
  medication: '#22c55e',
  procedure: '#f59e0b',
  lab_result: '#06b6d4',
  provider: '#64748b',
  institution: '#6366f1',
  symptom: '#f97316',
  vital_sign: '#ec4899',
  question: '#8b5cf6',
}

interface Entity {
  id: string
  entity_type: string
  entity_value: string
  entity_date: string | null
  entity_status: string | null
  user_id: string | null
  session_id: string | null
  confidence: number
  created_at: string
}

interface Relationship {
  id: string
  entity_a_id: string
  entity_b_id: string
  relationship_type: string
  confidence: number
}

export default function AdminGraphPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [stats, setStats] = useState({ totalEntities: 0, totalRelationships: 0, uniquePatients: 0 })

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    setLoading(true)
    try {
      // Fetch all entities (admin view)
      const entitiesRes = await fetch('/api/admin/graph/entities')
      const entitiesData = await entitiesRes.json()

      // Fetch all relationships
      const relsRes = await fetch('/api/admin/graph/relationships')
      const relsData = await relsRes.json()

      setEntities(entitiesData.entities || [])
      setRelationships(relsData.relationships || [])
      setStats({
        totalEntities: entitiesData.entities?.length || 0,
        totalRelationships: relsData.relationships?.length || 0,
        uniquePatients: new Set([
          ...(entitiesData.entities || []).map((e: Entity) => e.user_id || e.session_id)
        ]).size
      })
    } catch (err) {
      console.error('Error fetching graph data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group entities by type
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.entity_type]) acc[entity.entity_type] = []
    acc[entity.entity_type].push(entity)
    return acc
  }, {} as Record<string, Entity[]>)

  // Filter entities
  const filteredEntities = entities.filter(e => {
    const matchesSearch = !searchQuery ||
      e.entity_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !selectedType || e.entity_type === selectedType
    return matchesSearch && matchesType
  })

  // Get related entities for selected entity
  const getRelatedEntities = (entityId: string) => {
    const relatedIds = new Set<string>()
    relationships.forEach(rel => {
      if (rel.entity_a_id === entityId) relatedIds.add(rel.entity_b_id)
      if (rel.entity_b_id === entityId) relatedIds.add(rel.entity_a_id)
    })
    return entities.filter(e => relatedIds.has(e.id))
  }

  const exportGraph = () => {
    const graphData = {
      entities: entities.map(e => ({
        id: e.id,
        type: e.entity_type,
        value: e.entity_value,
        date: e.entity_date,
        status: e.entity_status
      })),
      relationships: relationships.map(r => ({
        source: r.entity_a_id,
        target: r.entity_b_id,
        type: r.relationship_type
      }))
    }

    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patient-knowledge-graph-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Patient Knowledge Graph</h1>
              <p className="text-sm text-slate-500">Admin visualization of extracted entities</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchGraphData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportGraph}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Total Entities</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalEntities}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Relationships</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalRelationships}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Unique Patients</p>
            <p className="text-2xl font-bold text-slate-900">{stats.uniquePatients}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value || null)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All Types</option>
            {Object.keys(groupedEntities).map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ')} ({groupedEntities[type].length})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Entity Type Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Entity Distribution</h3>
            <div className="space-y-3">
              {Object.entries(groupedEntities)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([type, typeEntities]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <span className="text-slate-500">{typeEntities.length}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(typeEntities.length / entities.length) * 100}%`,
                          backgroundColor: ENTITY_COLORS[type] || '#64748b'
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Entity List */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2">
            <h3 className="font-semibold text-slate-900 mb-4">
              Entities ({filteredEntities.length})
            </h3>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredEntities.map(entity => (
                <button
                  key={entity.id}
                  onClick={() => setSelectedEntity(entity)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedEntity?.id === entity.id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ENTITY_COLORS[entity.entity_type] || '#64748b' }}
                    />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      {entity.entity_type.replace('_', ' ')}
                    </span>
                    {entity.entity_status && (
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                        {entity.entity_status}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-900 mt-1">{entity.entity_value}</p>
                  {entity.entity_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(entity.entity_date).toLocaleDateString()}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Entity Details */}
        {selectedEntity && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Entity Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs text-slate-500">Value</dt>
                    <dd className="font-medium">{selectedEntity.entity_value}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Type</dt>
                    <dd className="capitalize">{selectedEntity.entity_type.replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Status</dt>
                    <dd>{selectedEntity.entity_status || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Date</dt>
                    <dd>{selectedEntity.entity_date ? new Date(selectedEntity.entity_date).toLocaleDateString() : 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Confidence</dt>
                    <dd>{Math.round(selectedEntity.confidence * 100)}%</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Related Entities</h4>
                <div className="space-y-2">
                  {getRelatedEntities(selectedEntity.id).length > 0 ? (
                    getRelatedEntities(selectedEntity.id).map(related => (
                      <div
                        key={related.id}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ENTITY_COLORS[related.entity_type] || '#64748b' }}
                        />
                        <span className="text-slate-500">{related.entity_type}:</span>
                        <span className="font-medium">{related.entity_value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">No relationships found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
