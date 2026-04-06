'use client'

import { X, Sliders, UserCheck, Check, Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: 'tuning' | 'expert' | 'general'
}

export function UpgradeModal({ isOpen, onClose, feature = 'general' }: UpgradeModalProps) {
  if (!isOpen) return null

  const handleUpgrade = (tier: 'pro' | 'expert') => {
    // TODO: Integrate with Stripe
    const urls = {
      pro: 'mailto:aria@opencancer.ai?subject=CancerCombat Pro Interest&body=I\'m interested in upgrading to CancerCombat Pro for full perspective tuning.',
      expert: '/expert-review'
    }
    if (tier === 'expert') {
      onClose()
      window.location.href = urls[tier]
    } else {
      window.open(urls[tier], '_blank')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - Clean, monochromatic design */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">Unlock Advanced Features</h2>
          <p className="text-slate-500 text-sm mt-1">Fine-tune how CancerCombat analyzes your case</p>
        </div>

        {/* Pro Tier - Currently Free */}
        <div className="p-6">
          <div className="border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Pro Features</h3>
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                Currently free
              </span>
            </div>

            <ul className="space-y-3 mb-5">
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700"><strong>Perspective weight tuning</strong> — Emphasize the perspectives that matter most to you</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700"><strong>Unlimited re-runs</strong> — Analyze with different settings</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700"><strong>PDF reports</strong> — Share with your oncologist</span>
              </li>
            </ul>

            <button
              onClick={() => handleUpgrade('pro')}
              className="w-full py-3 bg-[#C66B4A] hover:bg-[#B35E40] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              Enable Pro Features
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Expert Review - Link to dedicated page */}
          <div className="mt-4 border border-slate-200 rounded-xl p-5 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Human Expert Review</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Get your case reviewed by board-certified oncologists. Free consultations available through Cancer Commons.
            </p>
            <Link
              href="/expert-review"
              onClick={onClose}
              className="text-sm font-medium text-slate-900 hover:text-slate-700 flex items-center gap-1"
            >
              View expert options
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Trust signal */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>HIPAA-compliant. Your records are never used to train AI.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
