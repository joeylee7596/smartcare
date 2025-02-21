import { WebSocketServer } from 'ws';
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
          case 'VOICE_TRANSCRIPTION':
            // Start sending progress updates
            ws.send(JSON.stringify({
              type: 'TRANSCRIPTION_PROGRESS',
              preview: 'Transkribiere Aufnahme...',
            }));

            // Generate documentation
            const documentation = await generateDocumentation(data.audioContent);

            // Send final result
            ws.send(JSON.stringify({
              type: 'TRANSCRIPTION_RESULT',
              documentation
            }));
            break;

          case 'OPTIMIZE_TOUR':
            const optimizedWorkflow = await optimizeWorkflow(data.patients);
            ws.send(JSON.stringify({
              type: 'OPTIMIZED_TOUR',
              workflow: optimizedWorkflow
            }));
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
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}