import { Router } from "express";
import { getDatabasePool } from "../config/database.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { isValidCategoryId, validateCategory } from "../utils/validateCategory.js";

export function createCategoriesRouter({ getPool = getDatabasePool } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (request, response) => {
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Categories are temporarily unavailable because the database is not configured." });
    const result = await pool.query(
      "SELECT id, name, type, color, is_default AS \"isDefault\" FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY is_default DESC, type, name",
      [request.user.id],
    );
    return response.status(200).json({ success: true, categories: result.rows });
  });

  router.post("/", async (request, response) => {
    const validation = validateCategory(request.body);
    if (!validation.isValid) return response.status(400).json({ success: false, message: "Please correct the category details.", errors: validation.errors });
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Categories are temporarily unavailable because the database is not configured." });
    try {
      const { name, type, color } = validation.value;
      const result = await pool.query(
        "INSERT INTO categories (user_id, name, type, color) VALUES ($1, $2, $3, $4) RETURNING id, name, type, color, is_default AS \"isDefault\"",
        [request.user.id, name, type, color],
      );
      return response.status(201).json({ success: true, category: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") return response.status(409).json({ success: false, message: "You already have a category with this name and type." });
      throw error;
    }
  });

  router.put("/:id", async (request, response) => {
    if (!isValidCategoryId(request.params.id)) return response.status(400).json({ success: false, message: "Category ID is invalid." });
    const validation = validateCategory(request.body);
    if (!validation.isValid) return response.status(400).json({ success: false, message: "Please correct the category details.", errors: validation.errors });
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Categories are temporarily unavailable because the database is not configured." });
    try {
      const { name, type, color } = validation.value;
      const result = await pool.query(
        "UPDATE categories SET name = $1, type = $2, color = $3 WHERE id = $4 AND user_id = $5 RETURNING id, name, type, color, is_default AS \"isDefault\"",
        [name, type, color, request.params.id, request.user.id],
      );
      if (!result.rowCount) return response.status(404).json({ success: false, message: "Category not found." });
      return response.status(200).json({ success: true, category: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") return response.status(409).json({ success: false, message: "You already have a category with this name and type." });
      throw error;
    }
  });

  router.delete("/:id", async (request, response) => {
    if (!isValidCategoryId(request.params.id)) return response.status(400).json({ success: false, message: "Category ID is invalid." });
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Categories are temporarily unavailable because the database is not configured." });
    const result = await pool.query("DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id", [request.params.id, request.user.id]);
    if (!result.rowCount) return response.status(404).json({ success: false, message: "Category not found." });
    return response.status(200).json({ success: true, message: "Category deleted. Existing transactions are retained without a category." });
  });

  return router;
}

export default createCategoriesRouter();
