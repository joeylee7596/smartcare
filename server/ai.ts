import axios from 'axios';

const mistralAxios = axios.create({
  baseURL: 'https://api.mistral.ai/v1',
  headers: {
    'Content-Type': 'application/json',
    // Add 'Bearer' prefix to the API key
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
  },
});

export async function generateDocumentation(audioContent: string): Promise<string> {
  try {
    // Updated request format according to Mistral API docs
    const response = await mistralAxios.post('/chat/completions', {
      model: "mistral-large-latest",
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
  } catch (error) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    throw new Error("Failed to generate documentation");
  }
}

export async function optimizeWorkflow(patientData: any[]): Promise<{
  waypoints: Array<{ patientId: number; estimatedTime: number }>;
  totalDistance: number;
  estimatedDuration: number;
}> {
  try {
    const response = await mistralAxios.post('/chat/completions', {
      model: "mistral-large-latest",
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
      temperature: 0.3, // Lower temperature for more consistent outputs
      max_tokens: 1000,
      response_format: { type: "json_object" }
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
  } catch (error) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    throw new Error("Failed to optimize workflow");
  }
}

export async function generateAISuggestion(context: {
  patientHistory: any;
  currentTime: string;
  lastVisit?: string;
}): Promise<string> {
  try {
    const response = await mistralAxios.post('/chat/completions', {
      model: "mistral-large-latest",
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
  } catch (error) {
    console.error("Mistral AI API error:", error.response?.data || error.message);
    throw new Error("Failed to generate AI suggestion");
  }
}