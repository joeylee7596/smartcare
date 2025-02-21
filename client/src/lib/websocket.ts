import { toast } from '@/hooks/use-toast';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

class WebSocketManager {
  private static instance: WebSocket | null = null;
  private static messageHandlers: Set<(message: WebSocketMessage) => void> = new Set();
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 10; // Increased from 5 to 10
  private static reconnectDelay = 1000; // Reduced from 2000 to 1000
  private static reconnectTimer: NodeJS.Timeout | null = null;

  static getInstance(): WebSocket | null {
    if (!this.instance || this.instance.readyState === WebSocket.CLOSED) {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;

        console.log('Connecting to WebSocket:', wsUrl);
        this.instance = new WebSocket(wsUrl);
        this.reconnectAttempts = 0;

        this.instance.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
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

            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
            this.reconnectTimer = setTimeout(() => this.getInstance(), delay);
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
      console.log('WebSocket not ready, attempting to connect...');
      // Try to establish connection before sending
      this.getInstance();
      setTimeout(() => this.sendMessage(message), 1000);
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