import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 2 seconds
      setTimeout(connect, 2000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Verbindungsfehler",
        description: "Die Verbindung zum Server wurde unterbrochen. Versuche neu zu verbinden...",
        variant: "destructive",
      });
    };
  }, [toast]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      toast({
        title: "Verbindungsfehler",
        description: "Keine Verbindung zum Server. Bitte warten Sie einen Moment.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const subscribe = useCallback((handler: (message: WebSocketMessage) => void) => {
    if (!wsRef.current) return;

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handler(message);
    };
  }, []);

  return { sendMessage, subscribe };
}
