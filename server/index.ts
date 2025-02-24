import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, sql } from "./db";

const app = express();

// Basic startup logging
console.log("Starting server initialization...");
console.log("Environment:", process.env.NODE_ENV);
console.log("Database URL exists:", !!process.env.DATABASE_URL);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add basic request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Test database connection before starting server
async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...");
    const result = await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

(async () => {
  try {
    console.log("Checking database connection...");
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error("Could not connect to database");
    }

    console.log("Setting up routes...");
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Simplify by always using static serving for testing
    console.log("Setting up static serving...");
    serveStatic(app);

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      console.log(`Server running on port ${port}`);
      log(`Server started successfully on port ${port}`);
    });
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  }
})();