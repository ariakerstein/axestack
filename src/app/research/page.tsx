'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Filter, ExternalLink, BookOpen, FlaskConical, GraduationCap, Newspaper } from 'lucide-react'
import { ShareButton } from '@/components/ShareButton'

interface ResearchResource {
  id: string
  title: string
  description: string
  source: string
  sourceUrl: string
  category: 'guidelines' | 'clinical' | 'education' | 'news'
  cancerType?: string
  date?: string
}

const RESEARCH_RESOURCES: ResearchResource[] = [
  {
    id: '1',
    title: 'NCCN Clinical Practice Guidelines',
    description: 'Evidence-based, consensus-driven guidelines for cancer treatment and supportive care.',
    source: 'National Comprehensive Cancer Network',
    sourceUrl: 'https://www.nccn.org/guidelines/guidelines-detail',
    category: 'guidelines',
  },
  {
    id: '2',
    title: 'Cancer.gov Treatment Information',
    description: 'Comprehensive treatment summaries for patients and healthcare professionals.',
    source: 'National Cancer Institute',
    sourceUrl: 'https://www.cancer.gov/types',
    category: 'education',
  },
  {
    id: '3',
    title: 'ClinicalTrials.gov',
    description: 'Database of privately and publicly funded clinical studies from around the world.',
    source: 'U.S. National Library of Medicine',
    sourceUrl: 'https://clinicaltrials.gov/',
    category: 'clinical',
  },
  {
    id: '4',
    title: 'American Cancer Society Guidelines',
    description: 'Screening, prevention, and treatment guidelines for various cancer types.',
    source: 'American Cancer Society',
    sourceUrl: 'https://www.cancer.org/cancer/screening/american-cancer-society-guidelines-for-the-early-detection-of-cancer.html',
    category: 'guidelines',
  },
  {
    id: '5',
    title: 'PubMed Cancer Research',
    description: 'Access millions of peer-reviewed cancer research articles and studies.',
    source: 'National Library of Medicine',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/?term=cancer',
    category: 'clinical',
  },
  {
    id: '6',
    title: 'Cancer Research UK',
    description: 'Latest cancer news, treatment breakthroughs, and research updates.',
    source: 'Cancer Research UK',
    sourceUrl: 'https://www.cancerresearchuk.org/about-cancer',
    category: 'news',
  },
  {
    id: '7',
    title: 'ASCO Guidelines',
    description: 'Clinical practice guidelines from the American Society of Clinical Oncology.',
    source: 'ASCO',
    sourceUrl: 'https://www.asco.org/practice-patients/guidelines',
    category: 'guidelines',
  },
  {
    id: '8',
    title: 'Memorial Sloan Kettering Patient Education',
    description: 'Patient-friendly explanations of cancer types, treatments, and side effects.',
    source: 'MSK Cancer Center',
    sourceUrl: 'https://www.mskcc.org/cancer-care/patient-education',
    category: 'education',
  },
  {
    id: '9',
    title: 'MD Anderson Cancer Center Resources',
    description: 'Expert information on prevention, diagnosis, treatment and survivorship.',
    source: 'MD Anderson',
    sourceUrl: 'https://www.mdanderson.org/patients-family.html',
    category: 'education',
  },
  {
    id: '10',
    title: 'OncoLink',
    description: 'Patient education resources developed by Penn Medicine oncology experts.',
    source: 'Penn Medicine',
    sourceUrl: 'https://www.oncolink.org/',
    category: 'education',
  },
]

const CATEGORIES = {
  all: 'All Resources',
  guidelines: 'Clinical Guidelines',
  clinical: 'Clinical Research',
  education: 'Patient Education',
  news: 'News & Updates',
}

export default function ResearchPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredResources = RESEARCH_RESOURCES.filter(resource => {
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
    const matchesSearch = !searchTerm ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.source.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'guidelines': return <BookOpen className="w-5 h-5 text-blue-600" />
      case 'clinical': return <FlaskConical className="w-5 h-5 text-purple-600" />
      case 'education': return <GraduationCap className="w-5 h-5 text-green-600" />
      case 'news': return <Newspaper className="w-5 h-5 text-amber-600" />
      default: return <BookOpen className="w-5 h-5 text-slate-600" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'guidelines': return 'bg-blue-100 text-blue-700 border border-blue-200'
      case 'clinical': return 'bg-purple-100 text-purple-700 border border-purple-200'
      case 'education': return 'bg-green-100 text-green-700 border border-green-200'
      case 'news': return 'bg-amber-100 text-amber-700 border border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
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
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">Research Library</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShareButton
              tool="research"
              title="Share Research Library"
              description="Help others find cancer resources"
              variant="icon"
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📚</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Research Library</h1>
          <p className="text-slate-600">
            Curated resources from leading cancer research institutions and organizations.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            These resources are for educational purposes only. Always discuss treatment decisions with your oncology team.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-800">Filter Resources</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-11 bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm text-slate-900 placeholder:text-slate-500"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm text-slate-900"
            >
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-600 mb-4">
          Found <strong>{filteredResources.length}</strong> resources
        </p>

        {/* Resources grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Resources Found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredResources.map((resource) => (
              <a
                key={resource.id}
                href={resource.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(resource.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors">
                        {resource.title}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCategoryColor(resource.category)}`}>
                        {CATEGORIES[resource.category as keyof typeof CATEGORIES]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                    <p className="text-xs text-slate-500">Source: {resource.source}</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Have questions about your diagnosis?</p>
          <Link
            href="/ask"
            className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Ask Our AI Assistant →
          </Link>
        </div>
      </div>
    </main>
  )
}
