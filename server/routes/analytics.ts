import { Router } from "express";
import { storage } from "../storage";
import { analyzePatientData } from "../services/analytics";

const router = Router();

router.get("/patients", async (req, res) => {
  try {
    const [patients, employees, tours] = await Promise.all([
      storage.getPatients(),
      storage.getEmployees(),
      storage.getTours(),
    ]);

    const analytics = analyzePatientData(patients, employees, tours);
    res.json(analytics);
  } catch (error) {
    console.error("Error generating patient analytics:", error);
    res.status(500).json({ error: "Could not generate analytics" });
  }
});

export default router;
