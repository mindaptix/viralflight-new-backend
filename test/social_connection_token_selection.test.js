import test from "node:test";
import assert from "node:assert/strict";

import InfluencerSocialConnection from "../src/models/InfluencerSocialConnection.js";

test("explicit parent selection loads encrypted social tokens", () => {
  const query = InfluencerSocialConnection.findOne().select(
    "+accessToken +refreshToken"
  );
  query._applyPaths();

  const projection = query.projection();
  assert.equal(projection["accessToken.iv"], undefined);
  assert.equal(projection["accessToken.tag"], undefined);
  assert.equal(projection["accessToken.value"], undefined);
  assert.equal(projection["refreshToken.iv"], undefined);
  assert.equal(projection["refreshToken.tag"], undefined);
  assert.equal(projection["refreshToken.value"], undefined);
});

test("social tokens remain excluded from ordinary queries", () => {
  const query = InfluencerSocialConnection.findOne();
  query._applyPaths();

  assert.equal(query.projection().accessToken, 0);
  assert.equal(query.projection().refreshToken, 0);
});
