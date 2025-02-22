import Anthropic from '@anthropic-ai/sdk';
import { Tour, Employee, Patient } from "@shared/schema";

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ScheduleInsight {
  optimizedSchedule: {
    tourId: number;
    suggestedTime: string;
    suggestedEmployeeId: number;
    confidence: number;
    reasoning: string;
  }[];
  workloadBalance: {
    employeeId: number;
    currentLoad: number;
    recommendation: string;
  }[];
  overallEfficiency: number;
  suggestions: string[];
}

export async function getScheduleInsights(
  date: Date,
  tours: Tour[],
  employees: Employee[],
  patients: Patient[]
): Promise<ScheduleInsight> {
  const prompt = `As an AI healthcare schedule optimizer, analyze this nursing care schedule:

Schedule Date: ${date.toISOString().split('T')[0]}

Tours: ${JSON.stringify(tours, null, 2)}
Employees: ${JSON.stringify(employees, null, 2)}
Patients: ${JSON.stringify(patients, null, 2)}

Consider:
1. Employee qualifications matching patient needs
2. Geographic optimization
3. Employee workload balance
4. Patient care timing preferences
5. Break distribution
6. Travel efficiency

Provide optimized recommendations in this exact JSON format:
{
  "optimizedSchedule": [{
    "tourId": number,
    "suggestedTime": "ISO string",
    "suggestedEmployeeId": number,
    "confidence": number (0-1),
    "reasoning": "string"
  }],
  "workloadBalance": [{
    "employeeId": number,
    "currentLoad": number (0-100),
    "recommendation": "string"
  }],
  "overallEfficiency": number (0-100),
  "suggestions": ["string"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const result = JSON.parse(response.content[0].text);
    return result as ScheduleInsight;
  } catch (error) {
    console.error("AI Scheduling Error:", error);
    throw new Error("Failed to generate schedule insights");
  }
}

export async function optimizeRoute(
  tour: Tour,
  patients: Patient[],
): Promise<{
  optimizedOrder: number[];
  estimatedDuration: number;
  confidence: number;
}> {
  const prompt = `Optimize this care tour route:
Tour: ${JSON.stringify(tour)}
Patients: ${JSON.stringify(patients)}

Consider:
1. Patient care urgency
2. Geographic proximity
3. Time windows
4. Care duration

Return only valid JSON:
{
  "optimizedOrder": [patient_ids],
  "estimatedDuration": minutes,
  "confidence": 0-1
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const result = JSON.parse(response.content[0].text);
    return result;
  } catch (error) {
    console.error("Route Optimization Error:", error);
    throw new Error("Failed to optimize route");
  }
}
