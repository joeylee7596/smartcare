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
      try {
        if (!info.req.headers.cookie) {
          return done(false, 401, 'Unauthorized');
        }

        const cookies = parse(info.req.headers.cookie);
        const sid = cookies['connect.sid'];
        if (!sid) {
          return done(false, 401, 'No session found');
        }

        // Verify session
        const sessionID = sid.slice(2).split('.')[0];
        const session = await new Promise((resolve) => {
          storage.sessionStore.get(sessionID, (err, session) => {
            resolve(session);
          });
        });

        if (!session) {
          return done(false, 401, 'Invalid session');
        }

        done(true);
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        done(false, 500, 'Internal server error');
      }
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