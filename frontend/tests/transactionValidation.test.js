import test from "node:test";
import assert from "node:assert/strict";
import { validateTransactionForm } from "../src/lib/transactionValidation.js";

const validForm = {
  type: "expense",
  amount: "125.50",
  title: "Groceries",
  transactionDate: "2026-11-23",
  paymentMethod: "UPI",
  description: "Weekly shopping",
};

test("accepts a valid expense form", () => {
  assert.deepEqual(validateTransactionForm(validForm), { isValid: true, errors: {} });
});

test("accepts an income form", () => {
  assert.equal(validateTransactionForm({ ...validForm, type: "income" }).isValid, true);
});

test("rejects zero, negative and over-precision amounts", () => {
  for (const amount of ["0", "-1", "1.999", "10000000000"]) {
    assert.ok(validateTransactionForm({ ...validForm, amount }).errors.amount);
  }
});

test("rejects missing title and impossible date", () => {
  const result = validateTransactionForm({ ...validForm, title: " ", transactionDate: "2026-02-30" });
  assert.ok(result.errors.title);
  assert.ok(result.errors.transactionDate);
});

test("enforces optional field limits", () => {
  const result = validateTransactionForm({
    ...validForm,
    paymentMethod: "x".repeat(31),
    description: "x".repeat(2001),
  });
  assert.ok(result.errors.paymentMethod);
  assert.ok(result.errors.description);
});
