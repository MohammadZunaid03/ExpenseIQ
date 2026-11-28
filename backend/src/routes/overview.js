import { Router } from "express";
import { getDatabasePool } from "../config/database.js";
import { requireAuth } from "../middleware/requireAuth.js";

const OVERVIEW_QUERY = `
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::numeric(12,2) AS "totalIncome",
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::numeric(12,2) AS "totalExpenses",
    COALESCE(SUM(amount) FILTER (
      WHERE type = 'income'
        AND transaction_date >= date_trunc('month', CURRENT_DATE)::date
        AND transaction_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
    ), 0)::numeric(12,2) AS "monthIncome",
    COALESCE(SUM(amount) FILTER (
      WHERE type = 'expense'
        AND transaction_date >= date_trunc('month', CURRENT_DATE)::date
        AND transaction_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
    ), 0)::numeric(12,2) AS "monthExpenses",
    COALESCE(SUM(amount) FILTER (
      WHERE type = 'income'
        AND transaction_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
        AND transaction_date < date_trunc('month', CURRENT_DATE)::date
    ), 0)::numeric(12,2) AS "previousMonthIncome",
    COALESCE(SUM(amount) FILTER (
      WHERE type = 'expense'
        AND transaction_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
        AND transaction_date < date_trunc('month', CURRENT_DATE)::date
    ), 0)::numeric(12,2) AS "previousMonthExpenses"
  FROM transactions
  WHERE user_id = $1
`;

function percentageChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function createOverviewRouter({ getPool = getDatabasePool } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (request, response) => {
    const pool = getPool();
    if (!pool) {
      return response.status(503).json({
        success: false,
        message: "The overview is unavailable because the database is not configured.",
      });
    }

    const result = await pool.query(OVERVIEW_QUERY, [request.user.id]);
    const row = result.rows[0] || {};
    const totalIncome = Number(row.totalIncome || 0);
    const totalExpenses = Number(row.totalExpenses || 0);
    const monthIncome = Number(row.monthIncome || 0);
    const monthExpenses = Number(row.monthExpenses || 0);
    const previousMonthIncome = Number(row.previousMonthIncome || 0);
    const previousMonthExpenses = Number(row.previousMonthExpenses || 0);

    return response.status(200).json({
      success: true,
      overview: {
        totalBalance: (totalIncome - totalExpenses).toFixed(2),
        monthIncome: monthIncome.toFixed(2),
        monthExpenses: monthExpenses.toFixed(2),
        incomeChange: percentageChange(monthIncome, previousMonthIncome),
        expenseChange: percentageChange(monthExpenses, previousMonthExpenses),
      },
    });
  });

  return router;
}

export default createOverviewRouter();
