import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface SmartDocTemplate {
  type: string;
  content: string;
  suggestedDuration: number;
}

export async function generateDocumentation(text: string, context?: { 
  patientHistory?: string,
  careLevel?: number,
  lastVisit?: Date
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let contextPrompt = "";
    if (context) {
      contextPrompt = `
Berücksichtige diese zusätzlichen Informationen:
- Pflegegrad: ${context.careLevel || "Nicht angegeben"}
- Letzte Dokumentation: ${context.patientHistory || "Keine vorherige Dokumentation"}
- Letzter Besuch: ${context.lastVisit ? new Date(context.lastVisit).toLocaleDateString() : "Nicht bekannt"}
`;
    }

    const prompt = `Als medizinischer Dokumentationsassistent, formatiere den folgenden Text in eine professionelle Patientendokumentation im deutschen Pflegestandard. Verwende NUR die Informationen, die im Text gegeben sind. Füge KEINE zusätzlichen Informationen oder Annahmen hinzu.

${text}

${contextPrompt}

Formatiere die Dokumentation in die folgenden Abschnitte, wenn dazu Informationen im Text vorhanden sind:
- Allgemeiner Zustand (nur wenn beschrieben)
- Vitalzeichen (nur wenn gemessen)
- Durchgeführte Maßnahmen (nur wenn beschrieben)
- Beobachtungen (nur wenn beschrieben)
- Medikation (nur wenn erwähnt)
- Besonderheiten (nur wenn vorhanden)
- Empfehlungen (nur wenn explizit genannt)

Wenn zu einem der Abschnitte keine Informationen vorliegen, lasse diesen Abschnitt komplett weg.
Formatiere wichtige Werte wie Vitalzeichen, Medikamente oder Auffälligkeiten in **fetter** Schrift.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating documentation:', error);
    return text;
  }
}

export async function suggestDocTemplates(patientCondition: string): Promise<SmartDocTemplate[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Erstelle 3 Dokumentationsvorlagen für einen Patienten mit folgender Kondition: "${patientCondition}".
Formatiere die Ausgabe als JSON-Array mit Objekten, die folgende Eigenschaften haben:
- type: Art der Dokumentation
- content: Vorlagentext mit Platzhaltern in [eckigen Klammern]
- suggestedDuration: Geschätzte Dauer in Minuten

Die Vorlagen sollen professionell und im Pflegestandard sein.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error('Error generating templates:', error);
    return [];
  }
}

export async function analyzeCareProgress(
  patientId: number,
  recentDocs: string[]
): Promise<{
  trends: string[];
  suggestions: string[];
  riskAreas: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analysiere die folgenden Dokumentationen eines Patienten und erstelle eine Zusammenfassung der Entwicklung, Vorschläge für die weitere Betreuung und mögliche Risikobereiche.

Dokumentationen:
${recentDocs.join('\n---\n')}

Formatiere die Ausgabe als JSON mit:
- trends: Array von Strings mit erkennbaren Entwicklungen
- suggestions: Array von Strings mit konkreten Vorschlägen
- riskAreas: Array von Strings mit Risikobereichen die beobachtet werden sollten`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error('Error analyzing care progress:', error);
    return {
      trends: [],
      suggestions: [],
      riskAreas: []
    };
  }
}