import { toast } from '@/hooks/use-toast';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

class WebSocketManager {
  private static instance: WebSocket | null = null;
  private static messageHandlers: Set<(message: WebSocketMessage) => void> = new Set();

  static getInstance(): WebSocket | null {
    if (!this.instance) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        this.instance = new WebSocket(wsUrl);

        this.instance.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.messageHandlers.forEach(handler => handler(message));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.instance.onclose = () => {
          console.log('WebSocket disconnected');
          this.instance = null;
          setTimeout(() => this.getInstance(), 2000);
        };

        this.instance.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast({
            title: "Verbindungsfehler",
            description: "Die Verbindung zum Server wurde unterbrochen. Versuche neu zu verbinden...",
            variant: "destructive",
          });
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        return null;
      }
    }
    return this.instance;
  }

  static sendMessage(message: WebSocketMessage): void {
    const ws = this.getInstance();
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

  static subscribe(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }
}

// Initialize WebSocket connection
WebSocketManager.getInstance();

export const sendMessage = WebSocketManager.sendMessage.bind(WebSocketManager);
export const subscribe = WebSocketManager.subscribe.bind(WebSocketManager);