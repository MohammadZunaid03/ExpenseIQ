import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrency } from "../src/utils/formatCurrency.js";

test("formats whole rupee amounts using Indian currency notation", () => {
  assert.equal(formatCurrency(15000), "₹15,000.00");
});

test("formats decimal rupee amounts", () => {
  assert.equal(formatCurrency(1234.5), "₹1,234.50");
});

test("rejects non-numeric amounts", () => {
  assert.throws(() => formatCurrency("100"), TypeError);
});

test("rejects non-finite amounts", () => {
  assert.throws(() => formatCurrency(Number.NaN), TypeError);
});
