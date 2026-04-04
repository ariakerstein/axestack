'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Check, Tag, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const ENTITY_TYPES = [
  { value: 'diagnosis', label: 'Diagnosis', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'biomarker', label: 'Biomarker', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'treatment', label: 'Treatment', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'medication', label: 'Medication', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'procedure', label: 'Procedure', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'lab_result', label: 'Lab Result', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'provider', label: 'Provider', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'institution', label: 'Institution', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'symptom', label: 'Symptom', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'vital_sign', label: 'Vital Sign', color: 'bg-pink-100 text-pink-700 border-pink-200' },
] as const

type EntityType = typeof ENTITY_TYPES[number]['value']

interface Entity {
  id: string
  entity_type: EntityType
  entity_value: string
  entity_date?: string
  entity_status?: string
  numeric_value?: number
  numeric_unit?: string
  reference_range?: string
  confidence: number
  metadata?: { manual?: boolean }
}

interface EntityAnnotationProps {
  sessionId: string | null
  userId: string | null
  className?: string
}

export function EntityAnnotation({ sessionId, userId, className = '' }: EntityAnnotationProps) {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formType, setFormType] = useState<EntityType>('diagnosis')
  const [formValue, setFormValue] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStatus, setFormStatus] = useState('')
  const [formNumericValue, setFormNumericValue] = useState('')
  const [formNumericUnit, setFormNumericUnit] = useState('')

  // Fetch entities
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
        console.error('Error fetching entities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEntities()
  }, [sessionId, userId])

  const resetForm = () => {
    setFormType('diagnosis')
    setFormValue('')
    setFormDate('')
    setFormStatus('')
    setFormNumericValue('')
    setFormNumericUnit('')
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleAdd = async () => {
    if (!formValue.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/entities/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: {
            entity_type: formType,
            entity_value: formValue.trim(),
            entity_date: formDate || undefined,
            entity_status: formStatus || undefined,
            numeric_value: formNumericValue ? parseFloat(formNumericValue) : undefined,
            numeric_unit: formNumericUnit || undefined,
          },
          sessionId,
          userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEntities(prev => [...prev, data.entity])
        resetForm()
      }
    } catch (err) {
      console.error('Error adding entity:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (entityId: string) => {
    if (!formValue.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/entities/manual', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          updates: {
            entity_type: formType,
            entity_value: formValue.trim(),
            entity_date: formDate || null,
            entity_status: formStatus || null,
            numeric_value: formNumericValue ? parseFloat(formNumericValue) : null,
            numeric_unit: formNumericUnit || null,
          },
          sessionId,
          userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEntities(prev => prev.map(e => e.id === entityId ? data.entity : e))
        resetForm()
      }
    } catch (err) {
      console.error('Error updating entity:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entityId: string) => {
    if (!confirm('Delete this annotation?')) return

    try {
      const params = new URLSearchParams({ entityId })
      if (userId) params.set('userId', userId)
      else if (sessionId) params.set('sessionId', sessionId)

      const response = await fetch(`/api/entities/manual?${params}`, { method: 'DELETE' })

      if (response.ok) {
        setEntities(prev => prev.filter(e => e.id !== entityId))
      }
    } catch (err) {
      console.error('Error deleting entity:', err)
    }
  }

  const startEdit = (entity: Entity) => {
    setEditingId(entity.id)
    setFormType(entity.entity_type)
    setFormValue(entity.entity_value)
    setFormDate(entity.entity_date || '')
    setFormStatus(entity.entity_status || '')
    setFormNumericValue(entity.numeric_value?.toString() || '')
    setFormNumericUnit(entity.numeric_unit || '')
    setShowAddForm(true)
  }

  const getTypeConfig = (type: EntityType) => {
    return ENTITY_TYPES.find(t => t.value === type) || ENTITY_TYPES[0]
  }

  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.entity_type]) acc[entity.entity_type] = []
    acc[entity.entity_type].push(entity)
    return acc
  }, {} as Record<string, Entity[]>)

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-4 ${className}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-5 h-5 bg-slate-200 rounded" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900">Knowledge Graph</h3>
            <p className="text-sm text-slate-500">
              {entities.length} extracted entities
              {entities.some(e => e.metadata?.manual) && ' (includes manual)'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-200">
          {/* Add button */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => {
                resetForm()
                setShowAddForm(true)
              }}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Manual Annotation
            </button>
          </div>

          {/* Add/Edit form */}
          {showAddForm && (
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-900">
                  {editingId ? 'Edit Annotation' : 'New Annotation'}
                </h4>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Type selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as EntityType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    {ENTITY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Value input */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                  <input
                    type="text"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="e.g., EGFR mutation positive"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                {/* Optional fields row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Date (optional)</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Status (optional)</label>
                    <input
                      type="text"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      placeholder="e.g., positive, active"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>

                {/* Numeric fields for lab values */}
                {(formType === 'lab_result' || formType === 'vital_sign') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Numeric Value</label>
                      <input
                        type="number"
                        step="any"
                        value={formNumericValue}
                        onChange={(e) => setFormNumericValue(e.target.value)}
                        placeholder="e.g., 8.2"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                      <input
                        type="text"
                        value={formNumericUnit}
                        onChange={(e) => setFormNumericUnit(e.target.value)}
                        placeholder="e.g., ng/mL"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                  disabled={!formValue.trim() || saving}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    'Saving...'
                  ) : editingId ? (
                    <>
                      <Check className="w-4 h-4" />
                      Update
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Entity list grouped by type */}
          <div className="divide-y divide-slate-100">
            {Object.entries(groupedEntities).map(([type, typeEntities]) => {
              const config = getTypeConfig(type as EntityType)
              return (
                <div key={type} className="px-5 py-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {config.label} ({typeEntities.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {typeEntities.map(entity => (
                      <div
                        key={entity.id}
                        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${config.color}`}
                      >
                        <span>{entity.entity_value}</span>
                        {entity.entity_status && (
                          <span className="text-xs opacity-75">({entity.entity_status})</span>
                        )}
                        {entity.metadata?.manual && (
                          <span className="text-xs opacity-50" title="Manual annotation">*</span>
                        )}

                        {/* Edit/delete buttons - show on hover */}
                        <div className="hidden group-hover:flex items-center gap-1 ml-1 pl-1 border-l border-current border-opacity-20">
                          <button
                            onClick={() => startEdit(entity)}
                            className="p-0.5 hover:bg-black/10 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(entity.id)}
                            className="p-0.5 hover:bg-black/10 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {entities.length === 0 && (
              <div className="px-5 py-8 text-center">
                <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No entities extracted yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload a document or add manual annotations</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
