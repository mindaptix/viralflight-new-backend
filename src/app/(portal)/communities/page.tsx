import config from "@payload-config";
import { getPayload } from "payload";

import { PortalShell } from "../components/portal-shell";
import { requireSuperAdmin } from "../lib/auth";
import { formatNumber } from "../lib/format";
import { createCommunityAction, setCommunityStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const user = await requireSuperAdmin();
  const payload = await getPayload({ config });
  const data = await payload.find({
    collection: "communities",
    depth: 0,
    limit: 100,
    sort: "sortOrder",
  });

  return (
    <PortalShell active="communities" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Creator network</p>
          <h1>Communities</h1>
          <p>
            Create and control the communities shown inside the influencer app.
          </p>
        </div>
        <span className="live-badge">
          <i className="live-dot" />
          {formatNumber(data.totalDocs)} communities
        </span>
      </div>

      <div className="community-layout">
        <article className="panel community-create-panel">
          <div className="panel-header">
            <h2>Create community</h2>
            <span>Published to the app</span>
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
              <label>
                Cover image URL
                <input name="imageUrl" placeholder="https://…" type="url" />
              </label>
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
                  <span>
                    {formatNumber(community.baseMemberCount || 0)} members
                  </span>
                </div>
                <div className="community-tags">
                  {(community.tags || []).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
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
            <div className="empty-state panel">
              No communities yet. Create the first one.
            </div>
          ) : null}
        </section>
      </div>
    </PortalShell>
  );
}
