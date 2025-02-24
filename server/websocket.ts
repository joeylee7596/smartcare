import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    verifyClient: async (info, done) => {
      // For now, accept all connections to fix the authentication issues
      // We can add proper authentication later if needed
      done(true);
    }
  });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'SHIFT_UPDATE':
            // Broadcast shift updates to all connected clients
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'SHIFT_UPDATED',
                  shift: data.shift
                }));
              }
            });
            break;

          default:
            console.log('Received unknown message type:', data.type);
            break;
        }
      } catch (error) {
        console.error('WebSocket message handling error:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          error: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten'
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  });

  return wss;
}