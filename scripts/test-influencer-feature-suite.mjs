import assert from "assert";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { io as ClientIO } from "socket.io-client";

import app from "../src/app.js";
import { initChatSocket } from "../src/infrastructure/socket/chatSocket.js";
import User from "../src/models/User.js";
import InfluencerProfile from "../src/models/InfluencerProfile.js";
import Deal from "../src/models/Deal.js";
import Campaign from "../src/models/Campaign.js";
import SavedCampaign from "../src/models/SavedCampaign.js";
import Notification from "../src/models/Notification.js";

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🚀 Starting Influencer Feature Suite End-to-End Test Suite");
  console.log("==================================================================\n");

  const JWT_SECRET = process.env.JWT_SECRET || "local_dev_jwt_secret";
  process.env.JWT_SECRET = JWT_SECRET;

  const influencerUserId = new mongoose.Types.ObjectId();
  const brandUserId = new mongoose.Types.ObjectId();

  const influencerUser = {
    userId: influencerUserId,
    role: "influencer",
    mobile: "+919876543210",
  };
  const brandUser = {
    userId: brandUserId,
    role: "brand",
    mobile: "+919876500000",
  };

  const influencerToken = jwt.sign(influencerUser, JWT_SECRET, {
    expiresIn: "1h",
  });
  const brandToken = jwt.sign(brandUser, JWT_SECRET, { expiresIn: "1h" });

  // Mock DB models for unit/integration isolation
  User.findById = (id) => {
    let user = null;
    if (String(id) === String(influencerUserId)) {
      user = {
        _id: influencerUserId,
        role: "influencer",
        mobile: influencerUser.mobile,
      };
    } else if (String(id) === String(brandUserId)) {
      user = {
        _id: brandUserId,
        role: "brand",
        mobile: brandUser.mobile,
      };
    }
    return {
      ...user,
      lean: async () => user,
      then: (resolve, reject) => Promise.resolve(user).then(resolve, reject),
    };
  };

  let mockProfile = {
    _id: new mongoose.Types.ObjectId(),
    userId: influencerUserId,
    mobile: influencerUser.mobile,
    name: "Elena Rostova",
    city: "Mumbai",
    profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    rateCardTelemetry: null,
    save: async function () {
      return this;
    },
    markModified: function () {},
    lean: async function () {
      return this;
    },
    toObject: function () {
      return this;
    },
  };

  InfluencerProfile.findOne = () => ({
    ...mockProfile,
    select: function () { return this; },
    populate: function () { return this; },
    lean: async () => mockProfile,
    then: (resolve, reject) => Promise.resolve(mockProfile).then(resolve, reject),
  });

  Notification.countDocuments = async () => 3;
  Campaign.countDocuments = async () => 5;
  Campaign.find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => [],
      }),
    }),
  });

  let mockSavedCampaigns = [];
  SavedCampaign.find = () => ({
    lean: async () => mockSavedCampaigns,
  });
  SavedCampaign.findOne = async (query) =>
    mockSavedCampaigns.find((s) => String(s.campaignId) === String(query.campaignId)) || null;
  SavedCampaign.create = async (doc) => {
    const s = { ...doc, _id: new mongoose.Types.ObjectId() };
    mockSavedCampaigns.push(s);
    return s;
  };
  SavedCampaign.deleteOne = async (query) => {
    mockSavedCampaigns = mockSavedCampaigns.filter(
      (s) => String(s._id) !== String(query._id)
    );
    return { deletedCount: 1 };
  };

  // Mock Deals in-memory store
  let mockDeals = [];
  Deal.countDocuments = async (filter = {}) => {
    if (filter.status?.$in) {
      return mockDeals.filter((d) => filter.status.$in.includes(d.status)).length;
    }
    if (filter.status) {
      return mockDeals.filter((d) => d.status === filter.status).length;
    }
    return mockDeals.length;
  };
  Deal.find = (filter = {}) => {
    let result = [...mockDeals];
    if (filter.status?.$in) {
      result = result.filter((d) => filter.status.$in.includes(d.status));
    } else if (filter.status) {
      result = result.filter((d) => d.status === filter.status);
    }
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => result,
          }),
        }),
      }),
      lean: async () => result,
    };
  };
  Deal.findOne = async (query) => {
    return mockDeals.find((d) => String(d._id) === String(query._id)) || null;
  };
  Deal.insertMany = async (deals) => {
    deals.forEach((d) => {
      const dealDoc = {
        ...d,
        _id: d._id || new mongoose.Types.ObjectId(),
        toObject: function () {
          return this;
        },
        save: async function () {
          return this;
        },
      };
      if (dealDoc.milestones) {
        dealDoc.milestones.id = function (id) {
          return this.find((m) => String(m._id) === String(id));
        };
      }
      mockDeals.push(dealDoc);
    });
    return deals;
  };

  // Start HTTP Server
  const server = http.createServer(app);
  initChatSocket(server);
  const PORT = 5599;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const BASE_URL = `http://localhost:${PORT}/api`;
  console.log(`✓ Test Server listening on ${BASE_URL}\n`);

  try {
    const authHeaders = {
      Authorization: `Bearer ${influencerToken}`,
      "Content-Type": "application/json",
    };

    // ─── TEST 1: GET /api/influencer/home/dashboard ──────────────────────────
    console.log("TEST 1: GET /api/influencer/home/dashboard");
    const resHome = await fetch(`${BASE_URL}/influencer/home/dashboard`, {
      headers: authHeaders,
    });
    const dataHome = await resHome.json();
    assert.strictEqual(resHome.status, 200, "Dashboard should return 200");
    assert.strictEqual(dataHome.success, true);
    assert.strictEqual(dataHome.data.creator.name, "Elena Rostova");
    assert.strictEqual(dataHome.data.creator.firstName, "Elena");
    assert.strictEqual(dataHome.data.spotlight.brandName, "Gymshark");
    assert.strictEqual(dataHome.data.spotlight.guaranteedAmount, 2500);
    assert.strictEqual(dataHome.data.medianDeliverableFee, 1450);
    console.log("✓ Home dashboard structure verified successfully\n");

    // ─── TEST 2: GET /api/influencer/campaigns/curated ───────────────────────
    console.log("TEST 2: GET /api/influencer/campaigns/curated");
    const resCurated = await fetch(`${BASE_URL}/influencer/campaigns/curated`, {
      headers: authHeaders,
    });
    const dataCurated = await resCurated.json();
    assert.strictEqual(resCurated.status, 200);
    assert.strictEqual(dataCurated.success, true);
    assert(Array.isArray(dataCurated.data.campaigns));
    assert(dataCurated.data.campaigns.length >= 4);
    assert.strictEqual(dataCurated.data.campaigns[0].title, "Dew Balm Global Launch");
    assert.strictEqual(dataCurated.data.campaigns[0].brand.name, "Glossier");
    assert.strictEqual(dataCurated.data.campaigns[0].compensationType, "FIXED FEE");
    console.log("✓ Curated campaigns list and formatting verified\n");

    // ─── TEST 3: Curated campaigns filtering ─────────────────────────────────
    console.log("TEST 3: Filter curated campaigns by category tech_gadgets");
    const resFiltered = await fetch(
      `${BASE_URL}/influencer/campaigns/curated?category=tech_gadgets`,
      { headers: authHeaders }
    );
    const dataFiltered = await resFiltered.json();
    assert.strictEqual(resFiltered.status, 200);
    assert(
      dataFiltered.data.campaigns.some(
        (c) =>
          c.brand?.name?.includes("Sony") ||
          c.brand?.name?.includes("boAt") ||
          c.title?.toLowerCase().includes("airdopes")
      )
    );
    console.log("✓ Curated campaigns category filter verified\n");

    // ─── TEST 4: POST /api/influencer/campaigns/:id/bookmark ─────────────────
    console.log("TEST 4: POST /api/influencer/campaigns/:id/bookmark");
    const testCampId = new mongoose.Types.ObjectId();
    const resBookmark1 = await fetch(
      `${BASE_URL}/influencer/campaigns/${testCampId}/bookmark`,
      { method: "POST", headers: authHeaders }
    );
    const dataBookmark1 = await resBookmark1.json();
    assert.strictEqual(dataBookmark1.data.isBookmarked, true, "Should bookmark");

    const resBookmark2 = await fetch(
      `${BASE_URL}/influencer/campaigns/${testCampId}/bookmark`,
      { method: "POST", headers: authHeaders }
    );
    const dataBookmark2 = await resBookmark2.json();
    assert.strictEqual(dataBookmark2.data.isBookmarked, false, "Should toggle bookmark off");
    console.log("✓ Bookmark toggle verified\n");

    // ─── TEST 5: POST /api/influencer/campaigns/:id/apply ────────────────────
    console.log("TEST 5: POST /api/influencer/campaigns/:id/apply");
    const resApply = await fetch(
      `${BASE_URL}/influencer/campaigns/${testCampId}/apply`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          pitchNote: "I specialize in 4K aesthetic workout content with 8.2% ER.",
          customRate: 2500,
          proposedDeliverables: ["1x 60s 4K Reel", "2x Stories with link"],
        }),
      }
    );
    const dataApply = await resApply.json();
    assert.strictEqual(resApply.status, 201);
    assert.strictEqual(dataApply.success, true);
    assert.strictEqual(dataApply.data.proposedRate, 2500);
    console.log("✓ Apply to campaign verified\n");

    // ─── TEST 6: Auto-Match Rate Card (GET, PUT, RESET) ──────────────────────
    console.log("TEST 6: GET, PUT, POST Reset Auto-Match Rate Card");
    const resRateCard = await fetch(`${BASE_URL}/influencer/rate-card`, {
      headers: authHeaders,
    });
    const dataRateCard = await resRateCard.json();
    assert.strictEqual(resRateCard.status, 200);
    assert.strictEqual(dataRateCard.data.isAiDynamicPricingActive, true);
    assert.strictEqual(dataRateCard.data.recommendedMedian.amount, 1450);
    assert.strictEqual(dataRateCard.data.channels.length, 4);
    assert.strictEqual(dataRateCard.data.commercialAddOns.length, 2);

    // Update rate card
    const resUpdateRateCard = await fetch(`${BASE_URL}/influencer/rate-card`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        isAiDynamicPricingActive: false,
        smartEscrowMultipliers: {
          expressSurge48h: { isEnabled: true, surgePercent: 30 },
          instantEscrowIncentive: { isEnabled: true, discountPercent: 8 },
          dealFloorCutOff: { amount: 1500 },
        },
      }),
    });
    const dataUpdateRateCard = await resUpdateRateCard.json();
    assert.strictEqual(dataUpdateRateCard.data.isAiDynamicPricingActive, false);
    assert.strictEqual(
      dataUpdateRateCard.data.smartEscrowMultipliers.expressSurge48h.surgePercent,
      30
    );

    // Reset rate card
    const resResetRateCard = await fetch(
      `${BASE_URL}/influencer/rate-card/reset-defaults`,
      { method: "POST", headers: authHeaders }
    );
    const dataResetRateCard = await resResetRateCard.json();
    assert.strictEqual(dataResetRateCard.data.isAiDynamicPricingActive, true);
    console.log("✓ Rate Card telemetry GET, PUT, and RESET verified\n");

    // ─── TEST 7: Deals Summary ───────────────────────────────────────────────
    console.log("TEST 7: GET /api/influencer/deals/summary");
    const resDealsSummary = await fetch(`${BASE_URL}/influencer/deals/summary`, {
      headers: authHeaders,
    });
    const dataDealsSummary = await resDealsSummary.json();
    assert.strictEqual(resDealsSummary.status, 200);
    assert.strictEqual(dataDealsSummary.success, true);
    assert(dataDealsSummary.data.activePipeline.totalAmount > 0);
    assert(dataDealsSummary.data.escrowVault.totalLocked > 0);
    assert.strictEqual(
      dataDealsSummary.data.escrowVault.securityStatus,
      "100% RBI Escrow Secured"
    );
    console.log("✓ Deals summary metrics verified\n");

    // ─── TEST 8: Deals by Tab (incoming, active, completed) ───────────────────
    console.log("TEST 8: GET /api/influencer/deals by tabs");
    const resIncoming = await fetch(`${BASE_URL}/influencer/deals?tab=incoming`, {
      headers: authHeaders,
    });
    const dataIncoming = await resIncoming.json();
    assert.strictEqual(dataIncoming.data.deals.length >= 1, true);
    const incomingDeal = dataIncoming.data.deals[0];
    assert.strictEqual(incomingDeal.status, "incoming");
    assert.strictEqual(incomingDeal.brandName, "boAt Lifestyle");

    const resActive = await fetch(`${BASE_URL}/influencer/deals?tab=active`, {
      headers: authHeaders,
    });
    const dataActive = await resActive.json();
    assert.strictEqual(dataActive.data.deals.length >= 1, true);
    assert.strictEqual(dataActive.data.deals[0].status, "active");

    const resCompleted = await fetch(`${BASE_URL}/influencer/deals?tab=completed`, {
      headers: authHeaders,
    });
    const dataCompleted = await resCompleted.json();
    assert.strictEqual(dataCompleted.data.deals.length >= 1, true);
    assert.strictEqual(dataCompleted.data.deals[0].status, "completed");
    console.log("✓ Deals tab filtering verified\n");

    // ─── TEST 9: Counter-Offer & Accept Escrow on Deal ────────────────────────
    console.log("TEST 9: Counter-Offer on Deal");
    const dealId = incomingDeal.id;
    const resCounter = await fetch(
      `${BASE_URL}/influencer/deals/${dealId}/counter-offer`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          counterAmount: 9500,
          termsNote: "Includes raw footage files",
        }),
      }
    );
    const dataCounter = await resCounter.json();
    assert.strictEqual(dataCounter.success, true);
    assert.strictEqual(dataCounter.data.deal.status, "counter_offered");
    assert.strictEqual(dataCounter.data.deal.counterOffer.counterAmount, 9500);

    console.log("TEST 10: Accept Escrow Deal");
    const resAccept = await fetch(
      `${BASE_URL}/influencer/deals/${dealId}/accept-escrow`,
      { method: "POST", headers: authHeaders }
    );
    const dataAccept = await resAccept.json();
    assert.strictEqual(dataAccept.success, true);
    assert.strictEqual(dataAccept.data.deal.status, "active");
    assert.strictEqual(dataAccept.data.deal.escrowStatus, "Escrow Locked");
    console.log("✓ Counter offer and Escrow acceptance verified\n");

    // ─── TEST 10: Submit Milestone Draft ─────────────────────────────────────
    console.log("TEST 11: Submit Milestone Draft");
    const resDraft = await fetch(
      `${BASE_URL}/influencer/deals/${dealId}/milestones/0/submit-draft`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          draftUrl: "https://drive.google.com/file/d/test_video_v2.mp4",
          notes: "4K draft v2 with requested color grading",
        }),
      }
    );
    const dataDraft = await resDraft.json();
    assert.strictEqual(dataDraft.success, true);
    assert.strictEqual(dataDraft.data.milestone.status, "draft_submitted");
    assert.strictEqual(
      dataDraft.data.milestone.draftUrl,
      "https://drive.google.com/file/d/test_video_v2.mp4"
    );
    console.log("✓ Milestone draft submission verified\n");

    // ─── TEST 11: Socket.IO join_room, send_message & deal_status_changed ────
    console.log("TEST 12: Socket.IO Event Verification");
    const socket = ClientIO(`http://localhost:${PORT}`, {
      auth: { token: `Bearer ${influencerToken}` },
      transports: ["websocket"],
    });

    await new Promise((resolve, reject) => {
      socket.on("connect", resolve);
      socket.on("connect_error", reject);
    });

    // Test join_room
    await new Promise((resolve) => {
      socket.emit("join_room", { conversationId: "test_conv_123" }, (res) => {
        assert(res.success, "join_room should succeed");
        resolve();
      });
    });
    console.log("✓ Socket join_room verified");

    // Test deal_status_changed listener
    const dealStatusPromise = new Promise((resolve) => {
      socket.on("deal_status_changed", (data) => {
        resolve(data);
      });
    });

    // Trigger another deal status change via REST to test socket broadcast
    await fetch(`${BASE_URL}/influencer/deals/${dealId}/counter-offer`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ counterAmount: 9800, termsNote: "Revised" }),
    });

    const socketDealEvent = await dealStatusPromise;
    assert.strictEqual(socketDealEvent.status, "counter_offered");
    console.log("✓ Socket deal_status_changed event received in real-time");

    socket.disconnect();

    console.log("\n==================================================================");
    console.log("🎉 ALL INFLUENCER FEATURE SUITE TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================================");
  } finally {
    server.close();
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
