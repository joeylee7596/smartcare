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

const carePredictionSchema = z.object({
  patientData: z.object({
    name: z.string(),
    careLevel: z.number(),
    medications: z.array(z.string()).optional(),
    lastVisit: z.string().nullable(),
    notes: z.string().nullable().optional(),
    emergencyContact: z.string(),
    insuranceProvider: z.string(),
  }),
});

const shiftOptimizationSchema = z.object({
  employeeData: z.array(z.object({
    id: z.number(),
    name: z.string(),
    role: z.string(),
    workingHours: z.any(),
    qualifications: z.any(),
  })),
  currentShifts: z.array(z.object({
    id: z.number(),
    employeeId: z.number(),
    startTime: z.string(),
    endTime: z.string(),
    type: z.string(),
  })).optional(),
  date: z.string(),
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

router.post("/care-prediction", async (req, res) => {
  try {
    const { patientData } = carePredictionSchema.parse(req.body);

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Als KI-gestützter Pflegeanalyst, erstelle eine detaillierte Prognose des zukünftigen Pflegebedarfs basierend auf den folgenden Patientendaten. Berücksichtige dabei alle verfügbaren Informationen und aktuelle Pflegetrends.

Patienteninformationen:
- Name: ${patientData.name}
- Aktueller Pflegegrad: ${patientData.careLevel}
- Medikation: ${patientData.medications?.join(", ") || "Keine Angabe"}
- Letzter Besuch: ${patientData.lastVisit ? new Date(patientData.lastVisit).toLocaleDateString('de-DE') : "Keine Angabe"}
- Besondere Hinweise: ${patientData.notes || "Keine"}
- Versicherung: ${patientData.insuranceProvider}

Bitte erstelle eine strukturierte Analyse mit folgenden Punkten:

1. Kurzfristige Prognose (3-6 Monate)
   - Erwartete Entwicklung des Pflegebedarfs
   - Potenzielle Änderungen im Pflegegrad
   - Empfohlene präventive Maßnahmen

2. Mittelfristige Prognose (6-12 Monate)
   - Voraussichtliche Entwicklungen
   - Ressourcenbedarf
   - Empfehlungen zur Anpassung der Pflegestrategie

3. Risikofaktoren & Präventionsempfehlungen
   - Identifizierte Risikofaktoren
   - Konkrete Präventionsmaßnahmen
   - Empfohlene Überwachungsschwerpunkte

4. Ressourcenplanung
   - Personal- und Zeitbedarf
   - Notwendige Qualifikationen
   - Empfohlene Hilfsmittel/Ausstattung

Bitte berücksichtige bei der Analyse:
- Aktuelle medizinische Standards
- Beste Praktiken in der Pflege
- Kosteneffizienz
- Lebensqualität des Patienten

Die Prognose soll als Entscheidungshilfe für die Pflegeplanung dienen.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ prediction: text });
  } catch (error) {
    console.error("Care Prediction Error:", error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: "Pflegebedarfsprognose konnte nicht erstellt werden",
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: "Pflegebedarfsprognose konnte nicht erstellt werden",
        details: "Unbekannter Fehler"
      });
    }
  }
});

router.post("/shift-optimization", async (req, res) => {
  try {
    const { employeeData, currentShifts, date } = shiftOptimizationSchema.parse(req.body);

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Als KI-Assistent für Dienstplanoptimierung, analysiere bitte die folgenden Mitarbeiter- und Schichtdaten und erstelle Empfehlungen für eine optimale Schichtplanung.

Datum: ${date}

Mitarbeiterdaten:
${employeeData.map(emp => `- ${emp.name} (${emp.role})
  Qualifikationen: ${Object.entries(emp.qualifications).filter(([_, val]) => val === true).map(([key]) => key).join(', ')}
  Arbeitszeiten: ${Object.entries(emp.workingHours).filter(([_, val]) => val.isWorkingDay).map(([day]) => day).join(', ')}
`).join('\n')}

${currentShifts ? `Aktuelle Schichten:
${currentShifts.map(shift => {
  const employee = employeeData.find(emp => emp.id === shift.employeeId);
  return `- ${employee?.name}: ${new Date(shift.startTime).toLocaleTimeString('de-DE')} - ${new Date(shift.endTime).toLocaleTimeString('de-DE')} (${shift.type})`;
}).join('\n')}` : ''}

Bitte erstelle eine Analyse mit folgenden Punkten:

1. Schichtoptimierung
   - Vorschläge für optimale Schichtverteilung
   - Berücksichtigung von Qualifikationen und Verfügbarkeit
   - Identifizierung von Engpässen oder Überbesetzungen

2. Risiken & Empfehlungen
   - Potenzielle Konflikte oder Probleme
   - Konkrete Verbesserungsvorschläge
   - Präventive Maßnahmen

3. Compliance & Fairness
   - Einhaltung von Arbeitszeiten und Ruhephasen
   - Ausgewogene Verteilung der Arbeitsbelastung
   - Berücksichtigung von Mitarbeiterpräferenzen

Die Empfehlungen sollen praktisch umsetzbar sein und die Effizienz sowie Mitarbeiterzufriedenheit optimieren.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ recommendations: text });
  } catch (error) {
    console.error("Shift Optimization Error:", error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: "Schichtoptimierung konnte nicht durchgeführt werden",
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: "Schichtoptimierung konnte nicht durchgeführt werden",
        details: "Unbekannter Fehler"
      });
    }
  }
});

export default router;