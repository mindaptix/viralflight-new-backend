import assert from "assert";
import http from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../src/app.js";
import User from "../src/models/User.js";
import BrandProfile from "../src/models/BrandProfile.js";
import AgencyProfile from "../src/models/AgencyProfile.js";
import InfluencerProfile from "../src/models/InfluencerProfile.js";
import Campaign from "../src/models/Campaign.js";
import CampaignApplication from "../src/models/CampaignApplication.js";
import Deal from "../src/models/Deal.js";
import Collaboration from "../src/models/Collaboration.js";
import Conversation from "../src/models/Conversation.js";

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🚀 Testing Complete ViralFlight API Suite (Brand, Agency, AI, Collab)");
  console.log("==================================================================\n");

  const JWT_SECRET = process.env.JWT_SECRET || "local_dev_jwt_secret";
  process.env.JWT_SECRET = JWT_SECRET;

  const brandUserId = new mongoose.Types.ObjectId();
  const agencyUserId = new mongoose.Types.ObjectId();
  const influencerUserId = new mongoose.Types.ObjectId();

  const brandToken = jwt.sign(
    { userId: brandUserId, role: "brand", mobile: "+919876500001" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const agencyToken = jwt.sign(
    { userId: agencyUserId, role: "agency", mobile: "+919876500002" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const influencerToken = jwt.sign(
    { userId: influencerUserId, role: "influencer", mobile: "+919876500003" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // In-memory mock storage
  let mockBrandProfile = {
    _id: new mongoose.Types.ObjectId(),
    userId: brandUserId,
    companyName: "Acme Corp",
    brandKit: {},
    escrowConfig: {},
    isModified: () => false,
    markModified: () => {},
    save: async function () { return this; },
    toObject: function () { return this; },
  };

  let mockAgencyProfile = {
    _id: new mongoose.Types.ObjectId(),
    userId: agencyUserId,
    agencyName: "Top Tier Media",
    talent: [],
    isModified: () => false,
    markModified: () => {},
    save: async function () { return this; },
    toObject: function () { return this; },
  };

  let mockInfluencerProfile = {
    _id: new mongoose.Types.ObjectId(),
    userId: influencerUserId,
    displayName: "Jane Doe",
    username: "janedoe",
    niche: "Fashion & Beauty",
    followerCount: 25000,
    avgEngagementRate: 4.2,
    city: "Mumbai",
    save: async function () { return this; },
  };

  const campId = new mongoose.Types.ObjectId();
  let mockCampaign = {
    _id: campId,
    brandUserId: brandUserId,
    title: "Summer Collection",
    status: "active",
    viewCount: 120,
    slotsTotal: 10,
    slotsRemaining: 8,
    targetNiches: ["Fashion & Beauty"],
    targetScaleTier: ["Mid (10K–100K)"],
    save: async function () { return this; },
    toObject: function () { return this; },
  };

  // Mock model methods
  User.findById = (id) => {
    let u = null;
    if (String(id) === String(brandUserId)) u = { _id: brandUserId, role: "brand" };
    else if (String(id) === String(agencyUserId)) u = { _id: agencyUserId, role: "agency" };
    else if (String(id) === String(influencerUserId)) u = { _id: influencerUserId, role: "influencer" };
    return {
      ...u,
      lean: async () => u,
      then: (r, j) => Promise.resolve(u).then(r, j),
    };
  };

  BrandProfile.findOne = () => ({
    ...mockBrandProfile,
    select: function () { return this; },
    populate: function () { return this; },
    lean: async () => mockBrandProfile,
    then: (r, j) => Promise.resolve(mockBrandProfile).then(r, j),
  });

  AgencyProfile.findOne = () => ({
    ...mockAgencyProfile,
    select: function () { return this; },
    populate: function () { return this; },
    lean: async () => mockAgencyProfile,
    then: (r, j) => Promise.resolve(mockAgencyProfile).then(r, j),
  });

  InfluencerProfile.findOne = () => ({
    ...mockInfluencerProfile,
    select: function () { return this; },
    lean: async () => mockInfluencerProfile,
    then: (r, j) => Promise.resolve(mockInfluencerProfile).then(r, j),
  });

  InfluencerProfile.findById = (id) => ({
    ...mockInfluencerProfile,
    select: function () { return this; },
    lean: async () => mockInfluencerProfile,
    then: (r, j) => Promise.resolve(mockInfluencerProfile).then(r, j),
  });

  InfluencerProfile.find = () => ({
    select: () => ({
      limit: () => ({
        lean: async () => [mockInfluencerProfile],
      }),
    }),
  });

  Campaign.find = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          select: () => ({
            lean: async () => [mockCampaign],
          }),
          lean: async () => [mockCampaign],
        }),
      }),
      limit: () => ({
        select: () => ({
          lean: async () => [mockCampaign],
        }),
        lean: async () => [mockCampaign],
      }),
    }),
    distinct: async () => [mockCampaign._id],
    countDocuments: async () => 1,
    lean: async () => [mockCampaign],
  });
  Campaign.distinct = async () => [mockCampaign._id];

  Campaign.findOne = () => ({
    ...mockCampaign,
    lean: async () => mockCampaign,
    then: (r, j) => Promise.resolve(mockCampaign).then(r, j),
  });

  Campaign.findById = (id) => ({
    ...mockCampaign,
    lean: async () => mockCampaign,
    then: (r, j) => Promise.resolve(mockCampaign).then(r, j),
  });

  Campaign.countDocuments = async () => 1;
  CampaignApplication.countDocuments = async () => 0;

  Deal.find = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => [],
        }),
      }),
    }),
    countDocuments: async () => 0,
    lean: async () => [],
  });
  Deal.countDocuments = async () => 0;

  Conversation.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => [],
      }),
    }),
  });

  Collaboration.find = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          populate: () => ({
            populate: () => ({
              lean: async () => [],
            }),
            lean: async () => [],
          }),
          lean: async () => [],
        }),
      }),
    }),
  });
  Collaboration.countDocuments = async () => 0;
  Collaboration.distinct = async () => [];

  // Start temporary test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5598, resolve));
  const BASE_URL = "http://localhost:5598/api";

  try {
    // 1. POST /api/brand/verify-gst
    console.log("TEST 1: POST /api/brand/verify-gst");
    let res = await fetch(`${BASE_URL}/brand/verify-gst`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${brandToken}` },
      body: JSON.stringify({ gstNumber: "27AABCS1429B1ZB" }),
    });
    let data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.valid, true);
    console.log("✓ Brand GST verification passed\n");

    // 2. PUT /api/brand/brand-kit
    console.log("TEST 2: PUT /api/brand/brand-kit");
    res = await fetch(`${BASE_URL}/brand/brand-kit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${brandToken}` },
      body: JSON.stringify({
        primaryColor: "#FF5722",
        brandDescription: "Premium activewear",
      }),
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    console.log("✓ Brand Kit save passed\n");

    // 3. POST /api/brand/verify-bank-account
    console.log("TEST 3: POST /api/brand/verify-bank-account");
    res = await fetch(`${BASE_URL}/brand/verify-bank-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${brandToken}` },
      body: JSON.stringify({
        accountNumber: "1234567890",
        ifscCode: "HDFC0001234",
        beneficiaryName: "Acme Corp",
      }),
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.verified, true);
    console.log("✓ Brand verify bank account passed\n");

    // 4. PUT /api/brand/escrow-config
    console.log("TEST 4: PUT /api/brand/escrow-config");
    res = await fetch(`${BASE_URL}/brand/escrow-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${brandToken}` },
      body: JSON.stringify({
        bankAccount: { accountNumber: "1234567890", verified: true },
        authorizedSignatory: "John Doe",
      }),
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    console.log("✓ Brand escrow config passed\n");

    // 5. GET /api/brand/dashboard-stats
    console.log("TEST 5: GET /api/brand/dashboard-stats");
    res = await fetch(`${BASE_URL}/brand/dashboard-stats`, {
      headers: { Authorization: `Bearer ${brandToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(data.activeCampaigns !== undefined || data.data?.activeCampaigns !== undefined);
    console.log("✓ Brand dashboard stats passed\n");

    // 6. GET /api/brand/escrow-summary
    console.log("TEST 6: GET /api/brand/escrow-summary");
    res = await fetch(`${BASE_URL}/brand/escrow-summary`, {
      headers: { Authorization: `Bearer ${brandToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(data.data?.locked !== undefined || data.locked !== undefined);
    console.log("✓ Brand escrow summary passed\n");

    // 7. GET /api/brand/campaigns/:id/analytics
    console.log("TEST 7: GET /api/brand/campaigns/:id/analytics");
    res = await fetch(`${BASE_URL}/brand/campaigns/${campId}/analytics`, {
      headers: { Authorization: `Bearer ${brandToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(data.data?.applications !== undefined || data.applications !== undefined);
    console.log("✓ Brand campaign analytics passed\n");

    // 8. GET /api/agency/dashboard-stats
    console.log("TEST 8: GET /api/agency/dashboard-stats");
    res = await fetch(`${BASE_URL}/agency/dashboard-stats`, {
      headers: { Authorization: `Bearer ${agencyToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(data.activeCampaigns !== undefined || data.data?.activeCampaigns !== undefined);
    console.log("✓ Agency dashboard stats passed\n");

    // 9. POST /api/agency/talent
    console.log("TEST 9: POST /api/agency/talent");
    res = await fetch(`${BASE_URL}/agency/talent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${agencyToken}` },
      body: JSON.stringify({
        influencerProfileId: mockInfluencerProfile._id.toString(),
        notes: "Key talent",
      }),
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    console.log("✓ Agency add talent passed\n");

    // 10. GET /api/agency/talent
    console.log("TEST 10: GET /api/agency/talent");
    res = await fetch(`${BASE_URL}/agency/talent`, {
      headers: { Authorization: `Bearer ${agencyToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(data.talent || data.data?.talent));
    console.log("✓ Agency get talent roster passed\n");

    // 11. GET /api/agency/deals
    console.log("TEST 11: GET /api/agency/deals");
    res = await fetch(`${BASE_URL}/agency/deals`, {
      headers: { Authorization: `Bearer ${agencyToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(data.deals || data.data?.deals));
    console.log("✓ Agency deals passed\n");

    // 12. GET /api/agency/hq
    console.log("TEST 12: GET /api/agency/hq");
    res = await fetch(`${BASE_URL}/agency/hq`, {
      headers: { Authorization: `Bearer ${agencyToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(data.data?.team !== undefined || data.team !== undefined);
    console.log("✓ Agency HQ passed\n");

    // 13. GET /api/campaigns (marketplace)
    console.log("TEST 13: GET /api/campaigns (marketplace)");
    res = await fetch(`${BASE_URL}/campaigns`, {
      headers: { Authorization: `Bearer ${influencerToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(data.campaigns || data.data?.campaigns));
    console.log("✓ Public campaign marketplace passed\n");

    // 14. GET /api/collaborations
    console.log("TEST 14: GET /api/collaborations");
    res = await fetch(`${BASE_URL}/collaborations`, {
      headers: { Authorization: `Bearer ${brandToken}` },
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(data.collaborations || data.data?.collaborations));
    console.log("✓ Collaborations list passed\n");

    // 15. POST /api/ai/match-influencers
    console.log("TEST 15: POST /api/ai/match-influencers");
    res = await fetch(`${BASE_URL}/ai/match-influencers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${brandToken}` },
      body: JSON.stringify({
        targetNiches: ["Fashion & Beauty"],
        limit: 5,
      }),
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(data.matches || data.data?.matches));
    console.log("✓ AI match influencers passed\n");

    // 16. POST /api/ai/campaign-report
    console.log("TEST 16: POST /api/ai/campaign-report");
    res = await fetch(`${BASE_URL}/ai/campaign-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${brandToken}` },
      body: JSON.stringify({
        campaignId: campId.toString(),
      }),
    });
    data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(data.report !== undefined || data.data?.report !== undefined);
    console.log("✓ AI campaign report passed\n");

    console.log("==================================================================");
    console.log("🎉 ALL 16 API TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================================");
  } finally {
    server.close();
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
