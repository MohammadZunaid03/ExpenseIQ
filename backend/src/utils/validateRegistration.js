const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_BYTES = 72;

export function validateRegistration(input = {}) {
  const errors = {};

  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = "Name must be between 2 and 80 characters.";
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (password.length < 8) {
    errors.password = "Password must contain at least 8 characters.";
  } else if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    errors.password = "Password must not exceed 72 bytes.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
