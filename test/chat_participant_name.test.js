import assert from "node:assert/strict";
import test from "node:test";

import {
  mobileLookupCandidates,
  resolveParticipantDisplayName,
} from "../src/application/chat/ChatService.js";

test("chat matches Indian mobile numbers with or without country code", () => {
  assert.deepEqual(mobileLookupCandidates("+91 62845-47315"), [
    "+91 62845-47315",
    "916284547315",
    "6284547315",
    "+916284547315",
  ]);
});

test("chat uses influencer profile name before generic fallbacks", () => {
  assert.equal(
    resolveParticipantDisplayName({
      role: "influencer",
      user: { displayName: "Login Name" },
      profile: { name: "Deeksha Sharma" },
    }),
    "Deeksha Sharma",
  );
});

test("chat uses login display name when influencer profile name is empty", () => {
  assert.equal(
    resolveParticipantDisplayName({
      role: "influencer",
      user: { displayName: "Aarav Creator" },
      profile: { name: "" },
    }),
    "Aarav Creator",
  );
});

test("chat can use connected Instagram handle for an older creator profile", () => {
  assert.equal(
    resolveParticipantDisplayName({
      role: "influencer",
      user: null,
      profile: { instagram: { handle: "creator.handle" } },
    }),
    "creator.handle",
  );
});

test("chat can use a connected LinkedIn name for an older creator profile", () => {
  assert.equal(
    resolveParticipantDisplayName({
      role: "influencer",
      user: null,
      profile: { linkedin: { name: "Ananya Sharma" } },
    }),
    "Ananya Sharma",
  );
});

test("chat only shows Creator when no identity field exists", () => {
  assert.equal(
    resolveParticipantDisplayName({
      role: "influencer",
      user: null,
      profile: null,
    }),
    "Creator",
  );
});
