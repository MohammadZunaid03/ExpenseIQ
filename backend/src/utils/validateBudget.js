const DATE_PATTERN = /^\\d{4}-\\d{2}-\\d{2}$/;
function validDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateBudget(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = {};
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const amountText = typeof source.amountLimit === "number" || typeof source.amountLimit === "string" ? String(source.amountLimit).trim() : "";
  const amount = Number(amountText);
  const periodStart = source.periodStart;
  const periodEnd = source.periodEnd;
  const categoryId = source.categoryId == null || source.categoryId === "" ? null : source.categoryId;
  if (!name || name.length > 120) errors.name = "Name is required and must be 120 characters or fewer.";
  if (!/^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0) errors.amountLimit = "Enter a positive amount with up to two decimal places.";
  if (!validDate(periodStart)) errors.periodStart = "Enter a valid start date.";
  if (!validDate(periodEnd)) errors.periodEnd = "Enter a valid end date.";
  if (validDate(periodStart) && validDate(periodEnd) && periodEnd < periodStart) errors.periodEnd = "End date must be on or after start date.";
  if (categoryId !== null && (typeof categoryId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId))) errors.categoryId = "Choose a valid category.";
  return { isValid: Object.keys(errors).length === 0, errors, value: { name, amountLimit: Number.isFinite(amount) ? amount.toFixed(2) : "0.00", periodStart, periodEnd, categoryId } };
}
