import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { URL } from 'url';
import { GoogleGenAI } from '@google/genai';
import { dbStore } from './db.js';
import { retrieveRelevantChunks } from './ragEngine.js';

interface ClientSession {
  clientWs: WebSocket;
  user: any;
  studentUnlockedDay: number;
  voiceName: string;
  geminiWs?: WebSocket;
  history: { sender: 'user' | 'ai'; text: string }[];
}

export function setupLiveVoiceWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, 'http://localhost').pathname : '';
    if (pathname === '/api/live-voice') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (clientWs: WebSocket, request: any) => {
    const requestUrl = new URL(request.url || '', 'http://localhost');
    const token = requestUrl.searchParams.get('token') || '';
    const voiceParam = requestUrl.searchParams.get('voice') || 'Puck';

    // Authenticate user token
    const users = dbStore.getUsers();
    let authenticatedUser: any = null;

    if (token) {
      if (token.startsWith('usr_')) {
        authenticatedUser = users.find((u) => u.id === token);
      } else {
        try {
          const parts = token.split('_');
          if (parts.length >= 2) {
            const uid = `${parts[0]}_${parts[1]}`;
            authenticatedUser = users.find((u) => u.id === uid || u.id === token);
          }
        } catch (_) {}
      }
    }

    if (!authenticatedUser) {
      // Fallback default user for dev preview if unauthenticated
      authenticatedUser = users.find((u) => u.role === 'student') || users[0];
    }

    if (!authenticatedUser || authenticatedUser.status === 'suspended') {
      clientWs.send(JSON.stringify({ type: 'error', message: 'Unauthorized or account suspended.' }));
      clientWs.close();
      return;
    }

    // Determine student's unlocked study plan day
    let studentUnlockedDay = 2; // Default
    if (authenticatedUser.role === 'admin') {
      studentUnlockedDay = 7; // Admins have full access
    } else {
      const plans = dbStore.getPlans();
      const activePlan = plans.find((p) => p.isActiveDefault) || plans[0];
      if (activePlan) {
        studentUnlockedDay = Math.min(7, activePlan.totalDays || 7);
      }
    }

    // Retrieve authorized PDF chunks strictly matching unlocked days
    const RAG_QUERY = 'core study plan learning modules curriculum concepts';
    const authorizedChunks = retrieveRelevantChunks(RAG_QUERY, 12, authenticatedUser.role, studentUnlockedDay);
    const ragContextText = authorizedChunks.length > 0
      ? authorizedChunks.map((c, i) => `[Source ${i + 1}: ${c.chunk.docName} (Pg ${c.chunk.pageNumber})]\n${c.chunk.content}`).join('\n\n')
      : 'General introductory study curriculum available.';

    const systemPrompt = `You are Talent Sphere AI Voice Assistant, a friendly, intelligent, and highly articulate AI tutor for student ${authenticatedUser.name}.
Your job is to answer the student's questions verbally in a natural, conversational tone.

AUTHORIZED STUDY MATERIALS (Unlocked up to Day ${studentUnlockedDay}):
${ragContextText}

STRICT DOCUMENT PERMISSIONS & SECURITY RULES:
1. Answer strictly using concepts and facts from the AUTHORIZED STUDY MATERIALS provided above.
2. If the student asks about locked-day materials, other students' private uploads, or admin files, politely decline: "I can only answer questions using your currently unlocked study plan materials (Up to Day ${studentUnlockedDay})."
3. Keep spoken responses concise, engaging, and clear (2 to 4 sentences). Avoid bullet points or markdown code blocks in spoken audio.
4. Speak warmly and encouragingly.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'GEMINI_API_KEY environment variable is not configured on server.' }));
      clientWs.close();
      return;
    }

    const session: ClientSession = {
      clientWs,
      user: authenticatedUser,
      studentUnlockedDay,
      voiceName: voiceParam,
      history: []
    };

    // Send connection established confirmation
    clientWs.send(JSON.stringify({
      type: 'connected',
      user: { id: authenticatedUser.id, name: authenticatedUser.name, role: authenticatedUser.role },
      unlockedDay: studentUnlockedDay,
      message: `Connected to Talent Sphere Voice Assistant (Unlocked Day ${studentUnlockedDay})`
    }));

    // Connect to Gemini Live BidiGenerateContent WebSocket Endpoint
    const gWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    let geminiWs: WebSocket | null = null;

    try {
      geminiWs = new WebSocket(gWsUrl);
      session.geminiWs = geminiWs;

      geminiWs.on('open', () => {
        // Send initial setup frame
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceParam || 'Puck'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            }
          }
        };
        geminiWs?.send(JSON.stringify(setupMessage));
      });

      geminiWs.on('message', (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());

          // Check for model turn content (Audio / Text)
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                // Audio chunk from Gemini Live
                clientWs.send(JSON.stringify({
                  type: 'audio',
                  data: part.inlineData.data
                }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({
                  type: 'transcript',
                  sender: 'ai',
                  text: part.text
                }));
              }
            }
          }

          if (msg.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turn_complete' }));
          }

          if (msg.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
        } catch (e) {
          console.error('Error parsing Gemini Live WS message:', e);
        }
      });

      geminiWs.on('error', (err) => {
        console.warn('Gemini Live WS error, falling back to Gemini Text/Audio Engine:', err.message);
      });

      geminiWs.on('close', () => {
        // Closed
      });
    } catch (err) {
      console.warn('Could not connect directly to Gemini Live WS:', err);
    }

    // Handle messages from Client Browser
    clientWs.on('message', async (messageData: Buffer | string) => {
      try {
        const payload = JSON.parse(messageData.toString());

        if (payload.type === 'audio_chunk' && payload.data) {
          // Forward audio chunk to Gemini Live WS if connected
          if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            const realtimeMsg = {
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'audio/pcm',
                    data: payload.data
                  }
                ]
              }
            };
            geminiWs.send(JSON.stringify(realtimeMsg));
          }
        } else if (payload.type === 'text_input' && payload.text) {
          const userText = payload.text.trim();
          clientWs.send(JSON.stringify({ type: 'transcript', sender: 'user', text: userText }));

          // RAG retrieval for relevant chunks
          const ragResults = retrieveRelevantChunks(userText, 5, authenticatedUser.role, studentUnlockedDay);
          const ragContext = ragResults.length > 0
            ? ragResults.map((r) => r.chunk.content).join('\n')
            : '';

          // Generate response using server-side Gemini API
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `${systemPrompt}\n\nRELEVANT EXCERPTS FOR THIS QUERY:\n${ragContext}\n\nStudent asked: "${userText}"\nProvide a clear, helpful spoken response.`;

          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt
            });
            const answerText = response.text || 'I am happy to help with your study plan.';

            clientWs.send(JSON.stringify({
              type: 'transcript',
              sender: 'ai',
              text: answerText
            }));

            // Signal complete turn
            clientWs.send(JSON.stringify({ type: 'turn_complete' }));
          } catch (err: any) {
            console.error('Gemini text error in Live Voice:', err);
            clientWs.send(JSON.stringify({
              type: 'transcript',
              sender: 'ai',
              text: 'I apologize, I could not process your query at this moment.'
            }));
          }
        } else if (payload.type === 'interrupt') {
          // Send interrupt signal to Gemini Live WS
          if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            // Signal interrupt frame if needed
          }
        }
      } catch (err) {
        console.error('Error handling live voice client message:', err);
      }
    });

    clientWs.on('close', () => {
      if (geminiWs) {
        try { geminiWs.close(); } catch (_) {}
      }
    });
  });

  return wss;
}
