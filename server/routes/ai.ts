import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { storage } from "../storage";
import { patientSchema } from "@shared/schema";

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

const billingAssistSchema = z.object({
  patient: z.object({
    name: z.string(),
    careLevel: z.number(),
    insuranceProvider: z.string(),
  }),
  services: z.array(z.object({
    code: z.string(),
    description: z.string(),
    amount: z.number(),
  })),
  careLevel: z.number(),
  date: z.string(),
});

router.post("/billing-assist", async (req, res) => {
  try {
    const { patient, services, careLevel, date } = billingAssistSchema.parse(req.body);

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Als KI-Assistent für Pflegedokumentation, überprüfe und verbessere die folgenden Leistungsbeschreibungen für die Krankenkassenabrechnung. Die Beschreibungen sollen präzise, professionell und den Anforderungen der Krankenkassen entsprechend sein.

Patient:
- Name: ${patient.name}
- Pflegegrad: ${careLevel}
- Versicherung: ${patient.insuranceProvider}
- Datum: ${date}

Aktuelle Leistungsbeschreibungen:
${services.map(s => `- ${s.code}: ${s.description} (${s.amount}€)`).join('\n')}

Bitte optimiere die Beschreibungen unter Berücksichtigung:
1. Pflegerelevanter Fachbegriffe
2. Präziser Beschreibung der durchgeführten Maßnahmen
3. Dokumentation des Pflegebedarfs
4. Berücksichtigung des Pflegegrads
5. Abrechnungsrelevante Details

Gib die verbesserten Beschreibungen im JSON-Format zurück, wobei du für jede Leistung eine optimierte Version vorschlägst.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the AI response to extract suggestions
    const suggestions = services.map((service, index) => {
      try {
        const enhancedDescription = text
          .split('\n')
          .find(line => line.includes(service.code))
          ?.split(':')[1]
          ?.trim() || service.description;

        return {
          code: service.code,
          enhancedDescription
        };
      } catch (e) {
        return {
          code: service.code,
          enhancedDescription: service.description
        };
      }
    });

    res.json({ suggestions });
  } catch (error) {
    console.error("Billing Assist Error:", error);
    if (error instanceof Error) {
      res.status(500).json({
        error: "Leistungsbeschreibungen konnten nicht optimiert werden",
        details: error.message
      });
    } else {
      res.status(500).json({
        error: "Leistungsbeschreibungen konnten nicht optimiert werden",
        details: "Unbekannter Fehler"
      });
    }
  }
});

const documentationAnalysisSchema = z.object({
  patientId: z.number(),
  date: z.string(),
});

router.post("/suggest-services", async (req, res) => {
  try {
    const { patientId, date } = documentationAnalysisSchema.parse(req.body);

    // Get patient data
    const patient = await storage.getPatient(patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient nicht gefunden" });
    }

    // Get documentation for the specified date
    const docs = await storage.getDocs(patientId);
    const dayDocs = docs.filter(doc =>
      new Date(doc.date).toISOString().split('T')[0] === new Date(date).toISOString().split('T')[0]
    );

    if (dayDocs.length === 0) {
      return res.status(404).json({
        error: "Keine Dokumentation für dieses Datum gefunden",
        details: "Bitte stellen Sie sicher, dass für das ausgewählte Datum eine Dokumentation existiert."
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze the following nursing documentation and create a JSON response with suggested billable services.

Patient Information:
- Name: ${patient.name}
- Care Level: ${patient.careLevel}
- Insurance: ${patient.insuranceProvider}

Documentation from ${new Date(date).toLocaleDateString('de-DE')}:
${dayDocs.map(doc => `- ${doc.content}`).join('\n')}

IMPORTANT: You must respond ONLY with a valid JSON object and no additional text.
The JSON must follow this exact structure:

{
  "services": [
    {
      "code": "string",
      "description": "string",
      "amount": number,
      "confidence": number,
      "based_on": "string"
    }
  ]
}

If no services can be suggested, return an empty services array:
{
  "services": []
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    try {
      // Try to extract JSON if there's any additional text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }

      const suggestions = JSON.parse(text);

      // Validate the structure
      if (!suggestions.services || !Array.isArray(suggestions.services)) {
        throw new Error("Invalid response format: missing services array");
      }

      // Validate and sanitize each service
      suggestions.services = suggestions.services.map(service => ({
        code: String(service.code || ''),
        description: String(service.description || ''),
        amount: Number(service.amount) || 0,
        confidence: Number(service.confidence) || 0,
        based_on: String(service.based_on || '')
      }));

      res.json(suggestions);
    } catch (parseError) {
      console.error("Parse Error:", parseError, "Raw Response:", text);

      // If the AI couldn't suggest any services, return an empty list
      if (text.toLowerCase().includes("keine leistungen") || 
          text.toLowerCase().includes("no services") ||
          text.toLowerCase().includes("cannot suggest")) {
        return res.json({ services: [] });
      }

      res.status(422).json({
        error: "Fehler bei der Analyse der Dokumentation",
        details: "Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es später erneut."
      });
    }
  } catch (error) {
    console.error("Service Suggestion Error:", error);
    res.status(500).json({
      error: "Fehler bei der Analyse der Dokumentation",
      details: error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten"
    });
  }
});

const documentExtractionSchema = z.object({
  documentImage: z.string(), // Base64 encoded image
});

router.post("/extract-patient-data", async (req, res) => {
  try {
    const { documentImage } = documentExtractionSchema.parse(req.body);

    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `Analyze this medical document or patient record and extract relevant patient information. 
    Please identify and extract the following details in a structured format:
    - Full name of the patient
    - Care level (Pflegegrad) if mentioned
    - Address
    - Emergency contact information
    - Insurance provider and number
    - Any medications listed
    - Important medical notes

    Please provide the information in the following JSON format:
    {
      "name": "string",
      "careLevel": number,
      "address": "string",
      "emergencyContact": "string",
      "insuranceProvider": "string",
      "insuranceNumber": "string",
      "medications": ["string"],
      "notes": "string"
    }

    If any field is not found in the document, use null for that field.
    Ensure the care level is a number between 1 and 5.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: documentImage.split(",")[1] // Remove data URL prefix if present
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    const text = response.text();

    // Try to parse the response as JSON
    try {
      const extractedData = JSON.parse(text);

      // Validate the extracted data against our patient schema
      const validatedData = patientSchema.parse(extractedData);

      res.json({
        success: true,
        data: validatedData
      });
    } catch (parseError) {
      console.error("Data parsing error:", parseError);
      res.status(422).json({
        error: "Konnte Patientendaten nicht aus dem Dokument extrahieren",
        details: "Ungültiges Datenformat"
      });
    }
  } catch (error) {
    console.error("Document extraction error:", error);
    if (error instanceof Error) {
      res.status(500).json({
        error: "Dokumentenanalyse fehlgeschlagen",
        details: error.message
      });
    } else {
      res.status(500).json({
        error: "Dokumentenanalyse fehlgeschlagen",
        details: "Unbekannter Fehler"
      });
    }
  }
});

export default router;