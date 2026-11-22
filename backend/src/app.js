import cors from "cors";
import express from "express";
import helmet from "helmet";
import { checkDatabaseConnection } from "./config/database.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "ExpenseIQ API is running.",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health/database", async (_request, response) => {
  try {
    const database = await checkDatabaseConnection();
    if (!database.configured) {
      return response.status(503).json({
        success: false,
        message: "Database is not configured. Add DATABASE_URL to the backend environment.",
        database,
      });
    }

    return response.status(200).json({ success: true, database });
  } catch {
    return response.status(503).json({
      success: false,
      message: "Database connection failed.",
    });
  }
});

app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
});

export default app;
