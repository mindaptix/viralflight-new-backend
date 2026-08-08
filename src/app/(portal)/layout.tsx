import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './portal.css'

export const metadata: Metadata = {
  title: 'Viral Flight · Company CRM',
  description: 'Viral Flight company workspace for influencers, agencies and AI search',
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
