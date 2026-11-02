import config from "@payload-config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import { PortalShell } from "../../components/portal-shell";
import { requireSuperAdmin } from "../../lib/auth";
import { formatDate } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSuperAdmin();
  const { id } = await params;
  const payload = await getPayload({ config });
  const account = await payload
    .findByID({ collection: "app-users", id, depth: 0 })
    .catch(() => null);
  if (!account) notFound();

  const profileHref =
    account.role === "influencer"
      ? `/influencers?q=${encodeURIComponent(account.mobile)}`
      : account.role === "agency"
        ? `/agencies?q=${encodeURIComponent(account.mobile)}`
        : null;

  return (
    <PortalShell active="users" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <Link href="/users">App users</Link> / Account
          </p>
          <h1>{account.mobile}</h1>
          <p>Login activity and account status.</p>
        </div>
        {profileHref ? (
          <Link className="filter-button" href={profileHref}>
            Find linked profile
          </Link>
        ) : null}
      </div>
      <div className="system-detail-grid">
        <article className="panel detail-panel">
          <span>Role</span>
          <strong>{account.role}</strong>
        </article>
        <article className="panel detail-panel">
          <span>Mobile verification</span>
          <strong>{account.isMobileVerified ? "Verified" : "Pending"}</strong>
        </article>
        <article className="panel detail-panel">
          <span>Last login</span>
          <strong>
            {account.lastLoginAt ? formatDate(account.lastLoginAt) : "Never"}
          </strong>
        </article>
        <article className="panel detail-panel">
          <span>Last OTP request</span>
          <strong>
            {account.lastOtpRequestedAt
              ? formatDate(account.lastOtpRequestedAt)
              : "No record"}
          </strong>
        </article>
        <article className="panel detail-panel">
          <span>Created</span>
          <strong>{formatDate(account.createdAt)}</strong>
        </article>
        <article className="panel detail-panel">
          <span>Account ID</span>
          <strong className="mono-value">{account.id}</strong>
        </article>
      </div>
    </PortalShell>
  );
}
