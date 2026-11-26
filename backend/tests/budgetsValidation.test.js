import test from "node:test";
import assert from "node:assert/strict";
import { validateBudget } from "../src/utils/validateBudget.js";

const valid = { name: "Monthly food", amountLimit: "5000", periodStart: "2026-11-01", periodEnd: "2026-11-30", categoryId: null };
test("budget validation accepts a valid general budget", () => {
  assert.equal(validateBudget(valid).isValid, true);
});
test("budget validation rejects invalid amount, dates and category IDs", () => {
  const result = validateBudget({ ...valid, amountLimit: "0", periodStart: "2026-02-30", categoryId: "bad-id" });
  assert.equal(result.isValid, false);
  for (const field of ["amountLimit", "periodStart", "categoryId"]) assert.ok(result.errors[field]);
});

test("budget validation rejects a reversed but otherwise valid date range", () => {
  const result = validateBudget({ ...valid, periodStart: "2026-11-30", periodEnd: "2026-11-01" });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.periodEnd);
});
