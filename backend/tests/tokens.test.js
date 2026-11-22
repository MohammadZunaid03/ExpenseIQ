import test from "node:test";
import assert from "node:assert/strict";
import { createAccessToken, getJwtSecret, verifyAccessToken } from "../src/utils/tokens.js";

const originalSecret = process.env.JWT_SECRET;

test("requires a JWT secret of at least 32 bytes", () => {
  try {
    delete process.env.JWT_SECRET;
    assert.throws(() => getJwtSecret(), /JWT_SECRET/);

    process.env.JWT_SECRET = "too-short";
    assert.throws(() => getJwtSecret(), /JWT_SECRET/);
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test("creates and verifies an access token for a user", () => {
  try {
    process.env.JWT_SECRET = "test-secret-that-is-at-least-32-bytes-long";
    const token = createAccessToken("user-123");
    const payload = verifyAccessToken(token);

    assert.equal(payload.sub, "user-123");
    assert.equal(payload.iss, "expenseiq-api");
    assert.equal(payload.aud, "expenseiq-client");
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test("rejects a tampered access token", () => {
  try {
    process.env.JWT_SECRET = "test-secret-that-is-at-least-32-bytes-long";
    const token = createAccessToken("user-123");
    const tamperedToken = `${token.slice(0, -1)}x`;

    assert.throws(() => verifyAccessToken(tamperedToken));
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});
