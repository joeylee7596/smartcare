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

    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    const toast = useToast(); // Assuming useToast is available in the calling scope
    if(toast){ // added check to prevent error when useToast is not available in context.
        toast({
          variant: "destructive",
          title: "API Error",
          description: `API request failed: ${error}`,
        });
    }
    throw error;
  }
}