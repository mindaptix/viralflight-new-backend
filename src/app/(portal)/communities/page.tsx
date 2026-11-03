import config from "@payload-config";
import Link from "next/link";
import { getPayload } from "payload";

import { PortalShell } from "../components/portal-shell";
import { requireSuperAdmin } from "../lib/auth";
import { formatNumber } from "../lib/format";
import { createCommunityAction, setCommunityStatusAction } from "./actions";
import { CommunityCoverUpload } from "./community-cover-upload";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommunitiesPage({ searchParams }: PageProps) {
  const user = await requireSuperAdmin();
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : "";
  const created = query.created === "1";
  const payload = await getPayload({ config });
  const data = await payload.find({
    collection: "communities",
    depth: 0,
    limit: 100,
    sort: "sortOrder",
  });

  return (
    <PortalShell active="communities" user={user}>
      <section className="community-hero">
        <div>
          <span className="community-hero-kicker">Creator network</span>
          <h1>Communities</h1>
          <p>
            Build spaces where creators discover opportunities, connect locally,
            and grow together.
          </p>
          <div className="community-hero-points">
            <span>
              <i>✓</i> Visible in the influencer app
            </span>
            <span>
              <i>✓</i> Organised by city and niche
            </span>
          </div>
        </div>
        <div className="community-hero-stat">
          <span>Active network</span>
          <strong>{formatNumber(data.totalDocs)}</strong>
          <em>{data.totalDocs === 1 ? "community" : "communities"}</em>
        </div>
        <div className="community-orb community-orb-one" />
        <div className="community-orb community-orb-two" />
      </section>

      {error ? (
        <div className="community-feedback error" role="alert">
          <strong>Community not created</strong>
          <span>{error}</span>
        </div>
      ) : null}
      {created ? (
        <div className="community-feedback success" role="status">
          <strong>Community created</strong>
          <span>It is now available in the community list and influencer app.</span>
        </div>
      ) : null}

      <div className="community-layout">
        <article className="panel community-create-panel" id="create-community">
          <div className="panel-header">
            <div className="community-panel-title">
              <span>01</span>
              <div>
                <h2>Create community</h2>
                <p>Set up how it appears in the app</p>
              </div>
            </div>
            <span className="community-publish-badge">
              <i /> Ready to publish
            </span>
          </div>
          <form
            action={createCommunityAction}
            className="crm-form community-form"
          >
            <div className="community-form-grid">
              <label>
                Name
                <input
                  name="name"
                  placeholder="Beauty Creators Chandigarh"
                  required
                />
              </label>
              <label>
                Category
                <input name="category" placeholder="Beauty" required />
              </label>
              <label>
                City
                <input name="city" placeholder="Chandigarh" required />
              </label>
              <CommunityCoverUpload />
              <label className="wide">
                Tagline
                <textarea
                  name="tagline"
                  placeholder="Connect, collaborate and grow together."
                  required
                  rows={3}
                />
              </label>
              <label className="wide">
                Tags
                <input name="tags" placeholder="Skincare, Makeup, Lifestyle" />
              </label>
              <label>
                Starting member count
                <input
                  min="0"
                  name="baseMemberCount"
                  type="number"
                  defaultValue="0"
                />
              </label>
              <label>
                Display order
                <input name="sortOrder" type="number" defaultValue="0" />
              </label>
            </div>
            <button className="primary-button" type="submit">
              Create community
            </button>
          </form>
        </article>

        <section className="community-list">
          {data.docs.map((community) => (
            <article className="community-card" key={community.id}>
              <Link className="community-card-link" href={`/communities/${community.id}`}>
                <div className="community-cover">
                  {community.imageUrl ? (
                    <img alt="" src={community.imageUrl} />
                  ) : (
                    <span>{community.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="community-card-copy">
                  <div className="community-card-title">
                    <strong>{community.name}</strong>
                    <span
                      className={`status-badge ${community.isActive ? "complete" : "incomplete"}`}
                    >
                      {community.isActive ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <p>{community.tagline}</p>
                  <div className="community-meta">
                    <span>{community.category}</span>
                    <span>{community.city}</span>
                    <span>{formatNumber(community.baseMemberCount || 0)} members</span>
                  </div>
                  <div className="community-tags">
                    {(community.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
                <span className="community-open-arrow">View details →</span>
              </Link>
              <form action={setCommunityStatusAction}>
                <input name="communityId" type="hidden" value={community.id} />
                <input
                  name="isActive"
                  type="hidden"
                  value={community.isActive ? "false" : "true"}
                />
                <button className="clear-button" type="submit">
                  {community.isActive ? "Hide from app" : "Publish"}
                </button>
              </form>
            </article>
          ))}
          {!data.docs.length ? (
            <div className="community-empty panel">
              <div className="community-empty-art" aria-hidden>
                <span className="empty-person p-one" />
                <span className="empty-person p-two" />
                <span className="empty-person p-three" />
                <i />
              </div>
              <span className="community-empty-kicker">Start your network</span>
              <h2>Your first community begins here</h2>
              <p>
                Create a city or niche-based group that creators can discover
                inside the Viral Flight app.
              </p>
              <a className="community-empty-action" href="#create-community">
                Create first community <span>→</span>
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </PortalShell>
  );
}
