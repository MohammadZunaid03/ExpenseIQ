const VALID_TYPES = new Set(["income", "expense"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

function isValidDateOnly(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(\`\${value}T00:00:00.000Z\`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTransaction(input = {}) {
  const errors = {};
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  const type = typeof source.type === "string" ? source.type : "";
  if (!VALID_TYPES.has(type)) errors.type = "Choose either income or expense.";

  const amountText = typeof source.amount === "number" || typeof source.amount === "string"
    ? String(source.amount).trim()
    : "";
  const amount = Number(amountText);
  if (!AMOUNT_PATTERN.test(amountText) || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than zero with up to two decimal places.";
  }

  const title = typeof source.title === "string" ? source.title.trim() : "";
  if (!title || title.length > 160) {
    errors.title = "Title is required and must be 160 characters or fewer.";
  }

  const description = source.description == null ? "" : source.description;
  if (typeof description !== "string" || description.trim().length > 2000) {
    errors.description = "Description must be 2,000 characters or fewer.";
  }

  const paymentMethod = source.paymentMethod == null ? "" : source.paymentMethod;
  if (typeof paymentMethod !== "string" || paymentMethod.trim().length > 30) {
    errors.paymentMethod = "Payment method must be 30 characters or fewer.";
  }

  const transactionDate = source.transactionDate;
  if (!isValidDateOnly(transactionDate)) {
    errors.transactionDate = "Enter a valid transaction date in YYYY-MM-DD format.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value: {
      type,
      amount: Number.isFinite(amount) ? amount.toFixed(2) : "0.00",
      title,
      description: typeof description === "string" ? description.trim() : "",
      paymentMethod: typeof paymentMethod === "string" ? paymentMethod.trim() : "",
      transactionDate,
    },
  };
}

export function validateTransactionFilters(query = {}) {
  const errors = {};
  const type = query.type || "";
  const startDate = query.startDate || "";
  const endDate = query.endDate || "";
  const search = query.search || "";
  const limitText = query.limit == null || query.limit === "" ? "20" : String(query.limit);
  const offsetText = query.offset == null || query.offset === "" ? "0" : String(query.offset);
  const limit = Number(limitText);
  const offset = Number(offsetText);

  if (type && !VALID_TYPES.has(type)) errors.type = "Type must be income or expense.";
  if (startDate && !isValidDateOnly(startDate)) errors.startDate = "Start date must use YYYY-MM-DD format.";
  if (endDate && !isValidDateOnly(endDate)) errors.endDate = "End date must use YYYY-MM-DD format.";
  if (startDate && endDate && isValidDateOnly(startDate) && isValidDateOnly(endDate) && startDate > endDate) {
    errors.endDate = "End date must be on or after the start date.";
  }
  if (typeof search !== "string" || search.length > 100) {
    errors.search = "Search text must be 100 characters or fewer.";
  }
  if (!/^\d+$/.test(limitText) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.limit = "Limit must be a whole number between 1 and 100.";
  }
  if (!/^\d+$/.test(offsetText) || !Number.isInteger(offset) || offset < 0 || offset > 100000) {
    errors.offset = "Offset must be a whole number between 0 and 100,000.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    filters: {
      type,
      startDate,
      endDate,
      search: typeof search === "string" ? search.trim() : "",
      limit,
      offset,
    },
  };
}

export function isValidTransactionId(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
