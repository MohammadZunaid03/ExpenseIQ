import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createBudgetsRouter } from "../src/routes/budgets.js";
import { createAccessToken } from "../src/utils/tokens.js";
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


const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const BUDGET_ID = "33333333-3333-4333-8333-333333333333";
const CATEGORY_ID = "55555555-5555-4555-8555-555555555555";

function createBudgetPool(ownerId = USER_A) {
  const queries = [];
  return { queries, async query(sql, params = []) {
    queries.push({ sql, params });
    if (sql.includes("SELECT id FROM categories")) {
      const valid = params[0] === CATEGORY_ID && params[1] === USER_A;
      return { rows: valid ? [{ id: CATEGORY_ID }] : [], rowCount: valid ? 1 : 0 };
    }
    if (sql.includes("SELECT b.id")) return { rows: [{
      id: BUDGET_ID, categoryId: null, name: "Monthly essentials",
      amountLimit: "12000.50", periodStart: "2026-11-01",
      periodEnd: "2026-11-30", categoryName: null, spent: "2450.25",
    }], rowCount: 1 };
    if (sql.startsWith("INSERT INTO budgets")) return { rows: [{ id: BUDGET_ID }], rowCount: 1 };
    if (sql.startsWith("UPDATE budgets")) {
      const owned = params[5] === BUDGET_ID && params[6] === ownerId;
      return { rows: owned ? [{ id: BUDGET_ID }] : [], rowCount: owned ? 1 : 0 };
    }
    if (sql.startsWith("DELETE FROM budgets")) {
      const owned = params[0] === BUDGET_ID && params[1] === ownerId;
      return { rows: owned ? [{ id: BUDGET_ID }] : [], rowCount: owned ? 1 : 0 };
    }
    throw new Error("Unexpected SQL in budget route test: " + sql);
  }};
}

async function startBudgetApi(t, pool) {
  process.env.JWT_SECRET = "expenseiq-budget-route-tests-secret-32-bytes";
  const app = express();
  app.use(express.json());
  app.use("/api/budgets", createBudgetsRouter({ getPool: () => pool }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  return { url: "http://127.0.0.1:" + server.address().port + "/api/budgets", token: createAccessToken(USER_A) };
}

test("budget routes require authentication", async (t) => {
  const api = await startBudgetApi(t, createBudgetPool());
  assert.equal((await fetch(api.url)).status, 401);
});

test("GET calculates spent, remaining and percent used for the signed-in user's budgets", async (t) => {
  const pool = createBudgetPool(), api = await startBudgetApi(t, pool);
  const response = await fetch(api.url, { headers: { Authorization: "Bearer " + api.token } });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.budgets[0].spent, "2450.25");
  assert.equal(payload.budgets[0].remaining, "9550.25");
  assert.equal(payload.budgets[0].percentUsed, 20);
  assert.match(pool.queries[0].sql, /WHERE b\.user_id = \$1/);
  assert.deepEqual(pool.queries[0].params, [USER_A]);
});

test("POST rejects an unavailable category and creates a budget with an owned expense category", async (t) => {
  const pool = createBudgetPool(), api = await startBudgetApi(t, pool);
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + api.token };
  const details = { name: "Food budget", amountLimit: "5000.00", periodStart: "2026-11-01", periodEnd: "2026-11-30", categoryId: "66666666-6666-4666-8666-666666666666" };
  const invalid = await fetch(api.url, { method: "POST", headers, body: JSON.stringify(details) });
  assert.equal(invalid.status, 400);
  assert.equal(pool.queries.some((q) => q.sql.startsWith("INSERT INTO budgets")), false);
  const valid = await fetch(api.url, { method: "POST", headers, body: JSON.stringify({ ...details, categoryId: CATEGORY_ID }) });
  assert.equal(valid.status, 201);
  const insert = pool.queries.find((q) => q.sql.startsWith("INSERT INTO budgets"));
  assert.deepEqual(insert.params.slice(0, 2), [USER_A, CATEGORY_ID]);
});

test("PUT and DELETE cannot modify another user's budget", async (t) => {
  const pool = createBudgetPool(USER_B), api = await startBudgetApi(t, pool);
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + api.token };
  const details = { name: "Updated budget", amountLimit: "6000.00", periodStart: "2026-11-01", periodEnd: "2026-11-30", categoryId: null };
  const update = await fetch(api.url + "/" + BUDGET_ID, { method: "PUT", headers, body: JSON.stringify(details) });
  const deletion = await fetch(api.url + "/" + BUDGET_ID, { method: "DELETE", headers: { Authorization: "Bearer " + api.token } });
  assert.equal(update.status, 404);
  assert.equal(deletion.status, 404);
  const uq = pool.queries.find((q) => q.sql.startsWith("UPDATE budgets"));
  const dq = pool.queries.find((q) => q.sql.startsWith("DELETE FROM budgets"));
  assert.match(uq.sql, /WHERE id=\$6 AND user_id=\$7/);
  assert.equal(uq.params[6], USER_A);
  assert.deepEqual(dq.params, [BUDGET_ID, USER_A]);
});

test("PUT and DELETE succeed for a budget owned by the signed-in user", async (t) => {
  const pool = createBudgetPool(USER_A), api = await startBudgetApi(t, pool);
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + api.token };
  const details = { name: "Updated budget", amountLimit: "6000.00", periodStart: "2026-11-01", periodEnd: "2026-11-30", categoryId: null };
  const update = await fetch(api.url + "/" + BUDGET_ID, { method: "PUT", headers, body: JSON.stringify(details) });
  const deletion = await fetch(api.url + "/" + BUDGET_ID, { method: "DELETE", headers: { Authorization: "Bearer " + api.token } });
  assert.equal(update.status, 200);
  assert.equal(deletion.status, 200);
});
