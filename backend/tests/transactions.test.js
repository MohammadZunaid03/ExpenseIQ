import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createTransactionsRouter } from "../src/routes/transactions.js";
import { createAccessToken } from "../src/utils/tokens.js";
import {
  validateTransaction,
  validateTransactionFilters,
  isValidTransactionId,
} from "../src/utils/validateTransaction.js";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const TRANSACTION_ID = "33333333-3333-4333-8333-333333333333";
const VALID_TRANSACTION = {
  type: "expense",
  amount: "125.50",
  title: "Groceries",
  description: "Weekly shopping",
  paymentMethod: "UPI",
  transactionDate: "2026-11-23",
};

test("transaction validation accepts valid income and expense records", () => {
  assert.equal(validateTransaction(VALID_TRANSACTION).isValid, true);
  assert.equal(validateTransaction({ ...VALID_TRANSACTION, type: "income" }).isValid, true);
});

test("transaction validation rejects invalid fields and impossible dates", () => {
  const result = validateTransaction({
    ...VALID_TRANSACTION,
    type: "transfer",
    amount: "0",
    title: " ",
    description: "x".repeat(2001),
    paymentMethod: "x".repeat(31),
    transactionDate: "2026-02-30",
  });
  assert.equal(result.isValid, false);
  for (const field of ["type", "amount", "title", "description", "paymentMethod", "transactionDate"]) {
    assert.ok(result.errors[field], "Expected " + field + " validation error");
  }
});

test("filter validation checks date order, type and pagination bounds", () => {
  const result = validateTransactionFilters({
    type: "transfer",
    startDate: "2026-11-24",
    endDate: "2026-11-01",
    limit: "101",
    offset: "-1",
  });
  assert.equal(result.isValid, false);
  for (const field of ["type", "endDate", "limit", "offset"]) assert.ok(result.errors[field]);
});

test("transaction IDs must be UUIDs", () => {
  assert.equal(isValidTransactionId(TRANSACTION_ID), true);
  assert.equal(isValidTransactionId("not-a-uuid"), false);
});

function createFakePool(seed = []) {
  const records = seed.map((record) => ({ ...record }));
  let lastQuery = null;

  return {
    records,
    get lastQuery() { return lastQuery; },
    async query(sql, params) {
      lastQuery = { sql, params };
      if (sql.includes("INSERT INTO transactions")) {
        const [user_id, type, amount, title, description, payment_method, transaction_date] = params;
        const row = {
          id: TRANSACTION_ID,
          user_id,
          type,
          amount,
          title,
          description,
          payment_method,
          transaction_date,
          created_at: "2026-11-23T08:00:00.000Z",
          updated_at: "2026-11-23T08:00:00.000Z",
        };
        records.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("FROM transactions")) {
        return { rows: records.filter((record) => record.user_id === params[0]), rowCount: 1 };
      }
      if (sql.includes("UPDATE transactions")) {
        const [type, amount, title, description, payment_method, transaction_date, id, userId] = params;
        const row = records.find((record) => record.id === id && record.user_id === userId);
        if (!row) return { rows: [], rowCount: 0 };
        Object.assign(row, { type, amount, title, description, payment_method, transaction_date });
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("DELETE FROM transactions")) {
        const [id, userId] = params;
        const index = records.findIndex((record) => record.id === id && record.user_id === userId);
        if (index < 0) return { rows: [], rowCount: 0 };
        records.splice(index, 1);
        return { rows: [{ id }], rowCount: 1 };
      }
      throw new Error("Unexpected SQL in transaction route test.");
    },
  };
}

async function startTestApi(t, pool) {
  process.env.JWT_SECRET = "expenseiq-transaction-route-tests-secret-32-bytes";
  const app = express();
  app.use(express.json());
  app.use("/api/transactions", createTransactionsRouter({ getPool: () => pool }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  return {
    baseUrl: "http://127.0.0.1:" + server.address().port + "/api/transactions",
    token: createAccessToken(USER_A),
  };
}

test("transaction endpoints require a bearer token", async (t) => {
  const api = await startTestApi(t, createFakePool());
  const response = await fetch(api.baseUrl);
  assert.equal(response.status, 401);
});

test("POST validates payloads and creates a user-owned transaction", async (t) => {
  const pool = createFakePool();
  const api = await startTestApi(t, pool);
  const invalid = await fetch(api.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + api.token },
    body: JSON.stringify({ ...VALID_TRANSACTION, amount: "-4" }),
  });
  assert.equal(invalid.status, 400);
  assert.equal(pool.records.length, 0);

  const response = await fetch(api.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + api.token },
    body: JSON.stringify(VALID_TRANSACTION),
  });
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.equal(payload.transaction.amount, "125.50");
  assert.equal(payload.transaction.paymentMethod, "UPI");
  assert.equal(pool.lastQuery.params[0], USER_A);
});

test("GET applies filters and scopes the query to the authenticated user", async (t) => {
  const pool = createFakePool([
    { id: TRANSACTION_ID, user_id: USER_A, type: "expense", amount: "125.50", title: "Groceries", transaction_date: "2026-11-23", created_at: "2026-11-23T08:00:00.000Z" },
    { id: "44444444-4444-4444-8444-444444444444", user_id: USER_B, type: "income", amount: "900.00", title: "Salary", transaction_date: "2026-11-22", created_at: "2026-11-22T08:00:00.000Z" },
  ]);
  const api = await startTestApi(t, pool);
  const params = new URLSearchParams({
    type: "expense",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    search: "grocery",
    limit: "25",
    offset: "5",
  });
  const response = await fetch(api.baseUrl + "?" + params.toString(), {
    headers: { Authorization: "Bearer " + api.token },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.transactions.length, 1);
  assert.match(pool.lastQuery.sql, /user_id = \$1/);
  assert.match(pool.lastQuery.sql, /type = \$2/);
  assert.match(pool.lastQuery.sql, /transaction_date >= \$3/);
  assert.match(pool.lastQuery.sql, /transaction_date <= \$4/);
  assert.match(pool.lastQuery.sql, /ILIKE \$5/);
  assert.deepEqual(pool.lastQuery.params, [USER_A, "expense", "2026-11-01", "2026-11-30", "%grocery%", 25, 5]);
});

test("PUT and DELETE cannot modify another user's transaction", async (t) => {
  const pool = createFakePool([{
    id: TRANSACTION_ID,
    user_id: USER_B,
    type: "expense",
    amount: "125.50",
    title: "Private record",
    description: "",
    payment_method: "UPI",
    transaction_date: "2026-11-23",
    created_at: "2026-11-23T08:00:00.000Z",
    updated_at: "2026-11-23T08:00:00.000Z",
  }]);
  const api = await startTestApi(t, pool);
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + api.token };
  const update = await fetch(api.baseUrl + "/" + TRANSACTION_ID, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...VALID_TRANSACTION, title: "Changed by another user" }),
  });
  const deletion = await fetch(api.baseUrl + "/" + TRANSACTION_ID, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + api.token },
  });

  assert.equal(update.status, 404);
  assert.equal(deletion.status, 404);
  assert.equal(pool.records[0].title, "Private record");
});

test("PUT updates an owned transaction and DELETE removes it", async (t) => {
  const pool = createFakePool([{
    id: TRANSACTION_ID,
    user_id: USER_A,
    type: "expense",
    amount: "125.50",
    title: "Old title",
    description: "",
    payment_method: "UPI",
    transaction_date: "2026-11-23",
    created_at: "2026-11-23T08:00:00.000Z",
    updated_at: "2026-11-23T08:00:00.000Z",
  }]);
  const api = await startTestApi(t, pool);
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + api.token };
  const update = await fetch(api.baseUrl + "/" + TRANSACTION_ID, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...VALID_TRANSACTION, title: "Updated groceries" }),
  });
  const updatePayload = await update.json();
  assert.equal(update.status, 200);
  assert.equal(updatePayload.transaction.title, "Updated groceries");

  const deletion = await fetch(api.baseUrl + "/" + TRANSACTION_ID, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + api.token },
  });
  assert.equal(deletion.status, 200);
  assert.equal(pool.records.length, 0);
});
