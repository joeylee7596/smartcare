import { toast } from '@/hooks/use-toast';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

class WebSocketManager {
  private static instance: WebSocket | null = null;
  private static messageHandlers: Set<(message: WebSocketMessage) => void> = new Set();
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 2000;

  static getInstance(): WebSocket | null {
    if (!this.instance || this.instance.readyState === WebSocket.CLOSED) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.instance = new WebSocket(wsUrl);
        this.reconnectAttempts = 0;

        this.instance.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
        };

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

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.getInstance(), this.reconnectDelay);
          } else {
            toast({
              title: "Verbindungsfehler",
              description: "Die Verbindung zum Server konnte nicht wiederhergestellt werden. Bitte laden Sie die Seite neu.",
              variant: "destructive",
            });
          }
        };

        this.instance.onerror = (error) => {
          console.error('WebSocket error:', error);
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
    // Ensure WebSocket connection exists
    this.getInstance();
    return () => {
      this.messageHandlers.delete(handler);
    };
  }
}

export const sendMessage = WebSocketManager.sendMessage.bind(WebSocketManager);
export const subscribe = WebSocketManager.subscribe.bind(WebSocketManager);

// Initialize WebSocket connection
WebSocketManager.getInstance();