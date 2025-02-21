import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertTourSchema, insertDocSchema } from "@shared/schema";
import { setupWebSocket } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}