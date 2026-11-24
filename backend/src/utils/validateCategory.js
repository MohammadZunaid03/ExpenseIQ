const VALID_TYPES = new Set(["income", "expense"]);
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function validateCategory(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = {};
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const type = typeof source.type === "string" ? source.type : "";
  const color = source.color == null || source.color === "" ? "#64748b" : source.color;
  if (!name || name.length > 80) errors.name = "Name is required and must be 80 characters or fewer.";
  if (!VALID_TYPES.has(type)) errors.type = "Type must be income or expense.";
  if (typeof color !== "string" || !COLOR_PATTERN.test(color)) errors.color = "Color must be a six-digit hex value.";
  return { isValid: Object.keys(errors).length === 0, errors, value: { name, type, color } };
}

export function isValidCategoryId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
