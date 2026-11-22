import test from "node:test";
import assert from "node:assert/strict";
import { validateRegistration } from "../src/utils/validateRegistration.js";

test("accepts a valid registration payload", () => {
  const result = validateRegistration({
    fullName: "Zunaid Ahmed",
    email: "zunaid@example.com",
    password: "secure-pass-123",
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test("rejects a missing or too-short name", () => {
  const result = validateRegistration({
    fullName: " ",
    email: "zunaid@example.com",
    password: "secure-pass-123",
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.fullName);
});

test("rejects malformed email addresses", () => {
  const result = validateRegistration({
    fullName: "Zunaid Ahmed",
    email: "not-an-email",
    password: "secure-pass-123",
  });

  assert.ok(result.errors.email);
});

test("rejects passwords shorter than eight characters", () => {
  const result = validateRegistration({
    fullName: "Zunaid Ahmed",
    email: "zunaid@example.com",
    password: "short",
  });

  assert.ok(result.errors.password);
});

test("rejects passwords exceeding bcrypt's 72-byte limit", () => {
  const result = validateRegistration({
    fullName: "Zunaid Ahmed",
    email: "zunaid@example.com",
    password: "é".repeat(37),
  });

  assert.ok(result.errors.password);
});
