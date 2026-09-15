import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/User.js";
import InfluencerProfile from "../src/models/InfluencerProfile.js";
import BrandProfile from "../src/models/BrandProfile.js";
import AgencyProfile from "../src/models/AgencyProfile.js";
import Campaign from "../src/models/Campaign.js";
import CampaignApplication from "../src/models/CampaignApplication.js";
import BrandInvite from "../src/models/BrandInvite.js";
import ConnectionRequest from "../src/models/ConnectionRequest.js";
import SavedCampaign from "../src/models/SavedCampaign.js";
import Notification from "../src/models/Notification.js";
import CommunityMembership from "../src/models/CommunityMembership.js";
import InfluencerProfileView from "../src/models/InfluencerProfileView.js";
import CreatorFollow from "../src/models/CreatorFollow.js";
import { deleteAccount } from "../src/application/auth/DeleteAccountService.js";

test("deleteAccount service requires confirmation header and cascades deletion across all records", async (t) => {
  const userId = "507f1f77bcf86cd799439011";
  const mobile = "+919999999999";
  const profileId = "507f1f77bcf86cd799439022";

  // Test missing confirmation
  await assert.rejects(
    async () => {
      await deleteAccount({ user: { userId, role: "influencer" }, confirmed: false });
    },
    { message: "Account deletion confirmation is required" }
  );

  // Mock User.findOne
  t.mock.method(User, "findOne", () => Promise.resolve({ _id: userId, mobile, role: "influencer" }));

  // Mock profile queries
  t.mock.method(InfluencerProfile, "find", () => ({
    select: () => ({
      lean: () => Promise.resolve([{ _id: profileId }]),
    }),
  }));
  t.mock.method(BrandProfile, "find", () => ({
    select: () => ({
      lean: () => Promise.resolve([]),
    }),
  }));
  t.mock.method(AgencyProfile, "find", () => ({
    select: () => ({
      lean: () => Promise.resolve([]),
    }),
  }));

  // Track deletion calls
  let campaignUpdated = false;
  let applicationDeleted = false;
  let brandInviteDeleted = false;
  let connectionRequestDeleted = false;
  let influencerProfileDeleted = false;
  let brandProfileDeleted = false;
  let agencyProfileDeleted = false;
  let userDeleted = false;
  let savedCampaignDeleted = false;
  let notificationDeleted = false;
  let communityMembershipDeleted = false;
  let viewDeleted = false;
  let followDeleted = false;

  t.mock.method(Campaign, "updateMany", () => {
    campaignUpdated = true;
    return Promise.resolve({ modifiedCount: 1 });
  });
  t.mock.method(CampaignApplication, "deleteMany", () => {
    applicationDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(BrandInvite, "deleteMany", () => {
    brandInviteDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(ConnectionRequest, "deleteMany", () => {
    connectionRequestDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(SavedCampaign, "deleteMany", () => {
    savedCampaignDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(Notification, "deleteMany", () => {
    notificationDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(CommunityMembership, "deleteMany", () => {
    communityMembershipDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(InfluencerProfileView, "deleteMany", () => {
    viewDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(CreatorFollow, "deleteMany", () => {
    followDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(InfluencerProfile, "deleteMany", () => {
    influencerProfileDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(BrandProfile, "deleteMany", () => {
    brandProfileDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(AgencyProfile, "deleteMany", () => {
    agencyProfileDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });
  t.mock.method(User, "deleteOne", () => {
    userDeleted = true;
    return Promise.resolve({ deletedCount: 1 });
  });

  const result = await deleteAccount({
    user: { userId, role: "influencer", mobile },
    confirmed: true,
  });

  assert.equal(result.message, "Account permanently deleted");
  assert.equal(campaignUpdated, true);
  assert.equal(applicationDeleted, true);
  assert.equal(brandInviteDeleted, true);
  assert.equal(connectionRequestDeleted, true);
  assert.equal(savedCampaignDeleted, true);
  assert.equal(notificationDeleted, true);
  assert.equal(communityMembershipDeleted, true);
  assert.equal(viewDeleted, true);
  assert.equal(followDeleted, true);
  assert.equal(influencerProfileDeleted, true);
  assert.equal(brandProfileDeleted, true);
  assert.equal(agencyProfileDeleted, true);
  assert.equal(userDeleted, true);
});

test("DELETE /api/v1/auth/account endpoint enforces auth and confirmation header", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "account-deletion-test-secret";
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const token = jwt.sign(
      { userId: "507f1f77bcf86cd799439011", role: "influencer", mobile: "+919999999999" },
      process.env.JWT_SECRET
    );

    // 1. Missing auth token
    const resNoAuth = await fetch(`${base}/api/v1/auth/account`, {
      method: "DELETE",
      headers: { "X-Confirm-Account-Deletion": "true" },
    });
    assert.equal(resNoAuth.status, 401);

    // 2. Missing confirmation header
    const resNoHeader = await fetch(`${base}/api/v1/auth/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(resNoHeader.status, 400);
    const dataNoHeader = await resNoHeader.json();
    assert.equal(dataNoHeader.success, false);
    assert.match(dataNoHeader.message, /confirmation is required/i);

    // 3. Confirmation header is 'false'
    const resFalseHeader = await fetch(`${base}/api/v1/auth/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Confirm-Account-Deletion": "false",
      },
    });
    assert.equal(resFalseHeader.status, 400);

    // 4. Valid call with mock service
    t.mock.method(User, "findOne", () =>
      Promise.resolve({ _id: "507f1f77bcf86cd799439011", role: "influencer", mobile: "+919999999999" })
    );
    t.mock.method(InfluencerProfile, "find", () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }));
    t.mock.method(BrandProfile, "find", () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }));
    t.mock.method(AgencyProfile, "find", () => ({ select: () => ({ lean: () => Promise.resolve([]) }) }));
    t.mock.method(Campaign, "updateMany", () => Promise.resolve({ modifiedCount: 0 }));
    t.mock.method(CampaignApplication, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(BrandInvite, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(ConnectionRequest, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(SavedCampaign, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(CommunityMembership, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(Notification, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(InfluencerProfileView, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(CreatorFollow, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(InfluencerProfile, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(BrandProfile, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(AgencyProfile, "deleteMany", () => Promise.resolve({ deletedCount: 0 }));
    t.mock.method(User, "deleteOne", () => Promise.resolve({ deletedCount: 1 }));

    const resSuccess = await fetch(`${base}/api/v1/auth/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Confirm-Account-Deletion": "true",
      },
    });

    assert.equal(resSuccess.status, 200);
    const dataSuccess = await resSuccess.json();
    assert.deepEqual(dataSuccess, {
      success: true,
      message: "Account permanently deleted",
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
