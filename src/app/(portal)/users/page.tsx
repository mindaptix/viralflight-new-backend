import config from "@payload-config";
import Link from "next/link";
import { getPayload, type Where } from "payload";

import { Avatar } from "../components/avatar";
import { PortalShell } from "../components/portal-shell";
import { getAccountProfileSummaries } from "../crm/data";
import { requireSuperAdmin } from "../lib/auth";
import { firstParam, formatDate, formatNumber } from "../lib/format";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  const user = await requireSuperAdmin();
  const params = await searchParams;
  const q = firstParam(params.q);
  const role = firstParam(params.role);
  const verified = firstParam(params.verified);
  const page = Math.max(1, Number(firstParam(params.page) || "1") || 1);
  const clauses: Where[] = [];

  if (q) clauses.push({ mobile: { contains: q } });
  if (["agency", "brand", "influencer"].includes(role)) {
    clauses.push({ role: { equals: role } });
  }
  if (verified === "true" || verified === "false") {
    clauses.push({ isMobileVerified: { equals: verified === "true" } });
  }

  const payload = await getPayload({ config });
  const data = await payload.find({
    collection: "app-users",
    depth: 0,
    limit: 25,
    page,
    sort: "-createdAt",
    where: clauses.length ? { and: clauses } : undefined,
  });
  const profileSummaries = await getAccountProfileSummaries(
    data.docs.map((account) => ({
      id: String(account.id),
      mobile: account.mobile,
      role: account.role,
    })),
  );

  const queryFor = (nextPage: number) =>
    new URLSearchParams({
      q,
      role,
      verified,
      page: String(nextPage),
    }).toString();

  return (
    <PortalShell active="users" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Account management</p>
          <h1>App Users</h1>
          <p>Mobile accounts registered in the Viral Flight app.</p>
        </div>
        <span className="live-badge">
          <i className="live-dot" />
          {formatNumber(data.totalDocs)} users
        </span>
      </div>

      <form className="filters">
        <label className="grow">
          Mobile number
          <input
            defaultValue={q}
            name="q"
            placeholder="Search mobile number…"
            type="search"
          />
        </label>
        <label>
          Role
          <select defaultValue={role} name="role">
            <option value="">All roles</option>
            <option value="influencer">Influencer</option>
            <option value="agency">Agency</option>
            <option value="brand">Brand</option>
          </select>
        </label>
        <label>
          Verification
          <select defaultValue={verified} name="verified">
            <option value="">All users</option>
            <option value="true">Verified</option>
            <option value="false">Not verified</option>
          </select>
        </label>
        <button className="filter-button" type="submit">
          Apply
        </button>
        <a className="clear-button" href="/users">
          Reset
        </a>
      </form>

      <article className="directory-panel">
        <div className="account-card-grid">
          {data.docs.map((account) => {
            const summary = profileSummaries.get(String(account.id));
            const displayName = summary?.name || account.mobile;

            return (
              <Link className="account-card" href={`/users/${account.id}`} key={account.id}>
                <div className="account-card-top">
                  <Avatar name={displayName} size="lg" src={summary?.imageUrl} />
                  <span
                    className={`status-badge ${account.isMobileVerified ? "complete" : "incomplete"}`}
                  >
                    {account.isMobileVerified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="account-card-identity">
                  <span className="role-badge">{account.role}</span>
                  <h2>{displayName}</h2>
                  <p>{account.mobile}</p>
                </div>
                <div className="account-card-meta">
                  <div>
                    <span>Last active</span>
                    <strong>{account.lastLoginAt ? formatDate(account.lastLoginAt) : "Never"}</strong>
                  </div>
                  <div>
                    <span>Joined</span>
                    <strong>{formatDate(account.createdAt)}</strong>
                  </div>
                </div>
                <div className="account-card-footer">
                  <span>ID · {String(account.id).slice(-8)}</span>
                  <strong>View profile <b>→</b></strong>
                </div>
              </Link>
            );
          })}
          {!data.docs.length ? (
            <div className="empty-state">No users match these filters.</div>
          ) : null}
        </div>
        <div className="pager">
          <span>
            Page {data.page || 1} of {data.totalPages || 1}
          </span>
          <div className="pager-actions">
            {data.hasPrevPage ? (
              <a className="clear-button" href={`/users?${queryFor(page - 1)}`}>
                Previous
              </a>
            ) : null}
            {data.hasNextPage ? (
              <a
                className="filter-button"
                href={`/users?${queryFor(page + 1)}`}
              >
                Next
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </PortalShell>
  );
}
