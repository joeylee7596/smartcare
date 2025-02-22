import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertTourSchema, insertDocSchema, insertEmployeeSchema, insertShiftSchema } from "@shared/schema";
import { setupWebSocket } from "./websocket";
import expiryRoutes from "./routes/expiry";
import aiRoutes from "./routes/ai";
import { insertBillingSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Use AI routes
  app.use("/api/ai", aiRoutes);

  // Documentation
  app.get("/api/docs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
    if (patientId && isNaN(patientId)) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }
    const docs = await storage.getDocs(patientId);
    res.json(docs);
  });

  app.post("/api/docs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertDocSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const doc = await storage.createDoc(parsed.data);
    res.status(201).json(doc);
  });

  app.patch("/api/docs/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const { status, reviewNotes } = req.body;
    const doc = await storage.updateDoc(id, {
      status,
      reviewNotes,
      reviewerId: status === "completed" ? req.user?.id : undefined,
      reviewDate: status === "completed" ? new Date() : undefined,
    });

    res.json(doc);
  });

  // Patients
  app.get("/api/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patients = await storage.getPatients();
    res.json(patients);
  });

  app.post("/api/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertPatientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const patient = await storage.createPatient(parsed.data);
    res.status(201).json(patient);
  });

  app.patch("/api/patients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const patient = await storage.updatePatient(id, req.body);
    res.json(patient);
  });

  app.delete("/api/patients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    await storage.deletePatient(id);
    res.sendStatus(204);
  });

  // Tours
  app.get("/api/tours", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tours = await storage.getTours();
    res.json(tours);
  });

  app.post("/api/tours", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertTourSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const tour = await storage.createTour(parsed.data);
    res.status(201).json(tour);
  });

  app.patch("/api/tours/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const tour = await storage.updateTour(id, req.body);
    res.json(tour);
  });

  app.delete("/api/tours/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    await storage.deleteTour(id);
    res.sendStatus(204);
  });

  // Employees (new endpoints)
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

  app.get("/api/employees/:id/qualifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const qualifications = await storage.getEmployeeQualifications(id);
    if (!qualifications) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(qualifications);
  });

  app.get("/api/employees/available", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const employees = await storage.getAvailableEmployees(date);
    res.json(employees);
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

  // Shifts
  app.get("/api/shifts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const shifts = await storage.getShifts(startDate, endDate);
    res.json(shifts);
  });

  app.post("/api/shifts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertShiftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const shift = await storage.createShift(parsed.data);
    res.status(201).json(shift);
  });

  app.patch("/api/shifts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const shift = await storage.updateShift(id, req.body);
    res.json(shift);
  });

  app.delete("/api/shifts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    await storage.deleteShift(id);
    res.sendStatus(204);
  });

  // Billing routes
  app.get("/api/billings/:patientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }
    const billings = await storage.getBillings(patientId);
    res.json(billings);
  });

  app.post("/api/billings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertBillingSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("Validation Error:", parsed.error);
        return res.status(400).json({
          error: "Ungültige Abrechnungsdaten",
          details: parsed.error.issues
        });
      }
      const billing = await storage.createBilling(parsed.data);
      res.status(201).json(billing);
    } catch (error) {
      console.error("Billing Creation Error:", error);
      res.status(500).json({
        error: "Die Abrechnung konnte nicht erstellt werden",
        details: error instanceof Error ? error.message : "Unbekannter Fehler"
      });
    }
  });

  app.patch("/api/billings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid billing ID" });
    }
    const { status } = req.body;
    if (typeof status !== "string") {
      return res.status(400).json({ error: "Invalid status" });
    }
    const billing = await storage.updateBillingStatus(id, status);
    res.json(billing);
  });

  // Register expiry tracking routes
  app.use("/api/expiry", expiryRoutes);

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}