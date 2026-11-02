import config from "@payload-config";
import Link from "next/link";
import { getPayload } from "payload";

import { PortalShell } from "../components/portal-shell";
import { requireSuperAdmin } from "../lib/auth";
import { formatNumber } from "../lib/format";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const user = await requireSuperAdmin();
  const payload = await getPayload({ config });
  const [
    users,
    creators,
    agencies,
    brands,
    communities,
    administrators,
    settings,
  ] = await Promise.all([
    payload.count({ collection: "app-users" }),
    payload.count({ collection: "influencer-profiles" }),
    payload.count({ collection: "agency-profiles" }),
    payload.count({ collection: "brand-profiles" }),
    payload.count({ collection: "communities" }),
    payload.count({ collection: "cms-users" }),
    payload.count({ collection: "onboarding-settings" }),
  ]);

  const records = [
    {
      label: "App users",
      value: users.totalDocs,
      detail: "Mobile login accounts",
      href: "/users",
    },
    {
      label: "Creator profiles",
      value: creators.totalDocs,
      detail: "Influencer records",
      href: "/influencers",
    },
    {
      label: "Agency profiles",
      value: agencies.totalDocs,
      detail: "Registered agencies",
      href: "/agencies",
    },
    {
      label: "Brand profiles",
      value: brands.totalDocs,
      detail: "Registered brand accounts",
      href: "/users?role=brand",
    },
    {
      label: "Communities",
      value: communities.totalDocs,
      detail: "Creator communities",
      href: "/communities",
    },
    {
      label: "Administrators",
      value: administrators.totalDocs,
      detail: "CRM access accounts",
      href: "/settings",
    },
    {
      label: "Onboarding settings",
      value: settings.totalDocs,
      detail: "App configuration records",
      href: "/settings",
    },
  ];

  return (
    <PortalShell active="system" user={user}>
      <section className="system-hero">
        <div>
          <span className="admin-eyebrow">System overview</span>
          <h2>Viral Flight data centre</h2>
          <p>
            A safe CRM view of the records powering the mobile app and admin
            workspace.
          </p>
        </div>
        <span className="system-health">
          <i /> All systems operational
        </span>
      </section>

      <div className="dashboard-heading compact-heading">
        <div>
          <p className="eyebrow">Collections</p>
          <h1>System Data</h1>
          <p>Open each business area without leaving the CRM.</p>
        </div>
      </div>

      <section className="system-card-grid">
        {records.map((record, index) => (
          <Link href={record.href} key={record.label}>
            <span className="system-card-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{record.label}</strong>
              <em>{record.detail}</em>
            </div>
            <b>{formatNumber(record.value)}</b>
            <i>→</i>
          </Link>
        ))}
      </section>

      <article className="system-note">
        <div>
          <strong>Protected administration</strong>
          <p>
            Raw database collections remain protected in Payload. Everyday
            account and operations work now stays inside the branded CRM.
          </p>
        </div>
        <Link href="/settings">Open settings</Link>
      </article>
    </PortalShell>
  );
}
