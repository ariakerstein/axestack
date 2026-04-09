'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Create client lazily to avoid SSR issues
function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"
  return createClient(url, key)
}

interface ContentItem {
  id: string
  title: string
  source: string
  content_tier: string
  content_type: string
  cancer_type: string | null
  status: string
  created_at: string
  chunkCount: number
  word_count?: number | null
  storage_path?: string | null
}

interface ContentStats {
  total: number
  totalChunks: number
  byTier: Record<string, number>
  byStatus: Record<string, number>
}

const CONTENT_TIERS = [
  { value: 'tier_1', label: 'Tier 1', description: 'NCCN, ASCO, FDA guidelines' },
  { value: 'tier_2', label: 'Tier 2', description: 'Peer-reviewed journals' },
  { value: 'tier_3', label: 'Tier 3', description: 'Community content' },
]

const CANCER_TYPES = [
  'Breast', 'Lung', 'Prostate', 'Colorectal', 'Melanoma', 'Leukemia',
  'Lymphoma', 'Bladder', 'Kidney', 'Liver', 'Pancreatic', 'Thyroid',
  'Ovarian', 'Brain', 'Head and Neck', 'Multiple Myeloma'
]

export default function RAGAdminPage() {
  const supabase = useMemo(() => getSupabase(), [])

  const [content, setContent] = useState<ContentItem[]>([])
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadSource, setUploadSource] = useState('')
  const [uploadTier, setUploadTier] = useState('tier_1')
  const [uploadCancerType, setUploadCancerType] = useState('')

  // URL ingestion state
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestUrl, setIngestUrl] = useState('')
  const [ingestTitle, setIngestTitle] = useState('')
  const [ingestSource, setIngestSource] = useState('')
  const [ingestTier, setIngestTier] = useState('tier_2')
  const [ingestCancerType, setIngestCancerType] = useState('')

  // Processing state
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadContent()
    loadStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTier, filterStatus, searchQuery])

  const loadContent = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('guideline_chunks')
        .select('guideline_title, guideline_source, cancer_type, content_tier, content_type, status, updated_at, word_count, storage_path')

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }
      if (filterTier !== 'all') {
        query = query.eq('content_tier', filterTier)
      }
      if (searchQuery) {
        query = query.or(`guideline_title.ilike.%${searchQuery}%,guideline_source.ilike.%${searchQuery}%`)
      }

      const { data: chunks, error } = await query
        .order('updated_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      // Group by title and count chunks
      const grouped = new Map<string, ContentItem>()
      chunks?.forEach((chunk: any) => {
        const key = chunk.guideline_title
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            title: chunk.guideline_title,
            source: chunk.guideline_source || 'Unknown',
            content_tier: chunk.content_tier || 'tier_3',
            content_type: chunk.content_type || 'guideline',
            cancer_type: chunk.cancer_type,
            status: chunk.status || 'active',
            created_at: chunk.updated_at,
            chunkCount: 1,
            word_count: chunk.word_count,
            storage_path: chunk.storage_path,
          })
        } else {
          const existing = grouped.get(key)!
          existing.chunkCount++
        }
      })

      setContent(Array.from(grouped.values()))
    } catch (error: any) {
      console.error('Load content error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data: chunks, error } = await supabase
        .from('guideline_chunks')
        .select('guideline_title, content_tier, status')
        .limit(5000)

      if (error) throw error

      const documentMap = new Map<string, any>()
      chunks?.forEach((chunk: any) => {
        if (!documentMap.has(chunk.guideline_title)) {
          documentMap.set(chunk.guideline_title, {
            content_tier: chunk.content_tier,
            status: chunk.status || 'active',
          })
        }
      })

      const byTier: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      documentMap.forEach((doc) => {
        byTier[doc.content_tier] = (byTier[doc.content_tier] || 0) + 1
        byStatus[doc.status] = (byStatus[doc.status] || 0) + 1
      })

      setStats({
        total: documentMap.size,
        totalChunks: chunks?.length || 0,
        byTier,
        byStatus,
      })
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !uploadSource) {
      alert('Please fill in all required fields')
      return
    }

    setIsUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Upload to storage
      const timestamp = Date.now()
      const fileName = `${session.user.id}/${timestamp}_${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(fileName, uploadFile)

      if (uploadError) throw uploadError

      // Create metadata record
      const { error: metadataError } = await supabase
        .from('guideline_chunks')
        .insert({
          guideline_title: uploadTitle,
          guideline_source: uploadSource,
          cancer_type: uploadCancerType || null,
          content_tier: uploadTier,
          content_type: 'guideline',
          storage_path: fileName,
          status: 'draft',
          chunk_text: '',
        })

      if (metadataError) throw metadataError

      alert('Upload successful! Click "Process" to extract text and generate embeddings.')
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadTitle('')
      setUploadSource('')
      setUploadCancerType('')
      await loadContent()
      await loadStats()
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleProcess = async (item: ContentItem) => {
    if (!item.storage_path) {
      alert('No PDF file found for this document')
      return
    }

    setProcessingItems(prev => new Set([...prev, item.id]))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { data: result, error } = await supabase.functions.invoke('process-guideline', {
        body: {
          recordId: Date.now(),
          metadata: {
            storagePath: item.storage_path,
            title: item.title,
            source: item.source,
            cancerType: item.cancer_type,
            contentTier: item.content_tier,
          }
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (error) throw error
      if (!result?.success) throw new Error(result?.error || 'Processing failed')

      alert(`Processing complete! Created ${result.chunksCreated || 0} searchable chunks.`)
      await loadContent()
      await loadStats()
    } catch (error: any) {
      console.error('Processing error:', error)
      alert('Processing failed: ' + error.message)
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleDelete = async (item: ContentItem) => {
    if (!confirm('Delete this content and all its chunks? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('guideline_chunks')
        .delete()
        .eq('guideline_title', item.id)

      if (error) throw error
      await loadContent()
      await loadStats()
    } catch (error: any) {
      alert('Delete failed: ' + error.message)
    }
  }

  const handleStatusChange = async (item: ContentItem, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('guideline_chunks')
        .update({ status: newStatus })
        .eq('guideline_title', item.id)

      if (error) throw error
      await loadContent()
      await loadStats()
    } catch (error: any) {
      alert('Status update failed: ' + error.message)
    }
  }

  const handleUrlIngest = async () => {
    if (!ingestUrl || !ingestTitle) {
      alert('Please provide a URL and title')
      return
    }

    setIsIngesting(true)
    try {
      // Fetch the URL content
      const response = await fetch('/api/rag/ingest-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: ingestUrl,
          title: ingestTitle,
          source: ingestSource || new URL(ingestUrl).hostname,
          tier: ingestTier,
          cancerType: ingestCancerType || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ingestion failed')
      }

      alert(`Success! Created ${result.chunksCreated || 0} chunks from URL.`)
      setShowUrlModal(false)
      setIngestUrl('')
      setIngestTitle('')
      setIngestSource('')
      setIngestCancerType('')
      await loadContent()
      await loadStats()
    } catch (error: any) {
      console.error('URL ingestion error:', error)
      alert('Ingestion failed: ' + error.message)
    } finally {
      setIsIngesting(false)
    }
  }

  // Auto-fill source from URL
  const handleUrlChange = (url: string) => {
    setIngestUrl(url)
    try {
      const hostname = new URL(url).hostname.replace('www.', '')
      if (!ingestSource) {
        setIngestSource(hostname)
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'tier_1': return 'bg-green-100 text-green-800'
      case 'tier_2': return 'bg-blue-100 text-blue-800'
      case 'tier_3': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">RAG Content Library</h1>
            <p className="text-gray-600 mt-1">Manage knowledge base content for Navis</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUrlModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Ingest URL
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload PDF
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm text-gray-500">Documents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-400">{stats.totalChunks.toLocaleString()} chunks</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm text-gray-500">Tier 1</p>
              <p className="text-3xl font-bold text-green-600">{stats.byTier.tier_1 || 0}</p>
              <p className="text-xs text-gray-400">NCCN, ASCO, FDA</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm text-gray-500">Tier 2</p>
              <p className="text-3xl font-bold text-blue-600">{stats.byTier.tier_2 || 0}</p>
              <p className="text-xs text-gray-400">Journals</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm text-gray-500">Tier 3</p>
              <p className="text-3xl font-bold text-gray-600">{stats.byTier.tier_3 || 0}</p>
              <p className="text-xs text-gray-400">Community</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm text-gray-500">Status</p>
              <div className="flex gap-4 mt-1">
                <div>
                  <span className="text-green-600 font-semibold">{stats.byStatus.active || 0}</span>
                  <span className="text-xs text-gray-400 ml-1">active</span>
                </div>
                <div>
                  <span className="text-yellow-600 font-semibold">{stats.byStatus.draft || 0}</span>
                  <span className="text-xs text-gray-400 ml-1">draft</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tiers</option>
            <option value="tier_1">Tier 1</option>
            <option value="tier_2">Tier 2</option>
            <option value="tier_3">Tier 3</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <button
            onClick={() => { loadContent(); loadStats() }}
            className="p-2 border rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : content.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No content found</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 text-blue-600 hover:underline"
              >
                Upload your first content
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Cancer Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Chunks</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {content.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-gray-900">{item.title}</td>
                    <td className="py-3 px-4 text-gray-600">{item.source}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(item.content_tier)}`}>
                        {item.content_tier.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.cancer_type || '-'}</td>
                    <td className="py-3 px-4">
                      {processingItems.has(item.id) ? (
                        <span className="flex items-center gap-2 text-blue-600">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-gray-600">{item.chunkCount}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'draft' && item.storage_path && (
                          <button
                            onClick={() => handleProcess(item)}
                            disabled={processingItems.has(item.id)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            Process
                          </button>
                        )}
                        {item.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(item, 'archived')}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Archive
                          </button>
                        )}
                        {item.status === 'archived' && (
                          <button
                            onClick={() => handleStatusChange(item, 'active')}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* URL Ingestion Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ingest from URL</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter a URL to fetch and index content. Works with articles, guidelines, and web pages.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input
                  type="url"
                  value={ingestUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.org/article"
                  className="w-full border rounded-lg p-2"
                  disabled={isIngesting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                  placeholder="e.g., ASCO Breast Cancer Treatment Guidelines"
                  className="w-full border rounded-lg p-2"
                  disabled={isIngesting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input
                  type="text"
                  value={ingestSource}
                  onChange={(e) => setIngestSource(e.target.value)}
                  placeholder="Auto-filled from URL domain"
                  className="w-full border rounded-lg p-2"
                  disabled={isIngesting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Tier *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CONTENT_TIERS.map(tier => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => setIngestTier(tier.value)}
                      disabled={isIngesting}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        ingestTier === tier.value
                          ? tier.value === 'tier_1' ? 'border-green-500 bg-green-50'
                            : tier.value === 'tier_2' ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-500 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`text-sm font-semibold ${
                        tier.value === 'tier_1' ? 'text-green-700'
                          : tier.value === 'tier_2' ? 'text-blue-700'
                          : 'text-gray-700'
                      }`}>
                        {tier.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{tier.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cancer Type (optional)</label>
                <select
                  value={ingestCancerType}
                  onChange={(e) => setIngestCancerType(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  disabled={isIngesting}
                >
                  <option value="">General / All Types</option>
                  {CANCER_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowUrlModal(false)}
                  disabled={isIngesting}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlIngest}
                  disabled={isIngesting || !ingestUrl || !ingestTitle}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isIngesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ingesting...
                    </>
                  ) : (
                    'Ingest URL'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upload RAG Content</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF File *</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setUploadFile(file)
                      if (!uploadTitle) {
                        setUploadTitle(file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '))
                      }
                    }
                  }}
                  className="w-full border rounded-lg p-2"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., NCCN Breast Cancer Guidelines"
                  className="w-full border rounded-lg p-2"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
                <input
                  type="text"
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                  placeholder="e.g., NCCN, ASCO, FDA"
                  className="w-full border rounded-lg p-2"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Tier *</label>
                <select
                  value={uploadTier}
                  onChange={(e) => setUploadTier(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  disabled={isUploading}
                >
                  {CONTENT_TIERS.map(tier => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label} - {tier.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cancer Type (optional)</label>
                <select
                  value={uploadCancerType}
                  onChange={(e) => setUploadCancerType(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  disabled={isUploading}
                >
                  <option value="">General / All Types</option>
                  {CANCER_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadFile || !uploadTitle || !uploadSource}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
