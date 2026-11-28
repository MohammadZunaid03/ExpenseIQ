import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createOverviewRouter } from "../src/routes/overview.js";
import { createAccessToken } from "../src/utils/tokens.js";

const USER_A = "11111111-1111-4111-8111-111111111111";

function createOverviewPool(row = {}) {
  const queries = [];
  return {
    queries,
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [{ totalIncome: "50000.00", totalExpenses: "12500.00", monthIncome: "8000.00", monthExpenses: "2500.00", previousMonthIncome: "6000.00", previousMonthExpenses: "3000.00", ...row }], rowCount: 1 };
    },
  };
}

async function startOverviewApi(t, pool) {
  process.env.JWT_SECRET = "expenseiq-overview-route-tests-secret-32-bytes";
  const app = express();
  app.use("/api/overview", createOverviewRouter({ getPool: () => pool }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  return { url: "http://127.0.0.1:" + server.address().port + "/api/overview", token: createAccessToken(USER_A) };
}

test("overview endpoint requires authentication", async (t) => {
  const api = await startOverviewApi(t, createOverviewPool());
  const response = await fetch(api.url);
  assert.equal(response.status, 401);
});

test("overview returns calculated balance and month totals for the authenticated user", async (t) => {
  const pool = createOverviewPool();
  const api = await startOverviewApi(t, pool);
  const response = await fetch(api.url, { headers: { Authorization: "Bearer " + api.token } });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.overview, {
    totalBalance: "37500.00",
    monthIncome: "8000.00",
    monthExpenses: "2500.00",
    incomeChange: 33.3,
    expenseChange: -16.7,
  });
  assert.match(pool.queries[0].sql, /WHERE user_id = \$1/);
  assert.deepEqual(pool.queries[0].params, [USER_A]);
});

test("overview handles months without previous-period activity without dividing by zero", async (t) => {
  const pool = createOverviewPool({ previousMonthIncome: "0.00", previousMonthExpenses: "0.00" });
  const api = await startOverviewApi(t, pool);
  const response = await fetch(api.url, { headers: { Authorization: "Bearer " + api.token } });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.overview.incomeChange, null);
  assert.equal(payload.overview.expenseChange, null);
});

test("overview returns zero totals for a new account", async (t) => {
  const pool = createOverviewPool({
    totalIncome: "0.00", totalExpenses: "0.00", monthIncome: "0.00",
    monthExpenses: "0.00", previousMonthIncome: "0.00", previousMonthExpenses: "0.00",
  });
  const api = await startOverviewApi(t, pool);
  const response = await fetch(api.url, { headers: { Authorization: "Bearer " + api.token } });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.overview.totalBalance, "0.00");
  assert.equal(payload.overview.incomeChange, 0);
  assert.equal(payload.overview.expenseChange, 0);
});
