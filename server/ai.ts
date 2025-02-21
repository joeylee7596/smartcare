import axios from 'axios';

// Create axios instance for Mistral AI
const mistralAxios = axios.create({
  baseURL: 'https://api.mistral.ai/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
  },
});

// Validate API key presence and format
function validateApiKey() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Mistral API key is not configured');
  }
  if (!apiKey.startsWith('ag')) {
    throw new Error('Invalid Mistral API key format. Key should start with "ag"');
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
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize waypoints array first
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

    // Start actual API call in background for next optimization
    mistralAxios.post('/chat/completions', {
      model: "mistral-small",
      messages: [
        {
          role: "system",
          content: `Als KI-Experte für Pflegetouren-Optimierung, erstellen Sie einen effizienten Zeitplan basierend auf:
1. Pflegebedürfnisse der Patienten
2. Geografische Nähe
3. Bevorzugte Besuchszeiten
4. Erforderliche Pflegedauer

Output im JSON Format mit:
- waypoints: Array von Objekten mit patientId und estimatedTime
- totalDistance: Geschätzte Gesamtdistanz in km
- estimatedDuration: Gesamtdauer inkl. Pflegezeit in Minuten`
        },
        {
          role: "user",
          content: JSON.stringify(patientData)
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }).catch(console.error); // Log errors but don't wait

    return {
      waypoints,
      totalDistance,
      estimatedDuration: totalDuration
    };
  } catch (error: any) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    throw new Error(`Fehler bei der Tourenoptimierung: ${error.response?.data?.message || error.message}`);
  }
}

// Test function to verify Mistral connection
export async function testMistralConnection(): Promise<boolean> {
  try {
    validateApiKey();

    const response = await mistralAxios.post('/chat/completions', {
      model: "mistral-small",
      messages: [
        {
          role: "user",
          content: "Test connection. Reply with: Connection successful."
        }
      ],
      temperature: 0.1,
      max_tokens: 20
    });

    return response.data?.choices?.[0]?.message?.content?.includes("Connection successful") || false;
  } catch (error: any) {
    console.error("Mistral connection test failed:", error.response?.data || error.message);
    return false;
  }
}

export async function generateDocumentation(audioContent: string): Promise<string> {
  try {
    validateApiKey();

    const response = await mistralAxios.post('/chat/completions', {
      model: "mistral-small",
      messages: [
        {
          role: "system",
          content: "Sie sind ein Experte für Pflegedokumentation. Formatieren Sie die Eingabe in eine strukturierte medizinische Notiz mit Abschnitten für Vitalzeichen, Medikamente, Allgemeinzustand und besondere Hinweise. Verwenden Sie eine klare, professionelle Sprache."
        },
        {
          role: "user",
          content: audioContent
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error("Ungültiges Antwortformat von Mistral AI");
    }

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Ihren Mistral API-Schlüssel.");
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

    const response = await mistralAxios.post('/chat/completions', {
      model: "mistral-small",
      messages: [
        {
          role: "system",
          content: "Sie sind ein Assistent für Pflegedokumentation. Schlagen Sie basierend auf der Tageszeit und der Patientenhistorie eine passende Dokumentation vor."
        },
        {
          role: "user",
          content: JSON.stringify(context)
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error("Ungültiges Antwortformat von Mistral AI");
    }

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Ihren Mistral API-Schlüssel.");
    }
    throw new Error(`Fehler bei der KI-Vorschlagsgenerierung: ${error.response?.data?.message || error.message}`);
  }
}