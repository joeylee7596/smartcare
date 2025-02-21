import { useCallback } from 'react';
import { subscribe as wsSubscribe, sendMessage as wsSendMessage, type WebSocketMessage } from '@/lib/websocket';

export function useWebSocket() {
  const sendMessage = useCallback((message: WebSocketMessage) => {
    wsSendMessage(message);
  }, []);

  const subscribe = useCallback((handler: (message: WebSocketMessage) => void) => {
    return wsSubscribe(handler);
  }, []);

  return { sendMessage, subscribe };
}