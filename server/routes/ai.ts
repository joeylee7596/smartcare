import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

    const prompt = `Als medizinischer Assistent, analysiere bitte die folgenden Patientendaten und erstelle eine professionelle Zusammenfassung. Berücksichtige dabei den Pflegegrad und alle verfügbaren Informationen.

Patient: ${patientData.name}
Pflegegrad: ${patientData.careLevel}
${patientData.medications?.length ? `Medikamente: ${patientData.medications.join(", ")}` : ''}
${patientData.lastVisit ? `Letzter Besuch: ${new Date(patientData.lastVisit).toLocaleDateString('de-DE')}` : ''}

Bitte strukturiere die Analyse in die folgenden Abschnitte:
1. Allgemeine Einschätzung
   - Basierend auf Pflegegrad und verfügbaren Daten
   - Besondere Aufmerksamkeitspunkte

2. Pflegeempfehlungen
   - Konkrete Vorschläge für die Pflege
   - Anpassungen basierend auf dem Pflegegrad

3. Hinweise für das Pflegepersonal
   - Wichtige Beobachtungspunkte
   - Vorgeschlagene Dokumentationsschwerpunkte

Bitte halte die Analyse sachlich und professionell.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ insights: text });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: "KI-Analyse konnte nicht durchgeführt werden",
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: "KI-Analyse konnte nicht durchgeführt werden",
        details: "Unbekannter Fehler"
      });
    }
  }
});

export default router;