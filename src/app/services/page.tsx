'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ExternalLink, Star, X, Building2, Heart, DollarSign, FlaskConical, Stethoscope, Users, Truck, Shield, Filter } from 'lucide-react'

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
}

// Category configuration with icons and colors
const CATEGORIES = [
  { id: 'Testing', label: 'Testing & Diagnostics', icon: FlaskConical, color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { id: 'Support & Advocacy', label: 'Support & Advocacy', icon: Heart, color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  { id: 'Financial Support', label: 'Financial Support', icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'Clinical Trials', label: 'Clinical Trials', icon: FlaskConical, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { id: 'Treatment Options', label: 'Treatment Options', icon: Stethoscope, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { id: 'Diagnostics', label: 'Diagnostics', icon: Search, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'Support', label: 'Support Services', icon: Users, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  { id: 'Logistics', label: 'Logistics & Transport', icon: Truck, color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  { id: 'Insurance', label: 'Insurance Help', icon: Shield, color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
]

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])

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
      // Extract unique categories
      const cats = [...new Set(data.map(s => s.category).filter(Boolean))] as string[]
      setAllCategories(cats.sort())
    }
    setLoading(false)
  }

  // Filter services based on search and category
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

  // Get category config or default
  const getCategoryConfig = (category: string | null) => {
    if (!category) return null
    return CATEGORIES.find(c => category.toLowerCase().includes(c.id.toLowerCase())) || {
      id: category,
      label: category,
      icon: Building2,
      color: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    }
  }

  const featuredServices = filteredServices.filter(s => s.featured)
  const regularServices = filteredServices.filter(s => !s.featured)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0a] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#C66B4A]/20 rounded-xl">
              <Building2 className="w-8 h-8 text-[#C66B4A]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Cancer Services Directory</h1>
              <p className="text-white/60">Discover {services.length} services across {allCategories.length} categories</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search services by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#C66B4A]/50 focus:border-[#C66B4A]/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60">Filter by category</span>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="ml-2 text-xs text-[#C66B4A] hover:underline flex items-center gap-1"
              >
                Clear filter <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(category => {
              const config = getCategoryConfig(category)
              const isSelected = selectedCategory === category
              const count = services.filter(s => s.category === category).length
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(isSelected ? null : category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#C66B4A] text-white border-[#C66B4A]'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {config && <config.icon className="w-4 h-4" />}
                  {category}
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-white/40'}`}>({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[#C66B4A] border-t-transparent rounded-full" />
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            {/* Results count */}
            <div className="mb-6 text-white/60">
              Showing {filteredServices.length} of {services.length} services
              {selectedCategory && <span> in <strong className="text-white">{selectedCategory}</strong></span>}
              {searchTerm && <span> matching "<strong className="text-white">{searchTerm}</strong>"</span>}
            </div>

            {/* Featured Services */}
            {featuredServices.length > 0 && !selectedCategory && !searchTerm && (
              <div className="mb-12">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  Featured Partners
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredServices.slice(0, 6).map(service => (
                    <ServiceCard key={service.id} service={service} featured />
                  ))}
                </div>
              </div>
            )}

            {/* All Services */}
            {filteredServices.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg">No services found matching your criteria</p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory(null) }}
                  className="mt-4 text-[#C66B4A] hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedCategory || searchTerm ? filteredServices : regularServices).map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ServiceCard({ service, featured }: { service: ServiceProvider; featured?: boolean }) {
  const tags = service.tags?.split(',').slice(0, 3).map(t => t.trim()).filter(Boolean) || []

  return (
    <div className={`bg-white/5 border rounded-xl p-5 hover:bg-white/[0.07] transition-all group ${
      featured ? 'border-amber-500/30 ring-1 ring-amber-500/20' : 'border-white/10'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white group-hover:text-[#C66B4A] transition-colors">
              {service.provider}
            </h3>
            {featured && (
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            )}
          </div>
          {service.category && (
            <span className="text-xs text-white/50 mt-1 block">{service.category}</span>
          )}
        </div>
        {service.logo_url && (
          <img
            src={service.logo_url}
            alt={service.provider}
            className="w-10 h-10 rounded-lg object-contain bg-white/10"
          />
        )}
      </div>

      {service.objective && (
        <p className="text-sm text-white/60 mb-3 line-clamp-2">{service.objective}</p>
      )}

      {service.Service && !service.objective && (
        <p className="text-sm text-white/60 mb-3 line-clamp-2">{service.Service}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {tags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-1 bg-white/5 text-white/50 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {service.Rating && (
        <div className="flex items-center gap-1 mb-3 text-amber-400">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm">{service.Rating}</span>
        </div>
      )}

      {service.url && (
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-[#C66B4A] hover:text-[#d87a59] transition-colors"
        >
          Visit website
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}
