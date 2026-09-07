import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import {
  createConnectionRequest,
  getConnectionRequestById,
  listUserConnectionRequests,
  updateConnectionRequestStatus,
} from "../src/application/connections/ConnectionRequestService.js";
import ConnectionRequest from "../src/models/ConnectionRequest.js";
import InfluencerProfile from "../src/models/InfluencerProfile.js";
import Notification from "../src/models/Notification.js";
import User from "../src/models/User.js";

async function runTests() {
  const uri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("No MongoDB URI found in environment");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB for testing");

  try {
    // 1. Create or find test users and profiles
    const testBrandUser = await User.findOneAndUpdate(
      { mobile: "+919999900001", role: "brand" },
      { mobile: "+919999900001", role: "brand", isMobileVerified: true },
      { upsert: true, new: true }
    );

    const testCreatorUser = await User.findOneAndUpdate(
      { mobile: "+919999900002", role: "influencer" },
      { mobile: "+919999900002", role: "influencer", isMobileVerified: true },
      { upsert: true, new: true }
    );

    const testCreatorProfile = await InfluencerProfile.findOneAndUpdate(
      { mobile: "+919999900002" },
      {
        userId: testCreatorUser._id,
        mobile: "+919999900002",
        name: "Test Creator",
        city: "Mumbai",
        instagramHandle: "testcreator",
      },
      { upsert: true, new: true }
    );

    const brandUserContext = {
      userId: testBrandUser._id,
      role: "brand",
      mobile: testBrandUser.mobile,
    };

    const creatorUserContext = {
      userId: testCreatorUser._id,
      role: "influencer",
      mobile: testCreatorUser.mobile,
    };

    console.log("✓ Test setup ready with Brand and Creator");

    // Clean previous test data
    await ConnectionRequest.deleteMany({ brandId: testBrandUser._id });
    await Notification.deleteMany({ userId: { $in: [testBrandUser._id, testCreatorUser._id] } });

    // 2. Test POST /api/connections/requests (kind = "quote")
    console.log("\nTesting Create Quote Request...");
    const quoteReqResult = await createConnectionRequest({
      user: brandUserContext,
      body: {
        creator_id: testCreatorProfile._id.toString(),
        kind: "quote",
        brand_name: "Acme Fitness",
        brand_niche: "Fitness & Wellness",
        message: "Please share your quote for a paid collaboration.",
        budget_display: "$500 - $1,000",
        deliverable: "1 Reel + 2 Stories",
        city: "Mumbai",
      },
    });

    console.log("Create Quote Response:", JSON.stringify(quoteReqResult, null, 2));
    if (
      !quoteReqResult.data.id ||
      quoteReqResult.data.kind !== "quote" ||
      quoteReqResult.data.status !== "pending" ||
      quoteReqResult.data.brand_name !== "Acme Fitness" ||
      quoteReqResult.data.budget_display !== "$500 - $1,000" ||
      quoteReqResult.data.deliverable !== "1 Reel + 2 Stories"
    ) {
      throw new Error("Create Quote Request failed assertion");
    }
    console.log("✓ Create Quote Request passed");

    // Verify notification was created for creator
    const creatorNotification = await Notification.findOne({
      userId: testCreatorUser._id,
      targetId: quoteReqResult.data.id,
    });
    if (!creatorNotification || creatorNotification.type !== "quote_request") {
      throw new Error("Creator notification was not created properly");
    }
    console.log("✓ Creator Notification verified in DB:", creatorNotification.title);

    // 3. Test POST /api/connections/requests (kind = "connection")
    console.log("\nTesting Create Connection Request...");
    const connReqResult = await createConnectionRequest({
      user: brandUserContext,
      body: {
        creator_id: testCreatorProfile._id.toString(),
        kind: "connection",
        brand_name: "Acme Fitness",
        brand_niche: "Fitness & Wellness",
        message: "Let's connect for future opportunities.",
      },
    });

    if (
      !connReqResult.data.id ||
      connReqResult.data.kind !== "connection" ||
      connReqResult.data.status !== "pending"
    ) {
      throw new Error("Create Connection Request failed assertion");
    }
    console.log("✓ Create Connection Request passed");

    // 4. Test GET /api/connections (Creator inbox)
    console.log("\nTesting List Connections as Creator...");
    const creatorInbox = await listUserConnectionRequests({
      user: creatorUserContext,
      query: { page: "1", limit: "10" },
    });
    console.log("Creator Inbox List:", JSON.stringify(creatorInbox, null, 2));
    if (
      creatorInbox.data.length < 2 ||
      !creatorInbox.data[0].is_incoming ||
      creatorInbox.pagination.total < 2
    ) {
      throw new Error("Creator inbox list assertion failed");
    }
    console.log("✓ Creator inbox list passed with is_incoming: true");

    // 5. Test GET /api/connections?type=quotes
    console.log("\nTesting List Filtered by type=quotes...");
    const filteredQuotes = await listUserConnectionRequests({
      user: creatorUserContext,
      query: { type: "quotes" },
    });
    if (
      filteredQuotes.data.length !== 1 ||
      filteredQuotes.data[0].kind !== "quote"
    ) {
      throw new Error("Filter by type=quotes failed");
    }
    console.log("✓ Filter by type=quotes passed");

    // 6. Test GET /api/connections as Brand
    console.log("\nTesting List Connections as Brand...");
    const brandOutbox = await listUserConnectionRequests({
      user: brandUserContext,
      query: {},
    });
    if (
      brandOutbox.data.length < 2 ||
      brandOutbox.data[0].is_incoming !== false
    ) {
      throw new Error("Brand outbox list assertion failed");
    }
    console.log("✓ Brand outbox list passed with is_incoming: false");

    // 7. Test PATCH /api/connections/:id/status (Creator accepts quote request)
    console.log("\nTesting PATCH status to 'accepted'...");
    const patchResult = await updateConnectionRequestStatus({
      user: creatorUserContext,
      requestId: quoteReqResult.data.id,
      body: { status: "accepted" },
    });
    console.log("Patch Response:", JSON.stringify(patchResult, null, 2));
    if (
      patchResult.data.status !== "accepted" ||
      !patchResult.data.updated_at
    ) {
      throw new Error("PATCH status failed assertion");
    }
    console.log("✓ PATCH status to accepted passed");

    // Check notification to brand
    const brandNotification = await Notification.findOne({
      userId: testBrandUser._id,
      targetId: quoteReqResult.data.id,
    });
    if (!brandNotification) {
      throw new Error("Brand notification was not created on status update");
    }
    console.log("✓ Brand Notification verified on status update:", brandNotification.title);

    // 8. Test GET /api/connections/:id
    console.log("\nTesting Get Request By ID...");
    const singleReq = await getConnectionRequestById({
      user: brandUserContext,
      requestId: quoteReqResult.data.id,
    });
    if (singleReq.data.status !== "accepted") {
      throw new Error("Get single request failed");
    }
    console.log("✓ Get Request By ID passed");

    // 9. Test Error Handling (Invalid status, invalid role, missing fields)
    console.log("\nTesting Error Handling...");
    try {
      await updateConnectionRequestStatus({
        user: creatorUserContext,
        requestId: quoteReqResult.data.id,
        body: { status: "invalid_status" },
      });
      throw new Error("Should have thrown ValidationError for invalid status");
    } catch (err) {
      if (err.statusCode === 400) {
        console.log("✓ Caught expected 400 ValidationError for invalid status");
      } else {
        throw err;
      }
    }

    try {
      await createConnectionRequest({
        user: creatorUserContext, // influencer cannot create request
        body: { creator_id: testCreatorProfile._id.toString() },
      });
      throw new Error("Should have thrown ForbiddenError for influencer creating request");
    } catch (err) {
      if (err.statusCode === 403) {
        console.log("✓ Caught expected 403 ForbiddenError for influencer creating request");
      } else {
        throw err;
      }
    }

    // Clean up test records
    await ConnectionRequest.deleteMany({ brandId: testBrandUser._id });
    await Notification.deleteMany({ userId: { $in: [testBrandUser._id, testCreatorUser._id] } });

    console.log("\n==================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================");

  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
