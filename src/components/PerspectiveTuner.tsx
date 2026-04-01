'use client'

import { useState } from 'react'
import { Shield, FlaskConical, Leaf, Sliders, Lock, Sparkles, Star } from 'lucide-react'

export interface PerspectiveWeights {
  guidelines: number  // 0-100
  research: number    // 0-100
  integrative: number // 0-100
}

// Preset configurations
const PRESETS = {
  balanced: { guidelines: 50, research: 50, integrative: 50, label: 'Balanced', description: 'All specialists contribute equally' },
  conservative: { guidelines: 80, research: 30, integrative: 20, label: 'By the Book', description: 'Focus on proven protocols' },
  cutting_edge: { guidelines: 30, research: 80, integrative: 40, label: 'Cutting Edge', description: 'Emphasize trials & precision medicine' },
  holistic: { guidelines: 40, research: 40, integrative: 80, label: 'Whole Person', description: 'Prioritize quality of life' },
  aggressive: { guidelines: 20, research: 90, integrative: 30, label: 'All Options', description: 'Maximum treatment exploration' },
}

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
    const { guidelines, research, integrative } = PRESETS[preset]
    onChange({ guidelines, research, integrative })
  }

  const getCurrentPreset = (): string | null => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (
        Math.abs(weights.guidelines - preset.guidelines) < 5 &&
        Math.abs(weights.research - preset.research) < 5 &&
        Math.abs(weights.integrative - preset.integrative) < 5
      ) {
        return key
      }
    }
    return null
  }

  const currentPreset = getCurrentPreset()

  // Free user: simplified view with upgrade prompt
  if (!isPremium) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-violet-500" />
              Analysis Style
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">3 tumor boards will analyze your case</p>
          </div>
        </div>

        {/* Current mode indicator */}
        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Balanced Analysis</p>
              <p className="text-sm text-white/80">All 3 specialist boards contribute equally</p>
            </div>
          </div>
        </div>

        {/* 3 boards preview */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50">
            <Shield className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Guidelines Board</p>
              <p className="text-xs text-slate-500">Medical, Radiation & Surgical Oncologists</p>
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">33%</span>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Cutting Edge Board</p>
              <p className="text-xs text-slate-500">Pathologist, Immunotherapy & Trials</p>
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">33%</span>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50">
            <Leaf className="w-5 h-5 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Whole Person Board</p>
              <p className="text-xs text-slate-500">Integrative, Nutrition & Palliative Care</p>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">33%</span>
          </div>
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
          Customize weights • Multiple analysis styles • Expert review
        </p>
      </div>
    )
  }

  // Premium user: full tuning access
  if (compact) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-500" />
            <span className="font-medium text-slate-900 text-sm">Your Analysis Style</span>
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium"
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
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <PerspectiveSlider
              icon={Shield}
              label="Guidelines Board"
              description="Medical, Radiation & Surgical Oncologists"
              color="blue"
              value={weights.guidelines}
              onChange={(v) => onChange({ ...weights, guidelines: v })}
            />
            <PerspectiveSlider
              icon={FlaskConical}
              label="Cutting Edge Board"
              description="Pathologist, Immunotherapy & Trial Specialist"
              color="purple"
              value={weights.research}
              onChange={(v) => onChange({ ...weights, research: v })}
            />
            <PerspectiveSlider
              icon={Leaf}
              label="Whole Person Board"
              description="Integrative, Nutrition & Palliative Care"
              color="emerald"
              value={weights.integrative}
              onChange={(v) => onChange({ ...weights, integrative: v })}
            />
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
            <Sliders className="w-5 h-5 text-violet-500" />
            Tune Your Analysis
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">How should the AI perspectives be weighted?</p>
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
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-violet-300 hover:shadow-md'
            }`}
          >
            {preset.label}
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {preset.description}
            </span>
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <PerspectiveSlider
          icon={Shield}
          label="Guidelines Board"
          description="Medical Oncologist • Radiation Oncologist • Surgical Oncologist"
          color="blue"
          value={weights.guidelines}
          onChange={(v) => onChange({ ...weights, guidelines: v })}
        />
        <PerspectiveSlider
          icon={FlaskConical}
          label="Cutting Edge Board"
          description="Molecular Pathologist • Immunotherapy Specialist • Trial Investigator"
          color="purple"
          value={weights.research}
          onChange={(v) => onChange({ ...weights, research: v })}
        />
        <PerspectiveSlider
          icon={Leaf}
          label="Whole Person Board"
          description="Integrative Oncologist • Oncology Nutritionist • Palliative Care"
          color="emerald"
          value={weights.integrative}
          onChange={(v) => onChange({ ...weights, integrative: v })}
        />
      </div>

      {/* Visual Preview */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 mb-3">Analysis emphasis:</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
          <div
            className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-300"
            style={{ width: `${(weights.guidelines / (weights.guidelines + weights.research + weights.integrative)) * 100}%` }}
          />
          <div
            className="bg-gradient-to-r from-purple-400 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${(weights.research / (weights.guidelines + weights.research + weights.integrative)) * 100}%` }}
          />
          <div
            className="bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
            style={{ width: `${(weights.integrative / (weights.guidelines + weights.research + weights.integrative)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Guidelines</span>
          <span>Research</span>
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
  color,
  value,
  onChange
}: {
  icon: typeof Shield
  label: string
  description: string
  color: 'blue' | 'purple' | 'emerald'
  value: number
  onChange: (value: number) => void
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      slider: 'accent-blue-500',
      fill: 'bg-blue-500',
    },
    purple: {
      bg: 'bg-purple-100',
      icon: 'text-purple-600',
      slider: 'accent-purple-500',
      fill: 'bg-purple-500',
    },
    emerald: {
      bg: 'bg-emerald-100',
      icon: 'text-emerald-600',
      slider: 'accent-emerald-500',
      fill: 'bg-emerald-500',
    },
  }

  const colors = colorClasses[color]

  return (
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${colors.icon}`} />
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
          className={`w-full h-2 rounded-full appearance-none cursor-pointer ${colors.slider}`}
          style={{
            background: `linear-gradient(to right, ${color === 'blue' ? '#3B82F6' : color === 'purple' ? '#A855F7' : '#10B981'} 0%, ${color === 'blue' ? '#3B82F6' : color === 'purple' ? '#A855F7' : '#10B981'} ${value}%, #E2E8F0 ${value}%, #E2E8F0 100%)`
          }}
        />
        <p className="text-xs text-slate-400 mt-0.5 truncate">{description}</p>
      </div>
    </div>
  )
}
