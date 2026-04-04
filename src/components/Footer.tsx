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
              <img
                src="/logo-black.svg"
                alt="opencancer.ai"
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-slate-500 mt-2">
              AI-powered tools for cancer patients and caregivers.
            </p>
            <Link href="/about" className="inline-block mt-2 text-base font-medium text-slate-700 hover:text-slate-600 transition-colors">
              Built by a cancer survivor →
            </Link>
          </div>

          {/* Tools */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-2">Tools</h3>
            <ul className="space-y-0 text-sm">
              <li><Link href="/records" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center">Records Vault</Link></li>
              <li><Link href="/ask" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center">Ask Navis</Link></li>
              <li><Link href="/trials" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center">Clinical Trials</Link></li>
              <li><Link href="/cancer-checklist" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center">Cancer Checklist</Link></li>
              <li><Link href="/oncologists" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center">Find Oncologists</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-2">Community</h3>
            <ul className="space-y-0 text-sm">
              <li>
                <a href="https://cancerhackerlab.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center gap-1">
                  Cancer Hacker Lab <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://community.cancerpatientlab.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center gap-1">
                  Discussion Forum <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li><Link href="/about" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center">About</Link></li>
              <li><Link href="/privacy" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center">Privacy & Terms</Link></li>
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-2">Open Source</h3>
            <ul className="space-y-0 text-sm">
              <li>
                <a href="https://github.com/ariakerstein/opencancer-skills" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center gap-1">
                  GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://axestack.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-600 transition-colors py-2 min-h-[44px] flex items-center gap-1">
                  Axestack <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-2">
              Contribute code, suggest features, or fork it for your own community. PRs welcome.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} opencancer.ai. An{' '}
            <a href="https://axestack.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-600">
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
