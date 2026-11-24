import { Router } from "express";
import { getDatabasePool } from "../config/database.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBudget } from "../utils/validateBudget.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SELECT_BUDGETS = `SELECT b.id, b.category_id AS "categoryId", b.name, b.amount_limit AS "amountLimit",
  b.period_start AS "periodStart", b.period_end AS "periodEnd",
  c.name AS "categoryName",
  COALESCE(SUM(t.amount), 0)::numeric(12,2) AS spent
  FROM budgets b
  LEFT JOIN categories c ON c.id = b.category_id
  LEFT JOIN transactions t ON t.user_id = b.user_id AND t.type = 'expense'
    AND t.transaction_date BETWEEN b.period_start AND b.period_end
    AND (b.category_id IS NULL OR t.category_id = b.category_id)`;

export function createBudgetsRouter({ getPool = getDatabasePool } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (request, response) => {
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Budgets are unavailable because the database is not configured." });
    const result = await pool.query(SELECT_BUDGETS + " WHERE b.user_id = $1 GROUP BY b.id, c.name ORDER BY b.period_start DESC, b.created_at DESC", [request.user.id]);
    const budgets = result.rows.map((row) => {
      const amountLimit = Number(row.amountLimit);
      const spent = Number(row.spent);
      return { ...row, amountLimit: row.amountLimit, spent: row.spent, remaining: (amountLimit - spent).toFixed(2), percentUsed: amountLimit ? Math.round((spent / amountLimit) * 100) : 0 };
    });
    return response.status(200).json({ success: true, budgets });
  });

  router.post("/", async (request, response) => {
    const validation = validateBudget(request.body);
    if (!validation.isValid) return response.status(400).json({ success: false, message: "Please correct the budget details.", errors: validation.errors });
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Budgets are unavailable because the database is not configured." });
    const { name, amountLimit, periodStart, periodEnd, categoryId } = validation.value;
    if (categoryId) {
      const category = await pool.query("SELECT id FROM categories WHERE id = $1 AND type = 'expense' AND (user_id = $2 OR user_id IS NULL)", [categoryId, request.user.id]);
      if (!category.rowCount) return response.status(400).json({ success: false, message: "Choose one of your expense categories or a default category." });
    }
    const result = await pool.query("INSERT INTO budgets (user_id, category_id, name, amount_limit, period_start, period_end) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [request.user.id, categoryId, name, amountLimit, periodStart, periodEnd]);
    return response.status(201).json({ success: true, budgetId: result.rows[0].id });
  });

  router.put("/:id", async (request, response) => {
    if (!UUID.test(request.params.id)) return response.status(400).json({ success: false, message: "Budget ID is invalid." });
    const validation = validateBudget(request.body);
    if (!validation.isValid) return response.status(400).json({ success: false, message: "Please correct the budget details.", errors: validation.errors });
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Budgets are unavailable because the database is not configured." });
    const { name, amountLimit, periodStart, periodEnd, categoryId } = validation.value;
    if (categoryId) {
      const category = await pool.query("SELECT id FROM categories WHERE id = $1 AND type = 'expense' AND (user_id = $2 OR user_id IS NULL)", [categoryId, request.user.id]);
      if (!category.rowCount) return response.status(400).json({ success: false, message: "Choose one of your expense categories or a default category." });
    }
    const result = await pool.query("UPDATE budgets SET category_id=$1, name=$2, amount_limit=$3, period_start=$4, period_end=$5, updated_at=NOW() WHERE id=$6 AND user_id=$7 RETURNING id", [categoryId, name, amountLimit, periodStart, periodEnd, request.params.id, request.user.id]);
    if (!result.rowCount) return response.status(404).json({ success: false, message: "Budget not found." });
    return response.status(200).json({ success: true, message: "Budget updated." });
  });

  router.delete("/:id", async (request, response) => {
    if (!UUID.test(request.params.id)) return response.status(400).json({ success: false, message: "Budget ID is invalid." });
    const pool = getPool();
    if (!pool) return response.status(503).json({ success: false, message: "Budgets are unavailable because the database is not configured." });
    const result = await pool.query("DELETE FROM budgets WHERE id=$1 AND user_id=$2 RETURNING id", [request.params.id, request.user.id]);
    if (!result.rowCount) return response.status(404).json({ success: false, message: "Budget not found." });
    return response.status(200).json({ success: true, message: "Budget deleted." });
  });

  return router;
}
export default createBudgetsRouter();
