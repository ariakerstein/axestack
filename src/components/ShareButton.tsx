'use client'

import { useState } from 'react'
import { Share2, X, Copy, Check } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/lib/auth'

interface ShareButtonProps {
  tool: string // e.g., 'records', 'ask', 'trials', 'oncologists'
  title?: string
  description?: string
  className?: string
  variant?: 'button' | 'icon'
}

export function ShareButton({
  tool,
  title = 'Share This Tool',
  description = 'Help others find this resource',
  className = '',
  variant = 'button'
}: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const { trackEvent } = useAnalytics()
  const { user } = useAuth()

  const getShareData = () => {
    // Generate or retrieve share tracking ID
    let shareId = localStorage.getItem('opencancer_share_id')
    if (!shareId) {
      shareId = Math.random().toString(36).substring(2, 8)
      localStorage.setItem('opencancer_share_id', shareId)
    }

    // Map tool names to actual URL paths
    const toolPaths: Record<string, string> = {
      'case-review': 'records/case-review',
      'records': 'records',
      'ask': 'ask',
      'trials': 'trials',
      'oncologists': 'oncologists',
      'checklist': 'cancer-checklist',
      'combat': 'combat',
      'coverage': 'coverage',
      'research': 'research',
    }

    const path = toolPaths[tool] || tool
    const shareUrl = `https://opencancer.ai/${path}?ref=${shareId}&utm_source=share&utm_medium=social&utm_campaign=${tool}_tool`

    const shareTexts: Record<string, string> = {
      records: 'I used opencancer.ai to translate my medical records into plain English - check out this free tool:',
      'case-review': 'I got an AI case review of my medical records - this free tool helped me understand my diagnosis:',
      ask: 'I found this helpful AI assistant for cancer questions - grounded in NCCN guidelines:',
      trials: 'Found this useful tool for searching clinical trials:',
      oncologists: 'This helped me find top cancer centers and oncologists:',
      checklist: 'Great checklist for preparing for oncology appointments:',
      combat: 'I used CancerCombat to get 3 AI perspectives on my diagnosis:',
      default: 'Check out this helpful tool from opencancer.ai:'
    }

    return {
      shareId,
      shareUrl,
      shareText: shareTexts[tool] || shareTexts.default
    }
  }

  const handleShare = async (method: 'copy' | 'twitter' | 'email') => {
    const { shareId, shareUrl, shareText } = getShareData()

    // Track share count
    const shareCount = parseInt(localStorage.getItem('opencancer_share_count') || '0') + 1
    localStorage.setItem('opencancer_share_count', shareCount.toString())

    // Log share event to analytics
    trackEvent('share', {
      method,
      tool,
      share_id: shareId,
      share_count: shareCount,
      user_email: user?.email || null,
    })

    if (method === 'copy') {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (method === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
      setShowModal(false)
    } else if (method === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(`Check out ${tool} on opencancer.ai`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
      setShowModal(false)
    }
  }

  return (
    <>
      {variant === 'button' ? (
        <button
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors ${className}`}
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className={`p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors ${className}`}
          title="Share this tool"
        >
          <Share2 className="w-5 h-5" />
        </button>
      )}

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <Share2 className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              <p className="text-slate-600 text-sm mt-2">{description}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-slate-600" />}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{copied ? 'Copied!' : 'Copy Link'}</p>
                  <p className="text-xs text-slate-500">Share via text or anywhere</p>
                </div>
              </button>

              <button
                onClick={() => handleShare('twitter')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                  𝕏
                </div>
                <div>
                  <p className="font-medium text-slate-900">Share on X</p>
                  <p className="text-xs text-slate-500">Tweet about this tool</p>
                </div>
              </button>

              <button
                onClick={() => handleShare('email')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  ✉️
                </div>
                <div>
                  <p className="font-medium text-slate-900">Send via Email</p>
                  <p className="text-xs text-slate-500">Share with friends & family</p>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Your sharing helps patients get the support they need ❤️
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
