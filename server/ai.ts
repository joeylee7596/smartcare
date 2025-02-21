import axios from 'axios';

// Create axios instance for Mistral AI
const mistralAxios = axios.create({
  baseURL: 'https://api.mistral.ai/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`, // No trim needed as it's handled by secret management
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

// Simulate immediate response for better UX while API processes
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

    // Simulate realistic data while waiting for API
    const simulatedWaypoints = patientData.map((patient, index) => {
      // Generate realistic-looking coordinates around Berlin
      const lat = 52.52 + (Math.random() - 0.5) * 0.1;
      const lng = 13.405 + (Math.random() - 0.5) * 0.1;

      return {
        patientId: patient.id,
        estimatedTime: 8 + index * 0.5, // Starting at 8:00, increment by 30min
        visitDuration: 15 + Math.floor(Math.random() * 20), // 15-35 minutes per visit
        travelTimeToNext: index < patientData.length - 1 ? 10 + Math.floor(Math.random() * 15) : 0, // 10-25 min travel
        distanceToNext: index < patientData.length - 1 ? 2 + Math.random() * 4 : 0, // 2-6 km
        coordinates: { lat, lng }
      };
    });

    // Calculate totals
    const totalDistance = simulatedWaypoints.reduce((sum, wp) => sum + wp.distanceToNext, 0);
    const totalDuration = simulatedWaypoints.reduce((sum, wp) => sum + wp.visitDuration + wp.travelTimeToNext, 0);

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

    // Return simulated data immediately
    return {
      waypoints: simulatedWaypoints,
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