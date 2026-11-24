import test from "node:test";
import assert from "node:assert/strict";
import { validateCategory, isValidCategoryId } from "../src/utils/validateCategory.js";

test("category validation accepts valid income and expense categories", () => {
  assert.equal(validateCategory({ name: "Food", type: "expense", color: "#22aa88" }).isValid, true);
  assert.equal(validateCategory({ name: "Salary", type: "income" }).isValid, true);
});

test("category validation rejects missing names, unsupported types and invalid colors", () => {
  const result = validateCategory({ name: " ", type: "transfer", color: "green" });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.type);
  assert.ok(result.errors.color);
});

test("category IDs must be UUIDs", () => {
  assert.equal(isValidCategoryId("33333333-3333-4333-8333-333333333333"), true);
  assert.equal(isValidCategoryId("category-1"), false);
});
