import { toast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

let wsInstance: WebSocket | null = null;

function getWebSocket() {
  if (!wsInstance) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    wsInstance = new WebSocket(wsUrl);

    wsInstance.onclose = () => {
      console.log('WebSocket disconnected');
      wsInstance = null;
      // Attempt to reconnect after 2 seconds
      setTimeout(getWebSocket, 2000);
    };

    wsInstance.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Verbindungsfehler",
        description: "Die Verbindung zum Server wurde unterbrochen. Versuche neu zu verbinden...",
        variant: "destructive",
      });
    };
  }

  return wsInstance;
}

export function sendMessage(message: WebSocketMessage) {
  const ws = getWebSocket();
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    toast({
      title: "Fehler",
      description: "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.",
      variant: "destructive",
    });
  }
}

export function useWebSocket() {
  return {
    sendMessage,
    subscribe: (handler: (message: WebSocketMessage) => void) => {
      const ws = getWebSocket();
      if (!ws) return;

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handler(message);
      };

      return () => {
        if (ws) {
          ws.onmessage = null;
        }
      };
    }
  };
}