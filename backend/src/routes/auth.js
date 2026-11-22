import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDatabasePool } from "../config/database.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { createAccessToken, getJwtSecret } from "../utils/tokens.js";
import { validateRegistration } from "../utils/validateRegistration.js";

const router = Router();

function authConfigurationAvailable(response) {
  try {
    getJwtSecret();
    return true;
  } catch {
    response.status(503).json({
      success: false,
      message: "Authentication is not configured. Set a JWT_SECRET of at least 32 bytes.",
    });
    return false;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    ...(user.created_at ? { createdAt: user.created_at } : {}),
  };
}

router.post("/register", async (request, response) => {
  const validation = validateRegistration(request.body);

  if (!validation.isValid) {
    return response.status(400).json({
      success: false,
      message: "Please correct the highlighted registration details.",
      errors: validation.errors,
    });
  }

  const pool = getDatabasePool();
  if (!pool) {
    return response.status(503).json({
      success: false,
      message: "Registration is temporarily unavailable because the database is not configured.",
    });
  }
  if (!authConfigurationAvailable(response)) return;

  const fullName = request.body.fullName.trim();
  const email = request.body.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(request.body.password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, created_at`,
      [fullName, email, passwordHash],
    );

    const user = result.rows[0];
    return response.status(201).json({
      success: true,
      message: "Your ExpenseIQ account has been created.",
      accessToken: createAccessToken(user.id),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === "23505") {
      return response.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    throw error;
  }
});

router.post("/login", async (request, response) => {
  const email = typeof request.body?.email === "string"
    ? request.body.email.trim().toLowerCase()
    : "";
  const password = typeof request.body?.password === "string"
    ? request.body.password
    : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || Buffer.byteLength(password, "utf8") < 1
    || Buffer.byteLength(password, "utf8") > 72) {
    return response.status(400).json({
      success: false,
      message: "Enter a valid email address and password.",
    });
  }

  const pool = getDatabasePool();
  if (!pool) {
    return response.status(503).json({
      success: false,
      message: "Login is temporarily unavailable because the database is not configured.",
    });
  }
  if (!authConfigurationAvailable(response)) return;

  const result = await pool.query(
    "SELECT id, full_name, email, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return response.status(401).json({
      success: false,
      message: "Email or password is incorrect.",
    });
  }

  return response.status(200).json({
    success: true,
    message: "Login successful.",
    accessToken: createAccessToken(user.id),
    user: publicUser(user),
  });
});

router.get("/me", requireAuth, async (request, response) => {
  const pool = getDatabasePool();
  if (!pool) {
    return response.status(503).json({
      success: false,
      message: "The database is not configured.",
    });
  }

  const result = await pool.query(
    "SELECT id, full_name, email FROM users WHERE id = $1",
    [request.user.id],
  );
  const user = result.rows[0];

  if (!user) {
    return response.status(401).json({
      success: false,
      message: "The account associated with this token no longer exists.",
    });
  }

  return response.status(200).json({
    success: true,
    user: publicUser(user),
  });
});

export default router;
