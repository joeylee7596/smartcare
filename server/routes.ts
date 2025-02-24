import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertPatientSchema, 
  insertTourSchema, 
  insertDocSchema, 
  insertEmployeeSchema, 
  insertShiftSchema, 
  ShiftStatus,
  insertBillingSchema 
} from "@shared/schema";
import { setupWebSocket } from "./websocket";
import expiryRoutes from "./routes/expiry";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import { endOfDay, subDays } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Use AI routes
  app.use("/api/ai", aiRoutes);

  // Use analytics routes
  app.use("/api/analytics", analyticsRoutes);

  // Check missing documentation
  app.get("/api/documentation/check/:patientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }

    const thirtyDaysAgo = subDays(new Date(), 30);

    // Get all tours and shifts for the patient in the last 30 days
    const tours = await storage.getTours(patientId, thirtyDaysAgo);
    const shifts = await storage.getShifts(thirtyDaysAgo, new Date());
    const existingDocs = await storage.getDocs(patientId);

    const missingDocs = [];

    // Check tours
    for (const tour of tours) {
      const hasDoc = existingDocs.some(doc => 
        doc.tourId === tour.id && doc.type === 'tour'
      );
      if (!hasDoc) {
        missingDocs.push({
          date: tour.date,
          type: 'tour',
          id: tour.id
        });
      }
    }

    // Check shifts
    for (const shift of shifts) {
      if (shift.patientIds.includes(patientId)) {
        const hasDoc = existingDocs.some(doc =>
          doc.shiftId === shift.id && doc.type === 'shift'
        );
        if (!hasDoc) {
          missingDocs.push({
            date: shift.startTime,
            type: 'shift',
            id: shift.id
          });
        }
      }
    }

    res.json({
      missingDocs: missingDocs.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    });
  });

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
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : endOfDay(startDate);

    try {
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
        endTime: new Date(req.body.endTime),
        status: req.body.status || ShiftStatus.PENDING
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

  app.patch("/api/shifts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid shift ID" });
      }

      const updates = {
        ...req.body,
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined
      };

      const shift = await storage.updateShift(id, updates);
      res.json(shift);
    } catch (error) {
      console.error("Error updating shift:", error);
      res.status(500).json({ error: "Failed to update shift" });
    }
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
      console.log("Received billing data:", req.body);
      const parsed = insertBillingSchema.safeParse({
        ...req.body,
        date: new Date(req.body.date)
      });

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