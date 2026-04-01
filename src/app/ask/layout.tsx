'use client'

import { ReactNode } from 'react'

// Chat interface layout - no footer (fixed input bar at bottom)
export default function AskLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
