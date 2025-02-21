import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateDocumentation(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Als medizinischer Dokumentationsassistent, formatiere den folgenden Text in eine professionelle Patientendokumentation im deutschen Pflegestandard. Behalte alle wichtigen medizinischen Details bei, strukturiere sie klar und verwende medizinische Fachsprache wo angemessen:

${text}

Formatiere die Dokumentation in folgende Abschnitte:
- Allgemeiner Zustand
- Durchgeführte Maßnahmen
- Beobachtungen
- Empfehlungen (falls zutreffend)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating documentation:', error);
    // Fallback: Return original text if AI processing fails
    return text;
  }
}