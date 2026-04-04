'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { CANCER_TYPES } from '@/lib/cancer-data'
import { Search, Filter, MapPin, Phone, ExternalLink, Star, Building2 } from 'lucide-react'
import { ShareButton } from '@/components/ShareButton'
import { useAuth } from '@/lib/auth'
import { useActivityLog } from '@/hooks/useActivityLog'
import { Navbar } from '@/components/Navbar'

interface CancerCenter {
  id: string
  name: string
  location: string
  region: string
  designation: 'NCI' | 'Academic' | 'Community'
  specialties: string[]
  website: string
  phone?: string
  ranking?: number
}

const TOP_CANCER_CENTERS: CancerCenter[] = [
  {
    id: '1',
    name: 'MD Anderson Cancer Center',
    location: 'Houston, TX',
    region: 'South',
    designation: 'NCI',
    specialties: ['All cancer types', 'Clinical trials', 'Rare cancers', 'Leukemia', 'Lymphoma'],
    website: 'https://www.mdanderson.org/',
    phone: '877-632-6789',
    ranking: 1,
  },
  {
    id: '2',
    name: 'Memorial Sloan Kettering Cancer Center',
    location: 'New York, NY',
    region: 'Northeast',
    designation: 'NCI',
    specialties: ['All cancer types', 'Immunotherapy', 'Precision medicine', 'Breast cancer', 'Prostate cancer'],
    website: 'https://www.mskcc.org/',
    phone: '212-639-2000',
    ranking: 2,
  },
  {
    id: '3',
    name: 'Mayo Clinic Cancer Center',
    location: 'Rochester, MN',
    region: 'Midwest',
    designation: 'NCI',
    specialties: ['All cancer types', 'Proton therapy', 'CAR-T', 'Pancreatic cancer', 'Brain tumors'],
    website: 'https://www.mayoclinic.org/departments-centers/mayo-clinic-cancer-center',
    phone: '507-538-3270',
    ranking: 3,
  },
  {
    id: '4',
    name: 'Dana-Farber Cancer Institute',
    location: 'Boston, MA',
    region: 'Northeast',
    designation: 'NCI',
    specialties: ['All cancer types', 'Pediatric oncology', 'Clinical trials', 'Breast cancer', 'Lung cancer'],
    website: 'https://www.dana-farber.org/',
    phone: '617-632-3000',
    ranking: 4,
  },
  {
    id: '5',
    name: 'Johns Hopkins Sidney Kimmel Cancer Center',
    location: 'Baltimore, MD',
    region: 'Northeast',
    designation: 'NCI',
    specialties: ['All cancer types', 'Brain tumors', 'Pancreatic cancer', 'Liver cancer', 'Sarcoma'],
    website: 'https://www.hopkinsmedicine.org/kimmel_cancer_center/',
    phone: '410-955-8964',
    ranking: 5,
  },
  {
    id: '6',
    name: 'UCSF Helen Diller Comprehensive Cancer Center',
    location: 'San Francisco, CA',
    region: 'West',
    designation: 'NCI',
    specialties: ['All cancer types', 'Brain tumors', 'Breast cancer', 'Immunotherapy', 'Prostate cancer'],
    website: 'https://cancer.ucsf.edu/',
    phone: '415-353-7070',
    ranking: 6,
  },
  {
    id: '7',
    name: 'Cleveland Clinic Cancer Center',
    location: 'Cleveland, OH',
    region: 'Midwest',
    designation: 'NCI',
    specialties: ['All cancer types', 'Robotic surgery', 'Bone marrow transplant', 'Lung cancer', 'Colorectal cancer'],
    website: 'https://my.clevelandclinic.org/departments/cancer',
    phone: '866-223-8100',
    ranking: 7,
  },
  {
    id: '8',
    name: 'UCLA Jonsson Comprehensive Cancer Center',
    location: 'Los Angeles, CA',
    region: 'West',
    designation: 'NCI',
    specialties: ['All cancer types', 'Immunotherapy', 'Genomic medicine', 'Kidney cancer', 'Melanoma'],
    website: 'https://cancer.ucla.edu/',
    phone: '310-825-5268',
    ranking: 8,
  },
  {
    id: '9',
    name: 'Stanford Cancer Institute',
    location: 'Palo Alto, CA',
    region: 'West',
    designation: 'NCI',
    specialties: ['All cancer types', 'CAR-T therapy', 'Proton therapy', 'Lymphoma', 'Leukemia'],
    website: 'https://cancer.stanford.edu/',
    phone: '877-668-7535',
    ranking: 9,
  },
  {
    id: '10',
    name: 'Fred Hutchinson Cancer Center',
    location: 'Seattle, WA',
    region: 'West',
    designation: 'NCI',
    specialties: ['All cancer types', 'Bone marrow transplant', 'Immunotherapy', 'Leukemia', 'Lymphoma'],
    website: 'https://www.fredhutch.org/',
    phone: '206-606-7222',
    ranking: 10,
  },
  {
    id: '11',
    name: 'Moffitt Cancer Center',
    location: 'Tampa, FL',
    region: 'South',
    designation: 'NCI',
    specialties: ['All cancer types', 'Lung cancer', 'Skin cancer', 'Blood cancers', 'Immunotherapy'],
    website: 'https://moffitt.org/',
    phone: '888-663-3488',
    ranking: 11,
  },
  {
    id: '12',
    name: 'City of Hope',
    location: 'Duarte, CA',
    region: 'West',
    designation: 'NCI',
    specialties: ['All cancer types', 'Bone marrow transplant', 'CAR-T', 'Breast cancer', 'Blood cancers'],
    website: 'https://www.cityofhope.org/',
    phone: '800-826-4673',
    ranking: 12,
  },
]

const REGIONS = ['All Regions', 'Northeast', 'South', 'Midwest', 'West']
const SPECIALTIES = ['All Specialties', 'Breast cancer', 'Lung cancer', 'Prostate cancer', 'Colorectal cancer', 'Leukemia', 'Lymphoma', 'Brain tumors', 'Pancreatic cancer', 'Melanoma', 'Immunotherapy', 'CAR-T', 'Clinical trials']


interface PatientProfile {
  cancerType: string
  location?: string
}

export default function OncologistsPage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('All Regions')
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties')
  const [showTopOnly, setShowTopOnly] = useState(false)

  const { logOncologistSearch, logActivity } = useActivityLog()

  // Load profile - prefer Supabase for authenticated users
  useEffect(() => {
    if (authLoading) return

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      setProfile({
        cancerType: authProfile.cancer_type,
        location: authProfile.location || undefined,
      })
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        const p = JSON.parse(saved)
        setProfile(p)
      }
    }
  }, [user, authProfile, authLoading])

  const filteredCenters = useMemo(() => {
    return TOP_CANCER_CENTERS.filter(center => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesSearch =
          center.name.toLowerCase().includes(term) ||
          center.location.toLowerCase().includes(term) ||
          center.specialties.some(s => s.toLowerCase().includes(term))
        if (!matchesSearch) return false
      }

      // Region filter
      if (selectedRegion !== 'All Regions' && center.region !== selectedRegion) {
        return false
      }

      // Specialty filter
      if (selectedSpecialty !== 'All Specialties') {
        const hasSpecialty = center.specialties.some(s =>
          s.toLowerCase().includes(selectedSpecialty.toLowerCase())
        )
        if (!hasSpecialty) return false
      }

      // Top 5 filter
      if (showTopOnly && center.ranking && center.ranking > 5) {
        return false
      }

      return true
    })
  }, [searchTerm, selectedRegion, selectedSpecialty, showTopOnly])

  const activeFilterCount = [
    selectedRegion !== 'All Regions',
    selectedSpecialty !== 'All Specialties',
    showTopOnly,
  ].filter(Boolean).length

  // Log search activity when filters change
  useEffect(() => {
    // Only log if there's some filter applied (not initial load)
    if (selectedRegion !== 'All Regions' || selectedSpecialty !== 'All Specialties' || searchTerm) {
      logOncologistSearch({
        specialty: selectedSpecialty !== 'All Specialties' ? selectedSpecialty : undefined,
        location: selectedRegion !== 'All Regions' ? selectedRegion : undefined,
        resultsCount: filteredCenters.length,
      })
    }
  }, [selectedRegion, selectedSpecialty, searchTerm, filteredCenters.length, logOncologistSearch])

  // Log when user clicks on a center
  const handleCenterClick = (center: CancerCenter) => {
    logActivity({
      activityType: 'oncologist_view',
      metadata: {
        centerId: center.id,
        centerName: center.name,
        location: center.location,
      },
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/40 to-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🩺</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Find an Oncologist</h1>
          <p className="text-slate-600">
            Connect with top cancer specialists and NCI-designated cancer centers.
          </p>
        </div>

        {/* Search & Filters Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search by name, location, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-11 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filters:</span>
            </div>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Specialty Filter */}
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            >
              {SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Top 5 Toggle */}
            <button
              onClick={() => setShowTopOnly(!showTopOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showTopOnly
                  ? 'bg-slate-100 text-slate-900 border border-slate-400'
                  : 'bg-white text-slate-600 border border-slate-300 hover:border-slate-400'
              }`}
            >
              <Star className="w-4 h-4" />
              Top 5 Only
            </button>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setSelectedRegion('All Regions')
                  setSelectedSpecialty('All Specialties')
                  setShowTopOnly(false)
                }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                Clear filters ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Profile context if available */}
          {profile?.cancerType && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Your profile: <span className="font-medium text-slate-900">{CANCER_TYPES[profile.cancerType] || profile.cancerType}</span>
                {profile.location && <span> • Near <span className="font-medium">{profile.location}</span></span>}
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {showTopOnly ? 'Top 5 ' : ''}NCI-Designated Cancer Centers
              <span className="font-normal text-slate-500 ml-2">({filteredCenters.length} results)</span>
            </h2>
          </div>

          <div className="space-y-3">
            {filteredCenters.map((center) => (
              <a
                key={center.id}
                href={center.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleCenterClick(center)}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {center.ranking && center.ranking <= 5 && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
                          <Star className="w-3 h-3" />
                          #{center.ranking}
                        </span>
                      )}
                      <h3 className="font-semibold text-slate-900 group-hover:text-[#C66B4A] transition-colors">
                        {center.name}
                      </h3>
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                        <Building2 className="w-3 h-3" />
                        NCI
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {center.location}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {center.specialties.filter(s => s !== 'All cancer types').slice(0, 4).map((specialty) => (
                        <span
                          key={specialty}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                    {center.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {center.phone}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-[#C66B4A] transition-colors flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>

          {filteredCenters.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Centers Found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search term.</p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 bg-slate-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Tips for Finding the Right Oncologist</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              Look for specialists in your specific cancer type
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              Check if they participate in clinical trials
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              Verify they accept your insurance
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              Consider travel time for frequent appointments
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              Getting a second opinion is always OK
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Preparing for your first appointment?</p>
          <Link
            href="/cancer-checklist"
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Get Your Appointment Checklist →
          </Link>
        </div>
      </div>
    </main>
  )
}
