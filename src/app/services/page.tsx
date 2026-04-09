'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ExternalLink, Star, X, Building2, Heart, DollarSign, FlaskConical, Stethoscope, Users, Truck, Shield, Filter, ChevronRight, Globe, Phone, Mail } from 'lucide-react'

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

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<ServiceProvider | null>(null)

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
          <p className="text-xs text-slate-300">Fetching from database</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1">
            ← Home
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">Services Directory</span>
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏥</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Cancer Services Directory</h1>
          <p className="text-slate-600 mb-2">
            Discover {services.length} services across {allCategories.length} categories
          </p>
        </div>

        {/* Trust Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Vetted resources for your journey</h3>
              <p className="text-sm text-slate-600">
                From testing and clinical trials to financial assistance and support groups—find services that can help you navigate cancer.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search services by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">Filter by category</span>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="ml-2 text-xs text-orange-600 hover:underline flex items-center gap-1"
              >
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
          Found <strong>{filteredServices.length}</strong> services
          {selectedCategory && <span> in <strong>{selectedCategory}</strong></span>}
          {searchTerm && <span> matching "<strong>{searchTerm}</strong>"</span>}
        </p>

        {/* Services list */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Services Found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search term.</p>
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
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="w-full text-left border border-slate-200 rounded-lg p-4 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {service.logo_url ? (
                      <img
                        src={service.logo_url}
                        alt={service.provider}
                        className="w-10 h-10 object-contain rounded bg-slate-50"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                          {service.provider}
                        </h3>
                        {service.featured && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      {service.objective && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">{service.objective}</p>
                      )}
                      {!service.objective && service.Service && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">{service.Service}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {service.category && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{service.category}</span>
                        )}
                        {service.coverage_info?.accepts_insurance && (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Accepts Insurance</span>
                        )}
                        {service.coverage_info?.financial_assistance_available && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Financial Aid</span>
                        )}
                        {service.Rating && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="w-3 h-3 fill-current" />
                            {service.Rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 pt-8 border-t border-slate-200 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Need personalized guidance?</h3>
            <p className="text-slate-600 text-sm mb-4">
              Get expert advice on your specific situation from Cancer Commons.
            </p>
            <Link
              href="/expert-review"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Get Expert Review →
            </Link>
          </div>
        </div>
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedService(null)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {selectedService.logo_url ? (
                  <img
                    src={selectedService.logo_url}
                    alt={selectedService.provider}
                    className="w-12 h-12 object-contain rounded bg-slate-50"
                  />
                ) : (
                  <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">{selectedService.provider}</h2>
                    {selectedService.featured && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    )}
                  </div>
                  {selectedService.category && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{selectedService.category}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              {(selectedService.objective || selectedService.Service) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">About this service</h3>
                  <p className="text-slate-600">{selectedService.objective || selectedService.Service}</p>
                </div>
              )}

              {/* Tags */}
              {selectedService.tags && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Services offered</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedService.tags.split(',').map((tag, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Coverage Info */}
              {selectedService.coverage_info && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedService.coverage_info.accepts_insurance && (
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <Shield className="w-4 h-4" />
                        <span className="text-xs font-medium">Insurance</span>
                      </div>
                      <p className="text-emerald-800 font-medium text-sm">Accepts Insurance</p>
                    </div>
                  )}
                  {selectedService.coverage_info.financial_assistance_available && (
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

              {/* Cancer Types */}
              {selectedService.cancer_types && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Cancer types served</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedService.cancer_types.split(',').map((type, i) => (
                      <span key={i} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                        {type.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating */}
              {selectedService.Rating && (
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="text-lg font-semibold text-slate-900">{selectedService.Rating}</span>
                  <span className="text-slate-500">rating</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                {selectedService.url ? (
                  <a
                    href={selectedService.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Website
                  </a>
                ) : (
                  <div className="flex-1 text-center bg-slate-200 text-slate-500 font-medium px-4 py-2.5 rounded-lg text-sm">
                    No website available
                  </div>
                )}
                <button
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
