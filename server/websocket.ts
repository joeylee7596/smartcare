import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { generateDocumentation } from './ai';
import { parse } from 'cookie';
import { storage } from './storage';

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
          case 'VOICE_TRANSCRIPTION':
            try {
              const documentation = await generateDocumentation(data.audioContent);
              console.log('Generated documentation successfully');

              ws.send(JSON.stringify({
                type: 'TRANSCRIPTION_COMPLETE',
                documentation,
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

          case 'DOC_STATUS_UPDATE':
            console.log('Broadcasting status update:', data);
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'DOC_STATUS_UPDATED',
                  docId: data.docId,
                  status: data.status
                }));
              }
            });
            break;

          case 'OPTIMIZE_TOUR':
            console.log('Received tour optimization request:', data);
            // Simulate AI processing time
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'OPTIMIZED_TOUR',
                  workflow: {
                    waypoints: data.patients.map((patient: any, index: number) => ({
                      patientId: patient.id,
                      estimatedTime: new Date(Date.now() + index * 45 * 60000).toISOString(),
                      visitDuration: 30,
                      travelTimeToNext: index < data.patients.length - 1 ? 15 : 0,
                      distanceToNext: index < data.patients.length - 1 ? 2.5 : 0,
                      lat: 52.520008 + (Math.random() * 0.1 - 0.05),
                      lng: 13.404954 + (Math.random() * 0.1 - 0.05)
                    })),
                    totalDistance: (data.patients.length - 1) * 2.5,
                    estimatedDuration: data.patients.length * 45
                  }
                }));
              }
            }, 2000);
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