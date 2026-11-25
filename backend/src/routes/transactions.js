import { Router } from "express";
import { getDatabasePool } from "../config/database.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  isValidTransactionId,
  validateTransaction,
  validateTransactionFilters,
} from "../utils/validateTransaction.js";

const TRANSACTION_COLUMNS = [
  "id, category_id, type, amount, title, description, payment_method,",
  "transaction_date, created_at, updated_at",
].join(" ");

function publicTransaction(transaction) {
  const transactionDate = transaction.transaction_date;
  return {
    id: transaction.id,
    categoryId: transaction.category_id || null,
    type: transaction.type,
    amount: String(transaction.amount),
    title: transaction.title,
    description: transaction.description || "",
    paymentMethod: transaction.payment_method || "",
    transactionDate: typeof transactionDate === "string"
      ? transactionDate.slice(0, 10)
      : transactionDate.toISOString().slice(0, 10),
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  };
}

async function categoryBelongsToUser(pool, categoryId, userId, type) {
  if (!categoryId) return true;
  const result = await pool.query(
    "SELECT id FROM categories WHERE id = $1 AND type = $2 AND (user_id = $3 OR user_id IS NULL)",
    [categoryId, type, userId],
  );
  return result.rowCount > 0;
}

function databaseUnavailable(response) {
  return response.status(503).json({
    success: false,
    message: "Transactions are temporarily unavailable because the database is not configured.",
  });
}

export function createTransactionsRouter({ getPool = getDatabasePool } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (request, response) => {
    const validation = validateTransactionFilters(request.query);
    if (!validation.isValid) {
      return response.status(400).json({
        success: false,
        message: "One or more transaction filters are invalid.",
        errors: validation.errors,
      });
    }

    const pool = getPool();
    if (!pool) return databaseUnavailable(response);

    const { type, startDate, endDate, search, limit, offset } = validation.filters;
    const values = [request.user.id];
    const conditions = ["user_id = $1"];
    const addCondition = (columnExpression, value) => {
      values.push(value);
      conditions.push(columnExpression + " $" + values.length);
    };

    if (type) addCondition("type =", type);
    if (startDate) addCondition("transaction_date >=", startDate);
    if (endDate) addCondition("transaction_date <=", endDate);
    if (search) {
      values.push("%" + search + "%");
      const searchPlaceholder = "$" + values.length;
      conditions.push("(title ILIKE " + searchPlaceholder + " OR COALESCE(description, '') ILIKE " + searchPlaceholder + ")");
    }

    values.push(limit, offset);
    const sql = [
      "SELECT " + TRANSACTION_COLUMNS,
      "FROM transactions",
      "WHERE " + conditions.join(" AND "),
      "ORDER BY transaction_date DESC, created_at DESC",
      "LIMIT $" + (values.length - 1) + " OFFSET $" + values.length,
    ].join("\n");
    const result = await pool.query(sql, values);

    return response.status(200).json({
      success: true,
      transactions: result.rows.map(publicTransaction),
      pagination: { limit, offset, count: result.rows.length },
    });
  });

  router.post("/", async (request, response) => {
    const validation = validateTransaction(request.body);
    if (!validation.isValid) {
      return response.status(400).json({
        success: false,
        message: "Please correct the transaction details.",
        errors: validation.errors,
      });
    }

    const pool = getPool();
    if (!pool) return databaseUnavailable(response);

    const { type, amount, title, description, paymentMethod, transactionDate, categoryId } = validation.value;
    if (!(await categoryBelongsToUser(pool, categoryId, request.user.id, type))) {
      return response.status(400).json({
        success: false,
        message: "Choose a category owned by your account or a matching default category.",
      });
    }

    const result = await pool.query(
      "INSERT INTO transactions " +
      "(user_id, category_id, type, amount, title, description, payment_method, transaction_date) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING " + TRANSACTION_COLUMNS,
      [request.user.id, categoryId, type, amount, title, description || null, paymentMethod || null, transactionDate],
    );

    return response.status(201).json({
      success: true,
      message: "Transaction created successfully.",
      transaction: publicTransaction(result.rows[0]),
    });
  });

  router.put("/:id", async (request, response) => {
    if (!isValidTransactionId(request.params.id)) {
      return response.status(400).json({ success: false, message: "Transaction ID is invalid." });
    }

    const validation = validateTransaction(request.body);
    if (!validation.isValid) {
      return response.status(400).json({
        success: false,
        message: "Please correct the transaction details.",
        errors: validation.errors,
      });
    }

    const pool = getPool();
    if (!pool) return databaseUnavailable(response);

    const { type, amount, title, description, paymentMethod, transactionDate, categoryId } = validation.value;
    if (!(await categoryBelongsToUser(pool, categoryId, request.user.id, type))) {
      return response.status(400).json({
        success: false,
        message: "Choose a category owned by your account or a matching default category.",
      });
    }

    const result = await pool.query(
      "UPDATE transactions SET category_id = $1, type = $2, amount = $3, title = $4, description = $5, " +
      "payment_method = $6, transaction_date = $7, updated_at = NOW() " +
      "WHERE id = $8 AND user_id = $9 RETURNING " + TRANSACTION_COLUMNS,
      [categoryId, type, amount, title, description || null, paymentMethod || null, transactionDate, request.params.id, request.user.id],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ success: false, message: "Transaction not found." });
    }

    return response.status(200).json({
      success: true,
      message: "Transaction updated successfully.",
      transaction: publicTransaction(result.rows[0]),
    });
  });

  router.delete("/:id", async (request, response) => {
    if (!isValidTransactionId(request.params.id)) {
      return response.status(400).json({ success: false, message: "Transaction ID is invalid." });
    }

    const pool = getPool();
    if (!pool) return databaseUnavailable(response);

    const result = await pool.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id",
      [request.params.id, request.user.id],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ success: false, message: "Transaction not found." });
    }

    return response.status(200).json({
      success: true,
      message: "Transaction deleted successfully.",
    });
  });

  return router;
}

export default createTransactionsRouter();
