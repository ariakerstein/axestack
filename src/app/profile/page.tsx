'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CANCER_TYPES } from '@/lib/cancer-data'
import { useAnalytics } from '@/hooks/useAnalytics'
import { saveProfile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { Navbar } from '@/components/Navbar'
import { User, Heart, Ribbon, ToggleLeft, ToggleRight } from 'lucide-react'

interface PatientProfile {
  role: 'patient' | 'caregiver'
  name: string
  email: string
  cancerType: string
  stage?: string
  location?: string
  createdAt?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile: authProfile, refreshProfile, signOut, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cancerType, setCancerType] = useState('')
  const [cancerSearch, setCancerSearch] = useState('')
  const [stage, setStage] = useState('')
  const [location, setLocation] = useState('')
  const [saved, setSaved] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const { trackEvent } = useAnalytics()

  // Filter cancer types based on search
  const filteredCancerTypes = useMemo(() => {
    const search = cancerSearch.toLowerCase()
    return Object.entries(CANCER_TYPES).filter(([key, label]) =>
      label.toLowerCase().includes(search) || key.toLowerCase().includes(search)
    )
  }, [cancerSearch])

  useEffect(() => {
    // If user is logged in and has a Supabase profile, use that
    if (user && authProfile) {
      setProfile({
        role: authProfile.role,
        name: authProfile.name,
        email: authProfile.email,
        cancerType: authProfile.cancer_type,
        stage: authProfile.stage || undefined,
        location: authProfile.location || undefined,
        createdAt: authProfile.created_at,
      })
      setRole(authProfile.role || 'patient')
      setName(authProfile.name || '')
      setEmail(authProfile.email || user.email || '')
      setCancerType(authProfile.cancer_type || '')
      setStage(authProfile.stage || '')
      setLocation(authProfile.location || '')
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        const p = JSON.parse(saved)
        setProfile(p)
        setRole(p.role || 'patient')
        setName(p.name || '')
        setEmail(p.email || (user?.email || ''))
        setCancerType(p.cancerType || '')
        setStage(p.stage || '')
        setLocation(p.location || '')
      } else if (user?.email) {
        // Pre-fill email for logged in user without profile
        setEmail(user.email)
      }
    }
  }, [user, authProfile])

  const handleSave = async () => {
    const newProfile: PatientProfile = {
      role,
      name,
      email,
      cancerType,
      stage: stage || undefined,
      location: location || undefined,
      createdAt: profile?.createdAt || new Date().toISOString(),
    }

    // Save to localStorage for offline access
    localStorage.setItem('patient-profile', JSON.stringify(newProfile))
    setProfile(newProfile)
    setSaved(true)

    // Save to Supabase
    await saveProfile({
      email,
      name,
      role,
      cancerType,
      stage: stage || undefined,
      location: location || undefined,
    })

    // Refresh auth context profile
    if (user) {
      await refreshProfile()
    }

    // Track profile creation/update
    const isNewProfile = !profile?.createdAt
    trackEvent(isNewProfile ? 'profile_created' : 'profile_updated', {
      role,
      cancer_type: cancerType,
      has_stage: !!stage,
      has_location: !!location,
    })

    // Redirect to home with success message
    setTimeout(() => {
      router.push('/?profile=saved')
    }, 500)
  }

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const canSave = name.trim() && cancerType && email && isValidEmail(email)

  const handleClear = () => {
    localStorage.removeItem('patient-profile')
    setProfile(null)
    setRole('patient')
    setName('')
    setEmail('')
    setCancerType('')
    setStage('')
    setLocation('')
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Page Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {profile ? 'Your Profile' : 'Create Your Profile'}
        </h1>

        {/* Info */}
        <div className={`border rounded-lg p-4 mb-6 ${user ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-sm ${user ? 'text-green-800' : 'text-slate-700'}`}>
            Your profile helps personalize tools like Clinical Trials, Ask Navis, and Records Translator.
            <strong className="block mt-1">
              {user
                ? 'Your data is encrypted and synced to your account.'
                : 'Data stays on your device. Sign in to sync across devices.'}
            </strong>
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Caregiver Mode Toggle - Prominent */}
          <div className={`rounded-xl p-4 border-2 transition-all ${
            role === 'caregiver'
              ? 'bg-stone-100 border-[#C66B4A]'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  role === 'caregiver' ? 'bg-[#C66B4A]/10' : 'bg-slate-200'
                }`}>
                  {role === 'caregiver' ? (
                    <Heart className="w-5 h-5 text-[#C66B4A]" />
                  ) : (
                    <Ribbon className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {role === 'caregiver' ? 'Caregiver Mode' : 'Patient Mode'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {role === 'caregiver'
                      ? 'Supporting someone with cancer'
                      : 'Managing my own diagnosis'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRole(role === 'caregiver' ? 'patient' : 'caregiver')}
                className="flex items-center gap-2 min-h-[44px] min-w-[44px]"
              >
                {role === 'caregiver' ? (
                  <ToggleRight className="w-10 h-10 text-[#C66B4A]" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-400" />
                )}
              </button>
            </div>

            {role === 'caregiver' && (
              <div className="mt-3 pt-3 border-t border-stone-200">
                <p className="text-xs text-[#C66B4A] font-medium mb-2">Caregiver features enabled:</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Tailored tools for understanding the diagnosis</li>
                  <li>• Appointment prep questions for caregivers</li>
                  <li>• CareCircle to coordinate with family</li>
                </ul>
              </div>
            )}
          </div>

          {/* Cancer Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cancer Type *
            </label>
              <div className="relative">
                <input
                  type="text"
                  value={cancerType ? (CANCER_TYPES[cancerType] || cancerType) : cancerSearch}
                  onChange={(e) => {
                    setCancerSearch(e.target.value)
                    if (cancerType) setCancerType('')
                  }}
                  onFocus={() => {
                    if (cancerType) {
                      setCancerSearch('')
                      setCancerType('')
                    }
                  }}
                  placeholder="Search or select..."
                  className={`w-full px-3 py-2.5 pl-9 bg-white text-slate-900 placeholder:text-slate-400 border rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm ${
                    cancerType ? 'border-slate-900 bg-slate-50' : 'border-slate-300'
                  }`}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {cancerType && (
                  <button
                    onClick={() => { setCancerType(''); setCancerSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
          </div>

          {/* Cancer Type Grid - Only show when searching or no selection */}
          {!cancerType && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {filteredCancerTypes.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCancerType(key)
                      setCancerSearch('')
                    }}
                    className="text-left px-3 py-2 rounded-lg text-sm transition-all bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
                  >
                    {label}
                  </button>
                ))}
                {filteredCancerTypes.length === 0 && (
                  <p className="col-span-full text-sm text-slate-500 text-center py-4">
                    No matching cancer types found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Name & Email Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {role === 'caregiver' ? "Patient's Name" : 'Name'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'caregiver' ? "Patient's name" : 'Your name'}
                className="w-full px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 border rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm ${
                  email && !isValidEmail(email) ? 'border-red-300' : 'border-slate-300'
                }`}
              />
            </div>
          </div>

          {/* Stage & Location Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Stage (optional)
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
              >
                <option value="">Select stage...</option>
                <option value="0">Stage 0 (In Situ)</option>
                <option value="I">Stage I</option>
                <option value="II">Stage II</option>
                <option value="III">Stage III</option>
                <option value="IV">Stage IV</option>
                <option value="unknown">Unknown / Not staged</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location (optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State or ZIP"
                className="w-full px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              canSave
                ? 'bg-[#C66B4A] text-white hover:bg-[#B35E40] shadow-lg shadow-[#C66B4A]/25'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saved ? '✓ Saved!' : 'Save Profile'}
          </button>
          {!canSave && (name || email || cancerType) && (
            <p className="text-xs text-slate-500 text-center">
              {!name.trim() ? 'Name is required' : !email ? 'Email is required' : !isValidEmail(email) ? 'Enter a valid email' : 'Select a cancer type'}
            </p>
          )}

          {/* Clear profile data */}
          {profile && (
            <button
              onClick={handleClear}
              className="w-full py-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              Clear profile data
            </button>
          )}

          {/* Sign out - separate action */}
          {user && (
            <button
              onClick={() => signOut()}
              className="w-full py-2 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Sign out of account
            </button>
          )}
        </div>

        {/* Current Profile */}
        {profile && (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700">Current Profile</h3>
              <div className="flex items-center gap-2">
                {user && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Synced
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${
                  profile.role === 'caregiver'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {profile.role === 'caregiver' ? '💜 Caregiver' : '🎗️ Patient'}
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              {profile.name && <p><strong>Name:</strong> {profile.name}</p>}
              {profile.email && <p><strong>Email:</strong> {profile.email}</p>}
              <p><strong>Cancer:</strong> {CANCER_TYPES[profile.cancerType as keyof typeof CANCER_TYPES] || profile.cancerType}</p>
              {profile.stage && <p><strong>Stage:</strong> {profile.stage}</p>}
              {profile.location && <p><strong>Location:</strong> {profile.location}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </main>
  )
}
