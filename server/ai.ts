import axios from 'axios';

// Create axios instance for Mistral AI
const mistralAxios = axios.create({
  baseURL: 'https://api.mistral.ai/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY?.trim()}`, // Ensure key is trimmed
  },
});

// Validate API key presence
function validateApiKey() {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Mistral API key is not configured');
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

    console.log("Mistral test response:", response.data);
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
          content: "You are a healthcare documentation assistant. Format the input into a structured medical note with sections for vitals, medications, general condition, and special notes. Use clear, professional language."
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
      throw new Error("Invalid response format from Mistral AI");
    }

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please check your Mistral API key.");
    }
    throw new Error(`Failed to generate documentation: ${error.response?.data?.message || error.message}`);
  }
}

export async function optimizeWorkflow(patientData: any[]): Promise<{
  waypoints: Array<{ patientId: number; estimatedTime: number }>;
  totalDistance: number;
  estimatedDuration: number;
}> {
  try {
    validateApiKey();

    const response = await mistralAxios.post('/chat/completions', {
      model: "mistral-small",
      messages: [
        {
          role: "system",
          content: "You are a healthcare workflow optimization expert. Create an efficient care schedule based on patient needs. Output should be in JSON format with waypoints (array of objects with patientId and estimatedTime), totalDistance, and estimatedDuration."
        },
        {
          role: "user",
          content: JSON.stringify(patientData)
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from Mistral AI");
    }

    const aiResponse = JSON.parse(response.data.choices[0].message.content);
    return {
      waypoints: aiResponse.waypoints || [],
      totalDistance: aiResponse.totalDistance || 0,
      estimatedDuration: aiResponse.estimatedDuration || 0
    };
  } catch (error: any) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please check your Mistral API key.");
    }
    throw new Error(`Failed to optimize workflow: ${error.response?.data?.message || error.message}`);
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
          content: "You are a healthcare documentation assistant. Suggest appropriate documentation based on the time of day and patient history."
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
      throw new Error("Invalid response format from Mistral AI");
    }

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error("Authentication failed. Please check your Mistral API key.");
    }
    throw new Error(`Failed to generate AI suggestion: ${error.response?.data?.message || error.message}`);
  }
}