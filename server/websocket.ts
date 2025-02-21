import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { generateDocumentation } from './ai';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'VOICE_TRANSCRIPTION':
            try {
              // Send back the transcribed text immediately
              ws.send(JSON.stringify({
                type: 'TRANSCRIPTION_COMPLETE',
                documentation: data.audioContent,
                originalText: data.audioContent
              }));
            } catch (error) {
              console.error('Transcription error:', error);
              ws.send(JSON.stringify({
                type: 'TRANSCRIPTION_ERROR',
                error: error instanceof Error ? error.message : 'Fehler bei der Transkription'
              }));
            }
            break;

          case 'TOUR_UPDATE':
            // Broadcast tour updates to all connected clients
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'TOUR_UPDATED',
                  tour: data.tour
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          error: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten'
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}