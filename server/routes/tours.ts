import { Router } from "express";
import { storage } from "../storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { insertTourSchema } from "@shared/schema";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");

// Get all tours
router.get("/", async (req, res) => {
  const tours = await storage.getTours();
  res.json(tours);
});

// Create a new tour
router.post("/", async (req, res) => {
  try {
    const tour = insertTourSchema.parse(req.body);
    const created = await storage.createTour(tour);
    res.json(created);
  } catch (error) {
    res.status(400).json({ error: "Invalid tour data" });
  }
});

// Update a tour
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = insertTourSchema.partial().parse(req.body);
    const updated = await storage.updateTour(id, updates);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Invalid tour data" });
  }
});

// Delete a tour
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteTour(id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: "Could not delete tour" });
  }
});

// AI Optimization endpoint
router.post("/optimize", async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = new Date(date);
    
    // Get all relevant data
    const tours = await storage.getTours();
    const employees = await storage.getEmployees();
    const patients = await storage.getPatients();
    
    // Filter tours for the target date
    const toursForDate = tours.filter(tour => 
      new Date(tour.date).toDateString() === targetDate.toDateString()
    );

    // Prepare data for AI analysis
    const scheduleData = {
      tours: toursForDate.map(tour => ({
        id: tour.id,
        employeeId: tour.employeeId,
        patientIds: tour.patientIds,
        time: new Date(tour.date).toISOString(),
        employee: employees.find(e => e.id === tour.employeeId),
        patients: tour.patientIds.map(id => patients.find(p => p.id === id)).filter(Boolean)
      })),
      employees: employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        qualifications: emp.qualifications,
        workingHours: emp.workingHours,
        maxPatientsPerDay: emp.maxPatientsPerDay
      }))
    };

    // Use Gemini to optimize the schedule
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    As an AI healthcare schedule optimizer, analyze and optimize this nursing care schedule:
    ${JSON.stringify(scheduleData, null, 2)}

    Consider:
    1. Employee qualifications and patient care requirements
    2. Geographic proximity of patients
    3. Required care time per patient
    4. Employee working hours and break requirements
    5. Maximum patients per employee
    6. Travel time between patients

    Provide optimized schedule with:
    1. Suggested time slots for each tour
    2. Employee assignments
    3. Patient visit order
    4. Optimization score (0-100)
    5. Economic efficiency rating
    
    Return only valid JSON matching this format:
    {
      "optimizedTours": [{
        "id": number,
        "employeeId": number,
        "patientIds": number[],
        "suggestedTime": string,
        "optimizationScore": number,
        "economicIndicator": "red" | "yellow" | "green"
      }]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const optimizationResult = JSON.parse(response.text());

    // Update tours with optimization results
    for (const optimizedTour of optimizationResult.optimizedTours) {
      await storage.updateTour(optimizedTour.id, {
        employeeId: optimizedTour.employeeId,
        patientIds: optimizedTour.patientIds,
        date: new Date(optimizedTour.suggestedTime),
        optimizationScore: optimizedTour.optimizationScore,
        economicIndicator: optimizedTour.economicIndicator
      });
    }

    res.json(optimizationResult);
  } catch (error) {
    console.error("Optimization error:", error);
    res.status(500).json({ error: "Failed to optimize schedule" });
  }
});

export default router;
