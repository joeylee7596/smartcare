import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { generateDocumentation, optimizeWorkflow } from './ai';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'OPTIMIZE_TOUR':
            const optimizedWorkflow = await optimizeWorkflow(data.patients || data.tours);
            ws.send(JSON.stringify({
              type: 'OPTIMIZED_TOUR',
              workflow: optimizedWorkflow
            }));
            break;

          case 'VOICE_TRANSCRIPTION':
            // Send initial progress update
            ws.send(JSON.stringify({
              type: 'TRANSCRIPTION_PROGRESS',
              status: 'started',
              message: 'Transkribiere Sprachaufnahme...'
            }));

            try {
              const documentation = await generateDocumentation(data.audioContent);
              ws.send(JSON.stringify({
                type: 'TRANSCRIPTION_COMPLETE',
                documentation
              }));
            } catch (error) {
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