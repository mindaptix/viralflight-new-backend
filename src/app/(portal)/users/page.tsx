import config from "@payload-config";
import Link from "next/link";
import { getPayload, type Where } from "payload";

import { PortalShell } from "../components/portal-shell";
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

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mobile number</th>
                <th>Role</th>
                <th>Verification</th>
                <th>Last login</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.docs.map((account) => (
                <tr key={account.id}>
                  <td className="person-cell">
                    <strong>{account.mobile}</strong>
                    <span>Account ID: {account.id}</span>
                  </td>
                  <td>
                    <span className="role-badge">{account.role}</span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${account.isMobileVerified ? "complete" : "incomplete"}`}
                    >
                      {account.isMobileVerified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td>
                    {account.lastLoginAt
                      ? formatDate(account.lastLoginAt)
                      : "Never"}
                  </td>
                  <td>{formatDate(account.createdAt)}</td>
                  <td>
                    <Link className="table-link" href={`/users/${account.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
