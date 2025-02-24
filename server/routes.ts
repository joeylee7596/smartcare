import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import shiftRoutes from "./routes/shifts";
import expiryRoutes from "./routes/expiry";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import { endOfDay, subDays } from "date-fns";
import { insertEmployeeSchema } from "@shared/schema";

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

  // Employees endpoints
  app.get("/api/employees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const employees = await storage.getEmployees();
    res.json(employees);
  });

  app.get("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const employee = await storage.getEmployee(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  });

  app.post("/api/employees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const employee = await storage.createEmployee(parsed.data);
    res.status(201).json(employee);
  });

  app.patch("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const employee = await storage.updateEmployee(id, req.body);
    res.json(employee);
  });

  app.delete("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    await storage.deleteEmployee(id);
    res.sendStatus(204);
  });

  const httpServer = createServer(app);
  return httpServer;
}