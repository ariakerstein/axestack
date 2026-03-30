'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CANCER_TYPES } from '@/lib/cancer-data'

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
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cancerType, setCancerType] = useState('')
  const [cancerSearch, setCancerSearch] = useState('')
  const [stage, setStage] = useState('')
  const [location, setLocation] = useState('')
  const [saved, setSaved] = useState(false)

  // Filter cancer types based on search
  const filteredCancerTypes = useMemo(() => {
    const search = cancerSearch.toLowerCase()
    return Object.entries(CANCER_TYPES).filter(([key, label]) =>
      label.toLowerCase().includes(search) || key.toLowerCase().includes(search)
    )
  }, [cancerSearch])

  useEffect(() => {
    const saved = localStorage.getItem('patient-profile')
    if (saved) {
      const p = JSON.parse(saved)
      setProfile(p)
      setRole(p.role || 'patient')
      setName(p.name || '')
      setEmail(p.email || '')
      setCancerType(p.cancerType || '')
      setStage(p.stage || '')
      setLocation(p.location || '')
    }
  }, [])

  const handleSave = () => {
    const newProfile: PatientProfile = {
      role,
      name,
      email,
      cancerType,
      stage: stage || undefined,
      location: location || undefined,
      createdAt: profile?.createdAt || new Date().toISOString(),
    }
    localStorage.setItem('patient-profile', JSON.stringify(newProfile))
    setProfile(newProfile)
    setSaved(true)

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
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1">
            ← Home
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">Profile</span>
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Info */}
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-violet-800">
            Your profile helps personalize tools like Clinical Trials, Ask AI, and Records Translator.
            <strong className="block mt-1">Data stays on your device. We never share your information without your consent.</strong>
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              I am a...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  role === 'patient'
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <span className="text-2xl">🎗️</span>
                <span className="font-medium">Patient</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  role === 'caregiver'
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <span className="text-2xl">💜</span>
                <span className="font-medium">Caregiver</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {role === 'caregiver' ? "Patient's Name" : 'Name'} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'caregiver' ? "Patient's name" : 'Your name'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${
                email && !isValidEmail(email) ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            <p className="text-xs text-slate-500 mt-1">For personalized recommendations</p>
          </div>

          {/* Cancer Type Grid with Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cancer Type *
            </label>
            <div className="relative mb-3">
              <input
                type="text"
                value={cancerSearch}
                onChange={(e) => setCancerSearch(e.target.value)}
                placeholder="Search cancer types..."
                className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
              {filteredCancerTypes.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCancerType(key)
                    setCancerSearch('')
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    cancerType === key
                      ? 'bg-violet-500 text-white font-medium'
                      : 'bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200'
                  }`}
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
            {cancerType && (
              <p className="text-sm text-violet-600 mt-2 flex items-center gap-1">
                <span>✓</span> Selected: <strong>{CANCER_TYPES[cancerType]}</strong>
              </p>
            )}
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Stage (optional)
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
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

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State or ZIP"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
            <p className="text-xs text-slate-500 mt-1">For finding nearby trials and specialists</p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              canSave
                ? 'bg-violet-600 text-white hover:bg-violet-700'
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

          {/* Clear */}
          {profile && (
            <button
              onClick={handleClear}
              className="w-full py-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              Clear profile data
            </button>
          )}
        </div>

        {/* Current Profile */}
        {profile && (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700">Current Profile</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                profile.role === 'caregiver'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {profile.role === 'caregiver' ? '💜 Caregiver' : '🎗️ Patient'}
              </span>
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
    </main>
  )
}
