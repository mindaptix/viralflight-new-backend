import assert from "node:assert/strict";
import test from "node:test";

import { resolveParticipantDisplayName } from "../src/application/chat/ChatService.js";

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
