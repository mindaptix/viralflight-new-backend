import Link from 'next/link'
import type { ReactNode } from 'react'

import { LogoutButton } from '../auth-controls'
import type { PortalUser } from '../lib/auth'

const navItems = [
  { href: '/', label: 'Overview', hint: 'Network pulse' },
  { href: '/agent', label: 'AI Agent', hint: 'Ask in plain English' },
  { href: '/influencers', label: 'Influencers', hint: 'Creator CRM' },
  { href: '/agencies', label: 'Agencies', hint: 'Partner directory' },
]

const titles: Record<string, { eyebrow: string; title: string }> = {
  overview: {
    eyebrow: 'Viral Flight',
    title: 'Operations overview',
  },
  agent: {
    eyebrow: 'Viral Flight AI',
    title: 'Company agent',
  },
  influencers: {
    eyebrow: 'Creator CRM',
    title: 'Influencers',
  },
  agencies: {
    eyebrow: 'Partner CRM',
    title: 'Agencies',
  },
}

export function Brand() {
  return (
    <Link className="brand-lockup" href="/">
      <span className="brand-mark">VF</span>
      <span>Viral Flight</span>
    </Link>
  )
}

export function PortalShell({
  user,
  active,
  children,
}: {
  user: PortalUser
  active: 'overview' | 'agent' | 'influencers' | 'agencies'
  children: ReactNode
}) {
  const heading = titles[active] || titles.overview

  return (
    <div className="crm-shell">
      <aside className="crm-sidebar">
        <Brand />
        <p className="crm-sidebar-label">Company workspace</p>
        <nav className="crm-nav">
          {navItems.map((item) => {
            const key = item.href === '/'
              ? 'overview'
              : item.href.replace(/^\//, '')
            const isActive = active === key
            return (
              <Link
                className={`crm-nav-link${isActive ? ' active' : ''}`}
                href={item.href}
                key={item.href}
              >
                <span className="crm-nav-label">{item.label}</span>
                <span className="crm-nav-hint">{item.hint}</span>
              </Link>
            )
          })}
        </nav>
        <a className="crm-nav-link muted" href="/admin" target="_blank" rel="noreferrer">
          Payload Admin ↗
        </a>
      </aside>

      <div className="crm-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{heading.eyebrow}</p>
            <strong className="topbar-title">{heading.title}</strong>
          </div>
          <div className="admin-actions">
            <div className="admin-identity">
              <strong>{user.name || 'Super Admin'}</strong>
              <span>{user.email}</span>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="dashboard-main crm-main">{children}</main>
      </div>
    </div>
  )
}
