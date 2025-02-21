import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateDocumentation(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Als medizinischer Dokumentationsassistent, formatiere den folgenden Text in eine professionelle Patientendokumentation im deutschen Pflegestandard. Verwende NUR die Informationen, die im Text gegeben sind. Füge KEINE zusätzlichen Informationen oder Annahmen hinzu.

${text}

Formatiere die Dokumentation NUR in die folgenden Abschnitte, wenn dazu Informationen im Text vorhanden sind:
- Allgemeiner Zustand (nur wenn beschrieben)
- Durchgeführte Maßnahmen (nur wenn beschrieben)
- Beobachtungen (nur wenn beschrieben)
- Empfehlungen (nur wenn explizit genannt)

Wenn zu einem der Abschnitte keine Informationen vorliegen, lasse diesen Abschnitt komplett weg.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating documentation:', error);
    // Fallback: Return original text if AI processing fails
    return text;
  }
}