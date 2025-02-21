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
            // Send initial status
            ws.send(JSON.stringify({
              type: 'OPTIMIZATION_STATUS',
              status: 'analyzing',
              message: 'Analysiere Patientendaten und Pflegebedürfnisse...'
            }));

            // Add slight delay for UX
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Send progress update
            ws.send(JSON.stringify({
              type: 'OPTIMIZATION_STATUS',
              status: 'calculating',
              message: 'Berechne optimale Route und Besuchszeiten...'
            }));

            // Get optimized workflow
            const optimizedWorkflow = await optimizeWorkflow(data.patients || data.tours);

            // Send final result
            ws.send(JSON.stringify({
              type: 'OPTIMIZED_TOUR',
              workflow: optimizedWorkflow
            }));
            break;

          case 'VOICE_TRANSCRIPTION':
            try {
              // Initial progress update
              ws.send(JSON.stringify({
                type: 'TRANSCRIPTION_PROGRESS',
                status: 'started',
                progress: 10,
                message: 'Starte Transkription...'
              }));

              // Progress update
              ws.send(JSON.stringify({
                type: 'TRANSCRIPTION_PROGRESS',
                status: 'processing',
                progress: 50,
                message: 'Verarbeite Aufnahme...'
              }));

              // Convert base64 to text (assuming it's already transcribed text)
              const spokenText = Buffer.from(data.audioContent, 'base64').toString('utf-8');
              console.log('Received spoken text:', spokenText);

              // Generate documentation from the spoken text
              const documentation = await generateDocumentation(spokenText);

              // Send final transcription
              ws.send(JSON.stringify({
                type: 'TRANSCRIPTION_COMPLETE',
                documentation: documentation,
                originalText: spokenText
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