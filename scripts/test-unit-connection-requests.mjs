import assert from "assert";
import mongoose from "mongoose";

import {
  createConnectionRequest,
  getConnectionRequestById,
  listUserConnectionRequests,
  updateConnectionRequestStatus,
} from "../src/application/connections/ConnectionRequestService.js";
import AgencyProfile from "../src/models/AgencyProfile.js";
import BrandProfile from "../src/models/BrandProfile.js";
import ConnectionRequest from "../src/models/ConnectionRequest.js";
import InfluencerProfile from "../src/models/InfluencerProfile.js";
import Notification from "../src/models/Notification.js";
import User from "../src/models/User.js";

async function runUnitTests() {
  console.log("Running Unit Test Suite for Quote & Connection Requests...\n");

  const brandUserId = new mongoose.Types.ObjectId();
  const agencyUserId = new mongoose.Types.ObjectId();
  const creatorUserId = new mongoose.Types.ObjectId();
  const creatorProfileId = new mongoose.Types.ObjectId();
  const reqId = new mongoose.Types.ObjectId();

  const brandUser = { userId: brandUserId, role: "brand", mobile: "+919876543210" };
  const agencyUser = { userId: agencyUserId, role: "agency", mobile: "+919876543211" };
  const creatorUser = { userId: creatorUserId, role: "influencer", mobile: "+919876543212" };

  const fakeCreatorProfile = {
    _id: creatorProfileId,
    userId: creatorUserId,
    mobile: "+919876543212",
    name: "Aman Sharma",
    city: "Mumbai",
  };

  const fakeBrandProfile = {
    userId: brandUserId,
    brandName: "Acme Fitness",
    industry: "Fitness & Wellness",
  };

  const fakeAgencyProfile = {
    userId: agencyUserId,
    agencyName: "Super Viral Agency",
    niches: ["Tech", "Gaming"],
    agencyType: "Influencer Marketing",
  };

  let mockNotifications = [];
  let mockRequests = [];

  // Mock InfluencerProfile
  InfluencerProfile.findById = async (id) => {
    if (String(id) === String(creatorProfileId)) return fakeCreatorProfile;
    return null;
  };
  InfluencerProfile.findOne = async (query) => {
    if (query?._id && String(query._id) === String(creatorProfileId)) return fakeCreatorProfile;
    if (query?.mobile === "+919876543212" || query?.userId?.equals?.(creatorUserId)) {
      return {
        ...fakeCreatorProfile,
        select: () => ({ _id: creatorProfileId }),
      };
    }
    return null;
  };

  // Mock User
  User.findById = async (id) => {
    if (String(id) === String(creatorUserId)) {
      return { _id: creatorUserId, mobile: "+919876543212", role: "influencer" };
    }
    return null;
  };

  // Mock BrandProfile & AgencyProfile
  BrandProfile.findOne = async () => fakeBrandProfile;
  AgencyProfile.findOne = async () => fakeAgencyProfile;

  // Mock Notification.create
  Notification.create = async (doc) => {
    mockNotifications.push({ ...doc, _id: new mongoose.Types.ObjectId() });
    return doc;
  };

  // Mock ConnectionRequest.create
  ConnectionRequest.create = async (doc) => {
    const created = {
      ...doc,
      _id: reqId,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () { return this; },
    };
    mockRequests.push(created);
    return created;
  };

  // ─── TEST 1: Create Quote Request (Brand -> Creator) ─────────────────────
  console.log("TEST 1: Create Quote Request from Brand");
  const quoteResult = await createConnectionRequest({
    user: brandUser,
    body: {
      creator_id: String(creatorProfileId),
      kind: "quote",
      brand_name: "Acme Fitness",
      brand_niche: "Fitness & Wellness",
      message: "Please share your quote for a paid collaboration.",
      budget_display: "$500 - $1,000",
      deliverable: "1 Reel + 2 Stories",
      city: "Mumbai",
    },
  });

  assert.strictEqual(quoteResult.data.kind, "quote");
  assert.strictEqual(quoteResult.data.status, "pending");
  assert.strictEqual(quoteResult.data.creator_id, String(creatorUserId));
  assert.strictEqual(quoteResult.data.brand_id, String(brandUserId));
  assert.strictEqual(quoteResult.data.brand_name, "Acme Fitness");
  assert.strictEqual(quoteResult.data.brand_niche, "Fitness & Wellness");
  assert.strictEqual(quoteResult.data.budget_display, "$500 - $1,000");
  assert.strictEqual(quoteResult.data.deliverable, "1 Reel + 2 Stories");
  assert.strictEqual(quoteResult.data.city, "Mumbai");
  assert(quoteResult.data.created_at, "created_at should be present");
  console.log("✓ TEST 1 Passed");

  // Check notification created
  assert.strictEqual(mockNotifications.length, 1);
  assert.strictEqual(mockNotifications[0].userId.toString(), creatorUserId.toString());
  assert.strictEqual(mockNotifications[0].type, "quote_request");
  assert.strictEqual(mockNotifications[0].title, "New Quote Request");
  console.log("✓ Creator Notification created and verified");

  // ─── TEST 2: Create Connection Request with Auto-Resolved Agency Info ────
  console.log("\nTEST 2: Create Connection Request with Agency Profile Auto-Resolution");
  const connResult = await createConnectionRequest({
    user: agencyUser,
    body: {
      creator_id: String(creatorProfileId),
      kind: "connection",
      message: "Let's connect for future brand deals.",
    },
  });

  assert.strictEqual(connResult.data.kind, "connection");
  assert.strictEqual(connResult.data.brand_name, "Super Viral Agency");
  assert.strictEqual(connResult.data.brand_niche, "Tech, Gaming");
  assert.strictEqual(connResult.data.city, "Mumbai"); // resolved from creator profile
  console.log("✓ TEST 2 Passed");

  // ─── TEST 3: List Requests for Creator (Inbox) ───────────────────────────
  console.log("\nTEST 3: List Requests as Creator (Inbox)");
  ConnectionRequest.countDocuments = async (filter) => mockRequests.length;
  ConnectionRequest.find = (filter) => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => mockRequests,
        }),
      }),
    }),
  });

  const creatorInbox = await listUserConnectionRequests({
    user: creatorUser,
    query: { page: "1", limit: "20" },
  });

  assert.strictEqual(creatorInbox.data.length, 2);
  assert.strictEqual(creatorInbox.data[0].is_incoming, true);
  assert.strictEqual(creatorInbox.pagination.total, 2);
  assert.strictEqual(creatorInbox.pagination.page, 1);
  assert.strictEqual(creatorInbox.pagination.limit, 20);
  console.log("✓ TEST 3 Passed");

  // ─── TEST 4: List Requests for Brand (Outbox) ────────────────────────────
  console.log("\nTEST 4: List Requests as Brand (Outbox)");
  const brandOutbox = await listUserConnectionRequests({
    user: brandUser,
    query: { type: "quotes" },
  });

  assert.strictEqual(brandOutbox.data[0].is_incoming, false);
  console.log("✓ TEST 4 Passed");

  // ─── TEST 5: Update Status to Accepted as Creator ────────────────────────
  console.log("\nTEST 5: Update Request Status to 'accepted'");
  const activeDoc = {
    _id: reqId,
    creatorId: creatorUserId,
    creatorProfileId: creatorProfileId,
    creatorMobile: "+919876543212",
    brandId: brandUserId,
    brandRole: "brand",
    brandName: "Acme Fitness",
    kind: "quote",
    status: "pending",
    save: async function () { return this; },
  };

  ConnectionRequest.findById = async (id) => activeDoc;

  const patchAccepted = await updateConnectionRequestStatus({
    user: creatorUser,
    requestId: String(reqId),
    body: { status: "accepted" },
  });

  assert.strictEqual(patchAccepted.message, "Request status updated to accepted");
  assert.strictEqual(patchAccepted.data.id, String(reqId));
  assert.strictEqual(patchAccepted.data.status, "accepted");
  assert(patchAccepted.data.updated_at);
  console.log("✓ TEST 5 Passed");

  // ─── TEST 6: Update Status to Disconnected ──────────────────────────────
  console.log("\nTEST 6: Update Request Status to 'disconnected'");
  const patchDisconnected = await updateConnectionRequestStatus({
    user: brandUser,
    requestId: String(reqId),
    body: { status: "disconnected" },
  });

  assert.strictEqual(patchDisconnected.data.status, "disconnected");
  console.log("✓ TEST 6 Passed");

  // ─── TEST 7: Get Request By ID ──────────────────────────────────────────
  console.log("\nTEST 7: Get Request by ID");
  ConnectionRequest.findById = (id) => ({
    lean: async () => activeDoc,
  });

  const getByIdResult = await getConnectionRequestById({
    user: creatorUser,
    requestId: String(reqId),
  });

  assert.strictEqual(getByIdResult.data.id, String(reqId));
  assert.strictEqual(getByIdResult.data.is_incoming, true);
  console.log("✓ TEST 7 Passed");

  // ─── TEST 8: Validation & Error Handling ─────────────────────────────────
  console.log("\nTEST 8: Validations & Authorization Errors");

  // Influencer cannot create request
  try {
    await createConnectionRequest({
      user: creatorUser,
      body: { creator_id: String(creatorProfileId) },
    });
    assert.fail("Should have thrown ForbiddenError for influencer creating request");
  } catch (err) {
    assert.strictEqual(err.statusCode, 403);
    console.log("✓ Role check enforced: 403 Forbidden");
  }

  // Invalid kind
  try {
    await createConnectionRequest({
      user: brandUser,
      body: { creator_id: String(creatorProfileId), kind: "invalid_kind" },
    });
    assert.fail("Should have thrown ValidationError for invalid kind");
  } catch (err) {
    assert.strictEqual(err.statusCode, 400);
    console.log("✓ Invalid kind rejected: 400 Bad Request");
  }

  // Invalid status
  try {
    await updateConnectionRequestStatus({
      user: creatorUser,
      requestId: String(reqId),
      body: { status: "some_weird_status" },
    });
    assert.fail("Should have thrown ValidationError for invalid status");
  } catch (err) {
    assert.strictEqual(err.statusCode, 400);
    console.log("✓ Invalid status rejected: 400 Bad Request");
  }

  // Unauthorized user
  const randomUser = { userId: new mongoose.Types.ObjectId(), role: "brand", mobile: "+911111111111" };
  try {
    await updateConnectionRequestStatus({
      user: randomUser,
      requestId: String(reqId),
      body: { status: "accepted" },
    });
    assert.fail("Should have thrown ForbiddenError for unrelated user");
  } catch (err) {
    assert.strictEqual(err.statusCode, 403);
    console.log("✓ Unauthorized user update rejected: 403 Forbidden");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 8 UNIT TESTS PASSED WITH 100% ACCURACY! 🎉");
  console.log("==================================================");
}

runUnitTests().catch((err) => {
  console.error("Unit test failed:", err);
  process.exit(1);
});
