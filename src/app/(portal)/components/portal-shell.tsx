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
  { href: '/decks', key: 'decks', label: 'Client PPT' },
  { href: '/agent', key: 'agent', label: 'AI Studio' },
]

const titles: Record<string, string> = {
  overview: 'Dashboard',
  campaigns: 'Campaigns',
  influencers: 'Influencers',
  approvals: 'Approvals',
  links: 'Client Links',
  reports: 'Reports',
  decks: 'Client PPT',
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
  | 'decks'

export function Brand() {
  return (
    <Link className="brand-lockup vf-brand" href="/">
      <span className="vf-mark" aria-hidden>
        <svg fill="none" viewBox="0 0 72 44">
          <g transform="translate(36 22) rotate(-18)">
            <rect fill="#F7921D" height="9" rx="1" width="64" x="-32" y="-11" />
            <rect fill="#21B011" height="9" rx="1" width="64" x="-32" y="2" />
          </g>
          <circle cx="36" cy="22" fill="#000" r="10" />
          <circle cx="36" cy="22" fill="#fff" r="2.6" />
        </svg>
      </span>
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
            Viral Flight Tip: Use Client PPT to generate a branded deck with AI, then share it with
            the brand.
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
