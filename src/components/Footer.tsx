'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Code, Users, Microscope, Heart, ExternalLink } from 'lucide-react'

export function Footer() {
  const pathname = usePathname()

  // Hide footer on pages with fixed input bars (chat interfaces)
  const hideFooterRoutes = ['/ask']
  if (hideFooterRoutes.includes(pathname)) {
    return null
  }

  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main footer grid */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block">
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">
                opencancer.ai
              </span>
            </Link>
            <p className="text-sm text-slate-500 mt-2">
              AI-powered tools for cancer patients and caregivers. Built by a cancer survivor.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Tools</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/records" className="text-slate-600 hover:text-violet-600 transition-colors">Records Vault</Link></li>
              <li><Link href="/ask" className="text-slate-600 hover:text-violet-600 transition-colors">Ask Navis</Link></li>
              <li><Link href="/trials" className="text-slate-600 hover:text-violet-600 transition-colors">Clinical Trials</Link></li>
              <li><Link href="/cancer-checklist" className="text-slate-600 hover:text-violet-600 transition-colors">Cancer Checklist</Link></li>
              <li><Link href="/oncologists" className="text-slate-600 hover:text-violet-600 transition-colors">Find Oncologists</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://cancerhackerlab.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-violet-600 transition-colors inline-flex items-center gap-1">
                  Cancer Hacker Lab <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://community.cancerpatientlab.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-violet-600 transition-colors inline-flex items-center gap-1">
                  Discussion Forum <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li><Link href="/about" className="text-slate-600 hover:text-violet-600 transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Open Source</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://github.com/ariakerstein/opencancer-skills" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-violet-600 transition-colors inline-flex items-center gap-1">
                  GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://axestack.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-violet-600 transition-colors inline-flex items-center gap-1">
                  Axestack <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              Contribute code, suggest features, or fork it for your own community. PRs welcome.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} opencancer.ai. An{' '}
            <a href="https://axestack.com" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-600">
              Axestack
            </a>{' '}
            product.
          </p>
          <p className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-pink-500" />
            Built with love by people who genuinely give a damn. Not medical advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
