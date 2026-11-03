import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { PortalShell } from '../../components/portal-shell'
import { requireSuperAdmin } from '../../lib/auth'
import { formatDate, formatNumber } from '../../lib/format'
import { setCommunityStatusAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSuperAdmin()
  const { id } = await params
  const payload = await getPayload({ config })
  const community = await payload
    .findByID({ collection: 'communities', id, depth: 0 })
    .catch(() => null)

  if (!community) notFound()

  return (
    <PortalShell active="communities" user={user}>
      <section className="community-detail-hero">
        {community.imageUrl ? <img alt="" src={community.imageUrl} /> : null}
        <div className="community-detail-overlay" />
        <div className="community-detail-copy">
          <Link href="/communities">← Community network</Link>
          <div className="community-detail-title">
            <div>
              <span>{community.category} · {community.city}</span>
              <h1>{community.name}</h1>
              <p>{community.tagline}</p>
            </div>
            <span className={`creator-status ${community.isActive ? 'complete' : 'incomplete'}`}>
              {community.isActive ? '✓ Live in app' : 'Hidden from app'}
            </span>
          </div>
        </div>
      </section>

      <section className="community-detail-grid">
        <div className="detail-stack">
          <article className="panel community-about-card">
            <div className="panel-header">
              <div><span className="panel-kicker">Community overview</span><h2>About this network</h2></div>
              <span>Created {formatDate(community.createdAt)}</span>
            </div>
            <div className="community-stat-grid">
              <div><span>Members</span><strong>{formatNumber(community.baseMemberCount || 0)}</strong><small>Starting audience</small></div>
              <div><span>Category</span><strong>{community.category}</strong><small>Primary niche</small></div>
              <div><span>City</span><strong>{community.city}</strong><small>Local network</small></div>
              <div><span>Display order</span><strong>{community.sortOrder || 0}</strong><small>App position</small></div>
            </div>
            <div className="community-detail-tags">
              {(community.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
              {!community.tags?.length ? <span>No tags added</span> : null}
            </div>
          </article>

          <article className="panel community-visibility-card">
            <div>
              <span className="panel-kicker">Influencer app</span>
              <h2>Community visibility</h2>
              <p>{community.isActive ? 'Creators can currently discover and join this community.' : 'This community is saved but hidden from creators.'}</p>
            </div>
            <form action={setCommunityStatusAction}>
              <input name="communityId" type="hidden" value={community.id} />
              <input name="isActive" type="hidden" value={community.isActive ? 'false' : 'true'} />
              <button className={community.isActive ? 'clear-button' : 'primary-button'} type="submit">
                {community.isActive ? 'Hide from app' : 'Publish community'}
              </button>
            </form>
          </article>
        </div>

        <aside className="panel community-preview-card">
          <span className="panel-kicker">App preview</span>
          <div className="community-phone-preview">
            <div className="community-phone-cover">
              {community.imageUrl ? <img alt="" src={community.imageUrl} /> : <span>{community.name.slice(0, 1)}</span>}
            </div>
            <div className="community-phone-copy">
              <span>{community.category}</span>
              <h3>{community.name}</h3>
              <p>{community.tagline}</p>
              <div>{community.city} · {formatNumber(community.baseMemberCount || 0)} members</div>
              <button type="button">Join community</button>
            </div>
          </div>
        </aside>
      </section>
    </PortalShell>
  )
}
