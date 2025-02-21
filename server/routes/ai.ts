import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");

const patientInsightsSchema = z.object({
  patientData: z.object({
    name: z.string(),
    careLevel: z.number(),
    medications: z.array(z.string()).optional(),
    lastVisit: z.string().nullable(),
  }),
});

router.post("/patient-insights", async (req, res) => {
  try {
    const { patientData } = patientInsightsSchema.parse(req.body);
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analysiere die folgenden Patientendaten und erstelle eine kurze, professionelle Zusammenfassung mit Empfehlungen für die Pflege. Berücksichtige dabei den Pflegegrad und die Medikation.

Patient: ${patientData.name}
Pflegegrad: ${patientData.careLevel}
Medikamente: ${patientData.medications?.join(", ") || "Keine"}
Letzter Besuch: ${patientData.lastVisit ? new Date(patientData.lastVisit).toLocaleDateString('de-DE') : "Kein Besuch vermerkt"}

Bitte strukturiere die Analyse in folgende Abschnitte:
1. Allgemeine Einschätzung
2. Pflegebedarf basierend auf Pflegegrad
3. Medikationsanalyse und Empfehlungen
4. Vorschläge für die weitere Betreuung`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({ insights: text });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ 
      error: "KI-Analyse konnte nicht durchgeführt werden",
      details: error instanceof Error ? error.message : "Unbekannter Fehler"
    });
  }
});

export default router;
