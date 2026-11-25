const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const TOKEN_KEY = "expenseiq_access_token";

export function getStoredAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeAccessToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (options.body) headers.set("Content-Type", "application/json");

  const token = options.token ?? getStoredAccessToken();
  if (token) headers.set("Authorization", "Bearer " + token);

  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.message || "The request could not be completed.");
  }

  return payload;
}

export function getApiHealth() {
  return request("/health");
}

export function registerUser(details) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(details),
    token: null,
  });
}

export function loginUser(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    token: null,
  });
}

export function getCurrentUser() {
  return request("/auth/me");
}

export function getTransactions(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return request("/transactions" + (query ? "?" + query : ""));
}

export function createTransaction(details) {
  return request("/transactions", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function updateTransaction(id, details) {
  return request("/transactions/" + encodeURIComponent(id), {
    method: "PUT",
    body: JSON.stringify(details),
  });
}

export function deleteTransaction(id) {
  return request("/transactions/" + encodeURIComponent(id), {
    method: "DELETE",
  });
}

export { API_BASE_URL };

export function getCategories() {
  return request("/categories");
}
export function createCategory(details) {
  return request("/categories", { method: "POST", body: JSON.stringify(details) });
}
export function deleteCategory(id) {
  return request("/categories/" + encodeURIComponent(id), { method: "DELETE" });
}
export function getBudgets() {
  return request("/budgets");
}
export function createBudget(details) {
  return request("/budgets", { method: "POST", body: JSON.stringify(details) });
}
export function updateBudget(id, details) {\n  return request("/budgets/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(details) });\n}\nexport function deleteBudget(id) {
  return request("/budgets/" + encodeURIComponent(id), { method: "DELETE" });
}
