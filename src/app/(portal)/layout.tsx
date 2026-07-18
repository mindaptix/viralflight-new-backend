import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './portal.css'

export const metadata: Metadata = {
  title: 'Super Admin | Viral Flight',
  description: 'Viral Flight onboarding and operations dashboard',
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
