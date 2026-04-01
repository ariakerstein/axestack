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
  description: 'Navigate your diagnosis with clarity. Free AI tools for cancer patients and caregivers. Built by a cancer survivor.',
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
