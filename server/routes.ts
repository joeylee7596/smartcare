import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import shiftRoutes from "./routes/shifts";  // Import the shifts router
import expiryRoutes from "./routes/expiry";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import { endOfDay, subDays } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Use the shifts router
  app.use("/api/shifts", shiftRoutes);

  // Use AI routes
  app.use("/api/ai", aiRoutes);

  // Use analytics routes
  app.use("/api/analytics", analyticsRoutes);

  // Register expiry tracking routes
  app.use("/api/expiry", expiryRoutes);

  const httpServer = createServer(app);
  return httpServer;
}