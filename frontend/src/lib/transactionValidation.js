const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTransactionForm(values) {
  const errors = {};
  const amount = typeof values.amount === "string" ? values.amount.trim() : String(values.amount ?? "");
  const title = typeof values.title === "string" ? values.title.trim() : "";

  if (!["income", "expense"].includes(values.type)) errors.type = "Choose income or expense.";
  if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
    errors.amount = "Enter a positive amount with up to two decimal places.";
  }
  if (!title || title.length > 160) errors.title = "Enter a title (maximum 160 characters).";
  if (typeof values.description !== "string" || values.description.length > 2000) {
    errors.description = "Description must be 2,000 characters or fewer.";
  }
  if (typeof values.paymentMethod !== "string" || values.paymentMethod.length > 30) {
    errors.paymentMethod = "Payment method must be 30 characters or fewer.";
  }
  if (!isValidDate(values.transactionDate)) errors.transactionDate = "Choose a valid date.";

  return { isValid: Object.keys(errors).length === 0, errors };
}
