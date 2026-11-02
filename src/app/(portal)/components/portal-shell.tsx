import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "../auth-controls";
import type { PortalUser } from "../lib/auth";

type IconName =
  | "dashboard"
  | "campaigns"
  | "creators"
  | "approvals"
  | "links"
  | "reports"
  | "decks"
  | "sparkles"
  | "users"
  | "agencies"
  | "settings"
  | "database";

const navGroups: Array<{
  label: string;
  items: Array<{
    href: string;
    key?: ShellActive;
    label: string;
    icon: IconName;
    external?: boolean;
  }>;
}> = [
  {
    label: "Workspace",
    items: [
      { href: "/", key: "overview", label: "Dashboard", icon: "dashboard" },
      {
        href: "/campaigns",
        key: "campaigns",
        label: "Campaigns",
        icon: "campaigns",
      },
      {
        href: "/influencers",
        key: "influencers",
        label: "Creators",
        icon: "creators",
      },
      {
        href: "/approvals",
        key: "approvals",
        label: "Approvals",
        icon: "approvals",
      },
      { href: "/links", key: "links", label: "Client links", icon: "links" },
      { href: "/reports", key: "reports", label: "Reports", icon: "reports" },
    ],
  },
  {
    label: "Admin tools",
    items: [
      { href: "/users", key: "users", label: "App users", icon: "users" },
      {
        href: "/agencies",
        key: "agencies",
        label: "Agencies",
        icon: "agencies",
      },
      { href: "/decks", key: "decks", label: "Client PPT", icon: "decks" },
      { href: "/agent", key: "agent", label: "AI Studio", icon: "sparkles" },
      {
        href: "/settings",
        key: "settings",
        label: "Settings",
        icon: "settings",
      },
      {
        href: "/system",
        key: "system",
        label: "System data",
        icon: "database",
      },
    ],
  },
];

const titles: Record<string, string> = {
  overview: "Dashboard",
  campaigns: "Campaigns",
  influencers: "Influencers",
  approvals: "Approvals",
  links: "Client Links",
  reports: "Reports",
  decks: "Client PPT",
  agent: "AI Studio",
  agencies: "Agencies",
  settings: "Settings",
  users: "App Users",
  system: "System Data",
};

export type ShellActive =
  | "overview"
  | "agent"
  | "influencers"
  | "agencies"
  | "settings"
  | "campaigns"
  | "approvals"
  | "links"
  | "reports"
  | "decks"
  | "users"
  | "system";

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    campaigns: (
      <>
        <path d="M4 19V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
        <path d="M8 6V4h8v2M3 19h18M8 11h8M8 15h5" />
      </>
    ),
    creators: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2.5 21a6.5 6.5 0 0 1 13 0M16 11a4 4 0 0 1 5.5 3.7M18 17a5 5 0 0 1 4 4" />
      </>
    ),
    approvals: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.7 2.7L16.5 9" />
      </>
    ),
    links: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
      </>
    ),
    reports: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    decks: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4M7 13l3-3 2 2 4-4 2 2" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6L19 13Z" />
      </>
    ),
    users: (
      <>
        <circle cx="8" cy="8" r="4" />
        <circle cx="17" cy="9" r="3" />
        <path d="M2 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 8 4" />
      </>
    ),
    agencies: (
      <>
        <path d="M3 21V7l9-4 9 4v14M8 10h2M14 10h2M8 14h2M14 14h2M9 21v-3h6v3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden
      className="vf-nav-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

export function Brand() {
  return (
    <Link className="brand-lockup vf-brand" href="/">
      <span className="vf-mark">
        <img alt="" src="/logo-mark.png" />
      </span>
      <span>
        Viral Flight <em>Admin</em>
      </span>
    </Link>
  );
}

export function PortalShell({
  user,
  active,
  children,
}: {
  user: PortalUser;
  active: ShellActive;
  children: ReactNode;
}) {
  const title = titles[active] || "Dashboard";

  return (
    <div className="vf-app">
      <aside className="vf-side">
        <Brand />
        <nav className="vf-nav">
          {navGroups.map((group) => (
            <div className="vf-nav-group" key={group.label}>
              <span className="vf-nav-label">{group.label}</span>
              {group.items.map((item) => (
                <Link
                  className={`vf-nav-item${active === item.key ? " is-active" : ""}`}
                  href={item.href}
                  key={item.href}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.external ? (
                    <span className="vf-nav-arrow">↗</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="vf-side-foot">
          <div className="vf-user">
            <span className="vf-avatar">
              {(user.name || "A").slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name || "Super Admin"}</strong>
              <span>Super administrator</span>
            </div>
          </div>
          <p className="vf-tip">
            <strong>Admin workspace</strong>
            <span>
              Manage every creator, campaign and agency from one place.
            </span>
          </p>
          <div className="vf-side-links">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="vf-main">
        <header className="vf-top">
          <div className="vf-page-title">
            <span>Viral Flight</span>
            <h1>{title}</h1>
          </div>
          <form action="/influencers" className="vf-search">
            <input
              name="q"
              placeholder="Search campaigns, influencers, clients..."
            />
            <kbd>⌘K</kbd>
          </form>
          <div className="vf-top-actions">
            <span className="vf-live-status">
              <i /> Live workspace
            </span>
            <Link className="vf-create" href="/campaigns/new">
              <span>+</span> New campaign
            </Link>
          </div>
        </header>
        <div className="vf-body">{children}</div>
      </div>
    </div>
  );
}
