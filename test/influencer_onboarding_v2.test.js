import test from "node:test";
import assert from "node:assert/strict";

import InfluencerProfile, {
  getDefaultOnboardingSettings,
} from "../src/models/InfluencerProfile.js";
import { containsAbusiveLanguage } from "../src/application/chat/communityModerationService.js";

test("simplified influencer onboarding supports custom cities and creator types", () => {
  const profile = new InfluencerProfile({
    mobile: "+919999999999",
    name: "Creator",
    city: "Siliguri",
    profileType: "community",
    platforms: [{ platform: "instagram", username: "creator" }],
    contentCategories: ["Comedy"],
    contentLanguages: [],
  });
  assert.equal(profile.validateSync(), undefined);
  assert.equal(profile.city, "Siliguri");
  assert.equal(profile.profileType, "community");
});

test("India onboarding options exclude TikTok", () => {
  const settings = getDefaultOnboardingSettings();
  assert.equal(settings.primaryPlatforms.includes("tiktok"), false);
  assert.equal(settings.platforms.some((item) => item.platform === "tiktok"), false);
});

test("community moderation detects abusive language without blocking normal messages", () => {
  assert.equal(containsAbusiveLanguage("Hello creators, great work"), false);
  assert.equal(containsAbusiveLanguage("you are a chutiya"), true);
  assert.equal(containsAbusiveLanguage("you are a b1tch"), true);
});
