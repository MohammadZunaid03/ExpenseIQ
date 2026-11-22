import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDatabasePool } from "../config/database.js";
import { validateRegistration } from "../utils/validateRegistration.js";

const router = Router();

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
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        createdAt: user.created_at,
      },
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

export default router;
