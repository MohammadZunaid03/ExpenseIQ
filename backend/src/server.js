import "dotenv/config";
import app from "./app.js";
import { closeDatabasePool } from "./config/database.js";

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => {
  console.log(`ExpenseIQ API listening on http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down ExpenseIQ API...`);
  server.close(async () => {
    await closeDatabasePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
