import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import app from "../src/app.js";

test("v1 and legacy routes preserve authentication and role boundaries", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "versioning-test-only-secret";
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const prefix of ["/api/v1", "/api"]) {
      assert.equal((await fetch(`${base}${prefix}/health`)).status, 200);
      for (const role of ["agency", "brand", "influencer"]) {
        const url = `${base}${prefix}/${role}/profile`;
        assert.equal((await fetch(url)).status, 401);
        for (const other of ["agency", "brand", "influencer"].filter(r => r !== role)) {
          const token = jwt.sign({ role: other, userId: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
          assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).status, 403);
        }
      }
      for (const path of ["/campaigns/507f1f77bcf86cd799439011", "/profiles/me", "/notifications", "/influencers"]) {
        assert.equal((await fetch(`${base}${prefix}${path}`)).status, 401);
      }
      assert.equal((await fetch(`${base}${prefix}/uploads`, { method: "POST" })).status, 401);
    }
    const missing = await fetch(`${base}/api/v1/not-a-route`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).success, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
