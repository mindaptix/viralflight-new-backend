import test from "node:test";
import assert from "node:assert/strict";
import { toDiscoveryCreatorDto } from "../src/application/discovery/mappers/discoveryMapper.js";

test("toDiscoveryCreatorDto resolves image from all supported avatar properties", () => {
  // 1. profileImageUrl
  const p1 = { profileImageUrl: "https://example.com/profile.jpg" };
  const d1 = toDiscoveryCreatorDto(p1);
  assert.equal(d1.imageUrl, "https://example.com/profile.jpg");
  assert.equal(d1.avatarUrl, "https://example.com/profile.jpg");
  assert.equal(d1.profileImageUrl, "https://example.com/profile.jpg");

  // 2. avatarUrl
  const p2 = { avatarUrl: "https://example.com/avatar.jpg" };
  const d2 = toDiscoveryCreatorDto(p2);
  assert.equal(d2.imageUrl, "https://example.com/avatar.jpg");
  assert.equal(d2.avatarUrl, "https://example.com/avatar.jpg");

  // 3. user.avatar
  const p3 = { user: { avatar: "https://example.com/user-avatar.jpg" } };
  const d3 = toDiscoveryCreatorDto(p3);
  assert.equal(d3.imageUrl, "https://example.com/user-avatar.jpg");
  assert.equal(d3.avatarUrl, "https://example.com/user-avatar.jpg");

  // 4. userId.avatar
  const p4 = { userId: { avatar: "https://example.com/userId-avatar.jpg" } };
  const d4 = toDiscoveryCreatorDto(p4);
  assert.equal(d4.imageUrl, "https://example.com/userId-avatar.jpg");
  assert.equal(d4.avatarUrl, "https://example.com/userId-avatar.jpg");

  // 5. instagram.profilePictureUrl fallback
  const p5 = { instagram: { profilePictureUrl: "https://example.com/ig.jpg" } };
  const d5 = toDiscoveryCreatorDto(p5);
  assert.equal(d5.imageUrl, "https://example.com/ig.jpg");
  assert.equal(d5.avatarUrl, "https://example.com/ig.jpg");

  // 6. priority order: profileImageUrl takes priority over user.avatar and instagram
  const p6 = {
    profileImageUrl: "https://example.com/primary.jpg",
    avatarUrl: "https://example.com/secondary.jpg",
    user: { avatar: "https://example.com/user.jpg" },
    instagram: { profilePictureUrl: "https://example.com/ig.jpg" },
  };
  const d6 = toDiscoveryCreatorDto(p6);
  assert.equal(d6.imageUrl, "https://example.com/primary.jpg");

  // 7. empty profile
  const d7 = toDiscoveryCreatorDto({});
  assert.equal(d7.imageUrl, "");
  assert.equal(d7.avatarUrl, "");
});
