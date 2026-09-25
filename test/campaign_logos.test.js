import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import Campaign from "../src/models/Campaign.js";
import CampaignApplication from "../src/models/CampaignApplication.js";
import AgencyProfile from "../src/models/AgencyProfile.js";
import BrandProfile from "../src/models/BrandProfile.js";
import { toCampaignCard } from "../src/application/campaigns/mappers/campaignMapper.js";
import { withCampaignOwnerImages } from "../src/application/campaigns/mappers/campaignOwnerImages.js";

test("toCampaignCard populates brandLogoUrl and agencyLogoUrl per mobile requirements", () => {
  // 1. Direct brandLogoUrl and agencyLogoUrl
  const card1 = toCampaignCard({
    _id: "c1",
    ownerRole: "agency",
    agencyName: "Top Agency",
    brandLogoUrl: "https://example.com/brand-logo.png",
    agencyLogoUrl: "https://example.com/agency-logo.png",
  });
  assert.equal(card1.brandLogoUrl, "https://example.com/brand-logo.png");
  assert.equal(card1.agencyLogoUrl, "https://example.com/agency-logo.png");

  // 2. Populates from agency.logoUrl / agency.avatarUrl when direct is missing
  const card2 = toCampaignCard({
    _id: "c2",
    ownerRole: "agency",
    agency: { logoUrl: "https://example.com/agency-logo.png" },
  });
  assert.equal(card2.agencyLogoUrl, "https://example.com/agency-logo.png");
  assert.equal(card2.brandLogoUrl, "https://example.com/agency-logo.png");

  // 3. Populates from brand.logoUrl when direct is missing
  const card3 = toCampaignCard({
    _id: "c3",
    ownerRole: "brand",
    brand: { logoUrl: "https://example.com/brand-only.png" },
  });
  assert.equal(card3.brandLogoUrl, "https://example.com/brand-only.png");
  assert.equal(card3.agencyLogoUrl, "");

  // 4. Empty campaign yields empty string logos (not undefined/null)
  const card4 = toCampaignCard({ _id: "c4" });
  assert.equal(card4.brandLogoUrl, "");
  assert.equal(card4.agencyLogoUrl, "");
});

test("withCampaignOwnerImages populates agencyLogoUrl for agencies and brandLogoUrl for brands", async (t) => {
  t.mock.method(AgencyProfile, "find", () => ({
    select: () => ({
      lean: async () => [
        { _id: "agency-p1", userId: "agency-u1", profileImageUrl: "https://cdn.example.com/agency.jpg" },
      ],
    }),
  }));

  t.mock.method(BrandProfile, "find", () => ({
    select: () => ({
      lean: async () => [
        { _id: "brand-p1", userId: "brand-u1", profileImageUrl: "https://cdn.example.com/brand.jpg" },
      ],
    }),
  }));

  const campaigns = [
    { ownerRole: "agency", ownerUserId: "agency-u1", title: "Agency Campaign" },
    { ownerRole: "brand", ownerUserId: "brand-u1", title: "Brand Campaign" },
  ];

  const enriched = await withCampaignOwnerImages(campaigns);
  assert.equal(enriched[0].agencyLogoUrl, "https://cdn.example.com/agency.jpg");
  assert.equal(enriched[0].brandLogoUrl, "https://cdn.example.com/agency.jpg");
  assert.equal(enriched[0].agency?.logoUrl, "https://cdn.example.com/agency.jpg");

  assert.equal(enriched[1].brandLogoUrl, "https://cdn.example.com/brand.jpg");
  assert.equal(enriched[1].brand?.logoUrl, "https://cdn.example.com/brand.jpg");

  const cardAgency = toCampaignCard(enriched[0]);
  assert.equal(cardAgency.agencyLogoUrl, "https://cdn.example.com/agency.jpg");
  assert.equal(cardAgency.brandLogoUrl, "https://cdn.example.com/agency.jpg");

  const cardBrand = toCampaignCard(enriched[1]);
  assert.equal(cardBrand.brandLogoUrl, "https://cdn.example.com/brand.jpg");
  assert.equal(cardBrand.agencyLogoUrl, "");
});

test("GET /api/v1/campaigns endpoint returns enriched campaignCards with logos", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "campaign-logos-test-secret";
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = jwt.sign(
      { userId: "507f1f77bcf86cd799439011", role: "influencer" },
      process.env.JWT_SECRET
    );

    t.mock.method(AgencyProfile, "find", () => ({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    }));
    t.mock.method(BrandProfile, "find", () => ({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    }));

    t.mock.method(Campaign, "find", () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            select: () => ({
              lean: async () => [
                {
                  _id: "507f1f77bcf86cd799439055",
                  title: "Sample Campaign",
                  ownerRole: "agency",
                  agencyUserId: "507f1f77bcf86cd799439033",
                  agencyLogoUrl: "https://example.com/agency.png",
                  brandLogoUrl: "https://example.com/brand.png",
                  status: "active",
                },
              ],
            }),
          }),
        }),
      }),
    }));

    t.mock.method(Campaign, "countDocuments", () => Promise.resolve(1));
    t.mock.method(CampaignApplication, "find", () => ({
      select: () => ({
        lean: async () => [{
          campaignId: "507f1f77bcf86cd799439055",
          status: "applied",
        }],
      }),
    }));

    const res = await fetch(`${base}/api/v1/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.campaigns.length, 1);
    assert.equal(data.campaigns[0].agencyLogoUrl, "https://example.com/agency.png");
    assert.equal(data.campaigns[0].brandLogoUrl, "https://example.com/brand.png");
    assert.equal(data.campaigns[0].applicationStatus, "applied");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
