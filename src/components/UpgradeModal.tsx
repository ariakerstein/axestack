'use client'

import { X, Sliders, UserCheck, Check, Star, Zap, Shield } from 'lucide-react'

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
      expert: 'mailto:aria@opencancer.ai?subject=Expert Review Request&body=I\'m interested in the Expert Review package with oncologist consultation.'
    }
    window.open(urls[tier], '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-600 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Unlock Full Power</h2>
              <p className="text-white/80">Get deeper insights on your cancer case</p>
            </div>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="p-6 grid md:grid-cols-2 gap-4">
          {/* Pro Tier - FREE for April */}
          <div className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-50 rounded-xl p-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-green-500 to-green-500 text-white text-xs font-bold rounded-full">
              FREE IN APRIL
            </div>
            <div className="flex items-center gap-2 mb-3 mt-2">
              <Sliders className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-slate-900">Pro</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-green-600">Free</span>
              <span className="text-slate-500 line-through ml-2">$29/mo</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>All 5 analysis styles</strong> — By the Book, Cutting Edge, Whole Person, All Options</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Custom weight tuning</strong> — Fine-tune each perspective's influence</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Unlimited analyses</strong> — Re-run with different perspectives</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Save & export</strong> — PDF reports for your oncologist</span>
              </li>
            </ul>
            <button
              onClick={() => handleUpgrade('pro')}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-green-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-green-500/25"
            >
              Get Pro Free →
            </button>
          </div>

          {/* Expert Tier */}
          <div className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-white" />
              HUMAN EXPERT
            </div>
            <div className="flex items-center gap-2 mb-3 mt-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900">Expert Review</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-slate-900">$199</span>
              <span className="text-slate-500">/review</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span><strong>Everything in Pro</strong></span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span><strong>Oncologist reviews your case</strong> — Board-certified cancer specialist</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span><strong>30-minute consultation</strong> — Video call to discuss findings</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span><strong>Written summary</strong> — Take to your treating oncologist</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span><strong>Questions for your doctor</strong> — Personalized list</span>
              </li>
            </ul>
            <button
              onClick={() => handleUpgrade('expert')}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-amber-500/25"
            >
              Get Expert Review
            </button>
          </div>
        </div>

        {/* Trust signals */}
        <div className="px-6 pb-6">
          <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
            <Shield className="w-8 h-8 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-700">
                <strong>Your data stays private.</strong> HIPAA-compliant. Your records are never used to train AI models.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
