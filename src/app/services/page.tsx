'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { CANCER_TYPES } from '@/lib/cancer-data'
import { Search, Star, X, Building2, Heart, DollarSign, Shield, Filter, ChevronRight, Globe, Upload, Sparkles, CheckCircle, MessageSquare } from 'lucide-react'
import { ExpandedAccessCard } from '@/components/ExpandedAccessCard'

interface ServiceProvider {
  id: number
  provider: string
  category: string | null
  objective: string | null
  Service: string | null
  url: string | null
  tags: string | null
  Rating: string | null
  logo_url: string | null
  cancer_types: string | null
  domain: string | null
  featured: boolean
  coverage_info?: {
    accepts_insurance?: boolean
    financial_assistance_available?: boolean
  } | null
}

// Why these services matter by cancer type
const WHY_SERVICES_MATTER: Record<string, { headline: string; categories: string[] }> = {
  breast: {
    headline: "Services matched for your breast cancer journey",
    categories: ['Testing', 'Support & Advocacy', 'Financial Support', 'Clinical Trials']
  },
  lung: {
    headline: "Resources for lung cancer patients",
    categories: ['Testing', 'Clinical Trials', 'Treatment Options', 'Support & Advocacy']
  },
  colorectal: {
    headline: "Support for your colorectal cancer journey",
    categories: ['Testing', 'Support & Advocacy', 'Clinical Trials', 'Diagnostics']
  },
  prostate: {
    headline: "Resources for prostate cancer patients",
    categories: ['Testing', 'Support & Advocacy', 'Treatment Options', 'Clinical Trials']
  },
  melanoma: {
    headline: "Services for melanoma patients",
    categories: ['Testing', 'Clinical Trials', 'Treatment Options', 'Support & Advocacy']
  },
  pancreatic: {
    headline: "Critical resources for pancreatic cancer",
    categories: ['Clinical Trials', 'Testing', 'Support & Advocacy', 'Financial Support']
  },
  default: {
    headline: "Services matched to your cancer type",
    categories: ['Testing', 'Support & Advocacy', 'Clinical Trials', 'Financial Support']
  }
}

export default function ServicesPage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [services, setServices] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [naturalQuery, setNaturalQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<ServiceProvider | null>(null)
  const [profile, setProfile] = useState<{ cancerType: string; stage?: string } | null>(null)

  // Load profile
  useEffect(() => {
    if (authLoading) return
    if (user && authProfile) {
      setProfile({
        cancerType: authProfile.cancer_type,
        stage: authProfile.stage || undefined,
      })
    } else {
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        const p = JSON.parse(saved)
        setProfile(p)
      }
    }
  }, [user, authProfile, authLoading])

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('serviceProviders')
      .select('*')
      .order('featured', { ascending: false })
      .order('provider', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
    } else if (data) {
      setServices(data)
      const cats = [...new Set(data.map(s => s.category).filter(Boolean))] as string[]
      setAllCategories(cats.sort())
    }
    setLoading(false)
  }

  // Get recommended services based on profile
  const recommendedServices = useMemo(() => {
    if (!profile?.cancerType) return []

    const config = WHY_SERVICES_MATTER[profile.cancerType] || WHY_SERVICES_MATTER.default

    return services.filter(s => {
      // Match by cancer type in service
      const matchesCancerType = s.cancer_types?.toLowerCase().includes(profile.cancerType.toLowerCase())
      // Or match by recommended categories
      const matchesCategory = config.categories.some(cat =>
        s.category?.toLowerCase().includes(cat.toLowerCase())
      )
      return matchesCancerType || matchesCategory
    }).slice(0, 6)
  }, [services, profile])

  // Featured services (non-recommended)
  const featuredServices = useMemo(() => {
    const recommendedIds = new Set(recommendedServices.map(s => s.id))
    return services.filter(s => s.featured && !recommendedIds.has(s.id)).slice(0, 6)
  }, [services, recommendedServices])

  // Natural language search
  const handleNaturalSearch = () => {
    if (!naturalQuery.trim()) return
    setSearchTerm(naturalQuery)
    setNaturalQuery('')
  }

  // Filter services
  const filteredServices = useMemo(() => {
    let result = [...services]

    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(s =>
        s.provider?.toLowerCase().includes(lower) ||
        s.objective?.toLowerCase().includes(lower) ||
        s.Service?.toLowerCase().includes(lower) ||
        s.tags?.toLowerCase().includes(lower) ||
        s.category?.toLowerCase().includes(lower)
      )
    }

    if (selectedCategory) {
      result = result.filter(s => s.category === selectedCategory)
    }

    return result
  }, [services, searchTerm, selectedCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-slate-400 mb-2">Loading services...</div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm">← Home</Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">opencancer.ai</span>
            <span className="text-slate-400">/</span>
            <span className="font-medium text-slate-700">Services</span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏥</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Cancer Services Directory</h1>
          <p className="text-slate-600">
            {services.length} services across {allCategories.length} categories
          </p>
        </div>

        {/* RECOMMENDED FOR YOU - if profile exists */}
        {profile?.cancerType && recommendedServices.length > 0 && (
          <div className="mb-10">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">
                    Recommended for Your {CANCER_TYPES[profile.cancerType] || profile.cancerType}
                    {profile.stage && <span className="font-normal text-slate-600"> • Stage {profile.stage}</span>}
                  </h2>
                  <p className="text-sm text-slate-700 mb-3">
                    {(WHY_SERVICES_MATTER[profile.cancerType] || WHY_SERVICES_MATTER.default).headline}
                  </p>
                  <ul className="space-y-1">
                    {(WHY_SERVICES_MATTER[profile.cancerType] || WHY_SERVICES_MATTER.default).categories.slice(0, 3).map((cat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>{cat} services available</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-emerald-200">
                    <Link href="/profile" className="text-xs text-emerald-700 hover:text-emerald-800 font-medium">
                      Update my profile →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended services grid */}
            <div className="grid md:grid-cols-2 gap-3">
              {recommendedServices.map((service) => (
                <ServiceCard key={service.id} service={service} onClick={() => setSelectedService(service)} recommended />
              ))}
            </div>
          </div>
        )}

        {/* NO PROFILE - Show upload prompt + natural language search */}
        {!profile?.cancerType && (
          <div className="mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">Get personalized recommendations</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Tell us about your cancer to see services matched to your specific situation.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/records"
                      className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Records
                    </Link>
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      Set My Cancer Type
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Natural language search */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">What are you looking for?</h3>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Describe what you need in plain English
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., financial help for chemo, support groups for caregivers..."
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNaturalSearch()}
                  className="flex-1 px-4 py-2.5 bg-white text-slate-900 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm"
                />
                <button
                  onClick={handleNaturalSearch}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FEATURED PARTNERS */}
        {featuredServices.length > 0 && !searchTerm && !selectedCategory && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h2 className="text-xl font-bold text-slate-900">Featured Partners</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {featuredServices.map((service) => (
                <ServiceCard key={service.id} service={service} onClick={() => setSelectedService(service)} featured />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">Filter by category</span>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} className="ml-2 text-xs text-orange-600 hover:underline flex items-center gap-1">
                Clear <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(category => {
              const isSelected = selectedCategory === category
              const count = services.filter(s => s.category === category).length
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(isSelected ? null : category)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {category} <span className={`text-xs ${isSelected ? 'text-orange-100' : 'text-slate-400'}`}>({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-600 mb-4">
          {searchTerm || selectedCategory ? (
            <>Found <strong>{filteredServices.length}</strong> services
            {selectedCategory && <span> in <strong>{selectedCategory}</strong></span>}
            {searchTerm && <span> matching "<strong>{searchTerm}</strong>"</span>}
            </>
          ) : (
            <>Browse all <strong>{services.length}</strong> services</>
          )}
        </p>

        {/* All Services list */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Services Found</h3>
            <p className="text-slate-500 text-sm">Try different search terms or filters.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory(null) }}
              className="mt-4 text-orange-600 hover:underline text-sm"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} onClick={() => setSelectedService(service)} />
            ))}
          </div>
        )}

        {/* Expanded Access Card */}
        <div className="mt-10">
          <ExpandedAccessCard variant="compact" context="services_page" />
        </div>

        {/* CTA */}
        <div className="mt-8 pt-8 border-t border-slate-200 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Need personalized guidance?</h3>
          <p className="text-slate-600 text-sm mb-4">Get expert advice from Cancer Commons.</p>
          <Link href="/expert-review" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors">
            Get Expert Review →
          </Link>
        </div>
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <ServiceModal service={selectedService} onClose={() => setSelectedService(null)} />
      )}
    </main>
  )
}

// Service Card Component
function ServiceCard({ service, onClick, recommended, featured }: {
  service: ServiceProvider
  onClick: () => void
  recommended?: boolean
  featured?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-lg p-4 hover:shadow-sm transition-all cursor-pointer group ${
        recommended ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300' :
        featured ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300' :
        'border-slate-200 hover:border-orange-300'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {service.logo_url ? (
            <img src={service.logo_url} alt={service.provider} className="w-10 h-10 object-contain rounded bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">{service.provider}</h3>
              {recommended && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Recommended</span>}
              {featured && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
            </div>
            {(service.objective || service.Service) && (
              <p className="text-sm text-slate-600 line-clamp-2 mb-2">{service.objective || service.Service}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {service.category && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{service.category}</span>}
              {service.coverage_info?.accepts_insurance && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Insurance</span>}
              {service.coverage_info?.financial_assistance_available && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Financial Aid</span>}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
      </div>
    </button>
  )
}

// Service Modal Component
function ServiceModal({ service, onClose }: { service: ServiceProvider; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {service.logo_url ? (
              <img src={service.logo_url} alt={service.provider} className="w-12 h-12 object-contain rounded bg-slate-50" />
            ) : (
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                <Building2 className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-900">{service.provider}</h2>
                {service.featured && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </div>
              {service.category && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{service.category}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {(service.objective || service.Service) && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">About</h3>
              <p className="text-slate-600">{service.objective || service.Service}</p>
            </div>
          )}

          {service.tags && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Services offered</h3>
              <div className="flex flex-wrap gap-2">
                {service.tags.split(',').map((tag, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">{tag.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {service.coverage_info && (
            <div className="grid grid-cols-2 gap-4">
              {service.coverage_info.accepts_insurance && (
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-medium">Insurance</span>
                  </div>
                  <p className="text-emerald-800 font-medium text-sm">Accepted</p>
                </div>
              )}
              {service.coverage_info.financial_assistance_available && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Financial Aid</span>
                  </div>
                  <p className="text-blue-800 font-medium text-sm">Available</p>
                </div>
              )}
            </div>
          )}

          {service.cancer_types && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Cancer types</h3>
              <div className="flex flex-wrap gap-2">
                {service.cancer_types.split(',').map((type, i) => (
                  <span key={i} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">{type.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {service.Rating && (
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-lg font-semibold text-slate-900">{service.Rating}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            {service.url ? (
              <a href={service.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                <Globe className="w-4 h-4" />
                Visit Website
              </a>
            ) : (
              <div className="flex-1 text-center bg-slate-200 text-slate-500 font-medium px-4 py-2.5 rounded-lg text-sm">No website</div>
            )}
            <button onClick={onClose} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 text-sm">Close</button>
          </div>
        </div>
      </div>
    </>
  )
}
