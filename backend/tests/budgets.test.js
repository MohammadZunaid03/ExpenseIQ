import test from "node:test";
import assert from "node:assert/strict";
import { validateBudget } from "../src/utils/validateBudget.js";

const VALID_BUDGET = {
  name: "Monthly essentials",
  amountLimit: "12000.50",
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  categoryId: null,
};

test("budget validation accepts a valid date range and decimal limit", () => {
  const result = validateBudget(VALID_BUDGET);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.amountLimit, "12000.50");
  assert.equal(result.value.categoryId, null);
});

test("budget validation accepts a valid optional category UUID", () => {
  const result = validateBudget({
    ...VALID_BUDGET,
    categoryId: "55555555-5555-4555-8555-555555555555",
  });
  assert.equal(result.isValid, true);
  assert.equal(result.value.categoryId, "55555555-5555-4555-8555-555555555555");
});

test("budget validation rejects impossible dates and reversed ranges", () => {
  const impossible = validateBudget({ ...VALID_BUDGET, periodStart: "2026-02-30" });
  assert.equal(impossible.isValid, false);
  assert.ok(impossible.errors.periodStart);

  const reversed = validateBudget({
    ...VALID_BUDGET,
    periodStart: "2026-11-30",
    periodEnd: "2026-11-01",
  });
  assert.equal(reversed.isValid, false);
  assert.ok(reversed.errors.periodEnd);
});

test("budget validation rejects invalid amounts, names, and category IDs", () => {
  for (const amountLimit of ["0", "-10", "1.999", "1e3", ""]) {
    assert.ok(validateBudget({ ...VALID_BUDGET, amountLimit }).errors.amountLimit);
  }
  assert.ok(validateBudget({ ...VALID_BUDGET, name: " " }).errors.name);
  assert.ok(validateBudget({ ...VALID_BUDGET, categoryId: "not-a-uuid" }).errors.categoryId);
});
