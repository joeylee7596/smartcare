import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { generateDocumentation } from './ai';
import { parse } from 'cookie';
import * as sessionParser from 'express-session';
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
    console.log('Client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'VOICE_TRANSCRIPTION':
            try {
              // Generate AI documentation from transcribed text
              const documentation = await generateDocumentation(data.audioContent);

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
            // Broadcast documentation status updates to all connected clients
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'DOC_STATUS_UPDATED',
                  docId: data.docId,
                  status: data.status,
                  reviewNotes: data.reviewNotes
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