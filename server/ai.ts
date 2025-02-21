import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini (this line is kept as it might be used elsewhere in the application, although it's not used in the modified function)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Generate documentation from voice input
export async function generateDocumentation(audioContent: string): Promise<string> {
  // Simply return the input text without AI processing
  return audioContent;
}