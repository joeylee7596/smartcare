import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");

interface DocumentationContext {
  patientContext: {
    careLevel?: string;
    medicalHistory?: string[];
    medications?: string[];
  };
  type: string;
  content?: string;
}

export async function generateDocumentationSuggestions(context: DocumentationContext) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Als erfahrene Pflegekraft erstelle ich eine ${context.type} Dokumentation.
Patientenkontext:
- Pflegestufe: ${context.patientContext.careLevel || 'Nicht angegeben'}
- Vorerkrankungen: ${context.patientContext.medicalHistory?.join(', ') || 'Keine'}
- Medikamente: ${context.patientContext.medications?.join(', ') || 'Keine'}

${context.content ? 'Bisheriger Dokumentationstext: ' + context.content : ''}

Bitte generiere drei verschiedene Vorschläge:
1. Eine Vervollständigung der bestehenden Dokumentation
2. Einen Korrekturvorschlag mit verbesserter Fachsprache
3. Zusätzliche wichtige Aspekte, die dokumentiert werden sollten

Die Antwort sollte im JSON-Format sein mit den Feldern:
- type (completion/correction/insight)
- content (der Vorschlag)
- confidence (0-1)`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const suggestions = JSON.parse(response.text());

    if (!Array.isArray(suggestions)) {
      throw new Error("Invalid AI response format");
    }

    return suggestions.map(suggestion => ({
      type: suggestion.type,
      content: suggestion.content,
      confidence: suggestion.confidence
    }));
  } catch (error) {
    console.error("AI Documentation Generation Error:", error);
    return [];
  }
}

export async function analyzeDocumentationQuality(content: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Analysiere die folgende Pflegedokumentation und bewerte die Qualität nach folgenden Kriterien:
- Vollständigkeit
- Fachliche Korrektheit
- Rechtliche Anforderungen
- Verständlichkeit

Dokumentation:
${content}

Antworte im JSON-Format mit:
- score (0-100)
- issues (Array von Problemen)
- suggestions (Array von Verbesserungsvorschlägen)`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("AI Documentation Analysis Error:", error);
    return {
      score: 0,
      issues: ["Fehler bei der KI-Analyse"],
      suggestions: []
    };
  }
}
