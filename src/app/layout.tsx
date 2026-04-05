import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { Providers } from '@/components/Providers'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { Footer } from '@/components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'opencancer.ai | AI-powered tools for cancer patients',
  description: 'Navigate your diagnosis with clarity. AI tools for cancer patients and caregivers. Built by a cancer survivor.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'opencancer.ai | AI-powered tools for cancer patients',
    description: 'Navigate your diagnosis with clarity. AI tools for cancer patients and caregivers. Built by a cancer survivor.',
    url: 'https://opencancer.ai',
    siteName: 'opencancer.ai',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'opencancer.ai - AI tools for cancer patients & caregivers',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'opencancer.ai | AI-powered tools for cancer patients',
    description: 'Navigate your diagnosis with clarity. AI tools for cancer patients and caregivers.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Providers>
          <AnalyticsProvider>
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AnalyticsProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
