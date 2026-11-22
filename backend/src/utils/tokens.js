import jwt from "jsonwebtoken";

const TOKEN_ISSUER = "expenseiq-api";
const TOKEN_AUDIENCE = "expenseiq-client";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes.");
  }

  return secret;
}

export function createAccessToken(userId) {
  return jwt.sign(
    {},
    getJwtSecret(),
    {
      algorithm: "HS256",
      subject: String(userId),
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}
