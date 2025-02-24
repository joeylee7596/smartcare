import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertShiftSchema } from "@shared/schema";
import { endOfDay } from "date-fns";
import { setupWebSocket } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Basic employee routes
  app.get("/api/employees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const employees = await storage.getEmployees();
    res.json(employees);
  });

  // Basic shift routes
  app.get("/api/shifts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const startDate = req.query.start ? new Date(req.query.start as string) : new Date();
      const endDate = req.query.end ? new Date(req.query.end as string) : endOfDay(startDate);

      const shifts = await storage.getShifts(startDate, endDate);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const parsed = insertShiftSchema.safeParse({
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime)
      });

      if (!parsed.success) {
        console.error("Validation Error:", parsed.error);
        return res.status(400).json(parsed.error);
      }

      const shift = await storage.createShift(parsed.data);
      res.status(201).json(shift);
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(500).json({ error: "Failed to create shift" });
    }
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}
