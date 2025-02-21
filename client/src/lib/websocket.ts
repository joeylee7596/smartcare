import { toast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';

export { useWebSocket };

export function sendMessage(message: any) {
  const { sendMessage: send } = useWebSocket();
  try {
    send(message);
  } catch (error) {
    console.error('Failed to send message:', error);
    toast({
      title: "Fehler",
      description: "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.",
      variant: "destructive",
    });
  }
}
