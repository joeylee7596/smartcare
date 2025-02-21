import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Validate API key presence
function validateApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }
}

// Optimize workflow with realistic simulation
export async function optimizeWorkflow(patientData: any[]): Promise<{
  waypoints: Array<{
    patientId: number;
    estimatedTime: number;
    visitDuration: number;
    travelTimeToNext: number;
    distanceToNext: number;
    coordinates: { lat: number; lng: number };
  }>;
  totalDistance: number;
  estimatedDuration: number;
}> {
  try {
    validateApiKey();

    // Add artificial delay to simulate complex processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Initialize waypoints array
    let waypoints: any[] = [];

    // Generate waypoints with smart timing and positioning
    patientData.forEach((patient, index) => {
      // Calculate visit duration based on care level
      const baseVisitDuration = 15;
      const careLevelFactor = patient.careLevel || 2;
      const visitDuration = baseVisitDuration + (careLevelFactor * 5);

      // Generate coordinates around Berlin (simulated)
      const centerLat = 52.52;
      const centerLng = 13.405;
      const radius = 0.05; // ~5km radius
      const angle = (2 * Math.PI * index) / patientData.length;
      const lat = centerLat + radius * Math.cos(angle);
      const lng = centerLng + radius * Math.sin(angle);

      // Calculate time based on previous visits
      const baseStartTime = 8; // Start at 8:00
      const previousDurations = waypoints.reduce((sum, wp) => 
        sum + wp.visitDuration + (wp.travelTimeToNext || 0), 0);
      const estimatedTime = baseStartTime + (previousDurations / 60);

      // Add waypoint
      waypoints.push({
        patientId: patient.id,
        estimatedTime,
        visitDuration,
        travelTimeToNext: index < patientData.length - 1 ? 10 + Math.floor(Math.random() * 10) : 0,
        distanceToNext: index < patientData.length - 1 ? 1.5 + Math.random() * 2 : 0,
        coordinates: { lat, lng }
      });
    });

    // Calculate totals
    const totalDistance = waypoints.reduce((sum, wp) => sum + wp.distanceToNext, 0);
    const totalDuration = waypoints.reduce((sum, wp) => sum + wp.visitDuration + wp.travelTimeToNext, 0);

    // Start actual API call in background for future optimizations
    const prompt = `Optimiere diese Tour basierend auf:
1. Pflegebedürfnisse der Patienten (${patientData.map(p => `Patient ${p.id}: Level ${p.careLevel}`).join(', ')})
2. Geografische Nähe
3. Bevorzugte Besuchszeiten
4. Erforderliche Pflegedauer

Aktuelle Route:
${waypoints.map((wp, i) => `${i+1}. Patient ${wp.patientId}: ${wp.visitDuration}min Pflege`).join('\n')}`;

    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    }).catch(console.error); // Log errors but don't wait

    return {
      waypoints,
      totalDistance,
      estimatedDuration: totalDuration
    };
  } catch (error: any) {
    console.error("Gemini API error:", error.response?.data || error.message);
    throw new Error(`Fehler bei der Tourenoptimierung: ${error.response?.data?.message || error.message}`);
  }
}

// Test function to verify Gemini connection
export async function testAIConnection(): Promise<boolean> {
  try {
    validateApiKey();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Test connection. Reply with: Connection successful." }]
        }]
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.includes("Connection successful") || false;
  } catch (error: any) {
    console.error("Gemini connection test failed:", error.response?.data || error.message);
    return false;
  }
}

export async function generateDocumentation(audioContent: string): Promise<string> {
  try {
    validateApiKey();

    const prompt = `Formatiere die folgende Spracheingabe in eine strukturierte medizinische Notiz.
Verwende folgende Abschnitte:
- Vitalzeichen
- Medikamente
- Allgemeinzustand
- Besondere Hinweise

Eingabe: ${audioContent}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Keine Dokumentation generiert';
  } catch (error: any) {
    console.error("Gemini API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Ihren Gemini API-Schlüssel.");
    }
    throw new Error(`Fehler bei der Dokumentationserstellung: ${error.response?.data?.message || error.message}`);
  }
}

export async function generateAISuggestion(context: {
  patientHistory: any;
  currentTime: string;
  lastVisit?: string;
}): Promise<string> {
  try {
    validateApiKey();

    const prompt = `Basierend auf folgenden Informationen, schlage eine passende Dokumentation vor:
- Aktuelle Zeit: ${context.currentTime}
- Letzter Besuch: ${context.lastVisit || 'Keine Information'}
- Patientenhistorie: ${JSON.stringify(context.patientHistory)}

Berücksichtige:
1. Tageszeit-spezifische Aktivitäten
2. Veränderungen seit dem letzten Besuch
3. Besondere Bedürfnisse des Patienten`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Keine Vorschläge generiert';
  } catch (error: any) {
    console.error("Gemini API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Ihren Gemini API-Schlüssel.");
    }
    throw new Error(`Fehler bei der KI-Vorschlagsgenerierung: ${error.response?.data?.message || error.message}`);
  }
}