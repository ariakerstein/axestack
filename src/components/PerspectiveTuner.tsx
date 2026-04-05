'use client'

import { useState } from 'react'
import { Shield, FlaskConical, Target, Clock, Leaf, Sliders, Lock, Star } from 'lucide-react'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'

export interface PerspectiveWeights {
  guidelines: number    // 0-100 - Standard of Care (NCCN)
  aggressive: number    // 0-100 - Emerging Evidence (research/trials)
  precision: number     // 0-100 - Molecular/Targeted
  conservative: number  // 0-100 - Watch & Wait
  integrative: number   // 0-100 - Whole Person (QoL)
}

// Preset configurations for common analysis styles
const PRESETS = {
  balanced: {
    guidelines: 50, aggressive: 50, precision: 50, conservative: 50, integrative: 50,
    label: 'Balanced',
    description: 'All perspectives contribute equally'
  },
  by_the_book: {
    guidelines: 90, aggressive: 30, precision: 40, conservative: 50, integrative: 30,
    label: 'By the Book',
    description: 'Follow NCCN guidelines'
  },
  research_forward: {
    guidelines: 50, aggressive: 90, precision: 70, conservative: 10, integrative: 40,
    label: 'Research Forward',
    description: 'Latest evidence & clinical trials'
  },
  molecular_match: {
    guidelines: 40, aggressive: 40, precision: 90, conservative: 40, integrative: 40,
    label: 'Molecular Match',
    description: 'Target your tumor\'s biology'
  },
  watch_and_wait: {
    guidelines: 60, aggressive: 10, precision: 50, conservative: 90, integrative: 60,
    label: 'Watch & Wait',
    description: 'Avoid overtreatment'
  },
  whole_person: {
    guidelines: 50, aggressive: 30, precision: 40, conservative: 60, integrative: 90,
    label: 'Whole Person',
    description: 'Quality of life focus'
  },
}

// The 5 perspective definitions - renamed for clarity
const PERSPECTIVES = [
  {
    key: 'guidelines' as const,
    icon: Shield,
    label: 'Standard of Care',
    description: 'NCCN guidelines, proven protocols',
    color: 'blue',
    colorClasses: { bg: 'bg-blue-100', icon: 'text-blue-600', fill: '#3B82F6' }
  },
  {
    key: 'aggressive' as const,
    icon: FlaskConical,
    label: 'Emerging Evidence',
    description: 'Latest research, clinical trials',
    color: 'violet',
    colorClasses: { bg: 'bg-violet-100', icon: 'text-violet-600', fill: '#8B5CF6' }
  },
  {
    key: 'precision' as const,
    icon: Target,
    label: 'Molecular/Targeted',
    description: 'Match treatment to your tumor\'s biology',
    color: 'purple',
    colorClasses: { bg: 'bg-purple-100', icon: 'text-purple-600', fill: '#A855F7' }
  },
  {
    key: 'conservative' as const,
    icon: Clock,
    label: 'Watch & Wait',
    description: 'Active surveillance, avoid overtreatment',
    color: 'amber',
    colorClasses: { bg: 'bg-amber-100', icon: 'text-amber-600', fill: '#F59E0B' }
  },
  {
    key: 'integrative' as const,
    icon: Leaf,
    label: 'Whole Person',
    description: 'Quality of life, supportive care',
    color: 'green',
    colorClasses: { bg: 'bg-green-100', icon: 'text-green-600', fill: '#10B981' }
  },
]

interface PerspectiveTunerProps {
  weights: PerspectiveWeights
  onChange: (weights: PerspectiveWeights) => void
  compact?: boolean
  isPremium?: boolean
  onUpgradeClick?: () => void
}

export function PerspectiveTuner({
  weights,
  onChange,
  compact = false,
  isPremium = false,
  onUpgradeClick
}: PerspectiveTunerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const applyPreset = (preset: keyof typeof PRESETS) => {
    if (!isPremium && preset !== 'balanced') {
      onUpgradeClick?.()
      return
    }
    const { guidelines, aggressive, precision, conservative, integrative } = PRESETS[preset]
    onChange({ guidelines, aggressive, precision, conservative, integrative })
  }

  const getCurrentPreset = (): string | null => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (
        Math.abs(weights.guidelines - preset.guidelines) < 5 &&
        Math.abs(weights.aggressive - preset.aggressive) < 5 &&
        Math.abs(weights.precision - preset.precision) < 5 &&
        Math.abs(weights.conservative - preset.conservative) < 5 &&
        Math.abs(weights.integrative - preset.integrative) < 5
      ) {
        return key
      }
    }
    return null
  }

  const currentPreset = getCurrentPreset()
  const totalWeight = weights.guidelines + weights.aggressive + weights.precision + weights.conservative + weights.integrative

  // Free user: simplified view with upgrade prompt
  if (!isPremium) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-slate-500" />
              Analysis Style
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">5 specialist boards will analyze your case</p>
          </div>
        </div>

        {/* Current mode indicator */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <ThinkingIndicator size={40} variant="dark" />
            <div>
              <p className="font-semibold">Balanced Analysis</p>
              <p className="text-sm text-white/80">All 5 perspectives contribute equally</p>
            </div>
          </div>
        </div>

        {/* 5 boards preview */}
        <div className="space-y-2 mb-4">
          {PERSPECTIVES.map((p) => (
            <div key={p.key} className={`flex items-center gap-3 p-2 rounded-lg ${p.colorClasses.bg}`}>
              <p.icon className={`w-5 h-5 ${p.colorClasses.icon}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{p.label}</p>
                <p className="text-xs text-slate-500">{p.description}</p>
              </div>
              <span className={`text-xs font-medium ${p.colorClasses.icon} bg-white/80 px-2 py-0.5 rounded`}>20%</span>
            </div>
          ))}
        </div>

        {/* Upgrade CTA */}
        <button
          onClick={onUpgradeClick}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
        >
          <Lock className="w-4 h-4" />
          Unlock All Perspectives
        </button>
        <p className="text-xs text-slate-500 text-center mt-2">
          Customize weights • 6 analysis styles • Expert review
        </p>
      </div>
    )
  }

  // Premium user: compact mode
  if (compact) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-900 text-sm">Your Analysis Style</span>
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-600 hover:text-slate-700 font-medium"
          >
            {showAdvanced ? 'Simple' : 'Customize'}
          </button>
        </div>

        {!showAdvanced ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key as keyof typeof PRESETS)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentPreset === key
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {PERSPECTIVES.map((p) => (
              <PerspectiveSlider
                key={p.key}
                icon={p.icon}
                label={p.label}
                description={p.description}
                colorClasses={p.colorClasses}
                value={weights[p.key]}
                onChange={(v) => onChange({ ...weights, [p.key]: v })}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full size premium version
  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-slate-500" />
            Tune Your Analysis
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">How should the 5 AI perspectives be weighted?</p>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => applyPreset(key as keyof typeof PRESETS)}
            className={`group relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              currentPreset === key
                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            {preset.label}
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {preset.description}
            </span>
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {PERSPECTIVES.map((p) => (
          <PerspectiveSlider
            key={p.key}
            icon={p.icon}
            label={p.label}
            description={p.description}
            colorClasses={p.colorClasses}
            value={weights[p.key]}
            onChange={(v) => onChange({ ...weights, [p.key]: v })}
          />
        ))}
      </div>

      {/* Visual Preview */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 mb-3">Analysis emphasis:</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
          {PERSPECTIVES.map((p) => (
            <div
              key={p.key}
              className="transition-all duration-300"
              style={{
                width: `${(weights[p.key] / totalWeight) * 100}%`,
                backgroundColor: p.colorClasses.fill
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Guidelines</span>
          <span>Aggressive</span>
          <span>Precision</span>
          <span>Conservative</span>
          <span>Integrative</span>
        </div>
      </div>
    </div>
  )
}

// Individual slider component
function PerspectiveSlider({
  icon: Icon,
  label,
  description,
  colorClasses,
  value,
  onChange
}: {
  icon: typeof Shield
  label: string
  description: string
  colorClasses: { bg: string; icon: string; fill: string }
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${colorClasses.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <span className="text-sm font-semibold text-slate-700">{value}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${colorClasses.fill} 0%, ${colorClasses.fill} ${value}%, #E2E8F0 ${value}%, #E2E8F0 100%)`
          }}
        />
        <p className="text-xs text-slate-400 mt-0.5 truncate">{description}</p>
      </div>
    </div>
  )
}
