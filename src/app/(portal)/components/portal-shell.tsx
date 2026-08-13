import Link from 'next/link'
import type { ReactNode } from 'react'

import { LogoutButton } from '../auth-controls'
import type { PortalUser } from '../lib/auth'

const navItems = [
  { href: '/', key: 'overview', label: 'Dashboard' },
  { href: '/campaigns', key: 'campaigns', label: 'Campaigns' },
  { href: '/influencers', key: 'influencers', label: 'Influencers' },
  { href: '/approvals', key: 'approvals', label: 'Approvals' },
  { href: '/links', key: 'links', label: 'Client Links' },
  { href: '/reports', key: 'reports', label: 'Reports' },
  { href: '/agent', key: 'agent', label: 'AI Studio' },
]

const titles: Record<string, string> = {
  overview: 'Dashboard',
  campaigns: 'Campaigns',
  influencers: 'Influencers',
  approvals: 'Approvals',
  links: 'Client Links',
  reports: 'Reports',
  agent: 'AI Studio',
  agencies: 'Agencies',
  settings: 'Settings',
}

export type ShellActive =
  | 'overview'
  | 'agent'
  | 'influencers'
  | 'agencies'
  | 'settings'
  | 'campaigns'
  | 'approvals'
  | 'links'
  | 'reports'

export function Brand() {
  return (
    <Link className="brand-lockup vf-brand" href="/">
      <img alt="" className="vf-logo" src="/logo-viral-flight.png" />
      <span>
        Viral Flight <em>CRM</em>
      </span>
    </Link>
  )
}

export function PortalShell({
  user,
  active,
  children,
}: {
  user: PortalUser
  active: ShellActive
  children: ReactNode
}) {
  const title = titles[active] || 'Dashboard'

  return (
    <div className="vf-app">
      <aside className="vf-side">
        <Brand />
        <nav className="vf-nav">
          {navItems.map((item) => (
            <Link
              className={`vf-nav-item${active === item.key ? ' is-active' : ''}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="vf-side-foot">
          <div className="vf-user">
            <span className="vf-avatar">
              {(user.name || 'A').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name || 'Super Admin'}</strong>
              <span>Account Manager</span>
            </div>
          </div>
          <p className="vf-tip">
            Viral Flight Tip: Use AI Studio to generate creative briefs, outreach emails and
            analyze performance faster.
          </p>
          <div className="vf-side-links">
            <Link href="/settings">Settings</Link>
            <Link href="/agencies">Agencies</Link>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="vf-main">
        <header className="vf-top">
          <h1>{title}</h1>
          <form action="/influencers" className="vf-search">
            <input name="q" placeholder="Search campaigns, influencers, clients..." />
            <kbd>⌘K</kbd>
          </form>
          <div className="vf-top-actions">
            <span className="vf-icon-btn" title="Notifications">
              ⌁
            </span>
            <Link className="vf-create" href="/campaigns/new">
              Create Campaign +
            </Link>
          </div>
        </header>
        <div className="vf-body">{children}</div>
      </div>
    </div>
  )
}
