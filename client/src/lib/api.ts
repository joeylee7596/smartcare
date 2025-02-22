import { useToast } from "@/hooks/use-toast";

export async function apiRequest(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, data?: any) {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error; // Let the component handle the error and show toast
  }
}